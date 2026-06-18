function Register({ mode, onModeChange, onComplete }) {
  const isRegister = mode === "register";
  const handleSubmit = (event) => {
    event.preventDefault();
    onComplete();
  };

  return (
    <main className="auth-page">
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
              <input type="text" placeholder="Enter your name" required />
            </label>
            <label>
              Email address
              <input type="email" placeholder="you@example.com" required />
            </label>
            <label>
              Target role
              <select defaultValue="" required>
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
              <input type="password" placeholder="Create a password" required />
            </label>
            <button className="primary auth-submit" type="submit">
              Create Account
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
              <input type="email" placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input type="password" placeholder="Enter your password" required />
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
            <button className="primary auth-submit" type="submit">
              Login
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
