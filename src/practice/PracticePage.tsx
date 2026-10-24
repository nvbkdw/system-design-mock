import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { findQuestion } from "../content/questions";
import { PracticeSession } from "./PracticeSession";
import "./practice.css";

export function PracticePage() {
  const { id } = useParams();
  const question = findQuestion(id);
  // Bumped by "Clear answers" to remount the session with a fresh record.
  const [generation, setGeneration] = useState(0);

  useEffect(() => window.scrollTo(0, 0), [id]);

  if (!question) return <Navigate to="/" replace />;
  return (
    <PracticeSession
      key={`${question.id}:${generation}`}
      question={question}
      onCleared={() => setGeneration((n) => n + 1)}
    />
  );
}
