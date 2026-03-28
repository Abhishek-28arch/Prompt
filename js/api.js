// ============================================
// API Integration Module
// Handles communication with Ollama local AI
// ============================================

const API_URL = '/api/chat';
const DEFAULT_MODEL = 'dolphin-mistral';

// ============================================
// System Prompt Builder
// ============================================

function buildSystemPrompt(ragContext, options = {}) {
  const { webSearchEnabled = false } = options;

  let webSearchBlock = '';
  if (webSearchEnabled) {
    webSearchBlock = `
## Web Search Awareness
The user has enabled web search mode. When answering:
- If the question requires up-to-date information (news, current events, recent releases, live data), clearly state: "🔍 **This answer would benefit from a web search.** My training data may not include the latest information."
- Provide the best answer you can from your training data, but flag any facts that might be outdated.
- Suggest specific search queries the user could run for the most current information.
`;
  }

  return `You are PromptCraft AI, an expert prompt engineering assistant. Your purpose is to help users write better, more effective prompts for AI language models.

You have access to a curated knowledge base of prompt engineering techniques. Use the retrieved knowledge below to ground your responses in established best practices.

${ragContext}
${webSearchBlock}
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
 * @param {Object} options - Additional options (webSearchEnabled, etc.)
 * @returns {Promise<{content: string, error: string|null}>}
 */
export async function sendMessage(userMessage, ragContext, conversationHistory = [], options = {}) {
  const model = getSelectedModel();
  const systemPrompt = buildSystemPrompt(ragContext, options);

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

// ============================================
// Prompt Rating
// ============================================

/**
 * Rate a prompt on 5 dimensions using Ollama.
 * @param {string} promptText - The prompt to rate
 * @returns {Promise<{ratings: Object, error: string|null}>}
 */
export async function ratePrompt(promptText) {
  const model = getSelectedModel();

  const ratingSystemPrompt = `You are a prompt engineering evaluator. Rate the given prompt on these 5 dimensions, each on a scale of 1-5:

1. **Role Definition** — Does it assign a clear role/persona to the AI?
2. **Clarity** — Is the task clearly and unambiguously described?
3. **Constraints** — Are there specific boundaries, format requirements, or limitations?
4. **Chain of Thought** — Does it encourage step-by-step reasoning or structured thinking?
5. **Output Format** — Does it specify the desired output format?

You MUST respond with ONLY valid JSON in this exact format, no other text:
{
  "role": { "score": 3, "feedback": "brief reason" },
  "clarity": { "score": 4, "feedback": "brief reason" },
  "constraints": { "score": 2, "feedback": "brief reason" },
  "chain_of_thought": { "score": 3, "feedback": "brief reason" },
  "output_format": { "score": 2, "feedback": "brief reason" },
  "overall": 2.8,
  "suggestion": "One key improvement suggestion"
}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: ratingSystemPrompt },
          { role: 'user', content: `Rate this prompt:\n\n${promptText}` }
        ],
        stream: false,
        options: { temperature: 0.3, num_predict: 512 }
      })
    });

    if (!response.ok) {
      return { ratings: null, error: 'Failed to rate prompt' };
    }

    const data = await response.json();
    const content = data.message?.content || '';

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ratings: null, error: 'Could not parse rating response' };
    }

    const ratings = JSON.parse(jsonMatch[0]);
    return { ratings, error: null };
  } catch (e) {
    return { ratings: null, error: `Rating failed: ${e.message}` };
  }
}

// ============================================
// Prompt Comparison
// ============================================

const VARIATION_STYLES = [
  {
    name: 'Chain of Thought',
    icon: '🧠',
    instruction: 'Rewrite this prompt using Chain of Thought technique. Add "Let\'s think step by step" and structure it so the AI breaks down the problem into logical steps before answering.'
  },
  {
    name: 'Few-Shot',
    icon: '📋',
    instruction: 'Rewrite this prompt using Few-Shot technique. Add 2-3 concrete input/output examples that demonstrate the expected behavior before presenting the actual task.'
  },
  {
    name: 'Role + Constraints',
    icon: '🎭',
    instruction: 'Rewrite this prompt using Role Prompting combined with clear Constraints. Assign a specific expert role, set explicit boundaries (length, format, tone), and include both positive and negative constraints.'
  }
];

/**
 * Generate multiple prompt variations using different techniques.
 * @param {string} userMessage - The original prompt to improve
 * @returns {Promise<Array<{name: string, icon: string, content: string, error: string|null}>>}
 */
export async function generateVariations(userMessage) {
  const model = getSelectedModel();

  const promises = VARIATION_STYLES.map(async (style) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: `You are an expert prompt engineer. ${style.instruction}\n\nRespond with ONLY the rewritten prompt, nothing else. Do not add commentary or explanations.`
            },
            { role: 'user', content: userMessage }
          ],
          stream: false,
          options: { temperature: 0.7, num_predict: 1024 }
        })
      });

      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      return {
        name: style.name,
        icon: style.icon,
        content: data.message?.content || 'No response',
        error: null
      };
    } catch (e) {
      return { name: style.name, icon: style.icon, content: null, error: e.message };
    }
  });

  return Promise.all(promises);
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
