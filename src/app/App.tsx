import { lazy, Suspense, useLayoutEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HomePage } from "../home/HomePage";

// The practice page carries the editor (TipTap/ProseMirror); load it on demand
// so the home page stays light.
const PracticePage = lazy(() => import("../practice/PracticePage").then((m) => ({ default: m.PracticePage })));

/**
 * Keeps the home page at the site's bare URL (…/system-design-mock/, not …/#/).
 * An empty hash already maps to "/", so dropping "#/" from the address bar
 * leaves the router's state unchanged; history.state is kept for back/forward.
 */
function CleanHomeUrl() {
  // Keyed on every navigation, including a link to the page already open.
  const { pathname, key } = useLocation();
  useLayoutEffect(() => {
    if (pathname === "/" && window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
  }, [pathname, key]);
  return null;
}

// Hash routing (#/q/<id>) works on GitHub Pages without server rewrites.
export function App() {
  return (
    <HashRouter>
      <CleanHomeUrl />
      <Suspense fallback={<p className="wrap loading">Loading…</p>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/q/:id" element={<PracticePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
