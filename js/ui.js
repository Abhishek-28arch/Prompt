// ============================================
// UI Controller Module
// DOM manipulation, event handlers, rendering
// ============================================

import { getAllTopics, getBuiltInTopics, getCustomTopics, addCustomTopic, removeCustomTopic } from './knowledge-base.js';
import { retrieve, buildContext, getSourceTags } from './rag-engine.js';
import { sendMessage, loadConversationMemory, saveConversationMemory, clearConversationMemory, getModelInfo, getMessageCount, fetchAvailableModels, checkOllamaStatus, getSelectedModel, setSelectedModel } from './api.js';

// ============================================
// State
// ============================================

let enabledTopicIds = new Set(getAllTopics().map(t => t.id));
let conversationHistory = loadConversationMemory();
let isProcessing = false;

// ============================================
// DOM Helpers
// ============================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Simple markdown-to-HTML renderer
function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  // Unordered lists
  html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>(<h[2-4]>)/g, '$1');
  html = html.replace(/(<\/h[2-4]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');

  return html;
}

// ============================================
// Chat Rendering
// ============================================

function createMessageElement(role, content, sources = []) {
  const msg = document.createElement('div');
  msg.className = `message message-${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = role === 'user'
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = role === 'assistant' ? renderMarkdown(content) : `<p>${escapeHtml(content)}</p>`;

  bubble.appendChild(contentDiv);

  // Source tags for assistant messages
  if (role === 'assistant' && sources.length > 0) {
    const sourcesDiv = document.createElement('div');
    sourcesDiv.className = 'message-sources';
    sourcesDiv.innerHTML = '<span class="sources-label">Sources:</span>';
    sources.forEach(src => {
      const tag = document.createElement('span');
      tag.className = 'source-tag';
      tag.textContent = `${src.title} (${src.score}%)`;
      tag.title = `Relevance: ${src.score}%`;
      sourcesDiv.appendChild(tag);
    });
    bubble.appendChild(sourcesDiv);
  }

  msg.appendChild(avatar);
  msg.appendChild(bubble);

  return msg;
}

function addTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'message message-assistant typing-indicator-wrapper';
  indicator.id = 'typing-indicator';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.innerHTML = '<span></span><span></span><span></span>';

  bubble.appendChild(typing);
  indicator.appendChild(avatar);
  indicator.appendChild(bubble);

  const chatMessages = $('#chat-messages');
  chatMessages.appendChild(indicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = $('#typing-indicator');
  if (indicator) indicator.remove();
}

function scrollToBottom() {
  const chatMessages = $('#chat-messages');
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendMessage(role, content, sources = []) {
  const chatMessages = $('#chat-messages');
  const msg = createMessageElement(role, content, sources);
  chatMessages.appendChild(msg);

  // Animate in
  requestAnimationFrame(() => {
    msg.classList.add('message-visible');
  });

  scrollToBottom();
}

// ============================================
// Topic Chips
// ============================================

function renderTopicChips() {
  const container = $('#topic-chips');
  container.innerHTML = '';

  const allTopics = getAllTopics();

  allTopics.forEach(topic => {
    const chip = document.createElement('button');
    chip.className = `topic-chip ${enabledTopicIds.has(topic.id) ? 'active' : ''}`;
    chip.dataset.topicId = topic.id;

    const icon = topic.isCustom ? '📝' : '📚';
    chip.innerHTML = `<span class="chip-icon">${icon}</span><span class="chip-label">${escapeHtml(topic.title)}</span>`;

    if (topic.isCustom) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'chip-remove';
      removeBtn.innerHTML = '×';
      removeBtn.title = 'Remove custom topic';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleRemoveCustomTopic(topic.id);
      });
      chip.appendChild(removeBtn);
    }

    chip.addEventListener('click', () => {
      toggleTopic(topic.id);
    });

    container.appendChild(chip);
  });

  updateChipCount();
}

function toggleTopic(topicId) {
  if (enabledTopicIds.has(topicId)) {
    enabledTopicIds.delete(topicId);
  } else {
    enabledTopicIds.add(topicId);
  }

  // Update chip UI
  const chip = $(`.topic-chip[data-topic-id="${topicId}"]`);
  if (chip) chip.classList.toggle('active');

  updateChipCount();
}

function updateChipCount() {
  const total = getAllTopics().length;
  const active = enabledTopicIds.size;
  const counter = $('#active-topics-count');
  if (counter) counter.textContent = `${active}/${total} active`;
}

function selectAllTopics() {
  enabledTopicIds = new Set(getAllTopics().map(t => t.id));
  renderTopicChips();
}

function deselectAllTopics() {
  enabledTopicIds.clear();
  renderTopicChips();
}

// ============================================
// Quick Prompts
// ============================================

const QUICK_PROMPTS = [
  { label: '✍️ Improve my prompt', text: 'How can I improve this prompt to get better results?' },
  { label: '🔗 Chain prompts', text: 'How do I chain multiple prompts together for a complex task?' },
  { label: '📋 Format output', text: 'How do I make the AI output in a specific format like JSON or markdown?' },
  { label: '🎭 Set a role', text: 'How do I use role prompting to get more expert-level responses?' },
  { label: '🧠 Think step by step', text: 'How do I use chain of thought prompting for complex reasoning?' },
  { label: '📐 System prompt', text: 'How do I write an effective system prompt for a chatbot?' }
];

function renderQuickPrompts() {
  const container = $('#quick-prompts');
  container.innerHTML = '';

  QUICK_PROMPTS.forEach(qp => {
    const btn = document.createElement('button');
    btn.className = 'quick-prompt-btn';
    btn.textContent = qp.label;
    btn.title = qp.text;
    btn.addEventListener('click', () => {
      const input = $('#message-input');
      input.value = qp.text;
      input.focus();
      handleSendMessage();
    });
    container.appendChild(btn);
  });
}

// ============================================
// Settings Panel
// ============================================

async function initSettings() {
  // Model selector
  const modelSelect = $('#model-select');
  const refreshBtn = $('#refresh-models-btn');
  const savedModel = getSelectedModel();

  // Load models
  await populateModelSelector();

  modelSelect.addEventListener('change', () => {
    setSelectedModel(modelSelect.value);
    $('#model-name').textContent = modelSelect.value;
    showToast(`Switched to ${modelSelect.value}`, 'success');
  });

  refreshBtn.addEventListener('click', async () => {
    refreshBtn.classList.add('spinning');
    await populateModelSelector();
    refreshBtn.classList.remove('spinning');
    showToast('Models refreshed', 'info');
  });

  // Check Ollama status
  await updateOllamaStatus();

  // Model info in footer
  $('#model-name').textContent = savedModel;

  // Settings toggle
  $('#settings-toggle').addEventListener('click', () => {
    $('#settings-panel').classList.toggle('open');
  });

  // Close settings when clicking outside
  document.addEventListener('click', (e) => {
    const panel = $('#settings-panel');
    const toggle = $('#settings-toggle');
    if (panel.classList.contains('open') && !panel.contains(e.target) && !toggle.contains(e.target)) {
      panel.classList.remove('open');
    }
  });
}

async function populateModelSelector() {
  const modelSelect = $('#model-select');
  const savedModel = getSelectedModel();
  const models = await fetchAvailableModels();

  modelSelect.innerHTML = '';

  if (models.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No models found — is Ollama running?';
    opt.disabled = true;
    modelSelect.appendChild(opt);
    return;
  }

  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.name;
    const sizeLabel = m.size ? ` (${m.size})` : '';
    opt.textContent = `${m.name}${sizeLabel}`;
    if (m.name === savedModel) opt.selected = true;
    modelSelect.appendChild(opt);
  });

  // If saved model isn't in the list, select the first one
  if (!models.some(m => m.name === savedModel) && models.length > 0) {
    modelSelect.value = models[0].name;
    setSelectedModel(models[0].name);
  }
}

async function updateOllamaStatus() {
  const isOnline = await checkOllamaStatus();
  const status = $('#ollama-status');
  if (isOnline) {
    status.innerHTML = '<span class="status-dot status-connected"></span> Ollama Online';
    status.className = 'api-key-status connected';
  } else {
    status.innerHTML = '<span class="status-dot status-disconnected"></span> Ollama Offline';
    status.className = 'api-key-status disconnected';
  }
}

// ============================================
// Custom Knowledge Modal
// ============================================

function initCustomKnowledgeModal() {
  const openBtn = $('#add-knowledge-btn');
  const modal = $('#custom-knowledge-modal');
  const closeBtn = $('#modal-close');
  const saveBtn = $('#save-knowledge-btn');
  const cancelBtn = $('#cancel-knowledge-btn');

  openBtn.addEventListener('click', () => {
    modal.classList.add('open');
    $('#custom-title').value = '';
    $('#custom-content').value = '';
    $('#custom-tags').value = '';
    $('#custom-title').focus();
  });

  closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  cancelBtn.addEventListener('click', () => modal.classList.remove('open'));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  saveBtn.addEventListener('click', handleSaveCustomKnowledge);
}

function handleSaveCustomKnowledge() {
  const title = $('#custom-title').value.trim();
  const content = $('#custom-content').value.trim();
  const tagsStr = $('#custom-tags').value.trim();

  if (!title || !content) {
    showToast('Please fill in both title and content.', 'error');
    return;
  }

  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  const newTopic = addCustomTopic(title, content, tags);

  enabledTopicIds.add(newTopic.id);
  renderTopicChips();

  $('#custom-knowledge-modal').classList.remove('open');
  showToast(`Added "${title}" to your knowledge base!`, 'success');
}

function handleRemoveCustomTopic(topicId) {
  const topic = getAllTopics().find(t => t.id === topicId);
  if (!topic) return;

  if (confirm(`Remove "${topic.title}" from your custom knowledge?`)) {
    removeCustomTopic(topicId);
    enabledTopicIds.delete(topicId);
    renderTopicChips();
    showToast(`Removed "${topic.title}"`, 'info');
  }
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================
// Conversation Memory UI
// ============================================

function updateMemoryIndicator() {
  const count = conversationHistory.length;
  const indicator = $('#memory-count');
  const clearBtn = $('#clear-memory-btn');

  if (indicator) indicator.textContent = `${count} messages`;
  if (clearBtn) clearBtn.style.display = count > 0 ? 'flex' : 'none';
}

function handleClearMemory() {
  if (confirm('Clear conversation history? This cannot be undone.')) {
    conversationHistory = [];
    clearConversationMemory();
    updateMemoryIndicator();
    // Clear chat UI
    const chatMessages = $('#chat-messages');
    chatMessages.innerHTML = '';
    addWelcomeMessage();
    showToast('Conversation cleared', 'info');
  }
}

// ============================================
// Sidebar Toggle (Mobile)
// ============================================

function initSidebarToggle() {
  const toggle = $('#sidebar-toggle');
  const sidebar = $('#sidebar');
  const overlay = $('#sidebar-overlay');

  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  }
}

// ============================================
// Welcome Message
// ============================================

function addWelcomeMessage() {
  const welcome = `Welcome to **PromptCraft AI**! 🚀

I'm your prompt engineering assistant powered by **local AI via Ollama**. I can help you:

- ✍️ Write better prompts for any AI model
- 🧠 Learn techniques like Chain of Thought, Few-Shot, and more
- 📋 Format outputs in JSON, markdown, or any structure
- 🔗 Chain prompts for complex workflows
- 🎭 Use role prompting for expert-level responses

**Getting Started:**
1. Make sure Ollama is running locally
2. Select your preferred model in ⚙️ Settings
3. Type a question or click a Quick Prompt below
4. Toggle knowledge topics in the sidebar to focus my expertise

**No API keys needed** — everything runs on your machine! 🔒`;

  appendMessage('assistant', welcome, []);
}

// ============================================
// Core Chat Handler
// ============================================

async function handleSendMessage() {
  const input = $('#message-input');
  const userMessage = input.value.trim();

  if (!userMessage || isProcessing) return;

  isProcessing = true;
  input.value = '';
  input.style.height = 'auto';
  updateSendButtonState();

  // Show user message
  appendMessage('user', userMessage);

  // Retrieve relevant knowledge
  const results = retrieve(userMessage, {
    topK: 3,
    enabledTopicIds: enabledTopicIds.size > 0 ? enabledTopicIds : null
  });

  const ragContext = buildContext(results);
  const sourceTags = getSourceTags(results);

  // Show typing indicator
  addTypingIndicator();

  // Send to API
  const { content, error } = await sendMessage(userMessage, ragContext, conversationHistory);

  removeTypingIndicator();

  if (error) {
    appendMessage('assistant', `⚠️ ${error}`, []);
  } else {
    appendMessage('assistant', content, sourceTags);

    // Update conversation memory
    conversationHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: content }
    );
    saveConversationMemory(conversationHistory);
  }

  updateMemoryIndicator();
  isProcessing = false;
  updateSendButtonState();
}

function updateSendButtonState() {
  const sendBtn = $('#send-btn');
  const input = $('#message-input');
  sendBtn.disabled = isProcessing || !input.value.trim();
}

// ============================================
// Input Handling
// ============================================

function initInputHandlers() {
  const input = $('#message-input');
  const sendBtn = $('#send-btn');

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    updateSendButtonState();
  });

  // Send on Enter (Shift+Enter for new line)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  sendBtn.addEventListener('click', handleSendMessage);

  // Clear memory button
  const clearBtn = $('#clear-memory-btn');
  if (clearBtn) clearBtn.addEventListener('click', handleClearMemory);

  // Select/deselect all topics
  const selectAll = $('#select-all-topics');
  const deselectAll = $('#deselect-all-topics');
  if (selectAll) selectAll.addEventListener('click', selectAllTopics);
  if (deselectAll) deselectAll.addEventListener('click', deselectAllTopics);
}

// ============================================
// Initialize UI
// ============================================

export function initUI() {
  renderTopicChips();
  renderQuickPrompts();
  initSettings();
  initCustomKnowledgeModal();
  initInputHandlers();
  initSidebarToggle();
  updateMemoryIndicator();

  // Restore conversation history in UI
  if (conversationHistory.length > 0) {
    conversationHistory.forEach(msg => {
      appendMessage(msg.role, msg.content, []);
    });
  } else {
    addWelcomeMessage();
  }

  // Focus input
  setTimeout(() => $('#message-input')?.focus(), 100);
}
