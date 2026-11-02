import { useEffect, useRef } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import chapters from "virtual:tutorial-book";
import { TUTORIALS_ROUTE, chapterPath, chapterRoute } from "../content/routes";
import { TUTORIALS_DESCRIPTION, TUTORIALS_NAME, TUTORIALS_TITLE, chapterPageTitle } from "../content/site";
import type { RenderedChapter } from "../content/types";
import { renderMermaid } from "../lib/renderMermaid";
import { SiteHeader } from "../ui/SiteHeader";
import "./tutorials.css";

/** /tutorials/ shows the table of contents; /tutorials/<id>/ a chapter. */
export function TutorialPage() {
  const { chapterId } = useParams();
  const chapter = chapters.find((c) => c.id === chapterId);
  if (chapterId && !chapter) return <Navigate to={TUTORIALS_ROUTE} replace />;
  return (
    <>
      <SiteHeader />
      {chapter ? <ChapterView chapter={chapter} /> : <TableOfContents />}
    </>
  );
}

function TableOfContents() {
  useEffect(() => {
    document.title = TUTORIALS_TITLE;
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="wrap book">
      <header className="book-head">
        <p className="eyebrow">Tutorial</p>
        <h1 className="book-title">{TUTORIALS_NAME}</h1>
        <p className="book-lede">{TUTORIALS_DESCRIPTION}</p>
      </header>
      <ol className="chapter-list">
        {chapters.map((c) => (
          <li key={c.id} className="chapter-item">
            <span className="chapter-num">{String(c.number).padStart(2, "0")}</span>
            <div>
              <h2 className="chapter-item-title">
                <Link to={chapterRoute(c.id)}>{c.title}</Link>
              </h2>
              <p className="chapter-item-summary">{c.summary}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}

/**
 * Replaces each ```mermaid block in `root` with its rendered diagram. The code
 * block stays in the static HTML, so crawlers and failed renders show the source.
 * Blocks render one at a time: Mermaid's renderer is not safe to run concurrently.
 */
async function renderDiagrams(root: HTMLElement, cancelled: () => boolean) {
  for (const code of root.querySelectorAll<HTMLElement>("pre > code.language-mermaid")) {
    const result = await renderMermaid(code.textContent ?? "");
    if (cancelled()) return;
    const pre = code.parentElement!;
    if (!result.ok) {
      pre.dataset.error = result.error;
      continue;
    }
    const figure = document.createElement("figure");
    figure.className = "diagram";
    figure.innerHTML = result.svg; // sanitized by Mermaid's strict security level
    pre.replaceWith(figure);
  }
}

function ChapterView({ chapter }: { chapter: RenderedChapter }) {
  const { hash } = useLocation();
  const body = useRef<HTMLDivElement>(null);
  const prev = chapters[chapter.number - 2];
  const next = chapters[chapter.number];

  useEffect(() => {
    document.title = chapterPageTitle(chapter.title);
  }, [chapter]);

  // React resets the body's HTML when the chapter changes, so render on each change.
  useEffect(() => {
    let cancelled = false;
    if (body.current) void renderDiagrams(body.current, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [chapter]);

  // A new chapter starts at the top, unless the URL points at a section.
  useEffect(() => {
    const target = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [chapter, hash]);

  return (
    <div className="wrap reader">
      <aside className="reader-toc" aria-label="Chapters">
        <Link className="toc-book" to={TUTORIALS_ROUTE}>
          {TUTORIALS_NAME}
        </Link>
        <ol className="toc-chapters">
          {chapters.map((c) => (
            <li key={c.id}>
              <Link className="toc-chapter" to={chapterRoute(c.id)} aria-current={c.id === chapter.id ? "page" : undefined}>
                <span className="toc-num">{c.number}</span> {c.title}
              </Link>
              {c.id === chapter.id && (
                <ul className="toc-sections">
                  {c.sections.map((s) => (
                    // Hrefs resolve against <base> (the site root), so they carry the chapter path.
                    <li key={s.id}>
                      <a href={`${chapterPath(c.id)}#${s.id}`}>{s.title}</a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </aside>

      <main className="reader-main">
        <article>
          <p className="eyebrow">Chapter {chapter.number}</p>
          <h1 className="reader-title">{chapter.title}</h1>
          {/* Built from the repo's own Markdown at build time; raw HTML is rejected by the parser. */}
          <div className="prose" ref={body} dangerouslySetInnerHTML={{ __html: chapter.html }} />
        </article>

        <nav className="pager" aria-label="Chapter navigation">
          {prev ? (
            <Link className="pager-link" to={chapterRoute(prev.id)}>
              <span className="pager-dir">Previous</span>
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link className="pager-link pager-next" to={chapterRoute(next.id)}>
              <span className="pager-dir">Next</span>
              {next.title}
            </Link>
          ) : (
            <a className="pager-link pager-next" href="./">
              <span className="pager-dir">Done reading?</span>
              Practice with the question bank
            </a>
          )}
        </nav>
      </main>
    </div>
  );
}
