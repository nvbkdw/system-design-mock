import { useEffect, useMemo, useState } from "react";
import { DIFFICULTIES } from "../content/questionFormat";
import { TOTAL_MINUTES } from "../content/phases";
import { ALL_QUESTIONS, QUESTION_BANK, isCustom } from "../content/questions";
import type { Difficulty } from "../content/types";
import { contributingUrl } from "../lib/repo";
import { loadRecord, questionStatus, type Status } from "../lib/storage";
import { PhaseStrip } from "../ui/PhaseStrip";
import { SiteBrand } from "../ui/SiteBrand";
import { PracticeGuide } from "./PracticeGuide";
import { QuestionCard } from "./QuestionCard";
import "./home.css";

type Filter<T extends string> = T | "all";

function loadEntries() {
  return ALL_QUESTIONS.map((question) => {
    const record = loadRecord(question.id);
    return { question, record, status: questionStatus(record) };
  });
}

const TAGS = [...new Set(QUESTION_BANK.flatMap((q) => q.tags))].sort();

export function HomePage() {
  const [entries, setEntries] = useState(loadEntries);
  const [tag, setTag] = useState<Filter<string>>("all");
  const [difficulty, setDifficulty] = useState<Filter<Difficulty>>("all");
  const [status, setStatus] = useState<Filter<Status>>("all");
  const [search, setSearch] = useState("");
  const contributeHref = contributingUrl();

  useEffect(() => {
    document.title = "System Design Interview Mock";
    // Progress may change in another tab.
    const refresh = () => setEntries(loadEntries());
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    return entries.filter(({ question, record, status: s }) => {
      const custom = isCustom(question);
      if (tag !== "all" && !question.tags.includes(tag)) return false;
      if (difficulty !== "all" && !custom && question.difficulty !== difficulty) return false;
      if (status !== "all" && s !== status) return false;
      if (!text) return true;
      return [question.title, question.statement, record.custom.title, ...question.tags].join(" ").toLowerCase().includes(text);
    });
  }, [entries, tag, difficulty, status, search]);

  const bank = entries.filter((e) => !isCustom(e.question));
  const done = bank.filter((e) => e.status === "done").length;
  const draft = bank.filter((e) => e.status === "draft").length;

  return (
    <>
      <header className="site-header">
        <div className="wrap header-inner">
          <SiteBrand />
          {contributeHref && (
            <a className="header-link" href={contributeHref}>
              Add a question
            </a>
          )}
        </div>
      </header>

      <main className="wrap">
        <section className="intro">
          <p className="eyebrow">Deliberate practice makes perfect</p>
          <h1 className="intro-title">Practice system design the way the interview runs.</h1>
          <div className="intro-lede">
            <p>
              A system design interview usually runs 60 minutes. After introductions and your questions at the end, about{" "}
              {TOTAL_MINUTES} minutes are left for the design itself. Knowing the material is only part of it. The rest is spending those
              minutes well: clarifying before drawing, estimating before scaling, and going deep where it matters.
            </p>
            <p>
              This tool recreates that session. Every question is split into the six phases an interviewer expects, each with a time
              budget, so you practice the structure and the pacing as well as the answer. However experienced you are, deliberate,
              repeated practice like this is what improves interview performance.
            </p>
          </div>
          <PhaseStrip />
          <p className="progress">
            {bank.length} questions · {done} completed · {draft} in progress
          </p>
        </section>

        <PracticeGuide />

        <section className="bank" aria-labelledby="bank-title">
          <div className="bank-head">
            <h2 id="bank-title" className="bank-title">
              Question bank
            </h2>
            <div className="filters">
              <input
                id="search"
                type="search"
                className="input"
                placeholder="Search questions"
                aria-label="Search questions"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                id="difficulty-filter"
                className="input"
                aria-label="Filter by difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Filter<Difficulty>)}
              >
                <option value="all">All levels</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d[0].toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
              <select
                id="status-filter"
                className="input"
                aria-label="Filter by progress"
                value={status}
                onChange={(e) => setStatus(e.target.value as Filter<Status>)}
              >
                <option value="all">All progress</option>
                <option value="new">Not started</option>
                <option value="draft">In progress</option>
                <option value="done">Completed</option>
              </select>
            </div>
          </div>

          <div className="chips" role="group" aria-label="Filter by topic">
            {["all", ...TAGS].map((t) => (
              <button key={t} type="button" className="chip" aria-pressed={tag === t} onClick={() => setTag(t)}>
                {t === "all" ? "All topics" : t}
              </button>
            ))}
          </div>

          <ol className="grid">
            {visible.map((entry) => (
              <QuestionCard key={entry.question.id} {...entry} />
            ))}
          </ol>
          {visible.length === 0 && <p className="empty">No questions match these filters.</p>}
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <p>Answers are saved in this browser only. Export them to keep a copy.</p>
          {contributeHref && <a href={contributeHref}>Contribute a question</a>}
        </div>
      </footer>
    </>
  );
}
