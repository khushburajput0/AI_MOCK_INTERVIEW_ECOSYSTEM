import { useState, useEffect, useRef } from "react";
import "./App.css";
import aiToolsImage from "./assets/ai-tools.webp";
import logo from "./assets/mock.jpg";
import interviewVisual from "./assets/p.webp";
import Home from "./components/home";
import Profile from "./components/profile";
import Register from "./components/register";
import Dashboard from "./components/dashboard";
import InterviewPage from "./components/interviewPage";
import Feedback from "./components/feedback";

const API_BASE = " http://127.0.0.1:8000";

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

const getDisplayName = (user) => {
  const rawName = user?.full_name || user?.name || user?.username || "";
  if (rawName && String(rawName).trim()) return String(rawName).trim();

  const email = user?.email || "";
  if (email.includes("@")) return email.split("@")[0];

  return "";
};

function App() {
  const [authMode, setAuthMode] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(localStorage.getItem("authToken"))
  );
  const [page, setPage] = useState(() =>
    localStorage.getItem("authToken") ? "home" : "landing"
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
    setIsAccountMenuOpen(false);
    scrollTop();
  };

  const goHome = () => {
    setPage(isAuthenticated ? "home" : "landing");
    setAuthMode(null);
    setIsAccountMenuOpen(false);
    scrollTop();
  };

  const handleGetStarted = () => {
    const token = localStorage.getItem("authToken");

    if (isAuthenticated || token) {
      setIsAuthenticated(true);
      setPage("home");
      setAuthMode(null);
      setIsAccountMenuOpen(false);
      scrollTop();
      return;
    }

    openAuthPage("register");
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

  const openDashboard = () => {
    if (!isAuthenticated) {
      openAuthPage("login");
      return;
    }

    setPage("dashboard");
    setAuthMode(null);
    setIsAccountMenuOpen(false);
    scrollTop();
  };

  const openFeedback = () => {
    if (!isAuthenticated) {
      openAuthPage("login");
      return;
    }

    setPage("feedback");
    setAuthMode(null);
    setIsAccountMenuOpen(false);
    scrollTop();
  };

  const openInterviewPage = (interview) => {
    setPage("interview");
    setAuthMode(null);
    setIsAccountMenuOpen(false);
    // store selected interview in state to pass to InterviewPage
    setCurrentUser((u) => u); // no-op to keep user
    // use sessionStorage to keep interview during navigation
    try {
      sessionStorage.setItem("currentInterview", JSON.stringify(interview));
    } catch {}
    scrollTop();
  };

  const handleAuthComplete = (data) => {
    const user = data?.user || data?.user_info || data?.profile || data;
    const displayName = getDisplayName(user) || getDisplayName(data) || "";
    const userInfo = {
      full_name:
        user?.full_name ||
        user?.name ||
        user?.username ||
        data?.full_name ||
        data?.name ||
        data?.username ||
        "",
      username: user?.username || data?.username || displayName,
      email: user?.email || data?.email || "",
      photo_url: user?.photo_url || user?.profile_photo || user?.avatar || "",
    };

    localStorage.setItem("authUser", JSON.stringify(userInfo));
    setCurrentUser(userInfo);
    setIsAuthenticated(true);
    setPage("home");
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

  const handleAccountDeleted = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsAccountMenuOpen(false);
    setPage("landing");
    setAuthMode(null);
    scrollTop();
  };

  const getUserInitial = () => {
    const displayName = getDisplayName(currentUser) || "U";
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
          {isAuthenticated ? (
            <>
              <li>
                <button className="nav-link-btn" type="button" onClick={goHome}>
                  Home
                </button>
              </li>
              <li>
                <button className="nav-link-btn" type="button" onClick={openDashboard}>
                  Scheduled Interview
                </button>
              </li>
              <li>
                <button className="nav-link-btn" type="button" onClick={openFeedback}>
                  Feedback
                </button>
              </li>
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
            </>
          ) : (
            <li>
              <button className="login-btn" onClick={() => openAuthPage("login")}>
                Login
              </button>
            </li>
          )}
        </ul>
      </nav>

      {page === "interview" && isAuthenticated ? (
        <div className="interview-nav-visual">
          <img src={interviewVisual} alt="Interview preparation" />
        </div>
      ) : null}

      {page === "profile" && isAuthenticated ? (
        <Profile user={currentUser} onAccountDeleted={handleAccountDeleted} />
      ) : authMode ? (
        <Register
          mode={authMode}
          onModeChange={setAuthMode}
          onComplete={handleAuthComplete}
        />
      ) : page === "home" && isAuthenticated ? (
        <Home user={currentUser} onViewProfile={openProfile} onOpenDashboard={openDashboard} />
      ) : page === "dashboard" && isAuthenticated ? (
        <Dashboard onCreateInterview={openInterviewPage} onStartInterview={openInterviewPage} />
      ) : page === "interview" && isAuthenticated ? (
        <InterviewPage
          onDone={(result) => {
            // result may be undefined (simple done) or { view: 'feedback', payload }
            if (result && result.view === "feedback") {
              setPage("feedback");
            } else {
              goHome();
            }
          }}
        />
      ) : page === "feedback" && isAuthenticated ? (
        <Feedback onDone={({ view }) => setPage(view || "home")} />
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
                  onClick={handleGetStarted}
                >
                  Get Started
                </button>
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

            <div className="hero-visual" aria-label="MockMate AI practice preview">
              <div className="hero-image-frame">
                <img
                  src={aiToolsImage}
                  alt="AI tools for mock interview preparation"
                  className="hero-main-image"
                />
              </div>
              <div className="floating-card floating-card-top">
                <span>AI Coach</span>
                <strong>Personalized questions ready</strong>
              </div>
              <div className="floating-card floating-card-bottom">
                <span>Progress</span>
                <strong>Confidence up 42%</strong>
              </div>
              <div className="visual-chip visual-chip-left">Role practice</div>
              <div className="visual-chip visual-chip-right">Fast feedback</div>
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
