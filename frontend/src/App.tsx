import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { MarkdownMessage } from "./MarkdownMessage";
import { AuthScreen } from "./AuthScreen";
import { StudentDashboard } from "./StudentDashboard";
import { StudentProfile } from "./StudentProfile";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

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
    return "No Model Installed";
  }

  const lower = model.toLowerCase();

  if (lower.includes("gemma")) return "Gemma · Local";
  if (lower.includes("qwen")) return "Qwen · Local";
  if (lower.includes("llama")) return "Llama · Local";

  return model.split("/").pop()?.split(":")[0] || model;
}

function App() {
  const [student, setStudent] = useState<Student | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
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

  function handleAuthenticated(token: string, loggedInStudent: Student) {
    sessionStorage.setItem("future_forge_token", token);
    setStudent(loggedInStudent);
    setCurrentConversationId(null);
    setMessages([]);
    setActiveNav("dashboard");
  }

  function logout() {
    sessionStorage.removeItem("future_forge_token");
    setStudent(null);
    setConversations([]);
    setCurrentConversationId(null);
    setMessages([]);
    setQuestion("");
    setActiveNav("dashboard");
  }

  // Load an existing conversation
  async function loadConversation(convId: number) {
    if (isLoading || isStreaming) return;
    const token = sessionStorage.getItem("future_forge_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/conversations/${convId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(
          data.messages.map((m: { role: "user" | "assistant"; content: string }) => ({
            role: m.role,
            content: m.content
          }))
        );
        setCurrentConversationId(convId);
        setActiveNav("chat");
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  }

  // Delete a conversation
  async function deleteConversation(e: React.MouseEvent, convId: number) {
    e.stopPropagation();
    const token = sessionStorage.getItem("future_forge_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/conversations/${convId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (currentConversationId === convId) {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }

  // Career suggestions
  const suggestions = [
    {
      icon: "🎓",
      title: "Career after BCA",
      description: "Explore top job roles, NIT MCA, and starting packages.",
      prompt: "What are the best career options after BCA in India?"
    },
    {
      icon: "💻",
      title: "Tech Careers & CTC",
      description: "Explore software developer salaries and hiring trends.",
      prompt: "What are the salary expectations for freshers in tech in India?"
    },
    {
      icon: "📊",
      title: "CA vs MBA",
      description: "Compare finance and business management paths.",
      prompt: "Which is better after graduation in India: CA or MBA?"
    },
    {
      icon: "🏛️",
      title: "Govt Jobs vs Private",
      description: "Compare SSC CGL, banking, and private sector careers.",
      prompt: "How do government jobs like SSC CGL compare with private sector careers?"
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

          if (data.model) {
            setModelName(formatModelName(data.model));
          }
        } else {
          setBackendStatus("offline");
        }
      } catch {
        setBackendStatus("offline");
      }
    }

    checkHealth();
  }, []);

  // Auto-scroll conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isStreaming]);

  // Stream AI response
  async function streamReply(conversationToSend: Message[]) {
    setIsLoading(true);
    setIsStreaming(false);

    try {
      const token = sessionStorage.getItem("future_forge_token");

      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messages: conversationToSend,
          conversation_id: currentConversationId,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      setBackendStatus("connected");

      const modelHeader = response.headers.get("X-Model-Active");
      if (modelHeader) {
        setModelName(formatModelName(modelHeader));
      }

      const convIdHeader = response.headers.get("X-Conversation-Id");
      if (convIdHeader) {
        const parsed = Number(convIdHeader);
        if (!isNaN(parsed) && parsed > 0) {
          setCurrentConversationId(parsed);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      setIsLoading(false);
      setIsStreaming(true);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "" }
      ]);

      const decoder = new TextDecoder("utf-8");
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
            "Sorry, I couldn't connect to the local inference backend. Please ensure Ollama and the FastAPI backend are active, then try again."
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      // Refresh previous conversations list
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

  // Start a fresh conversation
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

  // Sidebar navigation
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

  // Save student profile through backend API
  async function saveStudentProfile(profile: ProfileData) {
    const token = sessionStorage.getItem("future_forge_token");

    if (!token) {
      throw new Error("Your login session has expired. Please log in again.");
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
      throw new Error(data.detail || data.message || "Unable to save profile.");
    }

    setStudent(data.student);
    setActiveNav("dashboard");
  }

  if (!authChecked) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p>Loading Future Forge...</p>
        </section>
      </main>
    );
  }

  if (!student) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand" onClick={() => handleNavClick("dashboard")} style={{ cursor: "pointer" }}>
          <div className="brand-badge">✦</div>
          <div>
            <h2>CareerPath</h2>
            <p className="brand-sub">Career Guidance AI</p>
          </div>
        </div>

        <button
          className="new-chat-btn"
          onClick={newChat}
          disabled={isLoading || isStreaming}
        >
          <span>+</span> New Conversation
        </button>

        <div className="sidebar-section">
          <span className="section-title">QUICK EXPLORE</span>

          <button
            className={`nav-item ${activeNav === "dashboard" ? "active" : ""}`}
            onClick={() => handleNavClick("dashboard")}
            disabled={isLoading || isStreaming}
          >
            <span className="nav-bullet">⌂</span>
            <span className="nav-label">Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeNav === "chat" && currentConversationId === null ? "active" : ""}`}
            onClick={() => handleNavClick("chat")}
            disabled={isLoading || isStreaming}
          >
            <span className="nav-bullet">●</span>
            <span className="nav-label">Ask Anything</span>
          </button>

          <button
            className={`nav-item ${activeNav === "salaries" ? "active" : ""}`}
            onClick={() => handleNavClick("salaries")}
            disabled={isLoading || isStreaming}
          >
            <span className="nav-bullet">₹</span>
            <span className="nav-label">Salary Benchmarks</span>
          </button>

          <button
            className={`nav-item ${activeNav === "exams" ? "active" : ""}`}
            onClick={() => handleNavClick("exams")}
            disabled={isLoading || isStreaming}
          >
            <span className="nav-bullet">◈</span>
            <span className="nav-label">Exam Roadmaps</span>
          </button>

          <button
            className={`nav-item ${activeNav === "profile" ? "active" : ""}`}
            onClick={() => handleNavClick("profile")}
            disabled={isLoading || isStreaming}
          >
            <span className="nav-bullet">◉</span>
            <span className="nav-label">My Profile</span>
          </button>
        </div>

        <div className="sidebar-section conversations-history">
          <div className="history-header">
            <span className="section-title">CHATS ({conversations.length})</span>
          </div>

          <div className="conversations-scroll">
            {conversations.length === 0 ? (
              <p className="empty-history-text">No saved conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  className={`conversation-item ${
                    activeNav === "chat" && currentConversationId === c.id ? "active" : ""
                  }`}
                  onClick={() => loadConversation(c.id)}
                  disabled={isLoading || isStreaming}
                  title={c.title}
                >
                  <span className="conv-icon">💬</span>
                  <span className="conv-title">{c.title}</span>
                  <span
                    className="conv-delete-btn"
                    onClick={(e) => deleteConversation(e, c.id)}
                    title="Delete conversation"
                    role="button"
                    tabIndex={0}
                  >
                    ×
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="edition-badge">
            <span className="edition-flag">🇮🇳</span>
            <span>India Edition (2025/26)</span>
          </div>

          <div className="user-profile">
            <div className="user-avatar">
              {student.name.charAt(0).toUpperCase()}
            </div>

            <div className="user-details">
              <p className="user-name">{student.name}</p>
              <p className="user-sub">Career Explorer</p>
            </div>

            <button className="logout-btn" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <span
              className={`status-indicator ${
                backendStatus === "offline" ? "offline" : ""
              }`}
            ></span>

            <span className="status-label">
              {backendStatus === "connected"
                ? "AI CAREER ASSISTANT"
                : "BACKEND OFFLINE"}
            </span>
          </div>

          <div className="model-chip" title={modelName}>
            <span className="chip-dot">◈</span>
            <span className="chip-name">{modelName}</span>
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
                <div className="hero-section">
                  <div className="hero-pill">
                    <span>✦</span>
                    <span>YOUR FUTURE STARTS HERE</span>
                  </div>

                  <h1>
                    Discover your potential.
                    <br />
                    <em>Find your path.</em>
                  </h1>

                  <p className="hero-subtext">
                    Ask any question about your studies, career opportunities,
                    higher education, or salary expectations in India.
                  </p>

                  <div className="pathway-grid">
                    {suggestions.map((item, i) => (
                      <button
                        key={i}
                        className="pathway-card"
                        onClick={() => startFreshConversation(item.prompt)}
                        disabled={isLoading || isStreaming}
                      >
                        <span className="pathway-icon">{item.icon}</span>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        <span className="card-action">Ask this &rarr;</span>
                      </button>
                    ))}
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
                              ? "You"
                              : "✦ CareerPath AI"}
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
                      <div className="message-bubble assistant loading">
                        <div className="bubble-header">
                          <span className="bubble-author">
                            ✦ CareerPath AI
                          </span>
                          <span className="thinking-text">Thinking...</span>
                        </div>

                        <div className="typing-pulse">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
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
                  placeholder="Ask anything about careers, salaries in India, exams, or next steps..."
                  disabled={isLoading || isStreaming}
                  autoComplete="off"
                />

                <button
                  className="send-btn"
                  onClick={() => sendMessage()}
                  disabled={!question.trim() || isLoading || isStreaming}
                  aria-label="Send message"
                >
                  &uarr;
                </button>
              </div>

              <p className="composer-footer-note">
                AI suggestions are for career guidance. Double check important
                exam dates and requirements.
              </p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
