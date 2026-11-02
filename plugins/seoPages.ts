// Vite plugin for search engines and link previews.
//
// Build: after Vite writes dist/, turns dist/index.html into one static page per
// route (home, q/<id>/, tutorials/, tutorials/<id>/), each with its own title,
// description, canonical URL, Open Graph tags, JSON-LD and crawler-visible
// content, plus sitemap.xml,
// robots.txt and 404.html. Every route is a real file, so GitHub Pages serves
// it directly. Dev: applies the same metadata to each route on the fly.
//
// Absolute URLs (canonical, sitemap) need SITE_URL, e.g.
// https://<user>.github.io/<repo>/. Without it, those parts are skipped.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { CUSTOM_QUESTION } from "../src/content/customQuestion";
import { TUTORIALS_PATH, chapterPath, questionPath } from "../src/content/routes";
import { applyPageMeta, chapterMeta, homeMeta, questionMeta, robotsTxt, sitemap, tutorialsMeta, type PageMeta } from "../src/content/seo";
import { SITE_NAME } from "../src/content/site";
import { loadQuestionBank, renderStatement } from "./questionBank";
import { loadRenderedBook } from "./tutorialBook";

function siteUrlFromEnv(): string | undefined {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) return undefined;
  return raw.endsWith("/") ? raw : raw + "/";
}

export function seoPages(): Plugin {
  let config: ResolvedConfig;
  const siteUrl = siteUrlFromEnv();

  function metaForPath(pathname: string): PageMeta {
    if (/^\/tutorials\/?$/.test(pathname)) return tutorialsMeta(loadRenderedBook(), siteUrl);
    const chapterMatch = pathname.match(/^\/tutorials\/([^/]+)\/?$/);
    const chapter = chapterMatch && loadRenderedBook().find((c) => c.id === chapterMatch[1]);
    if (chapter) return chapterMeta(chapter, siteUrl);

    const { questions } = loadQuestionBank();
    const match = pathname.match(/^\/q\/([^/]+)\/?$/);
    const question = match && [...questions, CUSTOM_QUESTION].find((q) => q.id === match[1]);
    return question ? questionMeta(question, siteUrl, renderStatement(question.statement)) : homeMeta(questions, siteUrl);
  }

  return {
    name: "seo-pages",
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.server) return html; // the build is handled in closeBundle
        const pathname = new URL(ctx.originalUrl ?? ctx.path, "http://dev").pathname;
        return applyPageMeta(html, metaForPath(pathname), "/", siteUrl);
      },
    },
    closeBundle() {
      if (config.command !== "build") return;
      const outDir = path.resolve(config.root, config.build.outDir);
      const template = readFileSync(path.join(outDir, "index.html"), "utf8");
      const { questions } = loadQuestionBank();
      const write = (file: string, content: string) => {
        mkdirSync(path.dirname(path.join(outDir, file)), { recursive: true });
        writeFileSync(path.join(outDir, file), content);
      };

      const home = homeMeta(questions, siteUrl);
      write("index.html", applyPageMeta(template, home, "./", siteUrl));
      for (const question of [...questions, CUSTOM_QUESTION]) {
        // q/<id>/index.html is two levels deep, so its <base> points two levels up.
        write(path.join(questionPath(question.id), "index.html"), applyPageMeta(template, questionMeta(question, siteUrl, renderStatement(question.statement)), "../../", siteUrl));
      }
      // tutorials/ is one level deep and tutorials/<id>/ two, like q/<id>/.
      const chapters = loadRenderedBook();
      write(path.join(TUTORIALS_PATH, "index.html"), applyPageMeta(template, tutorialsMeta(chapters, siteUrl), "../", siteUrl));
      for (const chapter of chapters) {
        write(path.join(chapterPath(chapter.id), "index.html"), applyPageMeta(template, chapterMeta(chapter, siteUrl), "../../", siteUrl));
      }
      write("robots.txt", robotsTxt(siteUrl));

      if (!siteUrl) {
        config.logger.warn("seo-pages: SITE_URL is not set; skipping canonical URLs, sitemap.xml and 404.html.");
        return;
      }
      write("sitemap.xml", sitemap(questions, siteUrl, new Date().toISOString().slice(0, 10), chapters));
      // GitHub Pages serves 404.html at any depth, so its <base> must be absolute.
      const notFound: PageMeta = { ...home, title: `Page not found · ${SITE_NAME}`, noindex: true, jsonLd: undefined };
      write("404.html", applyPageMeta(template, notFound, new URL(siteUrl).pathname, siteUrl));
      config.logger.info(`seo-pages: wrote ${questions.length + chapters.length + 3} pages, sitemap.xml, robots.txt and 404.html for ${siteUrl}`);
    },
  };
}
