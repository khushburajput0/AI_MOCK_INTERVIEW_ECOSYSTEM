function Feedback({ onDone }) {
  const raw = sessionStorage.getItem("latestFeedback");
  const data = raw ? JSON.parse(raw) : null;

  if (!data) {
    return (
      <main className="feedback">
        <section className="feedback-empty">
          <span className="page-tag">Interview report</span>
          <h1>No feedback available</h1>
          <p>Complete a mock interview to generate a detailed performance report.</p>
          <button className="primary" onClick={() => onDone({ view: "home" })}>
            Back to Home
          </button>
        </section>
      </main>
    );
  }

  const { overall_score, items } = data;
  const feedbackItems = Array.isArray(items) ? items : [];
  const numericScore = Number(overall_score);
  const scoreValue = Number.isFinite(numericScore) ? Math.max(0, Math.min(100, numericScore)) : null;
  const answeredCount = feedbackItems.filter((item) => item.user_text).length;
  const averageQuestionScore = feedbackItems.length
    ? feedbackItems.reduce((sum, item) => {
        const itemScore = Number(item.score);
        return sum + (Number.isFinite(itemScore) ? itemScore : 0);
      }, 0) / feedbackItems.length
    : 0;

  return (
    <main className="feedback">
      <section className="feedback-hero">
        <div className="feedback-hero-copy">
          <span className="page-tag">Interview report</span>
          <h1>Performance Feedback</h1>
          <p>
            Review your answers, understand where you performed well, and use the question-by-question notes to improve your next attempt.
          </p>
        </div>

        <aside className="feedback-score-panel" aria-label="Overall score">
          <span>Overall score</span>
          <strong>{scoreValue ?? "N/A"}</strong>
          <div className="feedback-score-meter" aria-hidden="true">
            <span style={{ width: `${scoreValue ?? 0}%` }} />
          </div>
        </aside>
      </section>

      <section className="feedback-stats" aria-label="Feedback summary">
        <article>
          <span>Questions reviewed</span>
          <strong>{feedbackItems.length}</strong>
        </article>
        <article>
          <span>Answers captured</span>
          <strong>{answeredCount}</strong>
        </article>
        <article>
          <span>Avg. question score</span>
          <strong>{feedbackItems.length ? Math.round(averageQuestionScore) : "N/A"}</strong>
        </article>
      </section>

      <div className="feedback-list">
        <div className="feedback-section-heading">
          <h2>Question Review</h2>
          <p>Detailed notes for each answer in this mock interview.</p>
        </div>

        {feedbackItems.length ? (
          feedbackItems.map((it, idx) => (
            <div className="feedback-card" key={idx}>
              <div className="feedback-card-header">
                <div>
                  <span className="feedback-question-label">Question {idx + 1}</span>
                  <h3>{it.prompt || "Question prompt unavailable"}</h3>
                </div>
                <div className="feedback-card-score">
                  <strong>{it.score ?? "-"}</strong>
                  <span>Score</span>
                </div>
              </div>

              <div className="feedback-answer-block">
                <span>Your answer</span>
                <p>{it.user_text || "No answer transcript was captured."}</p>
              </div>

              <div className="feedback-note-block">
                <span>Feedback</span>
                <p>{it.feedback_text || "No detailed feedback was provided for this question."}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="feedback-muted">No detailed feedback is available for this interview.</p>
        )}
      </div>

      <div className="feedback-actions">
        <button className="primary" onClick={() => onDone({ view: "home" })}>
          Back to Home
        </button>
      </div>
    </main>
  );
}

export default Feedback;
