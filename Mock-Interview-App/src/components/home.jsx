import { useEffect, useState } from "react";

function Home({ user, onViewProfile, onOpenDashboard }) {
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const controller = new AbortController();
    const loadProfile = async () => {
      try {
        const res = await fetch("https://ai-mock-interview-ecosystem-21cm.onrender.com/profiles/me", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.full_name) {
          setProfileName(data.full_name);
        }
      } catch {
        // ignore fetch errors and keep the fallback name
      }
    };

    loadProfile();
    return () => controller.abort();
  }, []);

  const displayName =
    profileName ||
    user?.full_name ||
    user?.name ||
    user?.username ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "there";

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">AI mock interview practice</span>
          <h1>Ace your next interview with AI-powered practice</h1>
          <p>
            Welcome back, {displayName}. Practice realistic interviews with AI,
            get instant feedback on your answers, and boost your confidence for
            the real job.
          </p>

          <div className="buttons">
            <button className="primary" onClick={onOpenDashboard}>
              Start Mock Interview
            </button>
            <button className="secondary" onClick={onViewProfile}>
              View Profile
            </button>
          </div>
        </div>

        <aside className="hero-panel" aria-label="Quick actions and progress overview">
          <h2 className="hero-panel-heading">Give yourself an unfair advantage in interviews</h2>
          <div className="hero-panel-grid">
            <article className="panel-card">
              <span className="panel-tag">AI-Powered Interview Simulation</span>
              <h2>Live scenario practice</h2>
              <p>Answer role-specific questions and get instant feedback on each response.</p>
              <button className="panel-link" onClick={onOpenDashboard}>
                Get started
              </button>
            </article>
            <article className="panel-card panel-card-alt">
              <span className="panel-tag">Practice interviews with AI</span>
              <h2>Improve your confidence</h2>
              <p>Train with realistic mock rounds and review your strengths instantly.</p>
              <button className="panel-link" onClick={onOpenDashboard}>
                Start session
              </button>
            </article>
          </div>
        </aside>
      </section>

      <section className="home-stats" aria-label="Why choose MockMate">
        <article className="stat-card">
          <h3>Real interview simulation</h3>
          <p>Practice with role-specific questions designed to mirror real hiring rounds.</p>
        </article>
        <article className="stat-card">
          <h3>Instant AI feedback</h3>
          <p>Get performance insights on structure, clarity, confidence, and technical depth.</p>
        </article>
        <article className="stat-card">
          <h3>Track your progress</h3>
          <p>Review your readiness, stay consistent, and see how your interview confidence improves.</p>
        </article>
      </section>
    </main>
  );
}

export default Home;
