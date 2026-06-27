import { useState } from "react";
import otpVerificationImage from "../assets/otp-verification.png";

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
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
<<<<<<< Updated upstream
  const [success, setSuccess] = useState("");
=======
  const [message, setMessage] = useState("");
  const [pendingVerification, setPendingVerification] = useState(null);
  const [otp, setOtp] = useState("");
  const [verificationMode, setVerificationMode] = useState(null);
>>>>>>> Stashed changes

  const API_BASE = "http://127.0.0.1:8000";
  const otpDigits = Array.from({ length: 6 }, (_, index) => otp[index] || "");

  const getMaskedEmail = (value) => {
    if (!value || !value.includes("@")) return value || "your email";

    const [namePart, domain] = value.split("@");
    const visibleStart = namePart.slice(0, 2);
    const visibleEnd = namePart.length > 4 ? namePart.slice(-2) : "";
    return `${visibleStart}${"*".repeat(Math.max(3, namePart.length - 4))}${visibleEnd}@${domain}`;
  };

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
<<<<<<< Updated upstream
    setSuccess("");
=======
    setMessage("");
>>>>>>> Stashed changes
    setLoading(true);

    try {
      let res;
      if (isRegister) {
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
<<<<<<< Updated upstream
        throw new Error(getErrorMessage(data));
=======
        // backend may send { detail: '...' } or { error: '...' }
        const message = data?.detail || data?.error || data?.message || "Request failed";
        if (!isRegister && res.status === 403 && message.toLowerCase().includes("not verified")) {
          setPendingVerification({ email });
          setVerificationMode("login");
          setOtp("");
          setMessage("A verification OTP has been sent to your email.");
          return;
        }
        throw new Error(message);
>>>>>>> Stashed changes
      }

      const extractToken = (obj) => {
        if (!obj) return null;
        return obj.token || obj.access_token || obj.access || obj.auth_token || obj.refresh;
      };

      let token = extractToken(data);

<<<<<<< Updated upstream
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
=======
      if (isRegister) {
        const registrationName = name?.trim() || data?.full_name || data?.name || data?.username || "";
        setPendingVerification({
          full_name: registrationName,
          username: registrationName,
          email: data?.email || email,
          target_role: data?.target_role || role,
        });
        setVerificationMode("register");
        setMessage("We sent a verification code to your email.");
        return;
>>>>>>> Stashed changes
      }

      if (token) {
        localStorage.setItem("authToken", token);
      }

      // Include form identity because the login API currently returns only a token.
      if (onComplete) {
        const displayName =
          pendingVerification?.full_name ||
          pendingVerification?.name ||
          pendingVerification?.username ||
          data?.full_name ||
          data?.name ||
          data?.username ||
          name;
        const fallbackUsername = displayName || email.split("@")[0] || "";

        onComplete({
          ...data,
          full_name: displayName,
          username: data?.username || displayName || fallbackUsername,
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

<<<<<<< Updated upstream
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
=======
  async function handleVerifyOtp(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingVerification.email, otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        const message = data?.detail || data?.error || data?.message || "Invalid verification code";
        throw new Error(message);
      }

      const token = data?.access_token || data?.token || data?.access;
      if (token) {
        localStorage.setItem("authToken", token);
      }

      if (onComplete) {
        onComplete(pendingVerification);
      }
    } catch (err) {
      setError(err.message || "Could not verify email");
>>>>>>> Stashed changes
    } finally {
      setLoading(false);
    }
  }

<<<<<<< Updated upstream
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
=======
  async function handleResendOtp() {
    setError("");
    setMessage("");
    setResending(true);

    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingVerification.email }),
      });
      const data = await res.json();

      if (!res.ok) {
        const message = data?.detail || data?.error || data?.message || "Could not resend code";
        throw new Error(message);
      }

      setMessage(data?.message || "A new verification code has been sent.");
    } catch (err) {
      setError(err.message || "Could not resend code");
    } finally {
      setResending(false);
    }
  }

  if (pendingVerification) {
    return (
      <main className="otp-page">
        <section className="otp-shell" aria-label="OTP verification">
          <div className="otp-illustration">
            <img
              src={otpVerificationImage}
              alt="OTP verification illustration"
            />
          </div>

          <form className="otp-card" onSubmit={handleVerifyOtp}>
            <h1>OTP Verification</h1>
            <p>
              Enter OTP Code sent to <span>{getMaskedEmail(pendingVerification.email)}</span>
            </p>

            <label className="otp-code-field" aria-label="Verification code">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength="6"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                autoComplete="one-time-code"
                autoFocus
                required
              />
              <span className="otp-boxes" aria-hidden="true">
                {otpDigits.map((digit, index) => (
                  <span className="otp-box" key={index}>
                    {digit}
                  </span>
                ))}
              </span>
            </label>

            {message && <p className="form-success otp-status">{message}</p>}
            {error && <p className="form-error otp-status">{error}</p>}

            <p className="otp-resend">
              Didn't receive OTP code?
              <button type="button" onClick={handleResendOtp} disabled={resending}>
                {resending ? "Sending..." : "Resend Code"}
              </button>
            </p>

            <button
              className="otp-submit"
              type="submit"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify & Proceed"}
            </button>

            <button
              className="otp-edit"
              type="button"
              onClick={() => {
                setPendingVerification(null);
                setVerificationMode(null);
                setOtp("");
                setMessage("");
                setError("");
                if (verificationMode) {
                  onModeChange(verificationMode);
                }
              }}
            >
              Edit email
            </button>
          </form>
        </section>
      </main>
    );
  }
>>>>>>> Stashed changes

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
