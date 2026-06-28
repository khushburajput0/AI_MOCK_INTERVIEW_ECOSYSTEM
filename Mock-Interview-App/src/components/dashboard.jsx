
import { useEffect, useState } from "react";

const API_BASE = "https://ai-mock-interview-ecosystem-21cm.onrender.com";

function Dashboard({ onCreateInterview, onStartInterview }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ title: "", job_role: "", job_description: "", years_experience: "", scheduled_at: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/interviews/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error("Your session has expired. Please login again.");
          }
          throw new Error("Failed to load");
        }
        const data = await res.json();
        setList(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const formattedDate = (value) => {
    if (!value) return "—";
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const handleAuthFailure = (message) => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    alert(message || "Session expired. Please login again.");
    window.location.reload();
  };

  const upcomingCount = list.filter((item) => new Date(item.scheduled_at) > new Date()).length;
  const totalInterviews = list.length;
  const nextInterview = list
    .filter((item) => new Date(item.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0];

  const openModal = () => {
    setForm({ title: "", job_role: "", job_description: "", years_experience: "", scheduled_at: new Date().toISOString().slice(0, 16) });
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("authToken");
    try {
      if (!token) {
        throw new Error("Missing authentication token. Please login again.");
      }

      const payload = {
        title: form.title || form.job_role || "Interview",
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        job_role: form.job_role,
        job_description: form.job_description,
        years_experience: form.years_experience ? parseInt(form.years_experience, 10) : null,
      };

      const res = await fetch(`${API_BASE}/interviews/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          handleAuthFailure(err.detail || err.message || "Could not validate credentials");
          return;
        }
        throw new Error(err.detail || err.message || "Failed to create interview");
      }

      const data = await res.json();
      onCreateInterview(data);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create interview");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <div>
          <span className="page-tag">Interview Dashboard</span>
          <h2>Manage your practice sessions</h2>
          <p className="dashboard-copy">
            Track recent mock interviews, schedule new sessions, and jump into practice with a single click.
          </p>
        </div>

        <button className="primary dashboard-add-btn" onClick={openModal}>
          + Schedule Session
        </button>
      </div>

      <div className="dashboard-summary">
        <div className="summary-card">
          <span className="summary-label">Total sessions</span>
          <strong>{totalInterviews}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Upcoming sessions</span>
          <strong>{upcomingCount}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Next session</span>
          <strong>{nextInterview ? formattedDate(nextInterview.scheduled_at) : "None scheduled"}</strong>
        </div>
      </div>

      <section className="previous">
        <div className="section-heading">
          <div>
            <h3>Recent sessions</h3>
            <p>Review your latest mock interviews and continue practice when you're ready.</p>
          </div>
        </div>

        {loading ? (
          <p className="status-text">Loading interviews…</p>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <p>No mock interview sessions yet. Click “Schedule Session” to create your first practice run.</p>
          </div>
        ) : (
          <div className="cards">
            {list.map((it) => (
              <article className="card" key={it.id}>
                <div className="card-header">
                  <div>
                    <h4>{it.job_role || it.title}</h4>
                    <p className="card-meta">{formattedDate(it.scheduled_at)} · {it.years_experience ?? "—"} yrs exp</p>
                  </div>
                  <span className="status-pill">{new Date(it.scheduled_at) > new Date() ? "Upcoming" : "Completed"}</span>
                </div>

                <p className="card-description">{it.job_description || "No description provided."}</p>

                <div className="actions">
                  <button onClick={() => onStartInterview(it)} className="primary">
                    Start practice
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              <div>
                <h3>Schedule a new mock interview</h3>
                <p>Enter the role details and choose a time so you can practice with the right context.</p>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <label>
                Job role
                <input name="job_role" value={form.job_role} onChange={handleChange} required placeholder="e.g. Software Engineer" />
              </label>
              <label>
                Years of experience
                <input name="years_experience" type="number" min="0" value={form.years_experience} onChange={handleChange} placeholder="e.g. 3" />
              </label>
              <label className="full-width">
                Job description or tech stack
                <textarea name="job_description" value={form.job_description} onChange={handleChange} placeholder="Add a short summary of the role or technologies." />
              </label>
              <label>
                Scheduled time
                <input name="scheduled_at" type="datetime-local" value={form.scheduled_at} onChange={handleChange} />
              </label>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="secondary">
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? "Saving…" : "Save session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Dashboard;
