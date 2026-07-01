import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Timestamp = bigint;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface HttpRequestResult {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface FireDetection {
    id: string;
    lat: Latitude;
    lng: Longitude;
    source: string;
    brightness: number;
    acqDate: Timestamp;
    confidence: bigint;
}
export interface NoticedEvent {
    id: string;
    lat: Latitude;
    lng: Longitude;
    layer: ThreatLayer;
    summary: string;
    noticedAt: Timestamp;
    severity: Severity;
    payload: string;
    reason: NoticeReason;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface CycleStatus {
    lastFireFetchAt?: Timestamp;
    lastRunAt?: Timestamp;
    lastDeforestationFetchAt?: Timestamp;
    nextRunAt?: Timestamp;
    running: boolean;
}
export type Latitude = number;
export interface HttpHeader {
    value: string;
    name: string;
}
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface ThreatSnapshot {
    fires: Array<FireDetection>;
    fetchedAt: Timestamp;
    layer: ThreatLayer;
    deforestation: Array<DeforestationAlert>;
}
export interface TransformationInput {
    context: Uint8Array;
    response: HttpRequestResult;
}
export interface DeforestationAlert {
    id: string;
    lat: Latitude;
    lng: Longitude;
    alertDate: Timestamp;
    source: string;
    areaHectares: number;
    confidence: bigint;
}
export type Longitude = number;
export enum NoticeReason {
    newEvent = "newEvent",
    worsening = "worsening",
    escalating = "escalating",
    lingering = "lingering"
}
export enum Severity {
    low = "low",
    high = "high",
    severe = "severe",
    critical = "critical",
    moderate = "moderate"
}
export enum ThreatLayer {
    fire = "fire",
    deforestation = "deforestation"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    fetchDeforestation(): Promise<void>;
    fetchFires(): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    getCycleStatus(): Promise<CycleStatus>;
    getDeforestation(): Promise<Array<DeforestationAlert>>;
    getFires(): Promise<Array<FireDetection>>;
    getNoticedFeed(limit: bigint | null): Promise<Array<NoticedEvent>>;
    isCallerAdmin(): Promise<boolean>;
    runNoticingCycle(): Promise<void>;
    setFirmsApiKey(key: string): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}
