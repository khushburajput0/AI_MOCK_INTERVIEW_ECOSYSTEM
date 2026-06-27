import { useState } from "react";

function Register({ mode, onModeChange, onComplete }) {
  const isRegister = mode === "register";
  const isForgotPassword = mode === "forgot-password";
  const isResetPassword = mode === "reset-password";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_BASE = "http://127.0.0.1:8000";

  const parseResponse = async (res) => {
    const text = await res.text();
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  };

  const getErrorMessage = (data, fallback = "Request failed") =>
    data?.detail || data?.error || data?.message || fallback;

  const switchMode = (nextMode) => {
    setError("");
    setSuccess("");
    if (nextMode !== "reset-password") {
      setResetToken("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
    onModeChange(nextMode);
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
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

      const data = await parseResponse(res);

      if (!res.ok) {
        throw new Error(getErrorMessage(data));
      }

      // If your backend returns a token, save it and pass user info to parent
      const extractToken = (obj) => {
        if (!obj) return null;
        return obj.token || obj.access_token || obj.access || obj.auth_token || obj.refresh;
      };

      let token = extractToken(data);

      // If registering and backend didn't return a token, try logging in to obtain one
      if (isRegister && !token) {
        try {
          const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const loginData = await parseResponse(loginRes);
          token = extractToken(loginData);
          // Some backends return { access: 'token' } or { access_token }
          if (!token && loginData?.data && typeof loginData.data === 'object') {
            token = extractToken(loginData.data);
          }
        } catch {
          // ignore - we will surface error below if token missing
        }
      }

      if (token) {
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

  async function handleForgotPassword(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await parseResponse(res);

      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Could not create reset token"));
      }

      const token = data?.reset_token || "";

      setResetToken(token);
      onModeChange("reset-password");
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!resetToken) {
      setError("Please request a password reset again.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, new_password: newPassword }),
      });
      const data = await parseResponse(res);

      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Could not reset password"));
      }

      setNewPassword("");
      setConfirmNewPassword("");
      setResetToken("");
      setSuccess(data?.message || "Password reset successfully. You can login with your new password.");
      onModeChange("login");
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  const heroLabel = isRegister
    ? "Create your account"
    : isForgotPassword
      ? "Recover your account"
      : isResetPassword
        ? "Set a new password"
        : "Welcome back";

  const heroTitle = isRegister
    ? "Start practicing smarter today"
    : isForgotPassword
      ? "Reset your MockMate password"
      : isResetPassword
        ? "Create a secure new password"
        : "Continue your interview preparation";

  const heroCopy = isRegister
    ? "Build your profile once and unlock personalized interview questions, AI feedback reports, and progress tracking."
    : isForgotPassword
      ? "Enter your account email to generate a password reset token, then use it to create a new password."
      : isResetPassword
        ? "Paste your reset token and choose a new password to get back to your mock interviews."
        : "Login to resume mock interviews, review feedback, and keep improving your confidence before the real interview.";

  return (
    <main className={`auth-page ${isRegister ? "auth-page-register" : "auth-page-login"}`}>
      <section className="auth-hero">
        <span className="eyebrow">{heroLabel}</span>
        <h1>{heroTitle}</h1>
        <p>{heroCopy}</p>

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
            onClick={() => switchMode("register")}
          >
            Register
          </button>
          <button
            className={!isRegister && !isForgotPassword && !isResetPassword ? "active" : ""}
            onClick={() => switchMode("login")}
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
              <button type="button" onClick={() => switchMode("login")}>
                Login here
              </button>
            </p>
          </form>
        ) : isForgotPassword ? (
          <form className="auth-form" onSubmit={handleForgotPassword}>
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
            {error && <p className="form-error">{error}</p>}
            {success && <p className="form-success">{success}</p>}
            <button className="primary auth-submit" type="submit" disabled={loading}>
              {loading ? "Creating token…" : "Create Reset Token"}
            </button>
            <p className="auth-switch">
              Remembered it?
              <button type="button" onClick={() => switchMode("login")}>
                Back to login
              </button>
            </p>
          </form>
        ) : isResetPassword ? (
          <form className="auth-form" onSubmit={handleResetPassword}>
            {success && <p className="form-success">{success}</p>}
            <label>
              New password
              <input
                type="password"
                placeholder="Enter a new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                placeholder="Confirm your new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary auth-submit" type="submit" disabled={loading}>
              {loading ? "Resetting…" : "Reset Password"}
            </button>
            <p className="auth-switch">
              Ready to continue?
              <button type="button" onClick={() => switchMode("login")}>
                Back to login
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
              <button
                type="button"
                className="text-button"
                onClick={() => switchMode("forgot-password")}
              >
                Forgot password?
              </button>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="primary auth-submit" type="submit" disabled={loading}>
              {loading ? "Logging in…" : "Login"}
            </button>
            <p className="auth-switch">
              New to MockMate AI?
              <button type="button" onClick={() => switchMode("register")}>
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
