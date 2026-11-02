import { useState, useEffect, useRef } from "react";
import "./App.css";
import { MarkdownMessage } from "./MarkdownMessage";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function formatModelName(model: string): string {
  if (!model) return "Gemma 4 · Local";
  const lower = model.toLowerCase();
  if (lower.includes("gemma")) return "Gemma 4 · Local";
  if (lower.includes("qwen")) return "Qwen 3.5 · Local";
  if (lower.includes("llama")) return "Llama 3 · Local";
  return model.split("/").pop()?.split(":")[0] || model;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [modelName, setModelName] = useState("Gemma 4 · Local");
  const [backendStatus, setBackendStatus] = useState<"connected" | "offline">("connected");
  const [activeNav, setActiveNav] = useState<"chat" | "salaries" | "exams">("chat");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    async function checkHealth() {
      try {
        const response = await fetch("http://127.0.0.1:8000/health");
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isStreaming]);

  // Streaming message handler for fluid ChatGPT / Claude gliding token animation
  async function streamReply(conversationToSend: Message[]) {
    setIsLoading(true);
    setIsStreaming(false);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: conversationToSend,
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

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      // First token is about to stream: switch from pulsing loader to streaming bubble
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

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
            updated[updated.length - 1] = {
              role: "assistant",
              content: accumulated
            };
          }
          return updated;
        });
      }

    } catch (error: any) {
      console.error("Chat streaming error:", error);
      setIsLoading(false);
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
    }
  }

  // Active chat inquiry
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

  // Fresh isolated window (clears memory and starts with zero VRAM overhead)
  async function startFreshConversation(prompt: string) {
    if (isLoading || isStreaming) return;

    const freshMessages: Message[] = [
      { role: "user", content: prompt }
    ];

    setMessages(freshMessages);
    setQuestion("");
    await streamReply(freshMessages);
  }

  function newChat() {
    if (isLoading || isStreaming) return;
    setMessages([]);
    setQuestion("");
    setActiveNav("chat");
  }

  function handleNavClick(target: "chat" | "salaries" | "exams") {
    if (isLoading || isStreaming) return;
    setActiveNav(target);

    if (target === "salaries") {
      startFreshConversation("What are the current starting salary benchmarks for freshers in India across Software, Data Science, Finance, and Government jobs?");
    } else if (target === "exams") {
      startFreshConversation("Give me a roadmap and preparation guide for top competitive entrance exams in India like NIMCET, GATE, CAT, and SSC CGL.");
    } else {
      newChat();
    }
  }

  return (
    <div className="app-container">

      <aside className="sidebar">

        <div className="brand" onClick={() => handleNavClick("chat")}>
          <div className="brand-badge">✦</div>
          <div>
            <h2>CareerPath</h2>
            <p className="brand-sub">Career Guidance AI</p>
          </div>
        </div>

        <button className="new-chat-btn" onClick={newChat} disabled={isLoading || isStreaming}>
          <span>+</span> New Conversation
        </button>

        <div className="sidebar-section">
          <span className="section-title">QUICK EXPLORE</span>

          <button
            className={`nav-item ${activeNav === "chat" ? "active" : ""}`}
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
        </div>

        <div className="sidebar-bottom">
          <div className="edition-badge">
            <span className="edition-flag">🇮🇳</span>
            <span>India Edition (2025/26)</span>
          </div>
          <div className="user-profile">
            <div className="user-avatar">S</div>
            <div>
              <p className="user-name">Student</p>
              <p className="user-sub">Career Explorer</p>
            </div>
          </div>
        </div>

      </aside>

      <main className="main-content">

        <header className="topbar">
          <div className="topbar-left">
            <span className={`status-indicator ${backendStatus === "offline" ? "offline" : ""}`}></span>
            <span className="status-label">
              {backendStatus === "connected" ? "AI CAREER ASSISTANT" : "BACKEND OFFLINE"}
            </span>
          </div>
          <div className="model-chip" title={modelName}>
            <span className="chip-dot">◈</span>
            <span className="chip-name">{modelName}</span>
          </div>
        </header>

        <section className={`chat-viewport ${messages.length === 0 ? "empty" : ""}`}>

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
                        {message.role === "user" ? "You" : "✦ CareerPath AI"}
                      </span>
                    </div>
                    {message.role === "assistant" ? (
                      <div className="assistant-wrapper">
                        <MarkdownMessage content={message.content} />
                      </div>
                    ) : (
                      <p className="user-message-text">{message.content}</p>
                    )}
                  </div>
                </div>

              ))}

              {isLoading && (
                <div className="message-row assistant">
                  <div className="message-bubble assistant loading">
                    <div className="bubble-header">
                      <span className="bubble-author">✦ CareerPath AI</span>
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
                  if (e.nativeEvent.isComposing || (e.nativeEvent as any).keyCode === 229) {
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
            AI suggestions are for career guidance. Double check important exam dates and requirements.
          </p>

        </footer>

      </main>

    </div>
  );
}

export default App;
