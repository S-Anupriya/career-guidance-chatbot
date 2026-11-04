import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { MarkdownMessage } from "./MarkdownMessage";
import { AuthScreen } from "./AuthScreen";
import { StudentDashboard } from "./StudentDashboard";
import { StudentProfile } from "./StudentProfile";
import ThoughtLine from "./components/ThoughtLine";

const API_URL = import.meta.env.VITE_API_URL || "";

type Student = {
  id: number;
  name: string;
  email: string;
  course?: string | null;
  institution?: string | null;
  graduation_year?: number | null;
  interests?: string[];
  skills?: string[];
  preferred_domains?: string[];
};

type ProfileData = {
  course: string;
  institution: string;
  graduation_year: number | null;
  interests: string[];
  skills: string[];
  preferred_domains: string[];
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message?: string | null;
};

type Navigation = "dashboard" | "chat" | "salaries" | "exams" | "profile";

function formatModelName(model: string): string {
  if (!model || model.toLowerCase().includes("no model") || model === "None") {
    return "Offline (No Local Model)";
  }

  const lower = model.toLowerCase();

  if (lower.includes("gemma")) return "Gemma 2B · Local";
  if (lower.includes("qwen")) return "Qwen 2.5 · Local";
  if (lower.includes("llama")) return "Llama 3 · Local";

  return model.split("/").pop()?.split(":")[0] || model;
}

function App() {
  const [student, setStudent] = useState<Student | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("careerpath_theme");
    return (saved === "light" || saved === "dark") ? saved : "light";
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [modelName, setModelName] = useState("AI Model · Local");
  const [backendStatus, setBackendStatus] = useState<"connected" | "offline">("connected");
  const [activeNav, setActiveNav] = useState<Navigation>("dashboard");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync theme to root DOM attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("careerpath_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Fetch previous conversations for logged in student
  const fetchConversations = useCallback(async () => {
    const token = sessionStorage.getItem("future_forge_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, []);

  // Validate saved login
  useEffect(() => {
    async function validateSavedLogin() {
      const token = sessionStorage.getItem("future_forge_token");

      if (!token) {
        setAuthChecked(true);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          sessionStorage.removeItem("future_forge_token");
          return;
        }

        const data = await response.json();
        setStudent(data.student);
      } catch {
        sessionStorage.removeItem("future_forge_token");
      } finally {
        setAuthChecked(true);
      }
    }

    validateSavedLogin();
  }, []);

  // Load conversations when student is active
  useEffect(() => {
    if (student) {
      fetchConversations();
    }
  }, [student, fetchConversations]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle successful login or registration
  function handleAuthenticated(token: string, studentData: Student) {
    sessionStorage.setItem("future_forge_token", token);
    setStudent(studentData);
    setActiveNav("dashboard");
  }

  // Logout
  function logout() {
    sessionStorage.removeItem("future_forge_token");
    setStudent(null);
    setMessages([]);
    setCurrentConversationId(null);
    setActiveNav("dashboard");
  }

  // Load a conversation
  async function loadConversation(conversationId: number) {
    const token = sessionStorage.getItem("future_forge_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentConversationId(data.id);
        setMessages(
          data.messages.map((m: any) => ({
            role: m.role,
            content: m.content
          }))
        );
        setActiveNav("chat");
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  }

  // Delete a conversation
  async function deleteConversation(e: React.MouseEvent, conversationId: number) {
    e.stopPropagation();
    const token = sessionStorage.getItem("future_forge_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }

  // Career suggestions
  const consultationDossiers = [
    {
      index: "01",
      topic: "DEGREE TRAJECTORIES",
      title: "Undergraduate Degree to Core Product vs IT Services",
      desc: "How to position a BCA, B.Tech, or B.Sc degree for high-growth tech roles versus campus mass placement drives.",
      prompt: "What are the most effective strategies for a fresher with a BCA or B.Tech degree in India to transition into high-growth product engineering roles instead of traditional mass-recruitment IT services?"
    },
    {
      index: "02",
      topic: "COMPENSATION BENCHMARKS",
      title: "Indian Fresher CTC Realities: Base vs Variable vs ESOPs",
      desc: "Realistic salary breakdowns across Tier-1, Tier-2, and Tier-3 engineering and MCA cohorts in 2025–26.",
      prompt: "Explain the realistic starting salary (CTC) benchmarks for freshers in India across Software Engineering, Data Science, and Analyst roles. Break down base pay versus inflated CTC components."
    },
    {
      index: "03",
      topic: "ADMISSIONS & ENTRANCE",
      title: "NIMCET vs GATE CS vs CAT: Preparation Milestones",
      desc: "Eligibility requirements, timeline sequencing, and cutoff percentile strategies for top Indian institutions.",
      prompt: "Give me an authoritative preparation roadmap comparing NIMCET for NIT MCA, GATE CS for M.Tech/PSUs, and CAT for MBA. What are the key eligibility criteria and timelines for Indian undergraduates?"
    },
    {
      index: "04",
      topic: "PUBLIC SECTOR ALTERNATIVES",
      title: "Central Government PSUs vs Private Sector Careers",
      desc: "Comparing stability, compensation trajectory, and work-life balance between SSC CGL, Banking, and Private Tech.",
      prompt: "How do central government career paths like SSC CGL and PSU appointments compare with private technology careers in India in terms of long-term stability, career progression, and total compensation?"
    }
  ];

  // Check backend health
  useEffect(() => {
    async function checkHealth() {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
          const data = await response.json();
          setBackendStatus("connected");
          setModelName(formatModelName(data.model));
        } else {
          setBackendStatus("offline");
        }
      } catch {
        setBackendStatus("offline");
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Streaming reply handler
  async function streamReply(history: Message[]) {
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const token = sessionStorage.getItem("future_forge_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: history,
          conversation_id: currentConversationId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setBackendStatus("connected");

      const conversationIdHeader = response.headers.get("X-Conversation-Id");
      if (conversationIdHeader) {
        const convId = parseInt(conversationIdHeader, 10);
        if (!isNaN(convId)) {
          setCurrentConversationId(convId);
        }
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (!reader) {
        throw new Error("No response body readable stream.");
      }

      setIsLoading(false);

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          if (
            updated.length > 0 &&
            updated[updated.length - 1].role === "assistant"
          ) {
            updated[updated.length - 1] = {
              role: "assistant",
              content: accumulated
            };
          }
          return updated;
        });
      }

      accumulated += decoder.decode();

      if (accumulated) {
        setMessages((prev) => {
          const updated = [...prev];
          if (
            updated.length > 0 &&
            updated[updated.length - 1].role === "assistant"
          ) {
            updated[updated.length - 1] = {
              role: "assistant",
              content: accumulated
            };
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("Chat streaming error:", error);
      setBackendStatus("offline");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Unable to connect to the local inference backend. Please ensure the FastAPI service is active on port 8000 and Ollama is running."
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      fetchConversations();
    }
  }

  // Send a chat message
  async function sendMessage(value = question) {
    const messageToSend = value.trim();
    if (!messageToSend || isLoading || isStreaming) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: messageToSend }
    ];

    setMessages(newMessages);
    setQuestion("");

    await streamReply(newMessages);
  }

  // Start fresh conversation with prompt
  async function startFreshConversation(prompt: string) {
    if (isLoading || isStreaming) return;

    setCurrentConversationId(null);
    setActiveNav("chat");

    const freshMessages: Message[] = [
      { role: "user", content: prompt }
    ];

    setMessages(freshMessages);
    setQuestion("");

    await streamReply(freshMessages);
  }

  function newChat() {
    if (isLoading || isStreaming) return;

    setCurrentConversationId(null);
    setMessages([]);
    setQuestion("");
    setActiveNav("chat");
  }

  // Navigation router
  function handleNavClick(target: Navigation) {
    if (isLoading || isStreaming) return;

    setActiveNav(target);

    if (target === "dashboard" || target === "profile") return;

    if (target === "salaries") {
      startFreshConversation(
        "What are the current starting salary benchmarks for freshers in India across Software, Data Science, Finance, and Government jobs?"
      );
    } else if (target === "exams") {
      startFreshConversation(
        "Give me a roadmap and preparation guide for top competitive entrance exams in India like NIMCET, GATE, CAT, and SSC CGL."
      );
    } else {
      setCurrentConversationId(null);
      setMessages([]);
      setQuestion("");
    }
  }

  // Save student profile
  async function saveStudentProfile(profile: ProfileData) {
    const token = sessionStorage.getItem("future_forge_token");

    if (!token) {
      throw new Error("Your login session has expired. Please sign in again.");
    }

    const response = await fetch(`${API_URL}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(profile)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.message || "Unable to update profile.");
    }

    setStudent(data.student);
    setActiveNav("dashboard");
  }

  return (
    <div className="app-shell">
      {/* Tactile paper texture layer (zero WebGL overhead) */}
      <div className="app-paper-texture" aria-hidden="true" />

      {!authChecked ? (
        <main className="auth-page">
          <section className="auth-card">
            <p>Loading CareerPath Advisory System...</p>
          </section>
        </main>
      ) : !student ? (
        <AuthScreen onAuthenticated={handleAuthenticated} />
      ) : (
        <div className="app-container">
          {/* Institutional Sidebar */}
          <aside className="sidebar">
            <div className="brand" onClick={() => handleNavClick("dashboard")} role="button" tabIndex={0}>
              <div className="brand-seal-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <line x1="12" y1="6" x2="16" y2="6" />
                  <line x1="12" y1="10" x2="16" y2="10" />
                </svg>
              </div>
              <div className="brand-text-block">
                <span className="brand-name">CareerPath</span>
                <span className="brand-edition">India Edition</span>
              </div>
            </div>

            <button
              className="new-chat-btn"
              onClick={newChat}
              disabled={isLoading || isStreaming}
            >
              <span>+</span> New Advisory Session
            </button>

            <div className="sidebar-section">
              <span className="section-title">NAVIGATION</span>

              <button
                className={`nav-item ${activeNav === "dashboard" ? "active" : ""}`}
                onClick={() => handleNavClick("dashboard")}
                disabled={isLoading || isStreaming}
              >
                <span className="nav-index">01</span>
                <span className="nav-label">Candidate Dossier</span>
              </button>

              <button
                className={`nav-item ${activeNav === "chat" && currentConversationId === null ? "active" : ""}`}
                onClick={() => handleNavClick("chat")}
                disabled={isLoading || isStreaming}
              >
                <span className="nav-index">02</span>
                <span className="nav-label">Direct Counselor</span>
              </button>

              <button
                className={`nav-item ${activeNav === "salaries" ? "active" : ""}`}
                onClick={() => handleNavClick("salaries")}
                disabled={isLoading || isStreaming}
              >
                <span className="nav-index">03</span>
                <span className="nav-label">CTC Benchmarks</span>
              </button>

              <button
                className={`nav-item ${activeNav === "exams" ? "active" : ""}`}
                onClick={() => handleNavClick("exams")}
                disabled={isLoading || isStreaming}
              >
                <span className="nav-index">04</span>
                <span className="nav-label">Entrance Exams</span>
              </button>

              <button
                className={`nav-item ${activeNav === "profile" ? "active" : ""}`}
                onClick={() => handleNavClick("profile")}
                disabled={isLoading || isStreaming}
              >
                <span className="nav-index">05</span>
                <span className="nav-label">Academic Profile</span>
              </button>
            </div>

            <div className="sidebar-section conversations-history">
              <div className="history-header">
                <span className="section-title">SAVED SESSIONS ({conversations.length})</span>
              </div>

              <div className="conversations-scroll">
                {conversations.length === 0 ? (
                  <p className="empty-history-text">No archived sessions.</p>
                ) : (
                  conversations.map((c) => (
                    <div
                      key={c.id}
                      className={`conversation-item ${
                        activeNav === "chat" && currentConversationId === c.id ? "active" : ""
                      }`}
                      onClick={() => loadConversation(c.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") loadConversation(c.id);
                      }}
                      title={c.title}
                    >
                      <span className="conv-indicator">•</span>
                      <span className="conv-title">{c.title}</span>
                      <button
                        type="button"
                        className="conv-delete-btn"
                        onClick={(e) => deleteConversation(e, c.id)}
                        title="Delete conversation"
                        aria-label="Delete conversation"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="sidebar-bottom">
              <div className="edition-badge">
                <span className="edition-dot" />
                <span>Pan-India Grounded Dataset</span>
              </div>

              <div className="user-profile">
                <div className="user-avatar">
                  {student.name.charAt(0).toUpperCase()}
                </div>

                <div className="user-details">
                  <p className="user-name">{student.name}</p>
                  <p className="user-sub">{student.course || "Candidate"}</p>
                </div>

                <button className="logout-btn" onClick={logout} title="Sign out">
                  Sign out
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Workspace */}
          <main className="main-content">
            <header className="topbar">
              <div className="topbar-left">
                <span
                  className={`status-indicator ${
                    backendStatus === "offline" ? "offline" : ""
                  }`}
                />
                <span className="status-label">
                  {backendStatus === "connected"
                    ? "GROUNDED ADVISORY ENGINE"
                    : "ENGINE DISCONNECTED"}
                </span>
              </div>

              <div className="topbar-right">
                <button
                  className="theme-toggle-btn"
                  onClick={toggleTheme}
                  title={`Switch to ${theme === "dark" ? "Editorial Light" : "Nocturne Dark"} mode`}
                >
                  <span className="theme-toggle-label">{theme === "dark" ? "Light Paper" : "Nocturne"}</span>
                </button>

                <div className="model-chip" title={modelName}>
                  <span className="chip-dot" />
                  <span className="chip-name">{modelName}</span>
                </div>
              </div>
            </header>

            {activeNav === "dashboard" ? (
              <StudentDashboard
                student={student}
                onEditProfile={() => setActiveNav("profile")}
                onOpenChat={(prompt) => {
                  setActiveNav("chat");
                  startFreshConversation(prompt);
                }}
              />
            ) : activeNav === "profile" ? (
              <StudentProfile
                student={student}
                onSave={saveStudentProfile}
                onBack={() => setActiveNav("dashboard")}
              />
            ) : (
              <>
                <section
                  className={`chat-viewport ${
                    messages.length === 0 ? "empty" : ""
                  }`}
                >
                  {messages.length === 0 ? (
                    <div className="consultation-dossier-hero">
                      <div className="hero-kicker-strip">
                        <span className="kicker-label">INTERACTIVE COUNSELING REPOSITORY</span>
                        <span className="kicker-ref">DISPATCH · ACADEMIC SESSION 2025–26</span>
                      </div>

                      <div className="hero-editorial-split">
                        <div className="hero-editorial-left">
                          <h1 className="hero-editorial-title">
                            Direct Inquiry with Your Career Advisor.
                          </h1>
                          <p className="hero-editorial-lead">
                            Formulate queries regarding degree trajectories, placement realities, starting CTC breakdowns, and competitive entrance timelines.
                          </p>
                          <div className="hero-candidate-badge">
                            <span className="badge-bullet">Candidate:</span>
                            <strong>{student.name}</strong> ({student.course || "Degree Unset"} · {student.institution || "College Unset"})
                          </div>
                        </div>

                        <div className="hero-dossier-grid">
                          {consultationDossiers.map((item) => (
                            <button
                              key={item.index}
                              type="button"
                              className="dossier-prompt-card"
                              onClick={() => startFreshConversation(item.prompt)}
                              disabled={isLoading || isStreaming}
                            >
                              <div className="prompt-card-top">
                                <span className="prompt-index">{item.index}</span>
                                <span className="prompt-topic">{item.topic}</span>
                              </div>
                              <h3 className="prompt-title">{item.title}</h3>
                              <p className="prompt-desc">{item.desc}</p>
                              <span className="prompt-action">Open Consultation Track &rarr;</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="conversation-thread">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`message-row ${message.role}`}
                        >
                          <div className={`message-bubble ${message.role}`}>
                            <div className="bubble-header">
                              <span className="bubble-author">
                                {message.role === "user"
                                  ? student.name
                                  : "CareerPath Advisory Intelligence"}
                              </span>
                            </div>

                            {message.role === "assistant" ? (
                              <div className="assistant-wrapper">
                                <MarkdownMessage content={message.content} />
                              </div>
                            ) : (
                              <p className="user-message-text">
                                {message.content}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}

                      {isLoading && (
                        <div className="message-row assistant">
                          <div className="message-bubble assistant thought-bubble">
                            <ThoughtLine
                              working={isLoading}
                              steps={[
                                "Evaluating candidate academic profile & timeline",
                                "Correlating Indian placement & compensation indices",
                                "Formulating structured career recommendations"
                              ]}
                              label="Synthesizing career advice…"
                              doneLabel="Analysis complete"
                              glyph="sparkle"
                              color={theme === "dark" ? "#e07a5f" : "#9e3b1b"}
                              glyphColor={theme === "dark" ? "#e09f3e" : "#b87d28"}
                              fontSize={13.5}
                              breathPeriod={1.5}
                              breathDepth={0.4}
                              collapsible={false}
                              showTimer={true}
                            />
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </section>

                <footer className="composer-container">
                  <div className="composer-box">
                    <input
                      id="career-input"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();

                          if (
                            e.nativeEvent.isComposing ||
                            (e.nativeEvent as any).keyCode === 229
                          ) {
                            return;
                          }

                          sendMessage();
                        }
                      }}
                      placeholder="Inquire regarding Indian placement CTCs, competitive entrance exams, or degree roadmaps..."
                      disabled={isLoading || isStreaming}
                      autoComplete="off"
                    />

                    <button
                      className="send-btn"
                      onClick={() => sendMessage()}
                      disabled={!question.trim() || isLoading || isStreaming}
                      aria-label="Send inquiry"
                    >
                      &uarr;
                    </button>
                  </div>

                  <p className="composer-footer-note">
                    Counsel is synthesized from curated 2025–26 Indian educational benchmarks. Verify formal university & entrance examination circulars.
                  </p>
                </footer>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
