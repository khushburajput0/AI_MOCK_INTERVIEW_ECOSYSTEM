import { useState, useEffect, useRef } from "react";
import "./App.css";
import logo from "./assets/mock.jpg";
import Profile from "./components/profile";
import Register from "./components/register";

const API_BASE = "http://127.0.0.1:8000";

const getStoredUser = () => {
  const storedUser = localStorage.getItem("authUser");

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("authUser");
    return null;
  }
};

function App() {
  const [authMode, setAuthMode] = useState(null);
  const [page, setPage] = useState("home");
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(localStorage.getItem("authToken"))
  );
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  const features = [
    {
      icon: "01",
      title: "Role-Based AI Questions",
      text: "Generate interview rounds for software, data, product, HR, and fresher roles in seconds.",
    },
    {
      icon: "02",
      title: "Instant Feedback",
      text: "Review clarity, confidence, structure, technical depth, and communication after every answer.",
    },
    {
      icon: "03",
      title: "Progress Report",
      text: "Track scores, identify weak areas, and follow a practical improvement plan before the real interview.",
    },
  ];

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const openAuthPage = (mode) => {
    setPage("auth");
    setAuthMode(mode);
    scrollTop();
  };

  const goHome = () => {
    setPage("home");
    setAuthMode(null);
    scrollTop();
  };

  const openProfile = () => {
    if (!isAuthenticated) {
      openAuthPage("login");
      return;
    }

    setPage("profile");
    setAuthMode(null);
    setIsAccountMenuOpen(false);
    scrollTop();
  };

  const handleAuthComplete = (data) => {
    const user = data?.user || data?.user_info || data?.profile || data;
    const userInfo = {
      full_name: user?.full_name || user?.name || data?.full_name || "",
      email: user?.email || data?.email || "",
      photo_url: user?.photo_url || user?.profile_photo || user?.avatar || "",
    };

    localStorage.setItem("authUser", JSON.stringify(userInfo));
    setCurrentUser(userInfo);
    setIsAuthenticated(true);
    setPage("profile");
    setAuthMode(null);
    setIsAccountMenuOpen(false);
    scrollTop();
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("authToken");

    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch (error) {
      console.error("Logout request failed", error);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsAccountMenuOpen(false);
      goHome();
    }
  };

  const getUserInitial = () => {
    const displayName =
      currentUser?.full_name || currentUser?.name || currentUser?.email || "U";
    return displayName.trim().charAt(0).toUpperCase() || "U";
  };

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handleClickOutside = (event) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAccountMenuOpen]);

  return (
    <div className="app">
      <nav className="navbar">
        <button className="logo-container logo-button" onClick={goHome}>
          <img src={logo} alt="MockMate AI logo" className="navbar-logo" />
          <h2>MockMate AI</h2>
        </button>

        <ul className="nav-links">
          <li>
            <button className="nav-link-btn" onClick={goHome}>
              Home
            </button>
          </li>
          <li>
            <a href="#features" onClick={goHome}>
              Features
            </a>
          </li>
          {isAuthenticated ? (
            <li className="account-menu" ref={accountMenuRef}>
              <button
                className="avatar-menu-button"
                onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
              >
                {currentUser?.photo_url ? (
                  <img
                    src={currentUser.photo_url}
                    alt=""
                    className="nav-avatar-img"
                  />
                ) : (
                  <span className="nav-avatar-initial">{getUserInitial()}</span>
                )}
              </button>
              {isAccountMenuOpen && (
                <div className="account-dropdown" role="menu">
                  <button type="button" onClick={openProfile} role="menuitem">
                    Visit Profile
                  </button>
                  <button type="button" onClick={handleLogout} role="menuitem">
                    Logout
                  </button>
                </div>
              )}
            </li>
          ) : (
            <li>
              <button className="login-btn" onClick={() => openAuthPage("login")}>
                Login
              </button>
            </li>
          )}
        </ul>
      </nav>

      {page === "profile" && isAuthenticated ? (
        <Profile user={currentUser} />
      ) : authMode ? (
        <Register
          mode={authMode}
          onModeChange={setAuthMode}
          onComplete={handleAuthComplete}
        />
      ) : (
        <>
          <section className="hero" id="home">
            <div className="hero-content">
              <span className="eyebrow">Interview practice, upgraded</span>
              <h1>AI Mock Interview Ecosystem</h1>
              <p>
                Practice realistic interviews, receive AI-powered feedback, and
                build the confidence to answer clearly under pressure.
              </p>
              <div className="buttons">
                <button
                  className="primary"
                  onClick={() => openAuthPage("register")}
                >
                  Get Started
                </button>
                <button className="secondary">Try Demo</button>
              </div>

              <div className="stats">
                <div>
                  <strong>120+</strong>
                  <span>Question sets</span>
                </div>
                <div>
                  <strong>5 min</strong>
                  <span>Feedback reports</span>
                </div>
                <div>
                  <strong>24/7</strong>
                  <span>Practice access</span>
                </div>
              </div>
            </div>

            <div className="hero-panel" aria-label="Interview feedback preview">
              <div className="panel-header">
                <span className="status-dot"></span>
                <span>Live Interview Session</span>
              </div>
              <div className="question-card">
                <small>Current question</small>
                <h3>
                  Tell me about a project where you solved a difficult problem.
                </h3>
              </div>
              <div className="score-row">
                <span>Clarity</span>
                <div className="meter">
                  <span style={{ width: "86%" }}></span>
                </div>
                <strong>86%</strong>
              </div>
              <div className="score-row">
                <span>Structure</span>
                <div className="meter">
                  <span style={{ width: "74%" }}></span>
                </div>
                <strong>74%</strong>
              </div>
              <p className="tip">
                Add a measurable result at the end of your answer to make it
                more convincing.
              </p>
            </div>
          </section>

          <section className="features" id="features">
            <span className="section-label">Features</span>
            <h2>Everything you need before the real interview</h2>
            <div className="cards">
              {features.map((feature) => (
                <div className="card" key={feature.title}>
                  <span className="card-icon">{feature.icon}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <footer>
        <p>© 2026 MockMate AI. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
