import React from "react";

function Feedback({ onDone }) {
  const raw = sessionStorage.getItem("latestFeedback");
  const data = raw ? JSON.parse(raw) : null;

  if (!data) {
    return (
      <main className="feedback">
        <h2>Feedback</h2>
        <p>No feedback available.</p>
        <button className="primary" onClick={() => onDone({ view: "home" })}>
          Back to Home
        </button>
      </main>
    );
  }

  const { overall_score, items } = data;

  return (
    <main className="feedback">
      <h2>Interview Feedback</h2>
      <div className="summary">
        <p>
          Overall Score: <strong>{overall_score ?? "N/A"}</strong>
        </p>
      </div>

      <div className="feedback-list">
        {items && items.length ? (
          items.map((it, idx) => (
            <div className="feedback-card" key={idx}>
              <h4>Question {idx + 1}</h4>
              <p className="q">{it.prompt}</p>
              <p className="a"><strong>Your answer:</strong> {it.user_text}</p>
              <p className="score"><strong>Score:</strong> {it.score ?? "-"}</p>
              <p className="comment"><strong>Feedback:</strong> {it.feedback_text ?? "-"}</p>
            </div>
          ))
        ) : (
          <p>No detailed feedback</p>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <button className="primary" onClick={() => onDone({ view: "home" })}>
          Back to Home
        </button>
      </div>
    </main>
  );
}

export default Feedback;
