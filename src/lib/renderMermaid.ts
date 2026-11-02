// Renders Mermaid source to SVG (sequence preview, tutorial diagrams). Mermaid is large, so it
// is imported on first use and lands in its own chunk.
import type { Mermaid } from "mermaid";

export type RenderResult = { ok: true; svg: string } | { ok: false; error: string };

let loading: Promise<Mermaid> | null = null;
let count = 0;

function load(): Promise<Mermaid> {
  loading ??= import("mermaid").then(({ default: mermaid }) => {
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => css.getPropertyValue(name).trim();
    mermaid.initialize({
      startOnLoad: false,
      // Sanitizes labels: no HTML, scripts or click handlers from the source.
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "dark",
      fontFamily: getComputedStyle(document.body).fontFamily,
      themeVariables: {
        darkMode: true,
        background: token("--surface"),
        primaryColor: token("--surface"),
        primaryTextColor: token("--ink"),
        primaryBorderColor: token("--line"),
        lineColor: token("--muted"),
        textColor: token("--ink"),
        edgeLabelBackground: token("--surface"),
      },
    });
    return mermaid;
  });
  return loading;
}

/** The start of a Mermaid error; the rest is a parser trace. */
function message(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.split("\n").filter(Boolean).slice(0, 3).join("\n");
}

export async function renderMermaid(code: string): Promise<RenderResult> {
  try {
    const mermaid = await load();
    await mermaid.parse(code);
    const { svg } = await mermaid.render(`mermaid-preview-${++count}`, code);
    return { ok: true, svg };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}
