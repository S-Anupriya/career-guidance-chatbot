
import { useState } from "react";
import "./App.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");

  const suggestions = [
    {
      icon: "🎓",
      title: "Career after graduation",
      description: "Explore career options after your degree.",
      prompt: "What are the best career options after BCA?"
    },
    {
      icon: "💻",
      title: "Explore technology careers",
      description: "Discover careers in IT and technology.",
      prompt: "What technology careers can I explore?"
    },
    {
      icon: "🧠",
      title: "Discover my interests",
      description: "Find careers based on your interests.",
      prompt: "Help me identify my interests and strengths."
    },
    {
      icon: "🚀",
      title: "Build my career roadmap",
      description: "Create a step-by-step learning plan.",
      prompt: "Create a career roadmap for becoming an AI engineer."
    }
  ];

  function sendMessage(value = question) {
    if (!value.trim()) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: value }
    ]);

    setQuestion("");
  }

  function newChat() {
    setMessages([]);
    setQuestion("");
  }

  return (
    <div className="app-container">

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <h2>CareerPath AI</h2>
        </div>

        <button className="new-chat" onClick={newChat}>
          + New conversation
        </button>

        <div className="sidebar-menu">
          <p className="menu-heading">MENU</p>
          <div className="menu-item active">✦ Discover Careers</div>
          <div className="menu-item">◈ Career Roadmap</div>
          <div className="menu-item">◎ My Profile</div>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">S</div>
          <div>
            <strong>Student</strong>
            <p>Career Explorer</p>
          </div>
        </div>
      </aside>

      <main className="main-content">

        <header className="topbar">
          <div>
            <span className="status-dot"></span>
            AI CAREER ASSISTANT
          </div>
          <span className="model-label">Career Guidance</span>
        </header>

        <section className="chat-content">

          {messages.length === 0 ? (
            <div className="welcome-section">

              <div className="welcome-icon">✦</div>

              <p className="welcome-tag">YOUR FUTURE STARTS HERE</p>

              <h1>
                Discover your potential.
                <br />
                <span>Find your path.</span>
              </h1>

              <p className="welcome-description">
                Confused about your career? Let's explore your
                interests, discover opportunities and build
                a career path that matches your goals.
              </p>

              <div className="suggestion-grid">
                {suggestions.map((item) => (
                  <button
                    className="suggestion-card"
                    key={item.title}
                    onClick={() => sendMessage(item.prompt)}
                  >
                    <span className="suggestion-icon">
                      {item.icon}
                    </span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </button>
                ))}
              </div>

            </div>
          ) : (
            <div className="messages">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`message ${message.role}`}
                >
                  <strong>
                    {message.role === "user" ? "You" : "CareerPath AI"}
                  </strong>
                  <p>{message.content}</p>
                </div>
              ))}
              <div className="prototype-note">
                Your message is displayed. AI connection is our next
                development step.
              </div>
            </div>
          )}

        </section>

        <footer className="input-section">
          <div className="input-box">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Ask anything about your career..."
            />

            <button
              className="send-button"
              onClick={() => sendMessage()}
              disabled={!question.trim()}
            >
              ↑
            </button>
          </div>

          <p className="disclaimer">
            AI career suggestions are guidance, not guaranteed outcomes.
          </p>
        </footer>

      </main>
    </div>
  );
}

export default App;
