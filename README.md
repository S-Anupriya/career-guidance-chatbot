<div align="center">

# CareerPath AI (Future Forge)

**An intelligent, privacy-first career guidance platform with verified Indian benchmarks, student profile personalization, and real-time token streaming.**

*FastAPI · SQLite · React 19 + TypeScript · Local Ollama LLM · Curated RAG · Zero Cloud Dependencies*

<br />

<!-- Hero Screenshot -->
<img src="assets/dashboard.png" alt="CareerPath AI Dashboard" width="920" />

<br />

[Features](#features) · [Interface Gallery](#interface-gallery) · [Comparison](#why-careerpath-ai) · [Architecture](#architecture) · [Quick Start](#quick-start) · [macOS Guide](#macos-setup-guide) · [Windows Guide](#windows-setup-guide) · [Troubleshooting](#troubleshooting) · [Project Structure](#project-structure)

</div>

---

## Features

* **Argon2id Cryptographic Authentication**: Industrial-grade password hashing with Argon2id and JWT bearer token sessions. Plaintext passwords are never stored.
* **Password Hardening & Disposable Email Defense**: Enforces password complexity (minimum 8 characters, mixed case, numbers, and symbols) and automatically detects and blocks temporary/disposable email domains.
* **Persistent Student Profiles**: Stores degree, institution, graduation timeline, technical skills, interests, and target domains in SQLite. Seamlessly restored upon login and continuously synced with the LLM context.
* **Student Career Dashboard**: Personalized command center displaying academic status, registered skills, curated career pathway shortcuts, and contextual counselor advice.
* **Real-Time Multi-Step Reasoning (`ThoughtLine`)**: Live visual thinking indicator in assistant chat bubbles featuring active timer telemetry, multi-stage status indicators, and luminous glow effects.
* **Ambient 3D WebGL Background (`GhostFibers`) & Liquid Glass UI**: GPU-accelerated interactive particle fibers flowing beneath high-contrast, liquid glass cards and controls.
* **Dual Obsidian Dark & Editorial Light Themes**: Fully responsive dual-theme design system with custom CSS variables and persistent theme preference in `localStorage`.
* **Profile-Connected AI Personalization**: Injects student background (degree, year, skill stack, interests) directly into counselor prompts for hyper-targeted, context-aware roadmaps.
* **Persistent SQLite Conversation Threads**: Multi-session conversation management with automatic thread naming, user query storage, streaming response accumulation, and cascade deletion.
* **Grounded Indian Career Benchmarks**: Integrates factual data from ICAI campus placements, 7th Pay Commission pay scales, NIMCET NIT MCA statistics, and Indian tech hiring tiers (mass service firms, product startups, and GCCs).
* **100% Local and Free Inference**: Runs entirely on your personal machine through Ollama (Gemma, Qwen, or Llama). Zero subscriptions, zero telemetry, and complete privacy.
* **Auto-Discovery Model Binding**: Automatically inspects the local Ollama daemon and binds to the active model without hardcoded configuration.
* **Fluid Token Streaming**: Streams responses directly to the client token-by-token with smooth animation and instant markdown table rendering.
* **Single Command Startup**: Unified cross-platform launchers (`start.sh` for macOS/Linux, `start.bat` for Windows) that boot Ollama, the FastAPI backend, and the React frontend simultaneously.

---

## Interface Gallery

<div align="center">

### Liquid Glass Authentication
*Clean login and registration interface with password security policy enforcement and real-time WebGL backdrop.*
<br />
<img src="assets/login.png" alt="CareerPath AI Login" width="860" />

<br /><br />

### Live AI Thinking Indicator (`ThoughtLine`)
*Multi-step reasoning telemetry displaying live phase transitions and execution timing during generation.*
<br />
<img src="assets/ai_thinking.png" alt="CareerPath AI Multi-Step Thinking Indicator" width="860" />

<br /><br />

### Obsidian Dark AI Counseling
*Streamed personalized advice, salary benchmarks in INR, and structured preparation timelines.*
<br />
<img src="assets/chat_dark.png" alt="CareerPath AI Dark Chat" width="860" />

<br /><br />

### Editorial Light Theme
*High-contrast light mode with clean typography and liquid glass elements.*
<br />
<img src="assets/chat_light.png" alt="CareerPath AI Light Chat" width="860" />

</div>

---

## Why CareerPath AI?

| Dimension | Generic AI & Web Portals | CareerPath AI |
|:---|:---|:---|
| **Knowledge Base** | Western-centric examples or generic blogs | Grounded on Indian academic and industry benchmarks |
| **Personalization** | Forgets who you are on every new session | Connects student profile (degree, skills, year) to AI |
| **Security & Privacy** | Plaintext or basic MD5/SHA passwords | Industrial Argon2id hashing + disposable email defense |
| **Conversation Storage**| Stored on remote corporate servers | 100% local SQLite database (`future_forge.db`) |
| **Salary Data** | Inflated global estimates in USD | Realistic Indian INR (fresher CTC and in-hand breakdowns) |
| **Thinking Feedback** | Static spinning dots or blank delays | Multi-step reasoning telemetry with `ThoughtLine` |
| **Visual Design** | Flat generic templates | Liquid glass morphism with 3D WebGL `GhostFibers` |
| **Data Presentation** | Monolithic walls of unformatted text | Clean, interactive markdown tables and structured roadmaps |
| **Execution** | Complex multi-terminal manual configuration | Single-command automated orchestration (`./start.sh` / `start.bat`) |

---

## Architecture

The system is organized into a modular decoupled architecture:

```text
┌────────────────────────────────────────────────────────┐
│             React 19 + TypeScript Frontend             │
│   (Vite · Dashboard · Profile · GhostFibers · Chats)   │
└───────────────────────────┬────────────────────────────┘
                            │ REST / Event Streaming / JWT Bearer
                            ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│   (Auth Router · Conversations Router · RAG Pipeline)  │
└───────┬───────────────────┬────────────────────┬───────┘
        │                   │                    │
        ▼                   ▼                    ▼
┌───────────────┐   ┌────────────────┐   ┌───────────────┐
│ SQLite DB     │   │ Curated RAG    │   │ Local Ollama  │
│ (Users, Chats,│   │ Knowledge Base │   │ (Gemma / Qwen)│
│  Profiles)    │   │ (NIMCET, ICAI) │   │               │
└───────────────┘   └────────────────┘   └───────────────┘
```

* **Frontend**: Built with React 19, TypeScript, and Vite. Features a liquid glass UI, student dashboard, profile editor, previous chat sidebar history, markdown table rendering, `ThoughtLine` live reasoning indicator, and 3D WebGL `GhostFibers` background.
* **Backend**: Powered by FastAPI and Uvicorn. Implements Argon2id password security, JWT bearer authentication, profile management, conversation persistence, model resolution, and streaming generation.
* **Database**: Local SQLite database storing student accounts, argon2-hashed credentials, profiles, conversation threads, and chat messages.
* **RAG Layer**: Curated repository containing verified Indian compensation bands, exam timelines, and qualification criteria.
* **Inference Engine**: Standard Ollama instance running locally on CPU or Apple Silicon/NVIDIA GPU.

---

## Quick Start

### 1. macOS & Linux (Automated)

Open Terminal in the project root and run:

```bash
chmod +x start.sh
./start.sh
```

The script will automatically check Ollama, pull a model if missing, set up Python dependencies, install frontend packages, and launch both servers.

Access the web interface at: **http://localhost:5173**

---

### 2. Windows (Automated)

Open Command Prompt in the project root or simply **double-click `start.bat`**:

```cmd
start.bat
```

The batch script will verify Ollama, set up Python and Node dependencies automatically, and open `http://localhost:5173` in your default browser.

---

## macOS Setup Guide

If running on Apple Silicon (M1/M2/M3/M4) or Intel Mac:

1. **Install Ollama**:
   Download and install the macOS application from [ollama.com/download](https://ollama.com/download). Launch Ollama from your Applications folder (the Ollama icon appears in the top menu bar).

2. **Download an AI Model**:
   Open Terminal and run:
   ```bash
   ollama pull gemma:2b
   ```
   *(or `ollama pull qwen2.5:3b`)*

3. **Start the Application**:
   Navigate to the project folder and run:
   ```bash
   ./start.sh
   ```

---

## Windows Setup Guide

1. **Prerequisites**:
   * Install Python 3.10+ from [python.org](https://www.python.org/downloads/) *(make sure to check "Add Python to PATH" during installation)*.
   * Install Node.js 18+ from [nodejs.org](https://nodejs.org/).
   * Install Ollama for Windows from [ollama.com/download](https://ollama.com/download).

2. **Download an AI Model**:
   Open Command Prompt and run:
   ```cmd
   ollama pull gemma:2b
   ```

3. **Start the Application**:
   Double-click `start.bat` in the project root folder.

---

## Troubleshooting

| Issue | Likely Cause | Resolution |
|:---|:---|:---|
| **"AI model connection failed"** | Ollama daemon is not active. | Run `ollama serve` or open the Ollama app. |
| **"No model found"** | No LLM downloaded in Ollama. | Run `ollama list`. If empty, download one with `ollama pull gemma:2b`. |
| **Port 8000 or 5173 in use** | A previous instance was not terminated. | Free ports by running `lsof -ti:8000,5173 \| xargs kill -9`. |
| **High inference latency** | Model parameter size exceeds available RAM. | Switch to a smaller quantized model such as `gemma:2b` or `qwen2.5:3b`. |
| **CORS or Auth error** | Frontend port mismatch. | Ensure the client runs on `localhost:5173` or `localhost:3000`. |

---

## Project Structure

```text
career-guidance-chatbot/
├── backend/
│   ├── data/
│   │   ├── india_career_knowledge.json  # Curated Indian career benchmarks
│   │   └── future_forge.db              # SQLite database (auto-created)
│   ├── auth.py                          # Argon2id password security, JWT login, and profile API
│   ├── conversations.py                 # Chat history and conversation management
│   ├── database.py                      # Database schema and table initialization
│   ├── main.py                          # FastAPI endpoints, streaming, and model discovery
│   ├── rag.py                           # Semantic search and reasoning filter
│   ├── requirements.txt                 # Backend Python dependencies
│   ├── test_app.py                      # Automated test suite for auth, chats, and RAG
│   └── .env.example                     # Environment configuration template
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GhostFibers.jsx          # WebGL 3D ambient fiber particle background
│   │   │   ├── GhostFibers.css          # Full-bleed WebGL viewport canvas styling
│   │   │   ├── ThoughtLine.jsx          # Live multi-step reasoning indicator & timer
│   │   │   └── ThoughtLine.css          # Monospace badge & luminous glow animations
│   │   ├── App.tsx                      # Main app shell, navigation, theme toggle, and stream reader
│   │   ├── App.css                      # Liquid glass design system and widescreen styling
│   │   ├── AuthScreen.tsx               # Student registration & login with password hardening
│   │   ├── StudentDashboard.tsx         # Personalized career overview & pathways
│   │   ├── StudentProfile.tsx           # Profile editor (course, year, skills, domains)
│   │   ├── MarkdownMessage.tsx          # Markdown and table renderer
│   │   ├── main.tsx                     # React root mount
│   │   └── index.css                    # Viewport reset styles
│   ├── index.html                       # HTML entry point
│   ├── package.json                     # Frontend dependencies
│   └── vite.config.ts                   # Vite configuration
├── assets/                              # High-resolution screenshots and UI documentation
│   ├── dashboard.png                    # Student career dashboard & command center
│   ├── login.png                        # Liquid glass login interface
│   ├── ai_thinking.png                  # Multi-step live reasoning indicator
│   ├── chat_dark.png                    # Obsidian Dark chat interface
│   └── chat_light.png                   # Editorial Light theme interface
├── start.sh                             # macOS and Linux launcher script
├── start.bat                            # Windows double-click launcher script
├── .gitignore                           # Git exclusion rules
└── README.md                            # Comprehensive project documentation
```

---

## Verification & Testing

Verify full backend pipeline (Auth, Profiles, Conversations, Streaming):
```bash
python3 backend/test_app.py
```

Verify frontend TypeScript build:
```bash
cd frontend && npm run build
```

---

## License

Academic and educational open-source project. Developed for student career counseling and curriculum guidance.
