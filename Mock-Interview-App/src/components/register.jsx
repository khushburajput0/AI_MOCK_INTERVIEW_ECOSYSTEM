import { useState } from "react";

function Register({ mode, onModeChange, onComplete }) {
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = "http://127.0.0.1:8000";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      let res;
      if (isRegister) {
        // backend expects full_name and target_role fields
        res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name: name, email, target_role: role, password }),
        });
      } else {
        // Note: removed accidental double-slash in your provided URL
        res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        // backend may send { detail: '...' } or { error: '...' }
        const message = data?.detail || data?.error || data?.message || "Request failed";
        throw new Error(message);
      }

      // If your backend returns a token, save it and pass user info to parent
      if (data?.token || data?.access_token) {
        const token = data.token || data.access_token;
        localStorage.setItem("authToken", token);
      }

      // Include form identity because the login API currently returns only a token.
      if (onComplete) {
        onComplete({
          ...data,
          full_name: data?.full_name || name,
          email: data?.email || email,
          target_role: data?.target_role || role,
        });
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`auth-page ${isRegister ? "auth-page-register" : "auth-page-login"}`}>
      <section className="auth-hero">
        <span className="eyebrow">
          {isRegister ? "Create your account" : "Welcome back"}
        </span>
        <h1>
          {isRegister
            ? "Start practicing smarter today"
            : "Continue your interview preparation"}
        </h1>
        <p>
          {isRegister
            ? "Build your profile once and unlock personalized interview questions, AI feedback reports, and progress tracking."
            : "Login to resume mock interviews, review feedback, and keep improving your confidence before the real interview."}
        </p>

        <div className="auth-benefits">
          <span>Personalized role practice</span>
          <span>AI feedback reports</span>
          <span>Progress dashboard</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-tabs" aria-label="Authentication options">
          <button
            className={isRegister ? "active" : ""}
            onClick={() => onModeChange("register")}
          >
            Register
          </button>
          <button
            className={!isRegister ? "active" : ""}
            onClick={() => onModeChange("login")}
          >
            Login
          </button>
        </div>

        {isRegister ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Full name
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              Email address
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Target role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a role
                </option>
                <option>Software Developer</option>
                <option>Data Analyst</option>
                <option>Product Manager</option>
                <option>HR Interview</option>
              </select>
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary auth-submit" type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create Account"}
            </button>
            <p className="auth-switch">
              Already registered?
              <button type="button" onClick={() => onModeChange("login")}>
                Login here
              </button>
            </p>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email address
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <div className="form-row">
              <label className="remember">
                <input type="checkbox" />
                Remember me
              </label>
              <button type="button" className="text-button">
                Forgot password?
              </button>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="primary auth-submit" type="submit" disabled={loading}>
              {loading ? "Logging in…" : "Login"}
            </button>
            <p className="auth-switch">
              New to MockMate AI?
              <button type="button" onClick={() => onModeChange("register")}>
                Create account
              </button>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}

export default Register;
