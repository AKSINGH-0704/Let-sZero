import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installAmbientMotionPause } from "./lib/ambientMotion";

// M32-A — see ambientMotion.js. Installed once at the entry point rather than
// from a component, so it is not tied to any route's mount lifecycle.
installAmbientMotionPause();

createRoot(document.getElementById("root")).render(<App />);
