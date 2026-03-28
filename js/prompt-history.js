// ============================================
// Prompt History Module
// Saves and manages generated prompt history
// ============================================

const HISTORY_KEY = 'promptAssistant_promptHistory';
const MAX_HISTORY = 50;

function loadHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn('Failed to load prompt history:', e);
    return [];
  }
}

function saveHistoryStore(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save prompt history:', e);
  }
}

/**
 * Save a prompt exchange to history.
 * @param {string} query - User's query
 * @param {string} response - Assistant's response
 */
export function saveToHistory(query, response) {
  const history = loadHistory();
  const title = query.length > 60 ? query.substring(0, 60) + '…' : query;
  const item = {
    id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    title,
    query,
    response,
    timestamp: new Date().toISOString()
  };
  history.unshift(item); // newest first
  if (history.length > MAX_HISTORY) history.pop();
  saveHistoryStore(history);
  return item;
}

/**
 * Get all history items.
 * @returns {Array}
 */
export function getHistory() {
  return loadHistory();
}

/**
 * Delete a single history item.
 * @param {string} id
 */
export function deleteHistoryItem(id) {
  const history = loadHistory().filter(h => h.id !== id);
  saveHistoryStore(history);
  return history;
}

/**
 * Clear all history.
 */
export function clearAllHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

/**
 * Format a date string for display.
 * @param {string} isoString
 * @returns {string}
 */
export function formatHistoryDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
