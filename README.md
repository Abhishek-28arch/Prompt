# ⚡ PromptCraft AI

A RAG-powered prompt engineering assistant running entirely on your local machine with **Ollama**.

![Status](https://img.shields.io/badge/status-working-brightgreen) ![Local AI](https://img.shields.io/badge/AI-Ollama%20(Local)-blue) ![License](https://img.shields.io/badge/license-MIT-yellow)

## Features

- 🧠 **RAG-Powered Responses** — Retrieves relevant prompt engineering knowledge using in-browser TF-IDF
- 📚 **8 Built-in Topics** — Chain of Thought, Few-Shot, Role Prompting, Zero-Shot, Output Formatting, Prompt Chaining, Constraints & Clarity, System Prompts
- 🏷️ **Source Tags** — Shows which knowledge topics were used for each response
- 🎚️ **Topic Toggle Chips** — Focus the knowledge base on specific techniques
- ⚡ **Quick Prompts** — Common prompt engineering questions in one click
- 📝 **Custom Knowledge** — Add your own prompt engineering knowledge
- 🧠 **Conversation Memory** — Maintains context across chat turns
- 🔒 **100% Local** — No API keys, no cloud — everything runs on your machine
- 🎨 **Premium Dark UI** — Glassmorphism design with smooth animations

## Quick Start

### 1. Make sure Ollama is running

```bash
ollama serve
```

### 2. Pull a model (if you haven't already)

```bash
ollama pull dolphin-mistral
```

### 3. Start the app

```bash
cd Prompt
node server.js
```

### 4. Open in Browser

Navigate to **http://localhost:3000** — select your model in ⚙️ Settings and start chatting!

## Architecture

```
Prompt/
├── index.html              # HTML shell
├── styles.css              # Design system (dark glassmorphism)
├── server.js               # Proxy to Ollama (Node.js, zero deps)
├── js/
│   ├── knowledge-base.js   # 8 topics + custom knowledge CRUD
│   ├── rag-engine.js       # TF-IDF retrieval engine
│   ├── api.js              # Ollama API integration
│   ├── ui.js               # DOM/event handling
│   └── app.js              # Entry point
└── README.md
```

### How RAG Works

1. **User types a query** → The RAG engine tokenizes and scores it against all knowledge topics
2. **TF-IDF retrieval** → Top 3 most relevant topics are selected using cosine similarity
3. **Context injection** → Retrieved knowledge is injected into the model's system prompt
4. **Response** → The local model generates a grounded response with source attribution

## Adding Custom Knowledge

1. Click **"+ Add Knowledge"** in the sidebar
2. Enter a title, content (markdown supported), and optional tags
3. The new topic appears as a chip and is included in retrieval
4. Custom knowledge persists in `localStorage`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript (ES Modules) |
| AI | Ollama (local models — dolphin-mistral, llama3, etc.) |
| RAG | In-browser TF-IDF with cosine similarity |
| Storage | `localStorage` (custom knowledge, model selection, chat memory) |
| Server | Node.js proxy to Ollama (zero dependencies) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |

## License

MIT
