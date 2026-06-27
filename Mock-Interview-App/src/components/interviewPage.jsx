import { useEffect, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

const normalizeQuestions = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.questions)) return payload.questions;
  if (Array.isArray(payload?.created)) return payload.created;
  return [];
};

function InterviewPage({ onDone }) {
  const [interview, setInterview] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("currentInterview");
      if (raw) setInterview(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!interview) return;
    async function loadQuestions() {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_BASE}/qa/interview/${interview.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const loadedQuestions = normalizeQuestions(data);
        if (loadedQuestions.length) {
          setQuestions(loadedQuestions);
          return;
        }
      }

      // if no questions, ask backend to generate
      const genRes = await fetch(`${API_BASE}/qa/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ interview_id: interview.id, job_role: interview.job_role || interview.title, job_description: interview.job_description || "", years_experience: interview.years_experience || 0 }),
      });
      if (genRes.ok) {
        const gen = await genRes.json();
        const generatedQuestions = normalizeQuestions(gen);
        if (generatedQuestions.length) {
          setQuestions(generatedQuestions);
          return;
        }

        // Fallback for APIs that generate successfully but do not return items.
        const res2 = await fetch(`${API_BASE}/qa/interview/${interview.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data2 = await res2.json();
        setQuestions(normalizeQuestions(data2));
      }
    }

    loadQuestions();
  }, [interview]);

  const handleEnable = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setEnabled(true);
    } catch (e) {
      console.error(e);
      alert("Unable to access camera/microphone");
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("SpeechRecognition is not supported in this browser");
      return;
    }
    const r = new SpeechRecognition();
    r.lang = "en-US";
    r.interimResults = false;
    r.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setTranscript(text);
    };
    r.onend = () => setListening(false);
    r.start();
    recognitionRef.current = r;
    setListening(true);
  };

  const stopListeningAndSubmit = async () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
    const q = questions[currentIndex];
    const token = localStorage.getItem("authToken");

    try {
      console.log("Submitting answer for question", q?.id, q?.prompt, "transcript:", transcript);
      const res = await fetch(`${API_BASE}/qa/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ interview_id: interview.id, question_id: q.id, user_text: transcript, confidence: null }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error("Answer submit failed", res.status, errBody);
      } else {
        const data = await res.json().catch(() => null);
        console.log("Answer submitted", data);
      }
    } catch (err) {
      console.error("Network error submitting answer:", err);
    } finally {
      setTranscript("");
      // Advance UI regardless of submit outcome
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        try {
          const res = await fetch(`${API_BASE}/qa/finalize/${interview.id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const j = await res.json();
            sessionStorage.setItem("latestFeedback", JSON.stringify(j));
            onDone({ view: "feedback", payload: j });
          } else {
            const errBody = await res.text().catch(() => "");
            console.error("Finalize failed", res.status, errBody);
            onDone({ view: "home" });
          }
        } catch (err) {
          console.error("Failed to finalize interview:", err);
          onDone({ view: "home" });
        }
      }
    }
  };

  const currentQuestion = questions[currentIndex];

  return (
    <main className="interview-page">
      <div className="interview-header">
        <div>
          <span className="page-tag">Mock interview</span>
          <h2>Let's Get Started</h2>
          <p className="page-subtitle">
            Practice in a realistic setting with webcam review, voice recording, and AI-powered feedback.
          </p>
        </div>

        {questions.length > 0 && (
          <div className="interview-summary">
            <div>
              <strong>{currentIndex + 1}</strong>
              <span>Current question</span>
            </div>
            <div>
              <strong>{questions.length}</strong>
              <span>Total questions</span>
            </div>
            <div>
              <strong>{enabled ? "Camera ready" : "Camera disabled"}</strong>
              <span>Video status</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid">
        <section className="details">
          <div className="details-header">
            <h3>Interview details</h3>
          </div>

          <div className="detail-row">
            <span>Role</span>
            <strong>{interview?.job_role || interview?.title || "N/A"}</strong>
          </div>
          <div className="detail-row">
            <span>Tech stack</span>
            <strong>{interview?.job_description || "Not provided"}</strong>
          </div>
          <div className="detail-row">
            <span>Experience level</span>
            <strong>{interview?.years_experience ? `${interview.years_experience} years` : "N/A"}</strong>
          </div>

          <div className="question-panel">
            {currentQuestion ? (
              <div className="question-card">
                <div className="question-card-header">
                  <div>
                    <h3>Question prompt</h3>
                    <p className="question-count">Question {currentIndex + 1} of {questions.length}</p>
                  </div>

                  <button
                    type="button"
                    className="primary"
                    onClick={() => (listening ? stopListeningAndSubmit() : startListening())}
                  >
                    {listening ? "Stop & Submit" : "Record Answer"}
                  </button>
                </div>

                <div className="question-text">{currentQuestion.prompt}</div>

                <div className="transcript-box">
                  {transcript ? transcript : <span className="transcript-placeholder">Your answer transcript will appear here after you record.</span>}
                </div>

                <div className="question-tabs">
                  {questions.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={idx === currentIndex ? "primary" : "secondary"}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      Question #{idx + 1}
                    </button>
                  ))}
                </div>
<<<<<<< Updated upstream
                <div style={{ marginTop: 18 }}>{currentQuestion.prompt || currentQuestion.question}</div>

                <div style={{ marginTop: 18 }}>
                  <button onClick={() => (listening ? stopListeningAndSubmit() : startListening())} className="primary">
                    {listening ? "Stop & Submit" : "Record Answer"}
                  </button>
                </div>
=======
>>>>>>> Stashed changes
              </div>
            ) : (
              <div className="question-card">
                <p>Preparing questions…</p>
              </div>
            )}
          </div>
        </section>

        <aside className="camera">
          <div className="camera-card">
            <div className="camera-card-header">
              <h3>Live camera preview</h3>
            </div>

            <div className="camera-placeholder">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            <div className="camera-meta">
              <p>Use a clean, quiet space and look directly at the camera for the best recording results.</p>
            </div>

            <div className="camera-actions">
              {!enabled ? (
                <button className="primary" onClick={handleEnable}>
                  Enable webcam & microphone
                </button>
              ) : (
                <button className="secondary" onClick={() => alert("Already enabled")}>Camera enabled</button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default InterviewPage;
