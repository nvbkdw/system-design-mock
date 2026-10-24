// Page metadata, JSON-LD structured data, crawler-visible fallback content,
// sitemap and robots.txt. Pure functions (no DOM, no Node APIs) used by the
// build plugin and unit tests.
import { GUIDE_STEPS, plainText } from "./guide";
import { PHASES, TOTAL_MINUTES } from "./phases";
import { questionPath } from "./routes";
import { HOME_TITLE, SITE_DESCRIPTION, SITE_NAME, questionPageTitle } from "./site";
import { CUSTOM_QUESTION_ID, type Question } from "./types";

type JsonLd = Record<string, unknown>;

export interface PageMeta {
  title: string;
  description: string;
  /** Path relative to the site root: "" for home, "q/<id>/" for a question. */
  path: string;
  ogType: "website" | "article";
  noindex?: boolean;
  jsonLd?: JsonLd;
  /** HTML placed inside #root for crawlers; React replaces it on load. */
  body: string;
}

// ---- helpers ---------------------------------------------------------------

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** JSON for a <script> tag; "<" is escaped so content can't close the tag. */
export const jsonForScript = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/** Shortens text to a word boundary, for meta descriptions (~160 chars). */
export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,.;:]+$/, "") + "…";
}

const absolute = (path: string, siteUrl?: string) => (siteUrl ? new URL(path, siteUrl).href : undefined);

const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);

const paragraphs = (text: string) =>
  text
    .split("\n\n")
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");

// ---- home ------------------------------------------------------------------

export function homeMeta(questions: readonly Question[], siteUrl?: string): PageMeta {
  const url = absolute("", siteUrl);
  const website = { "@type": "WebSite", "@id": `${url ?? ""}#website`, name: SITE_NAME, description: SITE_DESCRIPTION, url, inLanguage: "en" };
  const app = {
    "@type": "WebApplication",
    "@id": `${url ?? ""}#app`,
    name: SITE_NAME,
    url,
    description: SITE_DESCRIPTION,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: [
      `Question bank of ${questions.length} system design interview questions`,
      `${PHASES.length} interview phases with time budgets: ${PHASES.map((p) => `${p.title} (${p.minutes} min)`).join(", ")}`,
      "Timed mock interview mode with phase warnings",
      "Interviewer answers and probe areas for each question",
      "Architecture diagram canvas exported as Mermaid",
      "Markdown export with a feedback prompt for AI review",
    ],
  };
  const howTo = {
    "@type": "HowTo",
    name: "How to practice for a system design interview",
    description: `Practice a ${TOTAL_MINUTES}-minute system design interview with a structured, timed guide.`,
    totalTime: `PT${TOTAL_MINUTES}M`,
    step: GUIDE_STEPS.map((step, i) => ({ "@type": "HowToStep", position: i + 1, name: step.title, text: plainText(step.text) })),
  };
  const list = {
    "@type": "ItemList",
    name: "System design interview questions",
    numberOfItems: questions.length,
    itemListElement: questions.map((q, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: q.title,
      url: absolute(questionPath(q.id), siteUrl),
    })),
  };

  const body =
    `<main class="wrap prerender"><h1>${escapeHtml(SITE_NAME)}</h1><p>${escapeHtml(SITE_DESCRIPTION)}</p>` +
    `<h2>System design interview questions</h2><ul>` +
    questions.map((q) => `<li><a href="${questionPath(q.id)}">${escapeHtml(q.title)}</a> (${q.difficulty})</li>`).join("") +
    `</ul></main>`;

  return {
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    path: "",
    ogType: "website",
    jsonLd: { "@context": "https://schema.org", "@graph": [website, app, howTo, list] },
    body,
  };
}

// ---- questions -------------------------------------------------------------

export function questionDescription(q: Question): string {
  return truncate(`System design interview question (${q.difficulty}): ${q.statement}`);
}

export function questionMeta(q: Question, siteUrl?: string): PageMeta {
  if (q.id === CUSTOM_QUESTION_ID) {
    return {
      title: questionPageTitle(q.title),
      description: "Practice your own system design interview question with the same timed phases.",
      path: questionPath(q.id),
      ogType: "website",
      noindex: true,
      body: "",
    };
  }

  const url = absolute(questionPath(q.id), siteUrl);
  const home = absolute("", siteUrl);
  const description = questionDescription(q);
  const resource = {
    "@type": "LearningResource",
    "@id": `${url ?? ""}#question`,
    name: q.title,
    description,
    text: q.statement,
    url,
    inLanguage: "en",
    learningResourceType: "Practice problem",
    educationalUse: "System design interview practice",
    educationalLevel: capitalize(q.difficulty),
    teaches: "System design",
    about: { "@type": "Thing", name: "System design interview" },
    keywords: [...q.tags, "system design interview", "mock interview"].join(", "),
    timeRequired: `PT${TOTAL_MINUTES}M`,
    isAccessibleForFree: true,
    isPartOf: { "@type": "WebSite", "@id": `${home ?? ""}#website`, name: SITE_NAME, url: home },
    ...(q.author && { author: { "@type": "Person", name: q.author } }),
    hasPart: PHASES.map((phase, i) => ({
      "@type": "LearningResource",
      name: `${i + 1}. ${phase.title}`,
      description: phase.goal,
      timeRequired: `PT${phase.minutes}M`,
    })),
  };
  const breadcrumbs = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: home },
      { "@type": "ListItem", position: 2, name: q.title, item: url },
    ],
  };

  const body =
    `<main class="wrap prerender"><p class="eyebrow">System design interview question · ${escapeHtml(q.difficulty)} · ` +
    `${q.tags.map(escapeHtml).join(" · ")}</p><h1>${escapeHtml(q.title)}</h1>${paragraphs(q.statement)}` +
    `<h2>Practice it as a ${TOTAL_MINUTES}-minute mock interview</h2><ol>` +
    PHASES.map((p) => `<li>${escapeHtml(p.title)} (${p.minutes} min): ${escapeHtml(p.goal)}</li>`).join("") +
    `</ol><p><a href="./">More system design interview questions</a></p></main>`;

  return {
    title: questionPageTitle(q.title),
    description,
    path: questionPath(q.id),
    ogType: "article",
    jsonLd: { "@context": "https://schema.org", "@graph": [resource, breadcrumbs] },
    body,
  };
}

// ---- head tags -------------------------------------------------------------

/** Tags for <head>. `base` makes relative URLs resolve from the site root. */
export function renderHead(meta: PageMeta, base: string, siteUrl?: string): string {
  const url = absolute(meta.path, siteUrl);
  const tags = [
    `<base href="${escapeHtml(base)}" />`,
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    meta.noindex ? `<meta name="robots" content="noindex" />` : "",
    url && !meta.noindex ? `<link rel="canonical" href="${escapeHtml(url)}" />` : "",
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:type" content="${meta.ogType}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    url ? `<meta property="og:url" content="${escapeHtml(url)}" />` : "",
    `<meta property="og:locale" content="en_US" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  ];
  return tags.filter(Boolean).join("\n    ");
}

export const renderJsonLd = (meta: PageMeta) =>
  meta.jsonLd ? `<script type="application/ld+json">${jsonForScript(meta.jsonLd)}</script>` : "";

/**
 * Applies a page's metadata to the app's index.html:
 * - drops the template's <title> and description;
 * - puts <base> and the meta tags right after <meta charset> (which must stay
 *   in the first 1024 bytes) and before any relative URL;
 * - appends JSON-LD at the end of <head>;
 * - fills #root with the crawler fallback.
 */
export function applyPageMeta(html: string, meta: PageMeta, base: string, siteUrl?: string): string {
  const head = renderHead(meta, base, siteUrl);
  const cleaned = html.replace(/\s*<title>[\s\S]*?<\/title>/, "").replace(/\s*<meta name="description"[^>]*>/, "");
  const charset = cleaned.match(/<meta charset[^>]*>/);
  const withHead = charset
    ? cleaned.replace(charset[0], `${charset[0]}\n    ${head}`)
    : cleaned.replace(/<head>/, `<head>\n    ${head}`);
  const jsonLd = renderJsonLd(meta);
  return withHead
    .replace(/<\/head>/, jsonLd ? `  ${jsonLd}\n  </head>` : "</head>")
    .replace(/<div id="root"><\/div>/, `<div id="root">${meta.body}</div>`);
}

// ---- sitemap & robots -------------------------------------------------------

export function sitemap(questions: readonly Question[], siteUrl: string, lastmod: string): string {
  const urls = ["", ...questions.filter((q) => q.id !== CUSTOM_QUESTION_ID).map((q) => questionPath(q.id))];
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((path) => `  <url><loc>${escapeHtml(new URL(path, siteUrl).href)}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n") +
    `\n</urlset>\n`
  );
}

export function robotsTxt(siteUrl?: string): string {
  return `User-agent: *\nAllow: /\n` + (siteUrl ? `\nSitemap: ${new URL("sitemap.xml", siteUrl).href}\n` : "");
}
