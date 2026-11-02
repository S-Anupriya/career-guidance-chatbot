<div align="center">

# CareerPath AI

**An intelligent, privacy-first career guidance engine with verified Indian benchmarks and real-time token streaming.**

*FastAPI · React 19 + TypeScript · Local Ollama LLM · Curated RAG · Zero Cloud Dependencies*

<br />

<!-- Hero Screenshot -->
<img src="assets/hero.png" alt="CareerPath AI Interface" width="860" />

<br />

[Features](#features) · [Comparison](#why-careerpath-ai) · [Architecture](#architecture) · [Quick Start](#quick-start) · [macOS Guide](#macos-setup-guide) · [Troubleshooting](#troubleshooting) · [Project Structure](#project-structure)

</div>

---

## Features

* **Grounded Indian Career Benchmarks**: Integrates factual data from ICAI campus placements, 7th Pay Commission pay scales, NIMCET NIT MCA statistics, and Indian tech hiring tiers (mass service firms, startups, and GCCs).
* **100% Local and Free Inference**: Runs entirely on your personal machine through Ollama (Gemma, Qwen, or Llama). Zero recurring subscriptions, zero telemetry, and complete privacy.
* **Auto-Discovery Model Binding**: Automatically inspects the local Ollama daemon and binds to the active model without hardcoded configuration.
* **Fluid Token Streaming**: Streams responses directly to the client token-by-token with real-time UI animation.
* **Sliding Window Context Memory**: Maintains a lean 4-turn conversational buffer to prevent local GPU/CPU VRAM exhaustion while preserving thread continuity.
* **Structured Markdown Presentation**: Automatically renders formatted data tables, bulleted tracks, and clear career paths.
* **Single Command Startup**: Includes a unified cross-platform launcher script (`start.sh`) for macOS and Linux that boots Ollama, the FastAPI backend, and the Vite React frontend simultaneously.

---

## Why CareerPath AI?

| Dimension | Generic AI & Web Portals | CareerPath AI |
|:---|:---|:---|
| **Knowledge Base** | Western-centric examples or generic blogs | Grounded on Indian academic and industry benchmarks |
| **Salary Data** | Inflated global estimates in USD | Realistic Indian INR (fresher CTC and in-hand breakdowns) |
| **Privacy & Cost** | Requires paid cloud APIs and internet access | 100% offline local inference with zero operational cost |
| **Memory Management**| Unbounded context causes local LLM slowdowns | 4-turn sliding context window optimized for laptop hardware |
| **Data Presentation** | Monolithic walls of unformatted text | Clean, interactive markdown tables and structured roadmaps |
| **Execution** | Complex multi-terminal manual configuration | Single-command automated orchestration (`./start.sh`) |

<br />

<div align="center">
  <img src="assets/chat.png" alt="CareerPath AI Live Streamed Counseling" width="860" />
</div>

<br />

---

## Architecture

The system is organized into a modular decoupled architecture:

```text
┌────────────────────────────────────────────────────────┐
│             React 19 + TypeScript Frontend             │
│   (Vite · Markdown Tables · Fluid Token Stream UI)     │
└───────────────────────────┬────────────────────────────┘
                            │ REST / Event Streaming
                            ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│   (Keyword RAG Matching · 4-Turn Sliding Memory Buffer)│
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌───────────────────────────────┐  ┌─────────────────────┐
│  Curated Indian Knowledge Base│  │  Local Ollama LLM   │
│ (NIMCET, 7th CPC, ICAI, GCCs) │  │  (Gemma / Qwen)     │
└───────────────────────────────┘  └─────────────────────┘
```

* **Frontend**: Built with React 19, TypeScript, and Vite. Features a widescreen responsive layout, categorized sidebar navigation, and native table rendering.
* **Backend**: Powered by FastAPI and Uvicorn. Handles model discovery, query categorization, context retrieval, and asynchronous token streaming.
* **RAG Layer**: Keyword-indexed repository containing verified Indian compensation bands, exam timelines, and qualification criteria.
* **Inference Engine**: Standard Ollama instance running locally on CPU or Apple Silicon/NVIDIA GPU.

---

## Quick Start

### Automated Launch (macOS & Linux)

Clone the repository and run the startup script:

```bash
git clone https://github.com/S-Anupriya/career-guidance-chatbot.git
cd career-guidance-chatbot
chmod +x start.sh
./start.sh
```

The script will automatically:
1. Verify if Ollama is running (and start it in the background if needed).
2. Detect the active local model.
3. Activate the backend virtual environment, install dependencies, and launch FastAPI on port 8000.
4. Install frontend dependencies and launch the Vite dev server on port 5173.
5. Provide clean teardown of all subprocesses upon pressing `Ctrl+C`.

Access the web interface at: **http://localhost:5173**

---

## Manual Installation

If you prefer running components separately:

### Prerequisites

* Python 3.10 or higher
* Node.js 18 or higher with `npm`
* Ollama installed ([ollama.com/download](https://ollama.com/download))

### Step 1: Model Setup (Ollama)

Ensure Ollama is running and pull your preferred lightweight model:

```bash
# Recommended for laptops:
ollama pull gemma:2b
# or
ollama pull qwen2.5:3b
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Verify backend health at: `http://127.0.0.1:8000/health`

### Step 3: Frontend Setup

```bash
cd frontend

# Install packages
npm install

# Start development server
npm run dev
```

Open your browser to `http://localhost:5173`.

---

## macOS Setup Guide

If running on Apple Silicon (M1/M2/M3/M4) or Intel Mac:

1. **Install Ollama**:
   Download the macOS application from [ollama.com](https://ollama.com). Open it from your Applications folder. You will see an Ollama icon in the top macOS menu bar.

2. **Pull a Model**:
   Open Terminal and execute:
   ```bash
   ollama pull gemma:2b
   ```

3. **Start the Application**:
   Navigate to the project folder and run:
   ```bash
   ./start.sh
   ```
   The application will detect the model and launch the web interface automatically.

---

## Troubleshooting

| Issue | Likely Cause | Resolution |
|:---|:---|:---|
| **"AI model connection failed"** | Ollama daemon is not active. | Run `ollama serve` or open the Ollama app. |
| **"No model found"** | No LLM downloaded in Ollama. | Run `ollama list`. If empty, download one with `ollama pull gemma:2b`. |
| **Port 8000 or 5173 in use** | A previous instance was not terminated. | Free ports by running `lsof -ti:8000,5173 \| xargs kill -9`. |
| **High inference latency** | Model parameter size exceeds available RAM. | Switch to a smaller quantized model such as `gemma:2b` or `qwen2.5:3b`. |
| **CORS connection error** | Frontend port mismatch. | Ensure the client runs on `localhost:5173` or `localhost:3000`. |

---

## Project Structure

```text
career-guidance-chatbot/
├── backend/
│   ├── data/
│   │   └── india_career_knowledge.json  # Curated Indian career benchmarks
│   ├── main.py                          # FastAPI endpoints, streaming, and model discovery
│   ├── rag.py                           # Semantic search and reasoning filter
│   ├── requirements.txt                 # Backend Python dependencies
│   └── .env.example                     # Environment configuration template
├── frontend/
│   ├── src/
│   │   ├── App.tsx                      # Main chat application and thread manager
│   │   ├── App.css                      # Widescreen layout and component styling
│   │   ├── MarkdownMessage.tsx          # Markdown and table renderer
│   │   ├── main.tsx                     # React root mount
│   │   └── index.css                    # Viewport reset styles
│   ├── index.html                       # HTML entry point
│   ├── package.json                     # Frontend dependencies
│   └── vite.config.ts                   # Vite configuration
├── assets/                              # Screenshots and documentation media
├── start.sh                             # Cross-platform runner script
├── .gitignore                           # Git exclusion rules
└── README.md                            # Project documentation
```

---

## Verification & Testing

Verify backend syntax:
```bash
python3 -m py_compile backend/main.py backend/rag.py
```

Verify frontend build:
```bash
cd frontend && npm run build
```

---

## License

Academic and educational open-source project. Developed for student career counseling and curriculum guidance.
