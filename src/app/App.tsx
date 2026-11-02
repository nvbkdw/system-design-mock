import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "../home/HomePage";

// The practice page carries the editor (TipTap/ProseMirror); load it on demand
// so the home page stays light.
const PracticePage = lazy(() => import("../practice/PracticePage").then((m) => ({ default: m.PracticePage })));
// The tutorial carries the chapter text; load it on demand too.
const TutorialPage = lazy(() => import("../tutorials/TutorialPage").then((m) => ({ default: m.TutorialPage })));

/**
 * Path URLs (…/q/<id>/, …/tutorials/<id>/). Every route is a static file generated at build time
 * (see plugins/seoPages.ts), so GitHub Pages serves refreshes and shared links
 * directly. `basename` is the site root, e.g. "/system-design-mock".
 */
export function App({ basename }: { basename: string }) {
  return (
    <BrowserRouter basename={basename}>
      <Suspense fallback={<p className="wrap loading">Loading…</p>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/q/:id" element={<PracticePage />} />
          <Route path="/tutorials" element={<TutorialPage />} />
          <Route path="/tutorials/:chapterId" element={<TutorialPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
