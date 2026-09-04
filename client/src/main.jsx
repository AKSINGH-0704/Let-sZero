import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installAmbientMotionPause } from "./lib/ambientMotion";
import { initGoogleAds } from "./lib/analytics/googleAds";
import { initAttribution } from "./lib/analytics/attribution";

// M32-A — see ambientMotion.js. Installed once at the entry point rather than
// from a component, so it is not tied to any route's mount lifecycle.
installAmbientMotionPause();

// M59 — the one and only Google tag initialisation, for the same reason: from
// the entry point, so no route mount can run it twice and SPA navigation cannot
// re-run it. It self-gates on consent and on being a production build, so this
// call is a no-op in dev, in test, and for any visitor who has not opted in.
initGoogleAds();

// M60 — capture the landing URL's advertising parameters before React renders,
// since a route can replace the URL. Self-gates on the same advertising consent
// the tag does, and writes nothing until it is granted.
initAttribution();

createRoot(document.getElementById("root")).render(<App />);
