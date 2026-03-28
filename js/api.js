// ============================================
// API Integration Module
// Handles communication with Ollama local AI
// ============================================

const API_URL = '/api/chat';
const DEFAULT_MODEL = 'dolphin-mistral';

// ============================================
// System Prompt Builder
// ============================================

function buildSystemPrompt(ragContext) {
  return `You are PromptCraft AI, an expert prompt engineering assistant. Your purpose is to help users write better, more effective prompts for AI language models.

You have access to a curated knowledge base of prompt engineering techniques. Use the retrieved knowledge below to ground your responses in established best practices.

${ragContext}

## Your Behavior
1. **Always be practical**: Provide ready-to-use prompt templates, not just theory
2. **Be specific**: When suggesting improvements, show the before and after
3. **Explain your reasoning**: Tell the user WHY a technique works, not just what it is
4. **Adapt to the user's level**: If they seem beginner, keep it simple. If advanced, go deeper.
5. **Use markdown formatting**: Structure your responses with headers, code blocks, and lists for readability

## Response Format
- Start with a brief, direct answer
- Provide practical examples in code blocks
- If multiple techniques apply, explain when to use each
- End with a actionable tip or next step

Remember: You are helping the user become better at prompt engineering. Every response should teach something.`;
}

// ============================================
// Conversation Memory
// ============================================

const MEMORY_KEY = 'promptAssistant_conversationMemory';

export function loadConversationMemory() {
  try {
    const stored = localStorage.getItem(MEMORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn('Failed to load conversation memory:', e);
    return [];
  }
}

export function saveConversationMemory(messages) {
  try {
    // Keep only last 20 messages to avoid context limits
    const trimmed = messages.slice(-20);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save conversation memory:', e);
  }
}

export function clearConversationMemory() {
  localStorage.removeItem(MEMORY_KEY);
}

export function getMessageCount() {
  return loadConversationMemory().length;
}

// ============================================
// Model Management
// ============================================

const MODEL_STORAGE = 'promptAssistant_selectedModel';

export function getSelectedModel() {
  return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL;
}

export function setSelectedModel(model) {
  localStorage.setItem(MODEL_STORAGE, model.trim());
}

/**
 * Fetch available models from Ollama.
 * @returns {Promise<Array<{name: string, size: string}>>}
 */
export async function fetchAvailableModels() {
  try {
    const response = await fetch('/api/models');
    if (!response.ok) return [];
    const data = await response.json();
    return (data.models || []).map(m => ({
      name: m.name,
      size: formatBytes(m.size),
      parameterSize: m.details?.parameter_size || '',
      family: m.details?.family || ''
    }));
  } catch (e) {
    console.warn('Failed to fetch models:', e);
    return [];
  }
}

function formatBytes(bytes) {
  if (!bytes) return '';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

/**
 * Check if Ollama is reachable.
 * @returns {Promise<boolean>}
 */
export async function checkOllamaStatus() {
  try {
    const response = await fetch('/api/health');
    return response.ok;
  } catch (e) {
    return false;
  }
}

// ============================================
// API Communication
// ============================================

/**
 * Send a message to Ollama via the proxy.
 * @param {string} userMessage - The user's current message
 * @param {string} ragContext - Retrieved knowledge context
 * @param {Array} conversationHistory - Previous messages for memory
 * @returns {Promise<{content: string, error: string|null}>}
 */
export async function sendMessage(userMessage, ragContext, conversationHistory = []) {
  const model = getSelectedModel();
  const systemPrompt = buildSystemPrompt(ragContext);

  // Build messages array: system + conversation history + new user message
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2048
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || `Ollama request failed with status ${response.status}`;

      if (response.status === 404) {
        return { content: null, error: `Model "${model}" not found. Please select a different model in settings or pull it with: ollama pull ${model}` };
      }

      return { content: null, error: errorMsg };
    }

    const data = await response.json();
    const content = data.message?.content || 'No response received.';

    return { content, error: null };
  } catch (e) {
    if (e.name === 'TypeError' && e.message.includes('fetch')) {
      return {
        content: null,
        error: 'Cannot reach Ollama. Make sure both the proxy server (`node server.js`) and Ollama are running.'
      };
    }
    return { content: null, error: `Unexpected error: ${e.message}` };
  }
}

/**
 * Get model info for display
 */
export function getModelInfo() {
  return {
    model: getSelectedModel(),
    provider: 'Ollama (Local)'
  };
}
