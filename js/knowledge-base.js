// ============================================
// Knowledge Base Module
// 8 built-in prompt engineering topics + custom knowledge CRUD
// ============================================

const BUILT_IN_TOPICS = [
  {
    id: 'chain-of-thought',
    title: 'Chain of Thought Prompting',
    tags: ['reasoning', 'step-by-step', 'cot', 'logic'],
    content: `
## Chain of Thought (CoT) Prompting

Chain of Thought prompting encourages the model to break down complex reasoning into intermediate steps before arriving at a final answer.

### Key Principles
- **Explicit reasoning**: Ask the model to "think step by step" or "show your reasoning"
- **Intermediate steps**: The model generates a sequence of logical steps, improving accuracy on math, logic, and multi-step problems
- **Self-verification**: The model can check its own work by reviewing the chain

### When to Use
- Math and arithmetic problems
- Logic puzzles and deduction tasks
- Multi-step reasoning (e.g., "If A then B, if B then C, what follows?")
- Complex decision-making with multiple factors

### Example Patterns
\`\`\`
# Basic CoT
"Solve this problem step by step: [problem]"

# Structured CoT
"Let's approach this systematically:
1. First, identify the key variables
2. Then, establish the relationships
3. Finally, calculate the answer
[problem]"

# CoT with verification
"Solve [problem] step by step, then verify your answer by working backwards."
\`\`\`

### Tips
- Works best with complex problems; simple factual questions don't benefit much
- Combine with few-shot examples of reasoning chains for even better results
- Use "Let's think step by step" as a simple but effective trigger phrase
- For math, ask the model to show all calculations explicitly
    `
  },
  {
    id: 'few-shot',
    title: 'Few-Shot Prompting',
    tags: ['examples', 'demonstrations', 'few-shot', 'in-context learning'],
    content: `
## Few-Shot Prompting

Few-shot prompting provides the model with a small number of input-output examples before the actual task, enabling it to learn the pattern and apply it.

### Key Principles
- **Learning by example**: The model infers the task format, style, and constraints from demonstrations
- **Pattern matching**: Consistent formatting across examples helps the model generalize
- **Quality over quantity**: 2–5 well-chosen examples usually outperform many mediocre ones

### When to Use
- Classification tasks (sentiment, category, intent)
- Data transformation (reformatting, extraction)
- Style matching (writing in a specific tone or format)
- Any task where showing is easier than telling

### Example Patterns
\`\`\`
# Classification few-shot
"Classify the sentiment of each review:

Review: 'This product is amazing, I love it!'
Sentiment: Positive

Review: 'Terrible quality, broke after one day.'
Sentiment: Negative

Review: 'It's okay, nothing special.'
Sentiment: Neutral

Review: 'Best purchase I've made this year!'
Sentiment:"

# Data extraction few-shot
"Extract the name and email from each message:

Message: 'Hi, I'm John Smith and you can reach me at john@example.com'
Name: John Smith
Email: john@example.com

Message: 'Contact Sarah Lee at sarah.lee@company.org for details'
Name: Sarah Lee
Email: sarah.lee@company.org

Message: 'Please forward this to Mike at mike123@mail.com'
Name:"
\`\`\`

### Tips
- Use diverse examples that cover edge cases
- Keep example format consistent (same delimiters, structure)
- Place the most representative examples first
- Include examples of what NOT to do if the model tends to make specific errors
- For classification, include at least one example per class
    `
  },
  {
    id: 'role-prompting',
    title: 'Role Prompting',
    tags: ['persona', 'role', 'expert', 'character'],
    content: `
## Role Prompting

Role prompting assigns a specific identity, expertise, or persona to the model, shaping its responses to align with that role's knowledge and communication style.

### Key Principles
- **Expertise framing**: "You are an expert [role]" activates domain-specific knowledge
- **Behavioral guidance**: The role sets expectations for tone, depth, and perspective
- **Consistency**: A well-defined role produces more coherent, focused responses

### When to Use
- Technical explanations (assign a domain expert role)
- Creative writing (assign a writer, poet, or storyteller role)
- Teaching and tutoring (assign a teacher or mentor role)
- Code review and debugging (assign a senior developer role)
- Brainstorming (assign an innovation consultant role)

### Example Patterns
\`\`\`
# Expert role
"You are a senior Python developer with 15 years of experience in backend systems.
Review this code and suggest improvements for performance and maintainability:
[code]"

# Teaching role
"You are a patient, encouraging math tutor for high school students.
Explain calculus derivatives in simple terms with relatable examples."

# Creative role
"You are a bestselling science fiction author known for hard sci-fi.
Write the opening paragraph of a story about first contact with an alien civilization."

# Multi-faceted role
"You are a UX researcher and designer with expertise in accessibility.
Analyze this interface mockup and provide feedback on:
1. Usability issues
2. Accessibility concerns (WCAG compliance)
3. Suggested improvements"
\`\`\`

### Tips
- Be specific about the role's experience level and domain
- Include relevant constraints (e.g., "explain simply" for a tutor role)
- Combine with other techniques (CoT + role for expert reasoning)
- Avoid conflicting roles in the same prompt
- The role should be appropriate for the task complexity
    `
  },
  {
    id: 'zero-shot',
    title: 'Zero-Shot Prompting',
    tags: ['direct', 'zero-shot', 'instruction', 'simple'],
    content: `
## Zero-Shot Prompting

Zero-shot prompting provides the model with a task instruction without any examples, relying on the model's pre-trained knowledge to understand and complete the task.

### Key Principles
- **Clear instructions**: The prompt must unambiguously describe what to do
- **Task framing**: Use action verbs and specific language ("Classify", "Summarize", "Translate")
- **Implicit knowledge**: The model uses its training data to infer the expected format and content

### When to Use
- Simple, well-defined tasks (summarization, translation, Q&A)
- When examples are hard to create or the task is self-explanatory
- Quick prototyping before investing in few-shot examples
- General knowledge questions

### Example Patterns
\`\`\`
# Direct instruction
"Summarize the following article in 3 bullet points:
[article text]"

# Task with constraints
"Translate the following English text to French.
Maintain a formal tone.
Text: 'Welcome to our annual conference.'"

# Structured zero-shot
"Classify the following customer support ticket:
Categories: [Billing, Technical, Account, Other]
Ticket: 'I can't log into my account after changing my password'
Category:"
\`\`\`

### Tips
- Start with zero-shot; add examples (few-shot) only if results are unsatisfactory
- Use precise, unambiguous language
- Specify the desired output format explicitly
- For complex tasks, break them into simpler zero-shot sub-tasks
- Works well for tasks the model has seen extensively in training data
    `
  },
  {
    id: 'output-formatting',
    title: 'Output Formatting',
    tags: ['format', 'json', 'markdown', 'structured', 'output'],
    content: `
## Output Formatting

Output formatting techniques control the structure, format, and presentation of the model's response, ensuring it meets specific requirements.

### Key Principles
- **Explicit format specification**: Tell the model exactly what format to use (JSON, markdown, CSV, etc.)
- **Templates and schemas**: Provide a template or schema for the expected output
- **Constraints**: Specify length, structure, and content requirements

### When to Use
- API responses (JSON, XML)
- Reports and documents (markdown, structured sections)
- Data extraction (tables, CSV)
- Any task where the output must conform to a specific format

### Example Patterns
\`\`\`
# JSON output
"Analyze this product review and return your analysis as JSON:
{
  "sentiment": "positive|negative|neutral",
  "key_topics": ["topic1", "topic2"],
  "confidence": 0.0-1.0,
  "summary": "one sentence summary"
}
Review: [review text]"

# Markdown output
"Create a project plan using this markdown structure:
# Project: [Name]
## Objectives
- [bullet points]
## Timeline
| Phase | Duration | Deliverables |
|-------|----------|-------------|
## Risks
- [bullet points]"

# Constrained output
"Answer in exactly 3 sentences. Use simple language suitable for a 10-year-old.
Question: How does photosynthesis work?"
\`\`\`

### Tips
- Show the exact format you want, including delimiters and nesting
- Use "Respond ONLY with [format]" to prevent extra text
- For JSON, provide the complete schema with example values
- Combine with role prompting (e.g., "You are an API that returns only JSON")
- Test edge cases to ensure format consistency
    `
  },
  {
    id: 'prompt-chaining',
    title: 'Prompt Chaining',
    tags: ['chaining', 'pipeline', 'multi-step', 'workflow'],
    content: `
## Prompt Chaining

Prompt chaining breaks a complex task into a sequence of simpler prompts, where the output of one prompt becomes the input for the next.

### Key Principles
- **Decomposition**: Split complex tasks into manageable, focused steps
- **Sequential processing**: Each step produces an intermediate result used by the next
- **Quality gates**: You can verify or modify intermediate results before proceeding
- **Modularity**: Individual steps can be tested and improved independently

### When to Use
- Complex document generation (research → outline → draft → edit)
- Multi-step analysis (gather data → analyze → recommend)
- Content pipelines (brainstorm → write → format → review)
- Any task too complex for a single prompt

### Example Patterns
\`\`\`
# 3-step content pipeline
Step 1: "Generate 5 blog post ideas about [topic]. For each, provide a title and one-sentence description."
Step 2: "Take this blog post idea: [selected from step 1]. Create a detailed outline with sections, subsections, and key points."
Step 3: "Write the full blog post following this outline: [from step 2]. Target 800 words, conversational tone."

# Analysis chain
Step 1: "Extract all factual claims from this article: [article]"
Step 2: "For each claim, assess its verifiability: [claims from step 1]"
Step 3: "Summarize the overall reliability of the article based on this analysis: [from step 2]"

# Code generation chain
Step 1: "List all functions needed for a [feature]. Include function name, parameters, and return type."
Step 2: "Write the implementation for each function: [specs from step 1]"
Step 3: "Write unit tests for these functions: [code from step 2]"
\`\`\`

### Tips
- Keep each step focused on a single task
- Include validation steps between critical stages
- Pass only necessary context between steps (avoid context bloat)
- Document the chain so it's reproducible
- Consider parallel chains for independent sub-tasks
    `
  },
  {
    id: 'constraints-clarity',
    title: 'Constraints and Clarity',
    tags: ['constraints', 'clarity', 'precision', 'rules', 'boundaries'],
    content: `
## Constraints and Clarity

Setting clear constraints and writing with precision eliminates ambiguity, reduces unwanted outputs, and keeps the model focused on exactly what you need.

### Key Principles
- **Specificity**: Vague prompts produce vague results. Be explicit about what you want AND what you don't want
- **Boundaries**: Set limits on length, scope, format, tone, and content
- **Negative constraints**: Tell the model what to avoid ("Do NOT include", "Avoid", "Never")
- **Priority ordering**: When listing multiple requirements, put the most important first

### When to Use
- Any prompt can benefit from constraints
- Especially important for: content generation, code writing, creative tasks
- Critical when output will be used in production or shared with others

### Example Patterns
\`\`\`
# Length and scope constraints
"Write a product description for [product].
Requirements:
- Maximum 150 words
- Include exactly 3 key features
- End with a call to action
- Do NOT mention competitors
- Use active voice only"

# Technical constraints
"Write a Python function that:
- Takes a list of integers as input
- Returns the top 3 most frequent elements
- Must have O(n log n) time complexity or better
- Include type hints
- Include a docstring with examples
- Do NOT use Counter from collections"

# Tone and style constraints
"Rewrite this email to be:
- Professional but warm
- Under 100 words
- Free of jargon
- Include a clear next step
- Do NOT use passive voice or exclamation marks"
\`\`\`

### Tips
- Use numbered lists or bullet points for multiple constraints
- Be specific: "under 200 words" is better than "keep it short"
- Test your constraints—if the model violates one, make it more prominent
- Use ALL CAPS or bold for critical constraints: "You MUST include..."
- Combine positive constraints (what to do) with negative ones (what to avoid)
    `
  },
  {
    id: 'system-prompts',
    title: 'System Prompts',
    tags: ['system', 'instruction', 'behavior', 'meta', 'configuration'],
    content: `
## System Prompts

System prompts set the overall behavior, personality, and rules for the AI model before any user interaction begins. They act as the "operating system" for the conversation.

### Key Principles
- **Global behavior**: System prompts define how the model should behave across ALL messages
- **Persistent rules**: Unlike user messages, system prompt rules apply throughout the conversation
- **Identity and boundaries**: Define who the model is, what it can do, and what it should never do
- **Context setting**: Provide background information the model needs for the entire conversation

### When to Use
- Building chatbots or assistants with specific personalities
- Setting up domain-specific AI tools
- Enforcing safety guidelines and content policies
- Configuring output standards for an entire session

### Example Patterns
\`\`\`
# Customer support bot
"You are a helpful customer support agent for TechCorp.
Rules:
1. Always greet the customer warmly
2. Ask clarifying questions before providing solutions
3. If you don't know an answer, say 'Let me connect you with a specialist'
4. Never share internal pricing or unreleased product information
5. End each response with 'Is there anything else I can help with?'
Available products: [product list]
Support hours: 9am-5pm EST"

# Code assistant
"You are a senior software engineer specializing in Python and JavaScript.
Guidelines:
- Always provide working, tested code
- Include error handling in all code examples
- Explain your code with inline comments
- Suggest best practices and potential improvements
- If a question is ambiguous, ask for clarification
- Use modern syntax (Python 3.10+, ES2022+)
Never: generate code that has known security vulnerabilities"

# Writing assistant
"You are a professional editor helping writers improve their work.
Style guide:
- Prefer active voice
- Use short sentences (under 20 words when possible)
- Avoid adverbs; use stronger verbs instead
- Flag clichés and suggest alternatives
- Maintain the author's voice while improving clarity
Always provide your feedback as:
1. What works well (2-3 points)
2. Suggested improvements (prioritized)
3. Revised version of the text"
\`\`\`

### Tips
- Put the most important rules first—models pay more attention to the beginning
- Use clear section headers (Role, Rules, Constraints, Context)
- Test the system prompt with adversarial inputs
- Keep it concise: overly long system prompts can dilute important rules
- Version your system prompts and track what works
- Combine with other techniques: the system prompt can include few-shot examples
    `
  }
];

// ============================================
// Custom Knowledge (persisted to localStorage)
// ============================================

const STORAGE_KEY = 'promptAssistant_customTopics';

function loadCustomTopics() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn('Failed to load custom topics:', e);
    return [];
  }
}

function saveCustomTopics(topics) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
  } catch (e) {
    console.warn('Failed to save custom topics:', e);
  }
}

// ============================================
// Public API
// ============================================

export function getAllTopics() {
  return [...BUILT_IN_TOPICS, ...loadCustomTopics()];
}

export function getBuiltInTopics() {
  return [...BUILT_IN_TOPICS];
}

export function getCustomTopics() {
  return loadCustomTopics();
}

export function getTopicById(id) {
  return getAllTopics().find(t => t.id === id) || null;
}

export function searchTopics(query, enabledTopicIds = null) {
  const topics = getAllTopics();
  const filtered = enabledTopicIds
    ? topics.filter(t => enabledTopicIds.has(t.id))
    : topics;

  if (!query || !query.trim()) return filtered;

  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

  return filtered.filter(topic => {
    const searchText = `${topic.title} ${topic.tags.join(' ')} ${topic.content}`.toLowerCase();
    return queryTerms.some(term => searchText.includes(term));
  });
}

export function addCustomTopic(title, content, tags = []) {
  const customs = loadCustomTopics();
  const id = 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  const newTopic = {
    id,
    title,
    content,
    tags: [...tags, 'custom'],
    isCustom: true,
    createdAt: new Date().toISOString()
  };
  customs.push(newTopic);
  saveCustomTopics(customs);
  return newTopic;
}

export function removeCustomTopic(id) {
  const customs = loadCustomTopics();
  const filtered = customs.filter(t => t.id !== id);
  saveCustomTopics(filtered);
  return filtered;
}

export function updateCustomTopic(id, updates) {
  const customs = loadCustomTopics();
  const index = customs.findIndex(t => t.id === id);
  if (index === -1) return null;
  customs[index] = { ...customs[index], ...updates, id }; // preserve id
  saveCustomTopics(customs);
  return customs[index];
}
