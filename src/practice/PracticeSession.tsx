import { useCallback, useEffect, useRef, useState } from "react";
import { PHASES, RUBRIC } from "../content/phases";
import { isCustom } from "../content/questions";
import type { Question } from "../content/types";
import { DiagramLauncher, DiagramPanel } from "../diagram/DiagramPanel";
import type { RichEditorHandle } from "../editor/RichEditor";
import { exportFilename, toMarkdown } from "../lib/markdown";
import { beep, unlockAudio } from "../lib/sound";
import { useMediaQuery } from "../lib/useMediaQuery";
import { usePrefs } from "../lib/usePrefs";
import { PhaseTimer } from "../timer/PhaseTimer";
import { Toast, type ToastMessage } from "../ui/Toast";
import { ExportDialog } from "./ExportDialog";
import { PhaseSection } from "./PhaseSection";
import { ProblemHeader } from "./ProblemHeader";
import { RecordStore, useRecordSlice } from "./RecordStore";
import { SelfReview } from "./SelfReview";
import { TopBar } from "./TopBar";

const AUTOSAVE_WHILE_RUNNING_MS = 5000;
const EXTRA_TIME_MS = 2 * 60_000;

function createSession(questionId: string) {
  // The store saves the timer's live timing; the timer starts from the saved timing.
  const holder: { timer?: PhaseTimer } = {};
  const store = new RecordStore(questionId, () => holder.timer!.serialize());
  const timer = (holder.timer = new PhaseTimer(PHASES, store.get().timing));
  return { store, timer };
}

interface PracticeSessionProps {
  question: Question;
  onCleared(): void;
}

export function PracticeSession({ question, onCleared }: PracticeSessionProps) {
  const [{ store, timer }] = useState(() => createSession(question.id));
  const [prefs, setPrefs] = usePrefs();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const editors = useRef<Record<string, RichEditorHandle | null>>({});
  const soundOn = useRef(prefs.sound);
  const customTitle = useRecordSlice(store, (r) => r.custom.title);
  const hasDiagram = useRecordSlice(store, (r) => r.diagram.nodes.length > 0);
  // Open by default when this question already has a diagram.
  const [diagramOpen, setDiagramOpen] = useState(hasDiagram);
  const wide = useMediaQuery("(min-width: 1100px)");
  const title = isCustom(question) ? customTitle || question.title : question.title;

  useEffect(() => {
    soundOn.current = prefs.sound;
  }, [prefs.sound]);

  useEffect(() => {
    document.title = `${title} · System Design Interview Mock`;
  }, [title]);

  const focusPhase = useCallback((index: number) => {
    const phase = PHASES[index];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`phase-${phase.id}`)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    editors.current[phase.id]?.focus();
  }, []);

  // Timer events: prompts, sounds and saves.
  useEffect(() => {
    const play = (count: number) => soundOn.current && beep(count);
    return timer.onEvent((event) => {
      switch (event.type) {
        case "phase":
          setToast(null);
          focusPhase(event.index);
          break;
        case "warning":
          play(1);
          setToast({ text: `One minute left in ${event.phase.title}.`, autoHideMs: 5000 });
          break;
        case "expire": {
          play(2);
          const next = PHASES[timer.index + 1];
          setToast({
            text: event.isLast
              ? `Time's up for ${event.phase.title}. Finish your sentence, then wrap up the interview.`
              : `Time's up for ${event.phase.title}. Close your current point and move on to ${next.title}.`,
            actions: [
              { label: event.isLast ? "Finish interview" : `Start ${next.short}`, primary: true, run: () => timer.next() },
              { label: "+2 min", run: () => timer.extend(EXTRA_TIME_MS) },
            ],
          });
          break;
        }
        case "complete":
          play(3);
          setToast({
            text: "Interview complete. Check the self-review, then export your answers.",
            actions: [
              { label: "Export .md", primary: true, run: () => setExportOpen(true) },
              { label: "Close", run: () => {} },
            ],
          });
          document.getElementById("self-review")?.scrollIntoView({ block: "start" });
          break;
      }
      store.flush();
    });
  }, [timer, store, focusPhase]);

  // Save timing periodically while running, and on every discrete change.
  useEffect(() => {
    let last = 0;
    return timer.subscribe(() => {
      if (timer.running && Date.now() - last < AUTOSAVE_WHILE_RUNNING_MS) return;
      last = Date.now();
      store.flush();
    });
  }, [timer, store]);

  useEffect(() => {
    const save = () => store.flush();
    const onVisibility = () => document.visibilityState === "hidden" && save();
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisibility);
      save();
      timer.dispose();
    };
  }, [store, timer]);

  const closeToast = useCallback(() => setToast(null), []);

  function setTimed(timed: boolean) {
    setPrefs({ timed });
    if (!timed) {
      timer.pause();
      setToast(null);
    }
  }

  function setSound(sound: boolean) {
    if (sound) unlockAudio();
    setPrefs({ sound });
  }

  function start() {
    unlockAudio();
    timer.start();
  }

  function clearAnswers() {
    timer.dispose();
    store.discard();
    onCleared();
  }

  function buildExport() {
    const record = store.snapshot();
    const custom = isCustom(question);
    return {
      filename: exportFilename(custom ? record.custom.title || "custom" : question.id),
      markdown: toMarkdown({
        question,
        title: custom ? record.custom.title || "Custom question" : question.title,
        statement: custom ? record.custom.statement : question.statement,
        record,
        timing: record.timing,
        phases: PHASES,
        rubric: RUBRIC,
      }),
    };
  }

  return (
    <>
      <TopBar
        timer={timer}
        timed={prefs.timed}
        sound={prefs.sound}
        onTimedChange={setTimed}
        onSoundChange={setSound}
        onStart={start}
        onReset={() => {
          setToast(null);
          timer.reset();
        }}
        onExport={() => setExportOpen(true)}
        diagramOpen={diagramOpen}
        onToggleDiagram={() => setDiagramOpen((open) => !open)}
      />
      <main className={"wrap practice" + (diagramOpen && wide ? " has-diagram" : "")}>
        <div className="practice-main">
          <ProblemHeader question={question} store={store} onClear={clearAnswers} />
          {!diagramOpen && <DiagramLauncher hasDiagram={hasDiagram} onOpen={() => setDiagramOpen(true)} />}
          {diagramOpen && !wide && <DiagramPanel store={store} docked={false} onClose={() => setDiagramOpen(false)} />}
          <div className="phases">
            {PHASES.map((phase, i) => (
              <PhaseSection
                key={phase.id}
                phase={phase}
                index={i}
                timer={timer}
                timed={prefs.timed}
                initialHtml={store.get().answers[phase.id] ?? ""}
                onChange={(html) => store.setAnswer(phase.id, html)}
                editorRef={(handle) => {
                  editors.current[phase.id] = handle;
                }}
              />
            ))}
          </div>
          <SelfReview question={question} store={store} timer={timer} onExport={() => setExportOpen(true)} />
        </div>
        {diagramOpen && wide && (
          <aside className="practice-aside">
            <DiagramPanel store={store} docked onClose={() => setDiagramOpen(false)} />
          </aside>
        )}
      </main>
      <Toast message={toast} onClose={closeToast} />
      {exportOpen && <ExportDialog build={buildExport} onClose={() => setExportOpen(false)} />}
    </>
  );
}
