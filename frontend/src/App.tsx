
import { useState } from "react";
import "./App.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  async function sendMessage(value = question) {
    const messageToSend = value.trim();

    if (!messageToSend || isLoading) return;

    // Display the student's message
    setMessages((previous) => [
      ...previous,
      { role: "user", content: messageToSend }
    ]);

    setQuestion("");
    setIsLoading(true);

    try {
      // Send message to FastAPI backend
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: messageToSend
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      // Display AI-generated response
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.reply
        }
      ]);

    } catch (error) {
      console.error("Chat API error:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't connect to the AI service. Please check that the backend and Ollama are running, then try again."
        }
      ]);

    } finally {
      setIsLoading(false);
    }
  }

  function newChat() {
    if (isLoading) return;

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
          <span className="model-label">Gemma 3 · 1B</span>
        </header>

        <section className="chat-content">

          {messages.length === 0 ? (

            <div className="welcome-section">

              <div className="welcome-icon">✦</div>

              <p className="welcome-tag">
                YOUR FUTURE STARTS HERE
              </p>

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
                    disabled={isLoading}
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
                    {message.role === "user"
                      ? "You"
                      : "CareerPath AI"}
                  </strong>

                  <p>{message.content}</p>
                </div>

              ))}

              {isLoading && (
                <div className="message assistant">
                  <strong>CareerPath AI</strong>
                  <p>Thinking...</p>
                </div>
              )}

            </div>

          )}

        </section>

        <footer className="input-section">

          <div className="input-box">

            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Ask anything about your career..."
              disabled={isLoading}
            />

            <button
              className="send-button"
              onClick={() => sendMessage()}
              disabled={!question.trim() || isLoading}
            >
              {isLoading ? "..." : "↑"}
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
