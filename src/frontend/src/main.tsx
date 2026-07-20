import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// biome-ignore lint/style/noNonNullAssertion: #root is defined in index.html
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
