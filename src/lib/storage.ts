import { emptyDiagram, normalizeDiagram, type Diagram } from "../diagram/types";

// Per-browser persistence. localStorage can be missing or throw (private
// windows, blocked storage), so every access degrades to "nothing saved".
const PREFIX = "sd-mock:v1:";

export interface Timing {
  /** Milliseconds spent per phase id. */
  used: Record<string, number>;
  /** Extra milliseconds granted per phase id ("+2 min"). */
  extra: Record<string, number>;
  /** Index of the current phase. */
  index: number;
  completed: boolean;
}

export interface AnswerRecord {
  /** Editor HTML per phase id. */
  answers: Record<string, string>;
  rubric: Record<string, boolean>;
  /** Title and statement for the custom question. */
  custom: { title: string; statement: string };
  timing: Timing;
  /** One diagram per question, shared by all phases. */
  diagram: Diagram;
  updatedAt?: number;
}

export interface Prefs {
  timed: boolean;
  sound: boolean;
}

export const emptyTiming = (): Timing => ({ used: {}, extra: {}, index: 0, completed: false });

export const emptyRecord = (): AnswerRecord => ({
  answers: {},
  rubric: {},
  custom: { title: "", statement: "" },
  timing: emptyTiming(),
  diagram: emptyDiagram(),
});

function read<T>(key: string): Partial<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: answers stay in memory for this session.
  }
}

export function loadRecord(questionId: string): AnswerRecord {
  const saved = read<AnswerRecord>("answer:" + questionId);
  const record = emptyRecord();
  if (!saved) return record;
  return {
    answers: { ...record.answers, ...saved.answers },
    rubric: { ...record.rubric, ...saved.rubric },
    custom: { ...record.custom, ...saved.custom },
    timing: { ...record.timing, ...saved.timing },
    diagram: normalizeDiagram(saved.diagram),
    updatedAt: saved.updatedAt,
  };
}

export const saveRecord = (questionId: string, record: AnswerRecord) => write("answer:" + questionId, record);

export function clearRecord(questionId: string): void {
  try {
    localStorage.removeItem(PREFIX + "answer:" + questionId);
  } catch {
    // Nothing to clear.
  }
}

export const loadPrefs = (): Prefs => ({ timed: false, sound: true, ...read<Prefs>("prefs") });

export const savePrefs = (prefs: Prefs) => write("prefs", prefs);

export type Status = "new" | "draft" | "done";

export const STATUS_LABEL: Record<Status, string> = { new: "Not started", draft: "In progress", done: "Completed" };

export function questionStatus(record: AnswerRecord): Status {
  if (record.timing.completed) return "done";
  const started =
    Object.values(record.answers).some(Boolean) ||
    Object.values(record.rubric).some(Boolean) ||
    Object.values(record.timing.used).some((ms) => ms > 0) ||
    record.diagram.nodes.length > 0 ||
    !!record.custom.title;
  return started ? "draft" : "new";
}
