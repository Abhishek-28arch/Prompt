# ⚡ PromptCraft AI

**PromptCraft** is an intelligent, privacy-first prompt engineering assistant running entirely on your local machine using Ollama. Learn to write better prompts, explore built-in knowledge on best practices, and level up your AI interactions with professional tools.

![PromptCraft Screenshot](https://raw.githubusercontent.com/abhishek/promptcraft/main/screenshot.png) *(Preview placeholder)*

---

## ✨ Features

- 🔒 **100% Local & Private**: Powered by Ollama. No API keys, no data leaves your machine.
- 🧠 **Vector RAG Engine**: Instantly retrieves prompt engineering best practices (Chain of Thought, Few-Shot, structured outputs) to ground AI responses. Uses `nomic-embed-text` for semantic search with a TF-IDF fallback.
- ⭐ **Prompt Rating Scorecard**: Generate a prompt and rate it on 5 dimensions (Role, Clarity, Constraints, Chain of Thought, Output Format) with visual progress bars and feedback.
- 🔀 **Comparison Mode**: Generate 3 different variations of a prompt side by side to compare techniques.
- 📂 **Templates Library**: Pre-built, customizable prompt templates for Coding, Research, Writing, Data Analysis, and more.
- 📜 **Prompt History**: Automatically saves your generated prompts so you can easily copy or reuse them later.
- 📥 **Export Options**: Export any prompt to Markdown (`.md`), JSON array (`.json`), or 1-click copy to clipboard.
- 📚 **Custom Knowledge**: Add your own prompt engineering tips or company guidelines to the local RAG database.
- 🌌 **Premium UI/UX**: Designed with a sleek glassmorphism aesthetic, smooth animations, and a responsive layout.

## 🚀 Quick Start

### 1. Install Dependencies
Make sure you have [Ollama](https://ollama.ai) and [Node.js](https://nodejs.org/) installed.

Pull the recommended models:
```bash
# Recommended text model
ollama pull llama3

# Required embedding model for accurate RAG retrieval
ollama pull nomic-embed-text
```

### 2. Run the App
Clone the repository and start the proxy server:

```bash
git clone https://github.com/yourusername/promptcraft.git
cd promptcraft
npm install # if using package-lock (none currently required)
node server.js
```

### 3. Open in Browser
Visit `http://localhost:3000`

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3 (Custom Design System), Vanilla JavaScript (ES6 Modules)
- **Backend/Proxy**: Node.js (`http` module, no heavy frameworks)
- **AI Core**: Ollama API (`chat` and `embed` endpoints)
- **RAG**: Custom In-Memory Vector Search (Cosine Similarity) with TF-IDF fallback.

## 💡 How to Use
1. **Select a Model**: Go to Settings (⚙️) and pick your preferred Ollama model.
2. **Ask for Help**: Type "How do I make the AI output JSON?" or use a Quick Prompt.
3. **Compare**: Click the "🔀 Compare" toggle in the input area to see 3 variations of your next prompt.
4. **Rate**: Click "⭐ Rate" on an assistant's response to see how good the generated prompt is.
5. **Save**: Find all your past prompts in the sidebar History section.

## 🤝 Contributing
Contributions are welcome! If you want to add new default Prompt Templates or Knowledge Base topics, simply edit `js/templates.js` or `js/knowledge-base.js`.

## 📄 License
MIT License. Free to use and modify.
