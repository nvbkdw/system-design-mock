import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "../home/HomePage";

// The practice page carries the editor (TipTap/ProseMirror); load it on demand
// so the home page stays light.
const PracticePage = lazy(() => import("../practice/PracticePage").then((m) => ({ default: m.PracticePage })));

// Hash routing (#/q/<id>) works on GitHub Pages without server rewrites.
export function App() {
  return (
    <HashRouter>
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
