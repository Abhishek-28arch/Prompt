// ============================================
// Prompt Templates Module
// Pre-built template library with fill-in fields
// ============================================

export const TEMPLATES = [
  {
    id: 'research',
    category: 'Research',
    name: 'Deep Research Report',
    icon: '🔬',
    description: 'Generate a comprehensive research report on any topic',
    template: `You are a senior research analyst with expertise in {{domain}}.

Write a comprehensive research report on: {{topic}}

Requirements:
- Include an executive summary
- Cover at least 5 key aspects/subtopics
- Provide data points and evidence where possible
- Include a "Current Trends" section
- End with actionable recommendations

Format: Use markdown with clear headers, bullet points, and bold key terms.
Length: {{length}} words.`
  },
  {
    id: 'code-review',
    category: 'Development',
    name: 'Code Review',
    icon: '🔍',
    description: 'Get a thorough code review with actionable feedback',
    template: `You are a senior {{language}} developer with 15+ years of experience in production systems.

Review the following code for:
1. **Bugs & Logic Errors** — Identify any functional issues
2. **Performance** — Spot inefficiencies and suggest optimizations
3. **Security** — Flag potential vulnerabilities
4. **Readability** — Suggest naming, structure, and documentation improvements
5. **Best Practices** — Recommend {{language}}-specific patterns

Code to review:
\`\`\`{{language}}
{{code}}
\`\`\`

Provide your review as a numbered list of findings, each with severity (🔴 Critical, 🟡 Warning, 🟢 Suggestion) and a fix.`
  },
  {
    id: 'content-writing',
    category: 'Content',
    name: 'Blog Post Writer',
    icon: '✍️',
    description: 'Create engaging blog posts with SEO optimization',
    template: `You are an expert content writer specializing in {{niche}}.

Write a blog post about: {{topic}}

Requirements:
- Target audience: {{audience}}
- Tone: {{tone}}
- Include an attention-grabbing headline
- Use subheadings (H2, H3) for structure
- Include a compelling introduction and conclusion
- Add a call-to-action at the end
- Naturally incorporate these keywords: {{keywords}}

Length: approximately {{length}} words.`
  },
  {
    id: 'data-analysis',
    category: 'Data',
    name: 'Data Analysis Prompt',
    icon: '📊',
    description: 'Analyze data with structured insights and visualizations',
    template: `You are a data analyst with expertise in {{domain}}.

Analyze the following data and provide insights:

{{data}}

Your analysis should include:
1. **Summary Statistics** — Key metrics and patterns
2. **Trends** — Notable trends or changes over time
3. **Anomalies** — Any outliers or unexpected patterns
4. **Correlations** — Relationships between variables
5. **Recommendations** — Data-driven action items

Present findings in a clear, structured format with bullet points.
Suggest {{count}} visualizations that would best represent this data.`
  },
  {
    id: 'email-writer',
    category: 'Business',
    name: 'Professional Email',
    icon: '📧',
    description: 'Draft professional emails for any business context',
    template: `You are a professional communication specialist.

Draft an email with the following details:
- **Purpose**: {{purpose}}
- **Recipient**: {{recipient}}
- **Tone**: {{tone}}
- **Key points to cover**: {{key_points}}

Requirements:
- Clear, concise subject line
- Professional greeting
- Maximum 200 words in the body
- Clear call to action
- Professional sign-off
- Do NOT use jargon or overly formal language`
  },
  {
    id: 'learning-tutor',
    category: 'Education',
    name: 'Learning Tutor',
    icon: '🎓',
    description: 'Learn any topic with an adaptive AI tutor',
    template: `You are a patient, encouraging tutor specializing in {{subject}}.

Teach me about: {{topic}}

My current level: {{level}}

Instructions:
- Start with a simple, relatable analogy
- Break the concept into 3-5 digestible steps
- Use concrete examples from everyday life
- After each concept, include a quick check question
- If I get something wrong, explain differently — don't just repeat
- End with a summary and 3 practice exercises

Use simple language. Avoid jargon unless you define it first.`
  },
  {
    id: 'api-design',
    category: 'Development',
    name: 'API Design',
    icon: '🔗',
    description: 'Design RESTful APIs with best practices',
    template: `You are a senior API architect.

Design a RESTful API for: {{feature}}

Requirements:
- Resource: {{resource}}
- Operations needed: {{operations}}
- Authentication: {{auth_method}}

For each endpoint, provide:
1. HTTP Method + URL pattern
2. Request body/params (if any)
3. Response format (JSON schema)
4. Status codes and error responses
5. Rate limiting recommendations

Follow REST best practices:
- Use plural nouns for collections
- Use proper HTTP status codes
- Include pagination for list endpoints
- Version the API (v1)

Output as a markdown API reference.`
  },
  {
    id: 'creative-story',
    category: 'Creative',
    name: 'Story Writer',
    icon: '📖',
    description: 'Generate creative stories in any genre',
    template: `You are an award-winning {{genre}} author.

Write a short story with these elements:
- **Setting**: {{setting}}
- **Main character**: {{character}}
- **Conflict**: {{conflict}}
- **Theme**: {{theme}}

Requirements:
- Open with a hook that draws the reader in immediately
- Use vivid sensory details (sight, sound, smell, touch)
- Include dialogue that reveals character
- Build tension throughout
- End with a {{ending_type}} ending
- Length: approximately {{length}} words

Style: Show, don't tell. Use active voice. Vary sentence length for rhythm.`
  }
];

/**
 * Get all unique template categories.
 */
export function getTemplateCategories() {
  return [...new Set(TEMPLATES.map(t => t.category))];
}

/**
 * Get templates filtered by category.
 */
export function getTemplatesByCategory(category) {
  if (!category || category === 'All') return TEMPLATES;
  return TEMPLATES.filter(t => t.category === category);
}

/**
 * Extract placeholder fields from a template string.
 * @param {string} template
 * @returns {Array<string>} unique field names
 */
export function extractFields(template) {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

/**
 * Fill a template with provided values.
 * @param {string} template
 * @param {Object} values - { fieldName: value }
 * @returns {string}
 */
export function fillTemplate(template, values) {
  let filled = template;
  Object.entries(values).forEach(([key, value]) => {
    filled = filled.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `[${key}]`);
  });
  return filled;
}
