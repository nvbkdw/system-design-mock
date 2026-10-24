import { Link } from "react-router-dom";
import { isCustom, questionNumber } from "../content/questions";
import { questionRoute } from "../content/routes";
import type { Question } from "../content/types";
import { STATUS_LABEL, type AnswerRecord, type Status } from "../lib/storage";
import { relativeTime } from "../lib/time";

const ACTION: Record<Status, string> = { new: "Start", draft: "Continue", done: "Review" };

interface QuestionCardProps {
  question: Question;
  record: AnswerRecord;
  status: Status;
}

export function QuestionCard({ question, record, status }: QuestionCardProps) {
  const custom = isCustom(question);
  const title = custom ? record.custom.title || question.title : question.title;
  const statement = custom
    ? record.custom.statement || "Paste a prompt from a real interview or a friend, then practice it with the same phases and timer."
    : question.statement;

  return (
    <li className={"card" + (custom ? " card-custom" : "")}>
      <div className="card-top">
        <span className="card-num">{custom ? "＋" : questionNumber(question)}</span>
        {!custom && <span className={`difficulty difficulty-${question.difficulty}`}>{question.difficulty}</span>}
        <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>
      </div>
      <h2 className="card-title">
        <Link to={questionRoute(question.id)} className="card-link">
          {title}
        </Link>
      </h2>
      <p className="card-statement">{statement}</p>
      <div className="card-bottom">
        <ul className="tags">
          {question.tags.map((tag) => (
            <li key={tag} className="tag">
              {tag}
            </li>
          ))}
        </ul>
        {record.updatedAt && <span className="card-meta">Edited {relativeTime(record.updatedAt)}</span>}
        <span className="card-action" aria-hidden="true">
          {ACTION[status]} →
        </span>
      </div>
    </li>
  );
}
