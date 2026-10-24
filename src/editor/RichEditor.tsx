// Rich-text editor for one phase, built on TipTap (ProseMirror). Markdown-style
// shortcuts come from StarterKit: "- ", "1. ", "### ", "> ", "```".
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useImperativeHandle, type Ref } from "react";
import "./editor.css";

export interface RichEditorHandle {
  focus(): void;
}

interface RichEditorProps {
  label: string;
  placeholder: string;
  initialHtml: string;
  /** Starter content for "Insert outline". */
  outline?: string;
  onChange(html: string): void;
  ref?: Ref<RichEditorHandle>;
}

type Tool = {
  id: string;
  label: string;
  title: string;
  run(editor: Editor): void;
  active?(editor: Editor): boolean;
};

const TOOL_GROUPS: Tool[][] = [
  [
    {
      id: "heading",
      label: "H",
      title: "Heading (### then space)",
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
      active: (e) => e.isActive("heading"),
    },
    { id: "bold", label: "B", title: "Bold (⌘B)", run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive("bold") },
    {
      id: "italic",
      label: "I",
      title: "Italic (⌘I)",
      run: (e) => e.chain().focus().toggleItalic().run(),
      active: (e) => e.isActive("italic"),
    },
    {
      id: "code",
      label: "code",
      title: "Inline code (⌘E)",
      run: (e) => e.chain().focus().toggleCode().run(),
      active: (e) => e.isActive("code"),
    },
  ],
  [
    {
      id: "bullets",
      label: "• list",
      title: "Bulleted list (- then space)",
      run: (e) => e.chain().focus().toggleBulletList().run(),
      active: (e) => e.isActive("bulletList"),
    },
    {
      id: "numbers",
      label: "1. list",
      title: "Numbered list (1. then space)",
      run: (e) => e.chain().focus().toggleOrderedList().run(),
      active: (e) => e.isActive("orderedList"),
    },
    {
      id: "quote",
      label: "quote",
      title: "Quote (> then space)",
      run: (e) => e.chain().focus().toggleBlockquote().run(),
      active: (e) => e.isActive("blockquote"),
    },
    {
      id: "codeBlock",
      label: "block",
      title: "Code block (``` then space)",
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
      active: (e) => e.isActive("codeBlock"),
    },
  ],
  [
    { id: "clear", label: "clear", title: "Clear formatting", run: (e) => e.chain().focus().unsetAllMarks().clearNodes().run() },
    { id: "undo", label: "undo", title: "Undo (⌘Z)", run: (e) => e.chain().focus().undo().run() },
  ],
];

const ALL_TOOLS = TOOL_GROUPS.flat();

export function RichEditor({ label, placeholder, initialHtml, outline, onChange, ref }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [3, 4] }, link: { openOnClick: false } }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml,
    editorProps: { attributes: { class: "editor", "aria-label": label, spellcheck: "true" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor }) => {
      const state: Record<string, boolean> = {};
      for (const tool of ALL_TOOLS) state[tool.id] = !!editor && !!tool.active?.(editor);
      return state;
    },
  });

  useImperativeHandle(ref, () => ({ focus: () => editor?.commands.focus("end") }), [editor]);

  function insertOutline() {
    if (!editor || !outline) return;
    if (editor.isEmpty) editor.chain().setContent(outline).focus("end").run();
    else editor.chain().focus("end").insertContent(outline).run();
  }

  return (
    <div className="editor-host">
      <div className="editor-toolbar" role="toolbar" aria-label={`${label} formatting`}>
        {TOOL_GROUPS.map((group, i) => (
          <span key={i} className="editor-group">
            {group.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className="editor-btn"
                title={tool.title}
                aria-label={tool.title}
                aria-pressed={tool.active ? !!active?.[tool.id] : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor && tool.run(editor)}
              >
                {tool.label}
              </button>
            ))}
          </span>
        ))}
        {outline && (
          <button type="button" className="editor-btn editor-action" onClick={insertOutline} title="Insert a starter outline for this phase">
            Insert outline
          </button>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
