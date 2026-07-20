import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

export interface WeatherPoint {
  lat: number;
  lon: number;
  temp: number;
  windspeed: number;
  weathercode: number;
  city: string;
}

export interface EqItem {
  lat: number;
  lng: number;
  mag: number;
  place: string;
}

export interface FireItem {
  id: string;
  lat: number;
  lng: number;
  brightness: number;
  confidence: number;
  acqDate: string;
  source: string;
}

export interface DeforestationItem {
  id: string;
  lat: number;
  lng: number;
  confidence: number;
  alertDate: string;
  areaHectares: number;
  source: string;
}

// Generic multi-hazard marker (volcano, storm, flood, landslide, …). Rendered
// as a colour/size-coded blip reusing the earthquake marker vocabulary, so new
// hazard kinds can appear on the globe without new bespoke geometry.
export interface HazardMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  size: number; // base sphere radius in globe units
  kind: string;
}

interface GlobeViewProps {
  eqData: EqItem[];
  weatherData: WeatherPoint[];
  fireData: FireItem[];
  deforestationData: DeforestationItem[];
  /** Generic multi-hazard blips (volcano, storm, flood, …). Optional and
   *  additive: omit it and the globe renders exactly as before. */
  hazardData?: HazardMarker[];
  /** Optional Google Earth Engine XYZ tile template for a raster overlay. */
  geeTileUrlTemplate?: string;
  /** Overlay opacity 0..1 (default 0.6). */
  geeOpacity?: number;
  layers: {
    earthquakes: boolean;
    weather: boolean;
    fires: boolean;
    deforestation: boolean;
  };
  globeCenter: { lat: number; lng: number };
  targetCenter?: { lat: number; lng: number } | null;
  onEarthquakeClick: (eq: EqItem) => void;
  onFireClick: (f: FireItem) => void;
  onDeforestationClick: (d: DeforestationItem) => void;
  onHazardClick?: (id: string) => void;
  onCenterChange: (lat: number, lng: number) => void;
  onZoomChange: (distance: number) => void;
  cityData: Array<{ name: string; lat: number; lng: number }>;
  onCityClick: (name: string, lat: number, lng: number) => void;
  showCityLabels?: boolean;
  /** When true (default), the globe slowly drifts via OrbitControls autoRotate.
   *  Set to false while the user is actively piloting to pause ambient drift. */
  autoRotate?: boolean;
}

// ─── Geo math helpers ─────────────────────────────────────────────────────────

function latLngToVec3(
  lat: number,
  lng: number,
  radius = 1,
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -Math.sin(phi) * Math.cos(theta) * radius;
  const z = Math.sin(phi) * Math.sin(theta) * radius;
  const y = Math.cos(phi) * radius;
  return [x, y, z];
}

function tile2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

function tile2lon(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180;
}

function lat2tile(lat: number, z: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      2 ** z,
  );
}

function lon2tile(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

function createTilePatchGeometry(
  northLat: number,
  southLat: number,
  westLon: number,
  eastLon: number,
): THREE.BufferGeometry {
  const segs = 12;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const mercNorth = Math.log(
    Math.tan((northLat * Math.PI) / 180 / 2 + Math.PI / 4),
  );
  const mercSouth = Math.log(
    Math.tan((southLat * Math.PI) / 180 / 2 + Math.PI / 4),
  );

  for (let i = 0; i <= segs; i++) {
    for (let j = 0; j <= segs; j++) {
      const lat = northLat + (southLat - northLat) * (i / segs);
      const lon = westLon + (eastLon - westLon) * (j / segs);
      const [x, y, z] = latLngToVec3(lat, lon, 1.001);
      positions.push(x, y, z);
      const u = j / segs;
      const mercLat = Math.log(
        Math.tan((lat * Math.PI) / 180 / 2 + Math.PI / 4),
      );
      const v = (mercLat - mercSouth) / (mercNorth - mercSouth);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j;
      const b = a + segs + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// ─── Tile system ──────────────────────────────────────────────────────────────────
// TWO-LAYER MODEL (Google Maps style):
//   Layer 1: BASE (z=2, 16 tiles) — always present, never removed, renderOrder=10
//   Layer 2: DETAIL (z=3..8) — one zoom level at a time, renderOrder=20
// Detail tiles always paint over base. Only one detail zoom active at a time.
// Tiles load center-first (sorted by distance from camera center tile).

const BASE_ZOOM = 2;
const MIN_DETAIL_ZOOM = 3;
const MAX_DETAIL_ZOOM = 8;
const DETAIL_TILE_CACHE = 400;

function disposeTile(mesh: THREE.Mesh, group: THREE.Group) {
  mesh.geometry.dispose();
  (mesh.material as THREE.MeshBasicMaterial).map?.dispose();
  (mesh.material as THREE.MeshBasicMaterial).dispose();
  group.remove(mesh);
}

function TiledGlobe() {
  const groupRef = useRef<THREE.Group>(null!);
  const tilesRef = useRef<Map<string, THREE.Mesh | "loading">>(new Map());
  const baseTileKeysRef = useRef<Set<string>>(new Set());
  const activeDetailZoomRef = useRef<number>(-1);
  const zoomGenRef = useRef<Map<number, number>>(new Map());
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCleanupZoomRef = useRef<number>(-1);
  const frameCountRef = useRef(0);
  const baseTilesLoadedRef = useRef(false);
  const textureLoader = useRef(new THREE.TextureLoader());
  const { camera } = useThree();

  const getTileUrl = useCallback((z: number, x: number, y: number): string => {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  }, []);

  const getGen = useCallback((z: number): number => {
    return zoomGenRef.current.get(z) ?? 0;
  }, []);

  const bumpGen = useCallback((z: number): number => {
    const next = (zoomGenRef.current.get(z) ?? 0) + 1;
    zoomGenRef.current.set(z, next);
    return next;
  }, []);

  const removeDetailZoom = useCallback((z: number) => {
    if (!groupRef.current) return;
    const prefix = `${z}/`;
    for (const [key, mesh] of Array.from(tilesRef.current.entries())) {
      if (key.startsWith(prefix) && !baseTileKeysRef.current.has(key)) {
        if (mesh instanceof THREE.Mesh) {
          disposeTile(mesh, groupRef.current);
        }
        tilesRef.current.delete(key);
      }
    }
  }, []);

  const loadTile = useCallback(
    (tileZ: number, tx: number, ty: number, isBase = false) => {
      const key = `${tileZ}/${tx}/${ty}`;
      if (tilesRef.current.has(key)) return;
      tilesRef.current.set(key, "loading");

      const northLat = tile2lat(ty, tileZ);
      const southLat = tile2lat(ty + 1, tileZ);
      const westLon = tile2lon(tx, tileZ);
      const eastLon = tile2lon(tx + 1, tileZ);
      const url = getTileUrl(tileZ, tx, ty);
      const capturedGen = getGen(tileZ);

      textureLoader.current.load(
        url,
        (texture) => {
          if (!isBase && getGen(tileZ) !== capturedGen) {
            texture.dispose();
            tilesRef.current.delete(key);
            return;
          }
          if (!isBase && tileZ !== activeDetailZoomRef.current) {
            texture.dispose();
            tilesRef.current.delete(key);
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          const geom = createTilePatchGeometry(
            northLat,
            southLat,
            westLon,
            eastLon,
          );
          const mat = new THREE.MeshBasicMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: isBase ? -1 : -2,
            polygonOffsetUnits: isBase ? -1 : -2,
          });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.renderOrder = isBase ? 10 : 20;
          tilesRef.current.set(key, mesh);
          if (groupRef.current) groupRef.current.add(mesh);
        },
        undefined,
        () => {
          tilesRef.current.delete(key);
        },
      );
    },
    [getTileUrl, getGen],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only
  useEffect(() => {
    if (baseTilesLoadedRef.current) return;
    baseTilesLoadedRef.current = true;
    const n = 2 ** BASE_ZOOM;
    for (let ty = 0; ty < n; ty++) {
      for (let tx = 0; tx < n; tx++) {
        const k = `${BASE_ZOOM}/${tx}/${ty}`;
        baseTileKeysRef.current.add(k);
        loadTile(BASE_ZOOM, tx, ty, true);
      }
    }
  }, [loadTile]);

  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current !== null)
        clearTimeout(cleanupTimerRef.current);
    };
  }, []);

  useFrame(() => {
    frameCountRef.current++;
    if (frameCountRef.current % 8 !== 0) return;
    if (!groupRef.current) return;

    const dist = camera.position.length();

    let desiredDetail: number;
    if (dist >= 2.5) desiredDetail = -1;
    else if (dist >= 1.8) desiredDetail = 3;
    else if (dist >= 1.45) desiredDetail = 4;
    else if (dist >= 1.25) desiredDetail = 5;
    else if (dist >= 1.13) desiredDetail = 6;
    else if (dist >= 1.07) desiredDetail = 7;
    else desiredDetail = MAX_DETAIL_ZOOM;

    const prevDetail = activeDetailZoomRef.current;

    if (desiredDetail !== prevDetail) {
      if (cleanupTimerRef.current !== null) {
        clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }

      const isZoomingOut = desiredDetail < prevDetail || desiredDetail === -1;

      if (prevDetail > 0) {
        bumpGen(prevDetail);

        if (isZoomingOut) {
          // Zooming out: immediately remove ALL detail tiles with zoom > desiredDetail
          // (any higher-res tiles must not be visible at a lower zoom level)
          for (
            let z = desiredDetail > 0 ? desiredDetail + 1 : MIN_DETAIL_ZOOM;
            z <= MAX_DETAIL_ZOOM;
            z++
          ) {
            if (z !== desiredDetail) {
              bumpGen(z);
              removeDetailZoom(z);
            }
          }
          pendingCleanupZoomRef.current = -1;
        } else {
          pendingCleanupZoomRef.current = prevDetail;
          cleanupTimerRef.current = setTimeout(() => {
            cleanupTimerRef.current = null;
            if (pendingCleanupZoomRef.current > 0) {
              removeDetailZoom(pendingCleanupZoomRef.current);
              pendingCleanupZoomRef.current = -1;
            }
          }, 2500);
        }
      }

      activeDetailZoomRef.current = desiredDetail;
    }

    const activeZ = activeDetailZoomRef.current;
    if (activeZ > 0) {
      const camDir = camera.position.clone().normalize();
      const lat =
        90 - Math.acos(Math.max(-1, Math.min(1, camDir.y))) * (180 / Math.PI);
      let lng = Math.atan2(camDir.z, -camDir.x) * (180 / Math.PI) - 180;
      if (lng < -180) lng += 360;

      const maxTiles = 2 ** activeZ;
      const centerTileX = lon2tile(lng, activeZ);
      const centerTileY = lat2tile(lat, activeZ);

      const horizonAngleDeg =
        Math.asin(Math.min(1, 1 / dist)) * (180 / Math.PI);
      const fovHalfDeg = 25;
      const halfAngleDeg = Math.min(horizonAngleDeg, fovHalfDeg * 2.0);
      const tileDegSize = 360 / maxTiles;
      const tileRadius = Math.min(
        24,
        Math.ceil(halfAngleDeg / tileDegSize) + 2,
      );

      const candidates: Array<{ tx: number; ty: number; d: number }> = [];
      for (let dy = -tileRadius; dy <= tileRadius; dy++) {
        for (let dx = -tileRadius; dx <= tileRadius; dx++) {
          const tx = (((centerTileX + dx) % maxTiles) + maxTiles) % maxTiles;
          const ty = centerTileY + dy;
          if (ty < 0 || ty >= maxTiles) continue;
          const k = `${activeZ}/${tx}/${ty}`;
          if (!tilesRef.current.has(k)) {
            candidates.push({ tx, ty, d: Math.abs(dx) + Math.abs(dy) });
          }
        }
      }

      candidates.sort((a, b) => a.d - b.d);
      const loadLimit = 12;
      for (let i = 0; i < Math.min(candidates.length, loadLimit); i++) {
        loadTile(activeZ, candidates[i].tx, candidates[i].ty, false);
      }
    }

    let detailCount = 0;
    for (const key of tilesRef.current.keys()) {
      if (!baseTileKeysRef.current.has(key)) detailCount++;
    }
    if (detailCount > DETAIL_TILE_CACHE) {
      let evicted = 0;
      for (const [key, mesh] of Array.from(tilesRef.current.entries())) {
        if (baseTileKeysRef.current.has(key)) continue;
        const keyZ = Number.parseInt(key.split("/")[0], 10);
        if (keyZ === activeDetailZoomRef.current) continue;
        if (keyZ === pendingCleanupZoomRef.current) continue;
        if (mesh instanceof THREE.Mesh) disposeTile(mesh, groupRef.current);
        tilesRef.current.delete(key);
        evicted++;
        if (evicted >= 20) break;
      }
    }
  });

  return (
    <>
      <mesh renderOrder={0}>
        <sphereGeometry args={[0.998, 48, 48]} />
        <meshBasicMaterial color="#1a3050" />
      </mesh>
      <mesh renderOrder={1}>
        <sphereGeometry args={[1.0002, 32, 16, 0, Math.PI * 2, 0, 0.09]} />
        <meshBasicMaterial
          color="#003959"
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      </mesh>
      <mesh renderOrder={1} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[1.0002, 32, 16, 0, Math.PI * 2, 0, 0.09]} />
        <meshBasicMaterial color="#ddeeff" />
      </mesh>
      <group ref={groupRef} />
    </>
  );
}

// ─── GEE raster overlay (optional) ────────────────────────────────────────────
// Renders a Google Earth Engine XYZ tile template as a semi-transparent global
// overlay at a fixed low zoom (z=3, 64 tiles). Only mounts when a template is
// supplied, so it's a no-op when GEE isn't configured. depthTest keeps the far
// hemisphere correctly occluded by the base globe.

function RasterOverlay({
  template,
  opacity,
}: {
  template: string;
  opacity: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  // biome-ignore lint/correctness/useExhaustiveDependencies: opacity updated in a separate effect
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const loader = new THREE.TextureLoader();
    const z = 3;
    const n = 2 ** z;
    const meshes: THREE.Mesh[] = [];
    for (let ty = 0; ty < n; ty++) {
      for (let tx = 0; tx < n; tx++) {
        const url = template
          .replace("{z}", String(z))
          .replace("{x}", String(tx))
          .replace("{y}", String(ty));
        loader.load(
          url,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            const geom = createTilePatchGeometry(
              tile2lat(ty, z),
              tile2lat(ty + 1, z),
              tile2lon(tx, z),
              tile2lon(tx + 1, z),
            );
            const mat = new THREE.MeshBasicMaterial({
              map: tex,
              transparent: true,
              opacity,
              depthTest: true,
              depthWrite: false,
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.scale.setScalar(1.004); // float just above the base imagery
            mesh.renderOrder = 30;
            meshes.push(mesh);
            group.add(mesh);
          },
          undefined,
          () => {},
        );
      }
    }
    return () => {
      for (const m of meshes) {
        m.geometry.dispose();
        (m.material as THREE.MeshBasicMaterial).map?.dispose();
        (m.material as THREE.MeshBasicMaterial).dispose();
        group.remove(m);
      }
    };
  }, [template]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    for (const m of group.children) {
      const mat = (m as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
    }
  }, [opacity]);

  return <group ref={groupRef} />;
}

// ─── Three.js sprite labels (no HTML canvas overlay) ──────────────────────────
// Pure WebGL sprites rendered at renderOrder=9000 with depthTest=false.
// They never touch the tile render pipeline.

const labelTexCache = new Map<string, THREE.CanvasTexture>();

function makeLabelTexture(text: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = "bold 26px monospace";
  const textW = Math.ceil(ctx.measureText(text).width);
  canvas.width = textW + 16;
  canvas.height = 32;
  ctx.font = "bold 26px monospace";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.fillText(text, 8, 24);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function getCachedLabelTex(text: string, color: string): THREE.CanvasTexture {
  const k = `${text}|${color}`;
  if (!labelTexCache.has(k)) {
    labelTexCache.set(k, makeLabelTexture(text, color));
  }
  return labelTexCache.get(k)!;
}

function CityLabel({
  city,
}: { city: { name: string; lat: number; lng: number } }) {
  const text = city.name.toUpperCase();
  const [bx, by, bz] = latLngToVec3(city.lat, city.lng, 1.001);
  const texture = useMemo(() => getCachedLabelTex(text, "#00ffcc"), [text]);
  const aspect = texture.image
    ? (texture.image as HTMLCanvasElement).width /
      (texture.image as HTMLCanvasElement).height
    : 5;
  const sh = 0.007;
  const sw = sh * aspect;
  const norm = new THREE.Vector3(bx, by, bz).normalize();
  const east = new THREE.Vector3(0, 1, 0).cross(norm).normalize();
  const down = norm.clone().cross(east).normalize().negate();
  const baseOffset = east
    .clone()
    .multiplyScalar(sw * 0.6)
    .add(down.clone().multiplyScalar(sh * 0.5));
  const spriteRef = useRef<THREE.Sprite>(null!);
  const { camera } = useThree();
  useFrame(() => {
    if (!spriteRef.current) return;
    const cdist = camera.position.length();
    const scale = cdist / 2.5;
    spriteRef.current.position.set(
      bx + baseOffset.x * scale,
      by + baseOffset.y * scale,
      bz + baseOffset.z * scale,
    );
  });
  return (
    <sprite
      ref={spriteRef}
      position={[bx + baseOffset.x, by + baseOffset.y, bz + baseOffset.z]}
      scale={[sw, sh, 1]}
      renderOrder={9000}
    >
      <spriteMaterial
        map={texture}
        transparent
        alphaTest={0.01}
        depthWrite={false}
        depthTest={false}
        sizeAttenuation={false}
      />
    </sprite>
  );
}

// ─── City marker ──────────────────────────────────────────────────────────────

function CityMarker({
  lat,
  lng,
  onClick,
}: {
  name: string;
  lat: number;
  lng: number;
  onClick: () => void;
  visible: boolean;
}) {
  const [x, y, z] = latLngToVec3(lat, lng, 1.001);

  const pinTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 32, 32);
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 16, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#00ffcc";
    ctx.beginPath();
    ctx.arc(16, 16, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(16, 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16, 20);
    ctx.lineTo(16, 28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 16);
    ctx.lineTo(12, 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, 16);
    ctx.lineTo(28, 16);
    ctx.stroke();
    return new THREE.CanvasTexture(canvas);
  }, []);

  useEffect(() => () => pinTexture.dispose(), [pinTexture]);

  return (
    <group>
      <sprite position={[x, y, z]} scale={[0.013, 0.013, 1]} renderOrder={9000}>
        <spriteMaterial
          map={pinTexture}
          transparent
          depthWrite={false}
          depthTest={false}
          sizeAttenuation={false}
        />
      </sprite>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Three.js mesh */}
      <mesh
        position={[x, y, z]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function WeatherMarker({ point }: { point: WeatherPoint }) {
  const [x, y, z] = latLngToVec3(point.lat, point.lon, 1.003);
  const temp = point.temp;
  const color =
    temp < 0
      ? "#4488ff"
      : temp < 15
        ? "#00ffcc"
        : temp < 25
          ? "#ffff00"
          : "#ff4400";
  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[0.002, 5, 5]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}

// ─── Fire ember marker (pulsing red-orange glow) ──────────────────────────────

function FireEmber({
  fire,
  position,
  onClick,
}: {
  fire: FireItem;
  position: [number, number, number];
  onClick: () => void;
}) {
  const coreRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  // Confidence 0..1 → base size; brightness scales slightly
  const baseSize = 0.004 + Math.min(1, fire.confidence) * 0.006;
  const brightnessBoost = Math.min(1, fire.brightness / 400) * 0.002;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Pulse: sin-based scale + opacity flicker, phase-shifted per fire for variety
    const phase = (fire.lat * 13.7 + fire.lng * 7.3) % 6.283;
    const pulse = 0.7 + 0.3 * Math.sin(t * 3.2 + phase);
    if (coreRef.current) {
      const s = baseSize * pulse;
      coreRef.current.scale.set(s, s, s);
    }
    if (glowRef.current) {
      const gs = (baseSize + brightnessBoost) * (1.6 + 0.4 * pulse);
      glowRef.current.scale.set(gs, gs, gs);
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 + 0.18 * pulse;
    }
  });

  return (
    <group>
      {/* Pulsing glow halo */}
      <mesh ref={glowRef} position={position} renderOrder={70}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color="#ff5a1f"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      {/* Bright ember core */}
      <mesh ref={coreRef} position={position} renderOrder={71}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial
          color="#ffb347"
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      {/* Invisible hit target */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Three.js mesh */}
      <mesh
        position={position}
        onPointerDown={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[0.018, 6, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── Deforestation patch marker (fading green-to-brown disk) ──────────────────

function DeforestationPatch({
  item,
  position,
  onClick,
}: {
  item: DeforestationItem;
  position: [number, number, number];
  onClick: () => void;
}) {
  // Recency fade: parse alertDate (ISO) → days old → 0 (fresh, green) .. 1 (old, brown)
  const fade = useMemo(() => {
    const then = Date.parse(item.alertDate);
    if (Number.isNaN(then)) return 0.5;
    const days = (Date.now() - then) / 86_400_000;
    return Math.max(0, Math.min(1, days / 90));
  }, [item.alertDate]);

  // Green (recent) → brown (old), OKLCH-ish via hex lerp
  const green = new THREE.Color("#3a7d2c");
  const brown = new THREE.Color("#6b4a2b");
  const color = green.clone().lerp(brown, fade);
  // Patch size scales with areaHectares (clamped)
  const radius = 0.006 + Math.min(0.02, Math.sqrt(item.areaHectares) * 0.0015);

  // Orient disk flat against the globe surface
  const quat = useMemo(() => {
    const norm = new THREE.Vector3(...position).normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      norm,
    );
  }, [position]);

  return (
    <group>
      <mesh position={position} quaternion={quat} renderOrder={65}>
        <circleGeometry args={[radius, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      {/* Faint ring outline for definition */}
      <mesh position={position} quaternion={quat} renderOrder={66}>
        <ringGeometry args={[radius * 0.98, radius, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      {/* Invisible hit target */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Three.js mesh */}
      <mesh
        position={position}
        onPointerDown={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[Math.max(0.018, radius), 6, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── Generic hazard blip (volcano, storm, flood, landslide, …) ────────────────
// Reuses the earthquake marker vocabulary (glowing sphere + halo ring) but
// takes an explicit colour + size so any hazard kind can be plotted uniformly.

function HazardBlip({
  marker,
  position,
  onClick,
}: {
  marker: HazardMarker;
  position: [number, number, number];
  onClick: () => void;
}) {
  const [x, y, z] = position;
  const ringQuat = useMemo(() => {
    const norm = new THREE.Vector3(x, y, z).normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      norm,
    );
  }, [x, y, z]);

  return (
    <group>
      <mesh position={position} renderOrder={55}>
        <sphereGeometry args={[marker.size, 10, 10]} />
        <meshBasicMaterial
          color={marker.color}
          transparent
          opacity={0.6}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh position={position} quaternion={ringQuat} renderOrder={55}>
        <torusGeometry args={[marker.size * 2.1, marker.size * 0.28, 8, 24]} />
        <meshBasicMaterial
          color={marker.color}
          transparent
          opacity={0.3}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      {/* Invisible hit target */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Three.js mesh */}
      <mesh
        position={position}
        onPointerDown={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[Math.max(0.016, marker.size * 1.5), 6, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── Distinct per-hazard markers ──────────────────────────────────────────────
// Volcano / storm / flood get their own animated marker language so the globe
// reads at a glance; everything else falls back to HazardBlip. All are additive.

interface HazardBlipProps {
  marker: HazardMarker;
  position: [number, number, number];
  onClick: () => void;
}

// Shared invisible click target so every marker is easy to hit.
function HitTarget({
  position,
  size,
  onClick,
}: {
  position: [number, number, number];
  size: number;
  onClick: () => void;
}) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Three.js mesh
    <mesh
      position={position}
      onPointerDown={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <sphereGeometry args={[Math.max(0.016, size * 1.6), 6, 6]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

// Volcano: pulsing core + an outward eruption cone along the surface normal.
function VolcanoBlip({ marker, position, onClick }: HazardBlipProps) {
  const coreRef = useRef<THREE.Mesh>(null!);
  const size = marker.size;
  const normal = useMemo(
    () => new THREE.Vector3(...position).normalize(),
    [position],
  );
  const coneQuat = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normal,
      ),
    [normal],
  );
  const coneLen = size * 3;
  const conePos: [number, number, number] = [
    position[0] + normal.x * coneLen * 0.5,
    position[1] + normal.y * coneLen * 0.5,
    position[2] + normal.z * coneLen * 0.5,
  ];
  useFrame((s) => {
    if (coreRef.current) {
      const p = 0.8 + 0.35 * Math.sin(s.clock.elapsedTime * 3.4);
      coreRef.current.scale.setScalar(p);
    }
  });
  return (
    <group>
      <mesh ref={coreRef} position={position} renderOrder={57}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial
          color={marker.color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh position={conePos} quaternion={coneQuat} renderOrder={56}>
        <coneGeometry args={[size * 1.3, coneLen, 12, 1, true]} />
        <meshBasicMaterial
          color={marker.color}
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <HitTarget position={position} size={size} onClick={onClick} />
    </group>
  );
}

// Severe storm: bright core + a rotating spiral arc (swirl).
function StormBlip({ marker, position, onClick }: HazardBlipProps) {
  const armRef = useRef<THREE.Mesh>(null!);
  const size = marker.size;
  const quat = useMemo(() => {
    const n = new THREE.Vector3(...position).normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      n,
    );
  }, [position]);
  useFrame((s) => {
    if (armRef.current) armRef.current.rotation.z = s.clock.elapsedTime * 1.6;
  });
  return (
    <group>
      <mesh position={position} renderOrder={57}>
        <sphereGeometry args={[size * 0.55, 8, 8]} />
        <meshBasicMaterial
          color={marker.color}
          transparent
          opacity={0.95}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={armRef} position={position} quaternion={quat} renderOrder={56}>
        <torusGeometry args={[size * 1.8, size * 0.22, 6, 24, Math.PI * 1.4]} />
        <meshBasicMaterial
          color={marker.color}
          transparent
          opacity={0.6}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <HitTarget position={position} size={size} onClick={onClick} />
    </group>
  );
}

// Flood: core + two expanding-and-fading ripple rings.
function FloodBlip({ marker, position, onClick }: HazardBlipProps) {
  const r1 = useRef<THREE.Mesh>(null!);
  const r2 = useRef<THREE.Mesh>(null!);
  const size = marker.size;
  const quat = useMemo(() => {
    const n = new THREE.Vector3(...position).normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      n,
    );
  }, [position]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const drive = (ref: React.MutableRefObject<THREE.Mesh>, phase: number) => {
      if (!ref.current) return;
      const v = (t * 0.6 + phase) % 1;
      ref.current.scale.setScalar(0.5 + v * 2.6);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - v);
    };
    drive(r1, 0);
    drive(r2, 0.5);
  });
  return (
    <group>
      <mesh position={position} renderOrder={57}>
        <sphereGeometry args={[size * 0.5, 8, 8]} />
        <meshBasicMaterial
          color={marker.color}
          transparent
          opacity={0.95}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      {[r1, r2].map((ref, i) => (
        <mesh
          key={`ripple-${i === 0 ? "a" : "b"}`}
          ref={ref}
          position={position}
          quaternion={quat}
          renderOrder={55}
        >
          <ringGeometry args={[size * 0.88, size, 20]} />
          <meshBasicMaterial
            color={marker.color}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}
      <HitTarget position={position} size={size} onClick={onClick} />
    </group>
  );
}

// ─── Earth component ───────────────────────────────────────────────────────────

interface EarthProps extends Omit<GlobeViewProps, "globeCenter"> {
  initCenter: { lat: number; lng: number };
  cameraDistRef: React.MutableRefObject<number>;
}

function Earth({
  eqData,
  weatherData,
  fireData,
  deforestationData,
  hazardData,
  geeTileUrlTemplate,
  geeOpacity,
  layers,
  onEarthquakeClick,
  onFireClick,
  onDeforestationClick,
  onHazardClick,
  onCenterChange,
  onZoomChange,
  cityData,
  onCityClick,
  initCenter,
  targetCenter,
  cameraDistRef,
  showCityLabels: showCityLabelsProp = true,
}: EarthProps) {
  const { camera } = useThree();
  const animTargetRef = useRef<THREE.Vector3 | null>(null);
  const prevTargetRef = useRef<{ lat: number; lng: number } | null>(null);
  // Tracks the camera-facing direction for back-face culling of markers
  const cameraDirRef = useRef(new THREE.Vector3(0, 1, 0));

  // Helper: returns true if lat/lng is on the camera-facing hemisphere
  const isVisible = useCallback((lat: number, lng: number): boolean => {
    const [vx, vy, vz] = latLngToVec3(lat, lng, 1);
    const vec = new THREE.Vector3(vx, vy, vz).normalize();
    return vec.dot(cameraDirRef.current) > -0.1;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only
  useEffect(() => {
    const [x, y, z] = latLngToVec3(initCenter.lat, initCenter.lng, 4.5);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  }, []);

  useEffect(() => {
    if (!targetCenter) return;
    if (
      prevTargetRef.current?.lat === targetCenter.lat &&
      prevTargetRef.current?.lng === targetCenter.lng
    )
      return;
    prevTargetRef.current = { ...targetCenter };
    const [tx, ty, tz] = latLngToVec3(targetCenter.lat, targetCenter.lng, 1.35);
    animTargetRef.current = new THREE.Vector3(tx, ty, tz);
  }, [targetCenter]);

  useFrame(() => {
    if (animTargetRef.current) {
      camera.position.lerp(animTargetRef.current, 0.06);
      if (camera.position.distanceTo(animTargetRef.current) < 0.003) {
        camera.position.copy(animTargetRef.current);
        animTargetRef.current = null;
      }
    }
    camera.lookAt(0, 0, 0);
    const dist = camera.position.length();
    cameraDistRef.current = dist;
    onZoomChange(dist);
    const dir = camera.position.clone().normalize();
    // Keep camera direction for visibility culling
    cameraDirRef.current.copy(dir);
    const lat =
      90 - Math.acos(Math.max(-1, Math.min(1, dir.y))) * (180 / Math.PI);
    // Bug fix: normalize lng to [-180, 180]
    let lng = Math.atan2(dir.z, -dir.x) * (180 / Math.PI) - 180;
    if (lng < -180) lng += 360;
    onCenterChange(lat, lng);
  });

  const cameraDist = cameraDistRef.current;

  return (
    <>
      <TiledGlobe />

      {/* Optional GEE raster overlay */}
      {geeTileUrlTemplate && (
        <RasterOverlay
          template={geeTileUrlTemplate}
          opacity={geeOpacity ?? 0.6}
        />
      )}

      {/* Atmosphere */}
      <mesh renderOrder={20}>
        <sphereGeometry args={[1.01, 32, 32]} />
        <meshBasicMaterial
          color="#1a4a6e"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh renderOrder={20}>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshBasicMaterial
          color="#0a2a4e"
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ── EARTHQUAKES ── */}
      {layers.earthquakes &&
        eqData
          .filter((eq) => isVisible(eq.lat, eq.lng))
          .map((eq) => {
            const [x, y, z] = latLngToVec3(eq.lat, eq.lng, 1.003);
            const color =
              eq.mag >= 5 ? "#ff3300" : eq.mag >= 3 ? "#ff6600" : "#ffcc00";
            const size = Math.max(0.004, eq.mag * 0.004);
            return (
              <group key={`eq-${eq.lat}-${eq.lng}`}>
                <mesh position={[x, y, z]} renderOrder={50}>
                  <sphereGeometry args={[size, 8, 8]} />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.45}
                    depthTest={false}
                    depthWrite={false}
                  />
                </mesh>
                {(() => {
                  const eqNorm = new THREE.Vector3(x, y, z).normalize();
                  const eqQuat = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    eqNorm,
                  );
                  return (
                    <mesh
                      position={[x, y, z]}
                      quaternion={eqQuat}
                      renderOrder={50}
                    >
                      <torusGeometry args={[size * 2.2, size * 0.3, 8, 24]} />
                      <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.2}
                        depthTest={false}
                        depthWrite={false}
                      />
                    </mesh>
                  );
                })()}
                <mesh
                  position={[x, y, z]}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (!isVisible(eq.lat, eq.lng)) return;
                    onEarthquakeClick(eq);
                  }}
                >
                  <sphereGeometry
                    args={[Math.min(0.018, 0.012 * cameraDist), 6, 6]}
                  />
                  <meshBasicMaterial
                    transparent
                    opacity={0}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            );
          })}

      {/* ── FIRES (pulsing red-orange embers) ── */}
      {layers.fires &&
        fireData
          .filter((f) => isVisible(f.lat, f.lng))
          .map((f) => {
            const [x, y, z] = latLngToVec3(f.lat, f.lng, 1.004);
            return (
              <FireEmber
                key={`fire-${f.id}-${f.lat}-${f.lng}`}
                fire={f}
                position={[x, y, z]}
                onClick={() => onFireClick(f)}
              />
            );
          })}

      {/* ── DEFORESTATION (fading green-to-brown patches) ── */}
      {layers.deforestation &&
        deforestationData
          .filter((d) => isVisible(d.lat, d.lng))
          .map((d) => {
            const [x, y, z] = latLngToVec3(d.lat, d.lng, 1.0035);
            return (
              <DeforestationPatch
                key={`defor-${d.id}-${d.lat}-${d.lng}`}
                item={d}
                position={[x, y, z]}
                onClick={() => onDeforestationClick(d)}
              />
            );
          })}

      {/* ── MULTI-HAZARD BLIPS (volcano, storm, flood, landslide, …) ── */}
      {(hazardData ?? [])
        .filter((h) => isVisible(h.lat, h.lng))
        .map((h) => {
          const [x, y, z] = latLngToVec3(h.lat, h.lng, 1.0035);
          const props = {
            marker: h,
            position: [x, y, z] as [number, number, number],
            onClick: () => onHazardClick?.(h.id),
          };
          const key = `hz-${h.id}`;
          if (h.kind === "volcano") return <VolcanoBlip key={key} {...props} />;
          if (h.kind === "severeStorm")
            return <StormBlip key={key} {...props} />;
          if (h.kind === "flood") return <FloodBlip key={key} {...props} />;
          return <HazardBlip key={key} {...props} />;
        })}

      {/* ── WEATHER ── */}
      {layers.weather &&
        weatherData.map((w) => <WeatherMarker key={`w-${w.city}`} point={w} />)}

      {/* ── CITIES ── */}
      {cityData
        .filter((city) => isVisible(city.lat, city.lng))
        .map((city) => (
          <group key={`city-${city.name}`}>
            <CityMarker
              name={city.name}
              lat={city.lat}
              lng={city.lng}
              onClick={() => onCityClick(city.name, city.lat, city.lng)}
              visible={showCityLabelsProp}
            />
            {showCityLabelsProp && <CityLabel city={city} />}
          </group>
        ))}
    </>
  );
}

// ─── Globe Scene ───────────────────────────────────────────────────────────────

function GlobeScene(
  props: Omit<GlobeViewProps, "globeCenter"> & {
    initCenter: { lat: number; lng: number };
    cameraDistRef: React.MutableRefObject<number>;
  },
) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 3, 5]} intensity={1.0} />
      <Stars
        radius={300}
        depth={50}
        count={4000}
        factor={4}
        saturation={0}
        fade
        speed={0.3}
      />
      <Suspense fallback={null}>
        <Earth {...props} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        minDistance={1.02}
        maxDistance={4.5}
        rotateSpeed={0.45}
        zoomSpeed={0.9}
        autoRotate={props.autoRotate !== false}
        autoRotateSpeed={0.1}
      />
    </>
  );
}

// ─── Public export ─────────────────────────────────────────────────────────────

export default function GlobeView(props: GlobeViewProps) {
  const { globeCenter, ...rest } = props;
  const [loaded, setLoaded] = useState(false);
  const cameraDistRef = useRef(2.5);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={containerRef as unknown as React.RefObject<HTMLDivElement>}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(0,255,255,0.5)",
            fontSize: 10,
            fontFamily: "monospace",
            letterSpacing: "0.15em",
            background: "#050510",
            zIndex: 10,
          }}
        >
          INITIALIZING GLOBE...
        </div>
      )}
      <Canvas
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
        }}
        camera={{ fov: 45, near: 0.01, far: 1000 }}
        style={{ background: "#000008", touchAction: "none" }}
        eventSource={containerRef as React.RefObject<HTMLElement>}
        eventPrefix="offset"
        resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
      >
        <GlobeScene
          {...rest}
          initCenter={globeCenter}
          cameraDistRef={cameraDistRef}
        />
      </Canvas>
    </div>
  );
}
