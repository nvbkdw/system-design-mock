import { describe, expect, it } from "vitest";
import { CUSTOM_QUESTION } from "./customQuestion";
import { GUIDE_STEPS } from "./guide";
import { PHASES } from "./phases";
import { applyPageMeta, homeMeta, jsonForScript, questionDescription, questionMeta, renderHead, robotsTxt, sitemap, truncate } from "./seo";
import type { Question } from "./types";

const SITE = "https://example.github.io/repo/";
const question: Question = {
  id: "url-shortener",
  title: 'TinyURL "shortener"',
  tags: ["storage", "caching"],
  difficulty: "easy",
  statement: "Design a URL shortening service like TinyURL. Users submit a long URL and get back a short alias.\n\nIt must stay fast.",
  clarify: ["a", "b", "c"],
  probes: ["x", "y", "z"],
};
const TEMPLATE =
  '<!doctype html><html><head>\n<meta charset="utf-8" />\n<title>Old</title>\n<meta name="description" content="old" />\n' +
  '<script type="module" src="./assets/index.js"></script></head><body><div id="root"></div></body></html>';

const graph = (meta: { jsonLd?: Record<string, unknown> }) => (meta.jsonLd!["@graph"] as Record<string, unknown>[]);

describe("truncate", () => {
  it("cuts at a word boundary and keeps the result within the limit", () => {
    const text = "word ".repeat(60);
    const result = truncate(text, 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.endsWith("word…")).toBe(true);
    expect(truncate("short", 50)).toBe("short");
  });
});

describe("questionMeta", () => {
  it("builds title, description and canonical path from the question", () => {
    const meta = questionMeta(question, SITE);
    expect(meta.title).toBe('TinyURL "shortener" · System Design Interview Mock');
    expect(meta.description).toBe(questionDescription(question));
    expect(meta.description.startsWith("System design interview question (easy): Design a URL")).toBe(true);
    expect(meta.description.length).toBeLessThanOrEqual(160);
    expect(meta.path).toBe("q/url-shortener/");
  });

  it("describes the question as a LearningResource with the six phases, plus breadcrumbs", () => {
    const [resource, breadcrumbs] = graph(questionMeta(question, SITE));
    expect(resource).toMatchObject({
      "@type": "LearningResource",
      name: question.title,
      text: question.statement,
      url: SITE + "q/url-shortener/",
      educationalLevel: "Easy",
      timeRequired: "PT50M",
      keywords: "storage, caching, system design interview, mock interview",
    });
    expect((resource.hasPart as unknown[]).length).toBe(PHASES.length);
    expect(breadcrumbs).toMatchObject({ "@type": "BreadcrumbList" });
  });

  it("puts the statement in crawler-visible HTML, escaped", () => {
    const body = questionMeta(question, SITE).body;
    expect(body).toContain("<h1>TinyURL &quot;shortener&quot;</h1>");
    expect(body).toContain("<p>It must stay fast.</p>");
  });

  it("keeps the custom question out of search results", () => {
    const meta = questionMeta(CUSTOM_QUESTION, SITE);
    expect(meta.noindex).toBe(true);
    const head = renderHead(meta, "../../", SITE);
    expect(head).toContain('<meta name="robots" content="noindex" />');
    expect(head).not.toContain("canonical");
  });
});

describe("homeMeta", () => {
  it("publishes the site, the app, the practice guide and the question list", () => {
    const types = graph(homeMeta([question], SITE)).map((node) => node["@type"]);
    expect(types).toEqual(["WebSite", "WebApplication", "HowTo", "ItemList"]);
    const howTo = graph(homeMeta([question], SITE))[2];
    expect((howTo.step as unknown[]).length).toBe(GUIDE_STEPS.length);
    expect(JSON.stringify(howTo)).not.toContain("*"); // emphasis markers are stripped
    const list = graph(homeMeta([question], SITE))[3];
    expect(list.itemListElement).toEqual([{ "@type": "ListItem", position: 1, name: question.title, url: SITE + "q/url-shortener/" }]);
  });
});

describe("renderHead / applyPageMeta", () => {
  it("replaces the template title and description, keeping charset first and <base> before relative URLs", () => {
    const html = applyPageMeta(TEMPLATE, questionMeta(question, SITE), "../../", SITE);
    expect(html).not.toContain("<title>Old</title>");
    expect(html).not.toContain('content="old"');
    expect(html.indexOf("<meta charset")).toBeLessThan(html.indexOf("<base"));
    expect(html.indexOf("<meta charset")).toBeLessThan(1024);
    expect(html.indexOf('<base href="../../" />')).toBeLessThan(html.indexOf("./assets/index.js"));
    expect(html.indexOf("application/ld+json")).toBeGreaterThan(html.indexOf("./assets/index.js"));
    expect(html).toContain('<link rel="canonical" href="https://example.github.io/repo/q/url-shortener/" />');
    expect(html).toContain('<meta property="og:type" content="article" />');
    expect(html).toContain('<div id="root"><main class="wrap prerender">');
  });

  it("omits absolute URLs when the site URL is unknown", () => {
    const head = renderHead(questionMeta(question), "../../");
    expect(head).not.toContain("canonical");
    expect(head).not.toContain("og:url");
  });

  it("keeps JSON-LD from closing its script tag", () => {
    expect(jsonForScript({ text: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("sitemap and robots", () => {
  it("lists home and bank questions, not the custom question", () => {
    const xml = sitemap([question, CUSTOM_QUESTION], SITE, "2026-10-24");
    expect(xml).toContain("<loc>https://example.github.io/repo/</loc>");
    expect(xml).toContain("<loc>https://example.github.io/repo/q/url-shortener/</loc>");
    expect(xml).not.toContain("q/custom/");
    expect(robotsTxt(SITE)).toContain("Sitemap: https://example.github.io/repo/sitemap.xml");
    expect(robotsTxt()).not.toContain("Sitemap");
  });
});
