// ============================================
// UI Controller Module
// DOM manipulation, event handlers, rendering
// ============================================

import { getAllTopics, getBuiltInTopics, getCustomTopics, addCustomTopic, removeCustomTopic } from './knowledge-base.js';
import { retrieve, buildContext, getSourceTags } from './rag-engine.js';
import { sendMessage, loadConversationMemory, saveConversationMemory, clearConversationMemory, getModelInfo, getMessageCount, fetchAvailableModels, checkOllamaStatus, getSelectedModel, setSelectedModel, ratePrompt, generateVariations } from './api.js';
import { saveToHistory, getHistory, deleteHistoryItem, clearAllHistory, formatHistoryDate } from './prompt-history.js';
import { TEMPLATES, getTemplateCategories, getTemplatesByCategory, extractFields, fillTemplate } from './templates.js';

// ============================================
// State
// ============================================

let enabledTopicIds = new Set(getAllTopics().map(t => t.id));
let conversationHistory = loadConversationMemory();
let isProcessing = false;
let compareMode = false;
let webSearchEnabled = false;

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

  // Action buttons for assistant messages
  if (role === 'assistant') {
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copy';
        }, 2000);
      });
    });

    // Download MD button
    const mdBtn = document.createElement('button');
    mdBtn.className = 'action-btn';
    mdBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> .md';
    mdBtn.addEventListener('click', () => downloadAsFile(content, 'prompt.md', 'text/markdown'));

    // Download JSON button
    const jsonBtn = document.createElement('button');
    jsonBtn.className = 'action-btn';
    jsonBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> .json';
    jsonBtn.addEventListener('click', () => {
      const jsonData = JSON.stringify({ content, sources, timestamp: new Date().toISOString() }, null, 2);
      downloadAsFile(jsonData, 'prompt.json', 'application/json');
    });

    // Rate button
    const rateBtn = document.createElement('button');
    rateBtn.className = 'action-btn action-btn-accent';
    rateBtn.innerHTML = '⭐ Rate';
    rateBtn.addEventListener('click', () => handleRatePrompt(content, bubble, rateBtn));

    actions.appendChild(copyBtn);
    actions.appendChild(mdBtn);
    actions.appendChild(jsonBtn);
    actions.appendChild(rateBtn);
    bubble.appendChild(actions);
  }

  msg.appendChild(avatar);
  msg.appendChild(bubble);

  return msg;
}

function downloadAsFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Downloaded ${filename}`, 'success');
}

async function handleRatePrompt(content, bubble, rateBtn) {
  rateBtn.disabled = true;
  rateBtn.innerHTML = '⏳ Rating...';

  const { ratings, error } = await ratePrompt(content);

  if (error) {
    showToast(error, 'error');
    rateBtn.disabled = false;
    rateBtn.innerHTML = '⭐ Rate';
    return;
  }

  // Remove existing rating card if any
  const existingCard = bubble.querySelector('.prompt-rating-card');
  if (existingCard) existingCard.remove();

  const card = document.createElement('div');
  card.className = 'prompt-rating-card';

  const dimensions = [
    { key: 'role', label: 'Role Definition', icon: '🎭' },
    { key: 'clarity', label: 'Clarity', icon: '💡' },
    { key: 'constraints', label: 'Constraints', icon: '📐' },
    { key: 'chain_of_thought', label: 'Chain of Thought', icon: '🧠' },
    { key: 'output_format', label: 'Output Format', icon: '📋' }
  ];

  const overall = ratings.overall || (
    dimensions.reduce((sum, d) => sum + (ratings[d.key]?.score || 0), 0) / dimensions.length
  ).toFixed(1);

  let cardHTML = `<div class="rating-header"><span class="rating-overall-score">${overall}/5</span><span class="rating-overall-label">Overall Score</span></div>`;

  dimensions.forEach(dim => {
    const data = ratings[dim.key] || { score: 0, feedback: 'N/A' };
    const pct = (data.score / 5) * 100;
    cardHTML += `
      <div class="rating-row">
        <span class="rating-label">${dim.icon} ${dim.label}</span>
        <div class="rating-bar"><div class="rating-fill" style="width:${pct}%" data-score="${data.score}"></div></div>
        <span class="rating-score">${data.score}/5</span>
      </div>
      <div class="rating-feedback">${escapeHtml(data.feedback)}</div>`;
  });

  if (ratings.suggestion) {
    cardHTML += `<div class="rating-suggestion">💡 <strong>Suggestion:</strong> ${escapeHtml(ratings.suggestion)}</div>`;
  }

  card.innerHTML = cardHTML;
  bubble.appendChild(card);

  rateBtn.innerHTML = '⭐ Rated';
  rateBtn.disabled = true;

  scrollToBottom();
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
// Comparison Mode Rendering
// ============================================

function appendComparisonResult(variations) {
  const chatMessages = $('#chat-messages');
  const wrapper = document.createElement('div');
  wrapper.className = 'message message-assistant';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble comparison-bubble';

  const header = document.createElement('div');
  header.className = 'comparison-header';
  header.innerHTML = '<h4>🔀 Prompt Variations</h4><p>Same prompt, three different techniques:</p>';
  bubble.appendChild(header);

  const container = document.createElement('div');
  container.className = 'comparison-container';

  variations.forEach(v => {
    const card = document.createElement('div');
    card.className = 'comparison-card';
    card.innerHTML = `
      <div class="comparison-card-header">
        <span>${v.icon} ${v.name}</span>
        <button class="action-btn comparison-copy" title="Copy">📋</button>
      </div>
      <div class="comparison-card-body">${v.error ? `<p class="error">⚠️ ${escapeHtml(v.error)}</p>` : renderMarkdown(v.content)}</div>`;

    const copyBtn = card.querySelector('.comparison-copy');
    if (v.content && copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(v.content);
        showToast('Variation copied!', 'success');
      });
    }

    container.appendChild(card);
  });

  bubble.appendChild(container);
  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatMessages.appendChild(wrapper);

  requestAnimationFrame(() => wrapper.classList.add('message-visible'));
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
  const modelSelect = $('#model-select');
  const refreshBtn = $('#refresh-models-btn');
  const savedModel = getSelectedModel();

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

  await updateOllamaStatus();
  $('#model-name').textContent = savedModel;

  $('#settings-toggle').addEventListener('click', () => {
    $('#settings-panel').classList.toggle('open');
  });

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
// Templates Modal
// ============================================

function initTemplatesModal() {
  const openBtn = $('#templates-btn');
  const modal = $('#templates-modal');
  const closeBtn = $('#templates-modal-close');

  if (!openBtn || !modal) return;

  openBtn.addEventListener('click', () => {
    modal.classList.add('open');
    renderTemplatesContent('All');
  });

  closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
}

function renderTemplatesContent(activeCategory) {
  const categoriesContainer = $('#template-categories');
  const cardsContainer = $('#template-cards');
  if (!categoriesContainer || !cardsContainer) return;

  // Category tabs
  const categories = ['All', ...getTemplateCategories()];
  categoriesContainer.innerHTML = '';
  categories.forEach(cat => {
    const tab = document.createElement('button');
    tab.className = `template-category-tab ${cat === activeCategory ? 'active' : ''}`;
    tab.textContent = cat;
    tab.addEventListener('click', () => renderTemplatesContent(cat));
    categoriesContainer.appendChild(tab);
  });

  // Template cards
  const templates = getTemplatesByCategory(activeCategory);
  cardsContainer.innerHTML = '';
  templates.forEach(tpl => {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.innerHTML = `
      <div class="template-card-icon">${tpl.icon}</div>
      <div class="template-card-info">
        <h4>${escapeHtml(tpl.name)}</h4>
        <p>${escapeHtml(tpl.description)}</p>
        <span class="template-card-category">${tpl.category}</span>
      </div>`;
    card.addEventListener('click', () => showTemplateForm(tpl));
    cardsContainer.appendChild(card);
  });
}

function showTemplateForm(tpl) {
  const cardsContainer = $('#template-cards');
  const fields = extractFields(tpl.template);

  cardsContainer.innerHTML = `
    <div class="template-form">
      <button class="template-back-btn" id="template-back">← Back to templates</button>
      <h3>${tpl.icon} ${escapeHtml(tpl.name)}</h3>
      <p class="template-form-desc">${escapeHtml(tpl.description)}</p>
      <div class="template-fields" id="template-fields"></div>
      <button class="btn btn-primary template-use-btn" id="template-use">Use This Prompt</button>
    </div>`;

  const fieldsContainer = $('#template-fields');
  fields.forEach(field => {
    const label = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const group = document.createElement('div');
    group.className = 'form-group';
    group.innerHTML = `
      <label class="form-label">${label}</label>
      ${field === 'code' || field === 'data'
        ? `<textarea class="form-textarea template-field-input" data-field="${field}" rows="4" placeholder="Enter ${label.toLowerCase()}..."></textarea>`
        : `<input type="text" class="form-input template-field-input" data-field="${field}" placeholder="Enter ${label.toLowerCase()}...">`
      }`;
    fieldsContainer.appendChild(group);
  });

  $('#template-back').addEventListener('click', () => renderTemplatesContent('All'));
  $('#template-use').addEventListener('click', () => {
    const values = {};
    $$('.template-field-input').forEach(input => {
      values[input.dataset.field] = input.value;
    });
    const filled = fillTemplate(tpl.template, values);
    const input = $('#message-input');
    input.value = filled;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    updateSendButtonState();
    $('#templates-modal').classList.remove('open');
    input.focus();
    showToast('Template loaded! Edit if needed, then send.', 'success');
  });
}

// ============================================
// Prompt History UI
// ============================================

function renderHistoryList() {
  const container = $('#history-list');
  if (!container) return;

  const history = getHistory();
  container.innerHTML = '';

  if (history.length === 0) {
    container.innerHTML = '<div class="history-empty">No prompts yet</div>';
    return;
  }

  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-item-header">
        <span class="history-title" title="${escapeHtml(item.query)}">${escapeHtml(item.title)}</span>
        <span class="history-date">${formatHistoryDate(item.timestamp)}</span>
      </div>
      <div class="history-actions">
        <button class="history-copy-btn" title="Copy prompt">📋</button>
        <button class="history-load-btn" title="Load into chat">↩️</button>
        <button class="history-del-btn" title="Delete">🗑️</button>
      </div>`;

    div.querySelector('.history-copy-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(item.response);
      showToast('Prompt copied!', 'success');
    });

    div.querySelector('.history-load-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const input = $('#message-input');
      input.value = item.query;
      input.focus();
      updateSendButtonState();
      showToast('Prompt loaded into input', 'info');
    });

    div.querySelector('.history-del-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHistoryItem(item.id);
      renderHistoryList();
      showToast('Removed from history', 'info');
    });

    container.appendChild(div);
  });
}

function initHistoryControls() {
  const clearBtn = $('#clear-history-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all prompt history?')) {
        clearAllHistory();
        renderHistoryList();
        showToast('History cleared', 'info');
      }
    });
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

**New Features:**
- ⭐ **Rate any prompt** on 5 dimensions (role, clarity, constraints, CoT, format)
- 📂 **Templates** — pre-built prompt templates for common tasks
- 🔀 **Compare mode** — generate 3 prompt variations side by side
- 📜 **History** — revisit and reuse past prompts
- 📥 **Export** — copy, download as .md or .json

**Getting Started:**
1. Make sure Ollama is running locally
2. Select your preferred model in ⚙️ Settings
3. Type a question or click a Quick Prompt below

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

  // Check if compare mode
  if (compareMode) {
    addTypingIndicator();
    const variations = await generateVariations(userMessage);
    removeTypingIndicator();
    appendComparisonResult(variations);

    conversationHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: `[Comparison of 3 variations generated]` }
    );
    saveConversationMemory(conversationHistory);
    saveToHistory(userMessage, variations.map(v => `${v.icon} ${v.name}:\n${v.content}`).join('\n\n---\n\n'));
  } else {
    // Retrieve relevant knowledge (now async with embeddings)
    const results = await retrieve(userMessage, {
      topK: 3,
      enabledTopicIds: enabledTopicIds.size > 0 ? enabledTopicIds : null
    });

    const ragContext = buildContext(results);
    const sourceTags = getSourceTags(results);

    // Show typing indicator
    addTypingIndicator();

    // Send to API
    const { content, error } = await sendMessage(userMessage, ragContext, conversationHistory, { webSearchEnabled });

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

      // Save to history
      saveToHistory(userMessage, content);
    }
  }

  updateMemoryIndicator();
  renderHistoryList();
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

  // Compare mode toggle
  const compareToggle = $('#compare-toggle');
  if (compareToggle) {
    compareToggle.addEventListener('click', () => {
      compareMode = !compareMode;
      compareToggle.classList.toggle('active', compareMode);
      showToast(compareMode ? 'Compare mode ON — next prompt generates 3 variations' : 'Compare mode OFF', 'info');
    });
  }

  // Web search toggle
  const webSearchToggle = $('#web-search-toggle');
  if (webSearchToggle) {
    webSearchToggle.addEventListener('click', () => {
      webSearchEnabled = !webSearchEnabled;
      webSearchToggle.classList.toggle('active', webSearchEnabled);
      showToast(webSearchEnabled ? 'Web search awareness ON' : 'Web search awareness OFF', 'info');
    });
  }
}

// ============================================
// Initialize UI
// ============================================

export function initUI() {
  renderTopicChips();
  renderQuickPrompts();
  initSettings();
  initCustomKnowledgeModal();
  initTemplatesModal();
  initInputHandlers();
  initSidebarToggle();
  initHistoryControls();
  updateMemoryIndicator();
  renderHistoryList();

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
