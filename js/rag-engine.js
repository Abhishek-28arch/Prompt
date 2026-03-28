// ============================================
// RAG Engine Module
// Lightweight TF-IDF retrieval for in-browser use
// ============================================

import { getAllTopics } from './knowledge-base.js';

// ============================================
// Text Processing
// ============================================

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
  'not', 'no', 'nor', 'so', 'yet', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'than', 'too', 'very', 'just',
  'about', 'up', 'out', 'if', 'then', 'that', 'this', 'it', 'its',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they',
  'them', 'their', 'what', 'which', 'who', 'whom', 'when', 'where',
  'how', 'all', 'any', 'use', 'used', 'using'
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

// ============================================
// TF-IDF Computation
// ============================================

function computeTF(tokens) {
  const tf = {};
  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1;
  });
  // Normalize by document length
  const len = tokens.length || 1;
  Object.keys(tf).forEach(token => {
    tf[token] /= len;
  });
  return tf;
}

function computeIDF(documents) {
  const idf = {};
  const N = documents.length;

  documents.forEach(doc => {
    const uniqueTokens = new Set(doc.tokens);
    uniqueTokens.forEach(token => {
      idf[token] = (idf[token] || 0) + 1;
    });
  });

  Object.keys(idf).forEach(token => {
    idf[token] = Math.log((N + 1) / (idf[token] + 1)) + 1; // smoothed IDF
  });

  return idf;
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  allKeys.forEach(key => {
    const a = vecA[key] || 0;
    const b = vecB[key] || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  });

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================
// RAG Retrieval
// ============================================

/**
 * Retrieve the top-K most relevant topics for a given query.
 * @param {string} query - The user's question or task
 * @param {Object} options
 * @param {number} options.topK - Number of results to return (default 3)
 * @param {Set<string>|null} options.enabledTopicIds - If set, only consider these topic IDs
 * @param {number} options.minScore - Minimum similarity score threshold (default 0.05)
 * @returns {Array<{topic: Object, score: number}>}
 */
export function retrieve(query, options = {}) {
  const { topK = 3, enabledTopicIds = null, minScore = 0.05 } = options;

  const allTopics = getAllTopics();
  const topics = enabledTopicIds
    ? allTopics.filter(t => enabledTopicIds.has(t.id))
    : allTopics;

  if (topics.length === 0) return [];

  // Prepare documents
  const documents = topics.map(topic => {
    const text = `${topic.title} ${topic.tags.join(' ')} ${topic.content}`;
    const tokens = tokenize(text);
    return { topic, tokens, tf: computeTF(tokens) };
  });

  // Compute IDF across all documents
  const idf = computeIDF(documents);

  // Compute TF-IDF vectors for documents
  documents.forEach(doc => {
    doc.tfidf = {};
    Object.keys(doc.tf).forEach(token => {
      doc.tfidf[token] = doc.tf[token] * (idf[token] || 0);
    });
  });

  // Compute query TF-IDF vector
  const queryTokens = tokenize(query);
  const queryTF = computeTF(queryTokens);
  const queryTFIDF = {};
  Object.keys(queryTF).forEach(token => {
    queryTFIDF[token] = queryTF[token] * (idf[token] || 1);
  });

  // Score each document
  const scored = documents.map(doc => ({
    topic: doc.topic,
    score: cosineSimilarity(queryTFIDF, doc.tfidf)
  }));

  // Sort by score descending, filter by min score, return top K
  return scored
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Build a context string from retrieved topics for injection into the LLM prompt.
 * @param {Array<{topic: Object, score: number}>} results
 * @returns {string}
 */
export function buildContext(results) {
  if (results.length === 0) {
    return 'No specific prompt engineering knowledge was retrieved. Answer based on general knowledge.';
  }

  let context = '## Retrieved Prompt Engineering Knowledge\n\n';
  results.forEach(({ topic, score }, i) => {
    context += `### ${i + 1}. ${topic.title} (relevance: ${(score * 100).toFixed(0)}%)\n`;
    context += topic.content.trim() + '\n\n';
  });

  return context;
}

/**
 * Get source tags (topic names + scores) for display in the UI.
 * @param {Array<{topic: Object, score: number}>} results
 * @returns {Array<{id: string, title: string, score: number}>}
 */
export function getSourceTags(results) {
  return results.map(({ topic, score }) => ({
    id: topic.id,
    title: topic.title,
    score: Math.round(score * 100)
  }));
}
