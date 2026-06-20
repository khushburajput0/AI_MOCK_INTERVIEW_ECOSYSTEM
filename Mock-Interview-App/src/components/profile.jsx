import avatar from "../assets/mock.jpg";

function Profile({ user }) {
  const displayName = user?.full_name || user?.name || "Candidate";
  const displayEmail = user?.email || "No email available";
  const profilePhoto = user?.photo_url || user?.profile_photo || user?.avatar;

  const stats = [
    {
      label: "Mock interviews completed",
      value: "18",
      detail: "6 completed this month",
    },
    {
      label: "Average interview score",
      value: "82%",
      detail: "Up 9% from first attempt",
    },
    {
      label: "Best interview score",
      value: "94%",
      detail: "Frontend Developer round",
    },
    {
      label: "Latest interview date",
      value: "18 Jun 2026",
      detail: "System design practice",
    },
  ];

  return (
    <main className="profile-page">
      <section className="profile-header">
        <div className="profile-identity">
          <img
            src={profilePhoto || avatar}
            alt="User profile"
            className="profile-avatar"
          />
          <div>
            <span className="eyebrow">Candidate Profile</span>
            <h1>{displayName}</h1>
            <p>{displayEmail}</p>
          </div>
        </div>

        <div className="account-card">
          <span>Account created</span>
          <strong>02 June 2026</strong>
        </div>
      </section>

      <section className="profile-stats" aria-label="Interview performance">
        {stats.map((stat) => (
          <article className="profile-stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <p>{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="performance-summary-card">
        <div>
          <span className="section-label">Performance Summary</span>
          <h2>Strong communication with room to sharpen technical depth</h2>
          <p>
            Your recent interviews show consistent improvement in confidence,
            answer structure, and clarity. Focus next on adding measurable
            project outcomes and deeper technical explanations for complex
            problem-solving questions.
          </p>
        </div>

        <div className="summary-score">
          <strong>82%</strong>
          <span>Overall readiness</span>
          <div className="summary-meter">
            <span style={{ width: "82%" }}></span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Profile;
