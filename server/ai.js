/**
 * RepMail AI Service
 * ==================
 * Model strategy:
 *   generateTemplate  → gpt-4o      (high-quality copywriting, used sparingly)
 *   generatePreviews  → gpt-4o-mini (fill-and-rephrase, cached)
 *   analyzeSpam       → gpt-4o-mini (classification task, cached)
 *
 * All responses for generatePreviews and analyzeSpam are cached in memory
 * (SHA-256 key on inputs, 1-hour TTL). Identical inputs return instantly.
 */

import OpenAI from "openai";
import * as cache from "./cache.js";
import { storage } from "./storage.js";

// Per-token cost rates (USD) — update here when OpenAI pricing changes
const MODEL_COSTS = {
  "gpt-4o":      { input: 2.50  / 1_000_000, output: 10.00 / 1_000_000 },
  "gpt-4o-mini": { input: 0.150 / 1_000_000, output: 0.600 / 1_000_000 },
};

// Module-level AI health status — updated on every OpenAI call, read by /api/health
// No active probing: zero extra OpenAI calls. Status reflects the most recent real call.
const aiHealthCache = { status: "unknown", lastError: null, updatedAt: 0 };

export function getAiHealthStatus() {
  if (!process.env.OPENAI_API_KEY) return { status: "not_configured", lastError: null };
  return { status: aiHealthCache.status, lastError: aiHealthCache.lastError, updatedAt: aiHealthCache.updatedAt };
}

function markAiHealthOk() {
  aiHealthCache.status = "ok";
  aiHealthCache.lastError = null;
  aiHealthCache.updatedAt = Date.now();
}

function markAiHealthError(err) {
  const isAuthError =
    err.status === 401 ||
    err.code === "invalid_api_key" ||
    (err.message || "").includes("API key") ||
    (err.message || "").includes("Incorrect API key");
  aiHealthCache.status = isAuthError ? "error" : "degraded";
  aiHealthCache.lastError = (err.message || "Unknown error").slice(0, 120);
  aiHealthCache.updatedAt = Date.now();
}

function calculateCostUsd(model, inputTokens, outputTokens) {
  const rates = MODEL_COSTS[model] ?? MODEL_COSTS["gpt-4o-mini"];
  return (inputTokens * rates.input) + (outputTokens * rates.output);
}

function logUsageToDb(userId, endpoint, model, inputTokens, outputTokens, cached, latencyMs = null, requestHash = null) {
  const estimatedCostUsd = cached ? 0 : calculateCostUsd(model, inputTokens, outputTokens);
  storage.createAiUsageLog({ userId: userId ?? null, endpoint, model, inputTokens, outputTokens, estimatedCostUsd, cached, latencyMs, requestHash })
    .catch(err => console.error("[AI_LOG] Failed to write usage log:", err.message));
}

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000,
    maxRetries: 1,
  });
}

function logAiUsage({ userId, endpoint, model, inputChars, outputChars }) {
  const inputEst = Math.ceil(inputChars / 4);
  const outputEst = Math.ceil(outputChars / 4);
  console.log(
    `[AI_USAGE] ts=${new Date().toISOString()} userId=${userId ?? "anon"} ` +
    `endpoint=${endpoint} model=${model} ~inputTokens=${inputEst} ~outputTokens=${outputEst}`
  );
}

// ─── 1. AI-POWERED EMAIL PREVIEW ──────────────────────────────────────────────
// Model: gpt-4o-mini  |  Cached: yes (key = subject+body+tone+contacts)

export async function generatePreviews(subject, body, contacts, tone = "professional", opts = {}) {
  const campaignType = opts.campaignType || "general";
  const cacheKey = cache.makeKey(
    "preview",
    subject,
    body,
    tone,
    campaignType,
    JSON.stringify(contacts.slice(0, 3).map(c => `${c.name}|${c.email}|${c.company}|${c.category}`))
  );

  const hit = cache.get(cacheKey);
  if (hit) {
    console.log(`[AI_CACHE] preview hit (key=${cacheKey.slice(0, 8)}…) — saved one GPT call`);
    logUsageToDb(opts.userId, "preview", "gpt-4o-mini", 0, 0, true, 0, cacheKey);
    return hit;
  }

  const client = getClient();
  const model = "gpt-4o-mini";

  const toneGuide = {
    professional:
      "Professional: authoritative yet approachable. First-name greeting, clear and concise sentences, confident but not stiff.",
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

  // Campaign-type context for preview personalization — mirrors generateTemplate preambles
  const previewCampaignContext = {
    b2b_outreach: "B2B outreach to a business professional. {{company}} references are appropriate. Use business-results vocabulary.",
    real_estate:  "Personal real estate inquiry — NOT a corporate pitch. Do NOT use {{company}} or corporate language (your organization, your team, ROI, business solution). Keep language personal and property-focused.",
    recruitment:  "Recruitment outreach about a job opportunity. {{company}} refers to the hiring organization. Use career/talent vocabulary.",
    partnership:  "Partnership proposal. {{company}} references are appropriate. Use collaboration language.",
    follow_up:    "Follow-up to a prior conversation. Keep it brief and reference prior context naturally.",
    general:      "General outreach. Use {{company}} only where it sounds natural.",
  };
  const campaignContextNote = previewCampaignContext[campaignType] || previewCampaignContext.general;

  const systemPrompt = `You are an expert email marketing copywriter with 15 years of experience writing high-converting outreach emails across industries. Your task is to personalize email templates for individual contacts.

CAMPAIGN TYPE CONTEXT — apply to every personalization:
${campaignContextNote}

RULES:
- Replace every {{placeholder}} with the contact's real data
- Rewrite the email naturally in the specified tone — do NOT just swap words, actually rework the phrasing
- Personalization must feel natural: if inserting the contact's name or category would make a sentence awkward, rephrase the sentence rather than forcing the placeholder in
- Keep the core message and call-to-action intact
- Make each email feel personally written for that specific person and company
- Output ONLY valid JSON, no markdown, no explanation

TONE — follow strictly for every email generated:
- Professional: clear and direct, first-name greeting, confident but not stiff, no filler phrases
- Friendly: warm and conversational, short punchy sentences, use first name often, upbeat but not over-the-top
- Formal: no contractions, full structured sentences, respectful and measured, no informal phrases
- Casual: relaxed and direct, reads like a message from a colleague, contractions throughout, no corporate language`;

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
    const t0 = Date.now();
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });
    const latencyMs = Date.now() - t0;

    const content = response.choices[0].message.content;
    const usage = response.usage;
    logAiUsage({
      userId: opts.userId,
      endpoint: "generatePreviews",
      model,
      inputChars: systemPrompt.length + userPrompt.length,
      outputChars: content.length,
    });
    logUsageToDb(opts.userId, "preview", model, usage.prompt_tokens, usage.completion_tokens, false, latencyMs, cacheKey);

    const parsed = JSON.parse(content);
    const previews = parsed.previews || [];

    const result = contacts.slice(0, 3).map((contact, i) => ({
      contact: {
        name: contact.name || "Valued Customer",
        email: contact.email || "",
        company: contact.company || "",
        category: contact.category || ""
      },
      subject: previews[i]?.subject || subject,
      body: previews[i]?.body || body
    }));

    markAiHealthOk();
    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    markAiHealthError(err);
    console.error("[AI] generatePreviews error:", err.message);
    throw err;
  }
}

// ─── 2. AI-POWERED SPAM ANALYSIS ──────────────────────────────────────────────
// Model: gpt-4o-mini  |  Cached: yes (key = subject+body)

export async function analyzeSpam(subject, body, opts = {}) {
  const { userId, acceptedSuggestions = [] } = opts;
  const model = "gpt-4o-mini";
  const cacheKey = cache.makeKey("spam", subject, body, model);

  const hit = cache.get(cacheKey);
  if (hit) {
    console.log(`[AI_CACHE] spam hit (key=${cacheKey.slice(0, 8)}…) — saved one GPT call`);
    logUsageToDb(userId, "spam-analysis", "gpt-4o-mini", 0, 0, true, 0, cacheKey);
    return hit;
  }

  const client = getClient();

  const systemPrompt = `You are a senior email deliverability expert who has analyzed millions of email campaigns. You understand exactly why emails land in spam folders and how to fix them.

EVALUATE ALL FIVE DIMENSIONS — the score must reflect combined risk across:
1. Spam trigger words: flag exact phrases from subject and body (free, win, guaranteed, urgent, limited time, click here, act now, etc.)
2. Subject line issues: ALL CAPS, length over 50 characters, excessive punctuation, misleading preview text
3. Reply-rate signals: is there a clear question or single CTA that invites a response? Penalize if missing or if multiple CTAs compete
4. Mobile rendering: flag if body exceeds 200 words — long emails are truncated on mobile and hurt engagement
5. Sender reputation: does this read like a legitimate individual reaching out, or a mass-blast template? Penalize promotional tone, generic openers, passive voice, and pressure language

RULES:
- Be precise and actionable, not generic
- Identify ACTUAL phrases/words from the email that are problematic (not hypothetical ones)
- Score should reflect REAL deliverability risk: 0-20 is excellent, 21-40 is good, 41-65 is needs work, 66-100 is high risk
- Suggestions must reference exact text from the email
- Output ONLY valid JSON, no markdown, no explanation`;

  const acceptedContext = Array.isArray(acceptedSuggestions) && acceptedSuggestions.length > 0
    ? `\n\nThe user has already addressed these issues: [${acceptedSuggestions.join(", ")}]. Do not suggest these again. Focus on remaining issues only.`
    : "";

  const userPrompt = `Analyze this email for spam risk and deliverability issues:

SUBJECT: ${subject}

BODY:
${body}${acceptedContext}

Evaluate these five dimensions:
1. Spam trigger words: flag exact phrases from subject and body (free, win, guaranteed, urgent, limited time, click here, act now, etc.)
2. Subject line issues: ALL CAPS, length over 50 characters, excessive punctuation, deceptive preview text
3. Reply-rate signals: is there a clear question or single CTA that invites a response? Note if missing or if multiple CTAs compete
4. Mobile rendering: count the body words — flag if over 200 words as too long for mobile
5. Sender reputation: does this read like a real person reaching out or a mass-blast template? Note promotional tone, generic openers, pressure language

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
    const t0 = Date.now();
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });
    const latencyMs = Date.now() - t0;

    const content = response.choices[0].message.content;
    const usage = response.usage;
    logAiUsage({
      userId: opts.userId,
      endpoint: "analyzeSpam",
      model,
      inputChars: systemPrompt.length + userPrompt.length,
      outputChars: content.length,
    });
    logUsageToDb(userId, "spam-analysis", model, usage.prompt_tokens, usage.completion_tokens, false, latencyMs, cacheKey);

    const parsed = JSON.parse(content);
    const result = {
      score: Math.min(Math.max(parseInt(parsed.score) || 0, 0), 100),
      riskyWords: Array.isArray(parsed.riskyWords) ? parsed.riskyWords : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      summary: parsed.summary || null
    };

    markAiHealthOk();
    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    markAiHealthError(err);
    console.error("[AI] analyzeSpam error:", err.message);
    throw err;
  }
}

// Synchronous cache peek — does NOT touch quota or audit log.
// Used by the spam-analysis route to serve repeated navigations for free.
export function peekSpamCache(subject, body) {
  const cacheKey = cache.makeKey("spam", subject, body, "gpt-4o-mini");
  return cache.get(cacheKey);
}

// ─── 3. AI-POWERED TEMPLATE GENERATION ────────────────────────────────────────
// Model: gpt-4o for growth/scale/enterprise, gpt-4o-mini otherwise
// Cached: no (creative task, always generate fresh)

// Strip bracket-style placeholder artifacts from AI-generated text.
// Targets patterns like [Your Name], [Title], [Company Name] that GPT outputs
// when it doesn't have sender context. Only matches known placeholder words —
// will not strip legitimate bracket usage like [see attached] or [Q3 results].
// When a complete sender profile is provided, the model is instructed to use
// {{sender_name}} etc. instead of bracket placeholders, so this function is
// a safety net for incomplete profiles only.
function stripBracketPlaceholders(text, userId) {
  const BRACKET_RE = /\[\s*(?:Your\s+|The\s+|A\s+)?(?:Name|First\s*Name|Last\s*Name|Full\s*Name|Title|Job\s*Title|Position|Role|Company|Organization|Company\s*Name|Phone(?:\s*Number)?|Email(?:\s*Address)?|Signature|Department|Team)[^\]]{0,30}\]/gi;
  if (BRACKET_RE.test(text)) {
    console.warn(`[AI] Bracket placeholders remain in generated template — sender profile incomplete for userId=${userId ?? "unknown"}. Stripping.`);
    // Reset lastIndex after the test() call before using replace()
    BRACKET_RE.lastIndex = 0;
  }
  return text
    .replace(BRACKET_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getModelForPlan(effectivePlan, feature) {
  if (feature === "generate-template") {
    return ["enterprise", "scale", "growth"].includes(effectivePlan) ? "gpt-4o" : "gpt-4o-mini";
  }
  return "gpt-4o-mini";
}

// Campaign-type-specific preambles — set domain context, vocabulary, structure, and placeholder rules.
const CAMPAIGN_TYPE_PREAMBLES = {
  b2b_outreach: `This is a B2B cold outreach email to a business professional.
STRUCTURE: (1) Opening that acknowledges their role or company → (2) specific, concrete value proposition → (3) single question CTA.
VOCABULARY: Use business-results language — team, growth, process, pipeline, efficiency, partnership, results.
PLACEHOLDERS: Use {{name}} in the greeting. Use {{company}} to reference their organization naturally (e.g., "at {{company}}", "your team at {{company}}"). Use {{category}} to reference their industry vertical if it sharpens the pitch.
SIGN-OFF FORMAT: Full name, title, company on separate lines.`,

  real_estate: `This is a personal real estate inquiry — NOT a corporate pitch, NOT a B2B email.
STRUCTURE: (1) Brief personal intro referencing the property or market → (2) specific context (property type, location, interest) → (3) clear next step (viewing, call, more info).
VOCABULARY: Use real estate language — property, home, listing, neighbourhood, market, viewing, location, price range, bedrooms, sq ft. NEVER use: your organization, your team, business needs, ROI, solution, corporate, enterprise.
PLACEHOLDERS: Use {{name}} in the greeting. DO NOT use {{company}} anywhere — this is person-to-person contact, not a company pitch. Use {{category}} only if it refers to property type (e.g., residential, commercial, investment).
SIGN-OFF FORMAT: First name only, or first and last name. No title or company in the sign-off.`,

  recruitment: `This is a recruitment outreach email about a job opportunity.
STRUCTURE: (1) Brief context on the opportunity or role → (2) why this specific person is a strong fit → (3) single soft CTA (open to a quick call?).
VOCABULARY: Use talent/career language — opportunity, role, background, experience, fit, team, position, compensation, growth path. Reference their skills or career stage if known.
PLACEHOLDERS: Use {{name}} in the greeting. Use {{company}} to name the hiring organization (e.g., "a role at {{company}}"). Use {{category}} to reference their job function or seniority level.
SIGN-OFF FORMAT: Full name, title (e.g., Recruiter, Talent Partner, Head of People), company.`,

  partnership: `This is a partnership proposal or collaboration outreach email.
STRUCTURE: (1) Brief intro establishing who the sender is and their credibility → (2) specific partnership idea and mutual benefit → (3) question to open dialogue.
VOCABULARY: Use partnership language — collaboration, mutual benefit, audience, opportunity, joint, aligned, synergy, co-create.
PLACEHOLDERS: Use {{name}} and {{company}} naturally throughout. Use {{category}} to frame the partner's business type if relevant.
SIGN-OFF FORMAT: Full name, title, company.`,

  follow_up: `This is a follow-up to a previous conversation or prior interaction.
STRUCTURE: (1) Brief, specific reference to the prior contact (don't be vague) → (2) reason for following up now → (3) single clear next step or question.
VOCABULARY: Use follow-up language — following up, last time we spoke, wanted to check in, still exploring, circling back. Keep it short — the recipient already has context.
PLACEHOLDERS: Use {{name}} in the greeting. Use {{company}} only if it was part of the prior conversation context. Use {{category}} sparingly.
SIGN-OFF FORMAT: Full name, title if relevant.`,

  general: `This is a general outreach email.
STRUCTURE: (1) Brief intro → (2) clear purpose and relevance to recipient → (3) single CTA.
PLACEHOLDERS: Use {{name}} in the greeting. Use {{company}} only if it sounds completely natural in context. Use {{category}} only if it adds specificity.
SIGN-OFF FORMAT: Full name.`,
};

export async function generateTemplate(prompt, tone = "professional", opts = {}) {
  const client = getClient();
  const effectivePlan = opts.effectivePlan || "free";
  const model = getModelForPlan(effectivePlan, "generate-template");
  const campaignType = opts.campaignType || "general";
  const senderCtx = opts.senderContext || {};
  console.log(`[AI] generate-template ${opts.userId ?? "anon"} using ${model} plan=${effectivePlan} type=${campaignType}`);

  const toneGuide = {
    professional: "professional tone — confident, clear, respectful, no filler phrases",
    friendly: "friendly and warm tone — conversational, approachable, first-name basis",
    formal: "formal tone — no contractions, full professional language, structured",
    casual: "casual tone — relaxed, direct, reads like a colleague wrote it"
  };

  // Build sender identity block — drives the sign-off and "written by a real person" signal.
  // Personal campaign types (real_estate) suppress title+company from the sign-off because
  // a corporate-looking sign-off contradicts the "personal inquiry, not a pitch" framing.
  const hasSenderProfile = senderCtx.name || senderCtx.title || senderCtx.company;
  const isPersonalCampaign = campaignType === "real_estate";
  const senderIdentityBlock = hasSenderProfile
    ? isPersonalCampaign
      ? `SENDER IDENTITY:
- Name: ${senderCtx.name || "not provided"}
Write FROM this person's perspective. Sign off with their name only — do NOT include title or company (this is a personal inquiry, not a corporate pitch).`
      : `SENDER IDENTITY (the person writing this email):
- Name: ${senderCtx.name || "not provided"}
- Title: ${senderCtx.title || "not provided"}
- Company: ${senderCtx.company || "not provided"}
Write FROM this person's perspective. Sign off with their full name, title, and company on separate lines.`
    : isPersonalCampaign
      ? `SENDER IDENTITY: Not configured. End the email with {{sender_name}} only — do NOT add {{sender_title}} or {{sender_company}} (personal inquiry, not a corporate pitch).`
      : `SENDER IDENTITY: Not configured. End the email with:
{{sender_name}}
{{sender_title}}
{{sender_company}}
These will be replaced at send time with the sender's real details.`;

  const campaignPreamble = CAMPAIGN_TYPE_PREAMBLES[campaignType] || CAMPAIGN_TYPE_PREAMBLES.general;

  const categoryGuide = {
    b2b_outreach: "{{category}} — recipient's industry vertical (e.g., SaaS, Healthcare, Finance). Use to sharpen the value proposition for their sector.",
    real_estate:  "{{category}} — property type or buyer segment (e.g., residential, commercial, investment property). Use only if it makes the outreach more specific.",
    recruitment:  "{{category}} — job function or seniority level (e.g., Engineering, Sales, C-suite). Use to personalize the role pitch.",
    partnership:  "{{category}} — partner's industry or business type. Use to frame mutual benefit by sector.",
    follow_up:    "{{category}} — context from prior interaction. Use sparingly and only if it adds relevance.",
    general:      "{{category}} — recipient's category. Use only if it makes the message more natural and specific.",
  };

  const systemPrompt = `You are an expert email copywriter who writes high-converting outreach emails that sound like they came from a real human, not a marketing platform.

CAMPAIGN CONTEXT:
${campaignPreamble}

${senderIdentityBlock}

AVAILABLE RECIPIENT PLACEHOLDERS (use naturally — never mechanically):
- {{name}} — recipient's first name or full name
- {{company}} — recipient's company name (see campaign context above for when to use)
- {{email}} — recipient's email address (rarely needed)
- ${categoryGuide[campaignType] || categoryGuide.general}

RULES:
- Write from the perspective of a real individual, not a company or platform
- Use {{name}} in the greeting — but rephrase the sentence if it sounds forced
- Only use {{company}} when the campaign context says it is appropriate AND it sounds natural in that specific sentence
- Subject line must be under 50 characters — specific and honest, never clickbait
- No ALL CAPS anywhere in subject or body
- No exclamation marks unless the tone specifically calls for one
- Avoid all spam trigger words: free, winner, urgent, guaranteed, click here, limited time, act now
- Plain conversational language — no corporate jargon, no hype, no pressure
- Body: 3–4 short paragraphs maximum (under 180 words total)
- Exactly one clear CTA — a single specific question or next-step invitation at the end
- NEVER write [Your Name], [Title], [Company] or any text in square brackets — use {{sender_name}} etc. instead
- Output ONLY valid JSON, no markdown, no explanation`;

  const userPrompt = `Write a complete email template for this campaign:

GOAL: ${prompt}
TONE: ${tone} — ${toneGuide[tone] || toneGuide.professional}

Return JSON:
{
  "subject": "subject line under 50 chars",
  "body": "full email body"
}`;

  try {
    const requestHash = cache.makeKey(prompt, tone, campaignType, senderCtx.name || "");
    const t0 = Date.now();
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 1200
    });
    const latencyMs = Date.now() - t0;

    const content = response.choices[0].message.content;
    const usage = response.usage;
    logAiUsage({
      userId: opts.userId,
      endpoint: "generateTemplate",
      model,
      inputChars: systemPrompt.length + userPrompt.length,
      outputChars: content.length,
    });
    logUsageToDb(opts.userId, "generate-template", model, usage.prompt_tokens, usage.completion_tokens, false, latencyMs, requestHash);

    const parsed = JSON.parse(content);
    if (!parsed.subject || !parsed.body) {
      throw new Error("Invalid template response from AI");
    }
    markAiHealthOk();
    return {
      subject: parsed.subject,
      body: stripBracketPlaceholders(parsed.body, opts.userId),
    };
  } catch (err) {
    markAiHealthError(err);
    console.error("[AI] generateTemplate error:", err.message);
    throw err;
  }
}
