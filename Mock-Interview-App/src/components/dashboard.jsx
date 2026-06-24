
import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

function Dashboard({ onCreateInterview, onStartInterview }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ title: "", job_role: "", job_description: "", years_experience: "", scheduled_at: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/interviews/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load");
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

  const openModal = () => {
    setForm({ title: "", job_role: "", job_description: "", years_experience: "", scheduled_at: new Date().toISOString().slice(0,16) });
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
      const payload = {
        title: form.title || form.job_role || "Interview",
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        job_role: form.job_role,
        job_description: form.job_description,
        years_experience: form.years_experience ? parseInt(form.years_experience, 10) : null,
      };

      const res = await fetch(`${API_BASE}/interviews/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || "Failed to create interview");
      }

      const data = await res.json();
      // navigate to interview page
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
      <h2>Dashboard</h2>
      <button className="primary" onClick={openModal}>
        + Add New
      </button>

      <section className="previous">
        <h3>Previous Mock Interview</h3>
        {loading ? (
          <p>Loading…</p>
        ) : list.length === 0 ? (
          <p>No previous interviews</p>
        ) : (
          <div className="cards">
            {list.map((it) => (
              <div className="card" key={it.id}>
                <h4>{it.job_role || it.title}</h4>
                <p>{it.job_description}</p>
                <p>Years: {it.years_experience ?? "-"}</p>
                <div className="actions">
                  <button onClick={() => onStartInterview(it)} className="primary">
                    Start
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Tell us more about your job interviewing</h3>
            <form onSubmit={handleSubmit}>
              <label>
                Job Role/Job Position
                <input name="job_role" value={form.job_role} onChange={handleChange} required />
              </label>
              <label>
                Job Description/Tech Stack (In Short)
                <textarea name="job_description" value={form.job_description} onChange={handleChange} />
              </label>
              <label>
                Years of experience
                <input name="years_experience" value={form.years_experience} onChange={handleChange} />
              </label>
              <label>
                Scheduled at
                <input name="scheduled_at" type="datetime-local" value={form.scheduled_at} onChange={handleChange} />
              </label>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="secondary">
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? "Starting…" : "Start Interview"}
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
