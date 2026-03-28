// ============================================
// App Entry Point
// Wires all modules together
// ============================================

import { initUI } from './ui.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 PromptCraft AI initializing...');
  initUI();
  console.log('✅ PromptCraft AI ready!');
});
