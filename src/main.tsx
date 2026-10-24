import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { questionPath } from "./content/routes";
import "./styles/global.css";
import "./ui/ui.css";

// Each page's <base> points at the site root, so it gives the router's basename
// at any page depth: "/system-design-mock/" on GitHub Pages, "/" in dev.
const root = new URL(document.baseURI).pathname;

// Links from the hash-routing era (…/#/q/<id>) move to the path URL, both on
// page load and when such a link is opened from within the site (a hash-only
// change doesn't reload the page, so the router is told via popstate).
function redirectLegacyHash(): boolean {
  const legacy = window.location.hash.match(/^#\/q\/([^/?#]+)/);
  if (legacy) window.history.replaceState(null, "", root + questionPath(legacy[1]));
  else if (window.location.hash.startsWith("#/")) window.history.replaceState(null, "", root);
  else return false;
  return true;
}
redirectLegacyHash();
window.addEventListener("hashchange", () => {
  if (redirectLegacyHash()) window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App basename={root.replace(/\/$/, "") || "/"} />
  </StrictMode>,
);
