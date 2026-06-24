function Home({ user, onViewProfile, onOpenDashboard }) {
  const displayName = user?.full_name || user?.name || user?.email || "there";

  return (
    <main className="home-page">
      <section className="home-hero">
        <div>
          <span className="eyebrow">Your practice dashboard</span>
          <h1>Welcome back, {displayName}</h1>
          <p>
            Pick up your interview preparation from here, review your latest
            performance, or start a fresh role-based mock round.
          </p>
          <div className="buttons">
            <button className="primary" onClick={onOpenDashboard}>Start Mock Interview</button>
            <button className="secondary" onClick={onViewProfile}>
              View Profile
            </button>
          </div>
        </div>

        <div className="readiness-panel">
          <span>Overall readiness</span>
          <strong>82%</strong>
          <div className="summary-meter">
            <span style={{ width: "82%" }}></span>
          </div>
          <p>Next focus: add measurable outcomes to project answers.</p>
        </div>
      </section>

      <section className="home-actions" aria-label="Recommended actions">
        <article className="home-action-card">
          <span className="card-icon">01</span>
          <h2>Continue Practice</h2>
          <p>Resume your latest system design and behavioral rounds.</p>
        </article>
        <article className="home-action-card">
          <span className="card-icon">02</span>
          <h2>Review Feedback</h2>
          <p>Check clarity, structure, confidence, and technical depth.</p>
        </article>
        <article className="home-action-card">
          <span className="card-icon">03</span>
          <h2>Update Profile</h2>
          <p>Keep your target role and candidate details ready.</p>
        </article>
      </section>
    </main>
  );
}

export default Home;
