import { useEffect, useState } from "react";
import avatar from "../assets/mock.jpg";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function Profile({ onAccountDeleted }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const API_BASE = "http://127.0.0.1:8000";

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/profiles/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.detail || data?.error || "Failed to load profile");
        }

        const data = await res.json();

        // map fields from backend directly into profile state
        setProfile({
          full_name: data.full_name,
          email: data.email,
          total_mock_interviews: data.total_mock_interviews,
          average_score: data.average_score,
          best_score: data.best_score,
          account_created_at: data.account_created_at,
          latest_future_interview: data.latest_future_interview,
          avatar: data.avatar,
        });
      } catch (err) {
        setError(err.message || "Unable to fetch profile");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Delete your account permanently? This removes your profile, interviews, answers, feedback, and login identity."
    );

    if (!confirmed) return;

    const token = localStorage.getItem("authToken");
    if (!token) {
      setDeleteError("Not authenticated");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`${API_BASE}/profiles/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.error || "Failed to delete account");
      }

      onAccountDeleted?.();
    } catch (err) {
      setDeleteError(err.message || "Unable to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  const displayName = profile?.full_name || "Candidate";
  const displayEmail = profile?.email || "No email available";
  const profilePhoto = profile?.avatar;

  const stats = [
    {
      label: "Mock interviews completed",
      value: profile?.total_mock_interviews ?? "-",
      detail: "",
    },
    {
      label: "Average interview score",
      value: profile?.average_score != null ? `${profile.average_score}%` : "-",
      detail: "",
    },
    {
      label: "Best interview score",
      value: profile?.best_score != null ? `${profile.best_score}%` : "-",
      detail: "",
    },
    {
      label: "Latest interview date",
      value: profile?.latest_future_interview ? formatDate(profile.latest_future_interview) : "-",
      detail: "",
    },
  ];

  return (
    <main className="profile-page">
      <div className="profile-delete-bar">
        <button
          className="delete-account-btn"
          type="button"
          onClick={handleDeleteAccount}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete Account"}
        </button>
      </div>

      <section className="profile-header">
        <div className="profile-identity">
          <img src={profilePhoto || avatar} alt="User profile" className="profile-avatar" />
          <div>
            <span className="eyebrow">Candidate Profile</span>
            <h1>{displayName}</h1>
            <p>{displayEmail}</p>
          </div>
        </div>

        <div className="account-card">
          <span>Account created</span>
          <strong>{profile?.account_created_at ? formatDate(profile.account_created_at) : "-"}</strong>
        </div>
      </section>

      <section className="profile-stats" aria-label="Interview performance">
        {loading ? (
          <p>Loading profile…</p>
        ) : error ? (
          <p className="form-error">{error}</p>
        ) : (
          stats.map((stat) => (
            <article className="profile-stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <p>{stat.detail}</p>
            </article>
          ))
        )}
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
          <strong>{profile?.average_score != null ? `${profile.average_score}%` : "-"}</strong>
          <span>Overall readiness</span>
          <div className="summary-meter">
            <span style={{ width: profile?.average_score ? `${profile.average_score}%` : "0%" }}></span>
          </div>
        </div>
      </section>
      {deleteError ? <p className="form-error profile-delete-error">{deleteError}</p> : null}
    </main>
  );
}

export default Profile;
