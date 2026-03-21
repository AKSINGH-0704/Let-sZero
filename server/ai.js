/**
 * RepMail AI Service
 * ==================
 * Powered by OpenAI gpt-4o — the best available model for copywriting and analysis.
 * All functions throw if OPENAI_API_KEY is not set, allowing callers to gracefully fall back.
 */

import OpenAI from "openai";

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ─── 1. AI-POWERED EMAIL PREVIEW ───────────────────────────────────────────────

/**
 * Generate personalized email previews for up to 3 contacts using GPT-4o.
 * Fills {{placeholders}}, rewrites in the selected tone, and makes emails feel
 * naturally written rather than templated.
 *
 * @param {string} subject  - Email subject with {{placeholders}}
 * @param {string} body     - Email body with {{placeholders}}
 * @param {Array}  contacts - Array of { name, email, company, category }
 * @param {string} tone     - "professional" | "friendly" | "formal" | "casual"
 * @returns {Array} Array of { contact, subject, body }
 */
export async function generatePreviews(subject, body, contacts, tone = "professional") {
  const client = getClient();

  const toneGuide = {
    professional:
      "Professional: authoritative yet approachable. First-name greeting, clear and concise sentences, confident but not stiff. Best for B2B outreach.",
    friendly:
      "Friendly: warm and conversational. Uses the recipient's first name frequently, upbeat tone, short sentences, light and engaging. Best for building rapport.",
    formal:
      "Formal: strictly professional. No contractions, full sentences, structured paragraphs, respectful and polished. Best for enterprise or legal contexts.",
    casual:
      "Casual: relaxed and informal. Contractions everywhere, conversational phrases, reads like a message from a colleague, energetic and direct."
  };

  const contactList = contacts
    .slice(0, 3)
    .map(
      (c, i) =>
        `Contact ${i + 1}: Name="${c.name || "Valued Customer"}", Company="${c.company || "their company"}", Email="${c.email || ""}", Category="${c.category || "General"}"`
    )
    .join("\n");

  const systemPrompt = `You are an expert email marketing copywriter with 15 years of experience writing high-converting B2B emails. Your task is to personalize email templates for individual contacts.

RULES:
- Replace every {{placeholder}} with the contact's real data
- Rewrite the email naturally in the specified tone — do NOT just swap words, actually rework the phrasing
- Keep the core message and call-to-action intact
- Make each email feel personally written for that specific person and company
- Output ONLY valid JSON, no markdown, no explanation`;

  const userPrompt = `TEMPLATE SUBJECT: ${subject}
TEMPLATE BODY:
${body}

CONTACTS:
${contactList}

TONE: ${tone.toUpperCase()}
Tone guide: ${toneGuide[tone] || toneGuide.professional}

Generate one personalized email for EACH contact. Return JSON:
{
  "previews": [
    { "subject": "personalized subject", "body": "personalized body" },
    { "subject": "personalized subject", "body": "personalized body" },
    { "subject": "personalized subject", "body": "personalized body" }
  ]
}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const previews = parsed.previews || [];

    return contacts.slice(0, 3).map((contact, i) => ({
      contact: {
        name: contact.name || "Valued Customer",
        email: contact.email || "",
        company: contact.company || "",
        category: contact.category || ""
      },
      subject: previews[i]?.subject || subject,
      body: previews[i]?.body || body
    }));
  } catch (err) {
    console.error("[AI] generatePreviews error:", err.message);
    throw err;
  }
}

// ─── 2. AI-POWERED SPAM ANALYSIS ───────────────────────────────────────────────

/**
 * Analyze an email for spam triggers, deliverability issues, and provide
 * intelligent improvement suggestions using GPT-4o.
 *
 * @param {string} subject - Email subject line
 * @param {string} body    - Email body text
 * @returns {{ score, riskyWords, suggestions, summary }}
 */
export async function analyzeSpam(subject, body) {
  const client = getClient();

  const systemPrompt = `You are a senior email deliverability expert who has analyzed millions of email campaigns. You understand exactly why emails land in spam folders and how to fix them.

RULES:
- Be precise and actionable, not generic
- Identify ACTUAL phrases/words from the email that are problematic (not hypothetical ones)
- Score should reflect REAL deliverability risk: 0-20 is excellent, 21-40 is good, 41-65 is needs work, 66-100 is high risk
- Suggestions must reference exact text from the email
- Output ONLY valid JSON, no markdown, no explanation`;

  const userPrompt = `Analyze this email for spam risk and deliverability issues:

SUBJECT: ${subject}

BODY:
${body}

Evaluate these factors:
1. Spam trigger words and phrases (free, win, guaranteed, urgent, limited time, click here, etc.)
2. Subject line issues: ALL CAPS, excessive punctuation, deceptive preview text
3. Body issues: excessive exclamation marks, misleading claims, overly promotional language
4. Structural problems: too many links, no unsubscribe mention, suspicious formatting
5. Tone issues: aggressive sales language, pressure tactics, false urgency

Return this exact JSON:
{
  "score": <integer 0-100>,
  "riskyWords": ["exact phrase found in email", ...],
  "suggestions": [
    { "original": "exact phrase from email", "suggestion": "professional alternative" }
  ],
  "summary": "One clear sentence explaining the primary deliverability concern and main recommendation"
}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      score: Math.min(Math.max(parseInt(parsed.score) || 0, 0), 100),
      riskyWords: Array.isArray(parsed.riskyWords) ? parsed.riskyWords : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      summary: parsed.summary || null
    };
  } catch (err) {
    console.error("[AI] analyzeSpam error:", err.message);
    throw err;
  }
}

// ─── 3. AI-POWERED TEMPLATE GENERATION ─────────────────────────────────────────

/**
 * Generate a complete email template from a brief campaign description.
 * The output includes proper {{name}}, {{company}}, {{category}} placeholders.
 *
 * @param {string} prompt - User's campaign goal description
 * @param {string} tone   - "professional" | "friendly" | "formal" | "casual"
 * @returns {{ subject, body }}
 */
export async function generateTemplate(prompt, tone = "professional") {
  const client = getClient();

  const toneGuide = {
    professional: "professional B2B tone — confident, clear, respectful",
    friendly: "friendly and warm tone — conversational, approachable, first-name basis",
    formal: "formal tone — no contractions, full professional language, structured",
    casual: "casual tone — relaxed, direct, reads like a colleague wrote it"
  };

  const systemPrompt = `You are an expert B2B email copywriter who specializes in creating high-converting email templates for marketing campaigns. You write emails that feel personal, not spammy.

AVAILABLE PLACEHOLDERS (use these naturally in the template):
- {{name}} — recipient's first name or full name
- {{company}} — recipient's company name
- {{email}} — recipient's email address
- {{category}} — recipient's industry/category

RULES:
- Always use {{name}} in the greeting
- Use {{company}} where it makes the email more personal
- Use {{category}} only if it fits naturally
- Subject line should be compelling but not spammy (no ALL CAPS, no excessive punctuation)
- Body should be 3-5 short paragraphs max
- Include a clear, single call-to-action
- End with a professional sign-off
- Output ONLY valid JSON, no markdown, no explanation`;

  const userPrompt = `Create a complete email template for this campaign:

GOAL: ${prompt}
TONE: ${tone} (${toneGuide[tone] || toneGuide.professional})

Return JSON:
{
  "subject": "email subject line with {{name}} or {{company}} if natural",
  "body": "full email body with {{name}}, {{company}}, and other placeholders used naturally"
}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 1200
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    if (!parsed.subject || !parsed.body) {
      throw new Error("Invalid template response from AI");
    }
    return { subject: parsed.subject, body: parsed.body };
  } catch (err) {
    console.error("[AI] generateTemplate error:", err.message);
    throw err;
  }
}
