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

  const systemPrompt = `You are personalizing one-to-one sales emails for individual recipients. Your task is to make each email feel personally written for that specific person — not templated, not mass marketing, not automated. Each email should read like a real professional wrote it directly to one person.

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
The email body ends with the CTA question. The sender placeholder block follows on the next line — no "Best regards", "Thanks", or similar phrase before it.`,

  real_estate: `This is a personal real estate inquiry — NOT a corporate pitch, NOT a B2B email.
STRUCTURE: (1) Brief personal intro referencing the property or market → (2) specific context (property type, location, interest) → (3) clear next step (viewing, call, more info).
VOCABULARY: Use real estate language — property, home, listing, neighbourhood, market, viewing, location, price range, bedrooms, sq ft. NEVER use: your organization, your team, business needs, ROI, solution, corporate, enterprise.
PLACEHOLDERS: Use {{name}} in the greeting. DO NOT use {{company}} anywhere — this is person-to-person contact, not a company pitch. Use {{category}} only if it refers to property type (e.g., residential, commercial, investment).
The email body ends with the CTA question. The sender placeholder block follows on the next line — no "Best regards", "Thanks", or similar phrase before it.`,

  recruitment: `This is a recruitment outreach email about a job opportunity.
STRUCTURE: (1) Brief context on the opportunity or role → (2) why this specific person is a strong fit → (3) single soft CTA (open to a quick call?).
VOCABULARY: Use talent/career language — opportunity, role, background, experience, fit, team, position, compensation, growth path. Reference their skills or career stage if known.
PLACEHOLDERS: Use {{name}} in the greeting. Use {{company}} to name the hiring organization (e.g., "a role at {{company}}"). Use {{category}} to reference their job function or seniority level.
The email body ends with the CTA question. The sender placeholder block follows on the next line — no "Best regards", "Thanks", or similar phrase before it.`,

  partnership: `This is a partnership proposal or collaboration outreach email.
STRUCTURE: (1) Brief intro establishing who the sender is and their credibility → (2) specific partnership idea and mutual benefit → (3) question to open dialogue.
VOCABULARY: Use partnership language — collaboration, mutual benefit, audience, opportunity, joint, aligned, synergy, co-create.
PLACEHOLDERS: Use {{name}} and {{company}} naturally throughout. Use {{category}} to frame the partner's business type if relevant.
The email body ends with the CTA question. The sender placeholder block follows on the next line — no "Best regards", "Thanks", or similar phrase before it.`,

  follow_up: `This is a follow-up to a previous conversation or prior interaction.
STRUCTURE: (1) Brief, honest reference to the prior contact → (2) reason for following up now → (3) single clear next step or question.
VOCABULARY: Use follow-up language — following up, last time we spoke, wanted to check in, still exploring, circling back. Keep it short — the recipient already has context.
HONESTY RULE: Only reference specific prior conversation details if they are explicitly provided in the campaign goal below. If no prior context is provided, keep the opening minimal and honest — "I reached out recently and wanted to follow up" is correct. Do NOT invent details about meetings, discussions, or commitments that were not described. A vague but honest reference is better than a specific fabrication.
SUBJECT RULE: Do not start the subject line with "Re:" — this falsely implies a prior email thread to the recipient's email client and is deceptive. Reference the prior interaction in the subject honestly instead.
PLACEHOLDERS: Use {{name}} in the greeting. Use {{company}} only if it was part of the prior conversation context. Use {{category}} sparingly.
The email body ends with the CTA question. The sender placeholder block follows on the next line — no "Best regards", "Thanks", or similar phrase before it.`,

  general: `This is a general outreach email.
STRUCTURE: (1) Brief intro → (2) clear purpose and relevance to recipient → (3) single CTA.
PLACEHOLDERS: Use {{name}} in the greeting. Use {{company}} only if it sounds completely natural in context. Use {{category}} only if it adds specificity.
The email body ends with the CTA question. The sender placeholder block follows on the next line — no "Best regards", "Thanks", or similar phrase before it.`,
};

export async function generateTemplate(intake, tone = "professional", opts = {}) {
  const client = getClient();
  const effectivePlan = opts.effectivePlan || "free";
  const model = getModelForPlan(effectivePlan, "generate-template");
  const campaignType = opts.campaignType || "general";
  const senderCtx = opts.senderContext || {};
  console.log(`[AI] generate-template ${opts.userId ?? "anon"} using ${model} plan=${effectivePlan} type=${campaignType}`);

  // Compose user prompt from structured intake fields.
  // Optional fields are only included when non-empty so the model is not misled by blank labels.
  const objectiveLine = intake.objectiveDetail?.trim()
    ? `${intake.objectiveType} — specifically: ${intake.objectiveDetail.trim()}`
    : intake.objectiveType;
  const promptParts = [
    `RECIPIENTS: ${intake.recipientDescription}`,
    `OFFER: ${intake.valueProposition}`,
    `OBJECTIVE: ${objectiveLine}`,
  ];
  if (intake.relevanceReason?.trim())        promptParts.push(`RELEVANCE CONTEXT: ${intake.relevanceReason.trim()}`);
  if (intake.previousContext?.trim())        promptParts.push(`PRIOR INTERACTION: ${intake.previousContext.trim()}`);
  if (intake.roleSummary?.trim())            promptParts.push(`ROLE DETAILS: ${intake.roleSummary.trim()}`);
  if (intake.additionalInstructions?.trim()) promptParts.push(`ADDITIONAL CONTEXT: ${intake.additionalInstructions.trim()}`);
  const composedPrompt = promptParts.join("\n");

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
Write FROM this person's perspective. The email must end with the literal placeholder text {{sender_name}} on its own line — no greeting phrase (Best regards, Thanks, Cheers, etc.) before it. CRITICAL: output the placeholder tag exactly as written: {{sender_name}} — do NOT substitute the actual name value. The platform replaces placeholders at send time. This is a personal inquiry, not a corporate pitch.`
      : `SENDER IDENTITY (the person writing this email):
- Name: ${senderCtx.name || "not provided"}
- Title: ${senderCtx.title || "not provided"}
- Company: ${senderCtx.company || "not provided"}
Write FROM this person's perspective. The email body must end with the following three lines, each on its own line, exactly as written:
{{sender_name}}
{{sender_title}}, {{sender_company}}
CRITICAL: output those placeholder tags verbatim — do NOT substitute the name, title, or company values from the sender context above. The platform replaces {{sender_name}}, {{sender_title}}, {{sender_company}} at send time. No greeting phrase (Best regards, Thanks, etc.) before these lines. The CTA question is the last sentence of the body; these three placeholder lines are the only thing after it.`
    : isPersonalCampaign
      ? `SENDER IDENTITY: Not configured. End the email with the placeholder {{sender_name}} on its own line — do NOT add {{sender_title}} or {{sender_company}} (personal inquiry, not a corporate pitch).`
      : `SENDER IDENTITY: Not configured. End the email body with:
{{sender_name}}
{{sender_title}}, {{sender_company}}
No greeting phrase (Best regards, Thanks, etc.) before these lines. The CTA question comes first, then these two placeholder lines.`;

  const campaignPreamble = CAMPAIGN_TYPE_PREAMBLES[campaignType] || CAMPAIGN_TYPE_PREAMBLES.general;

  const categoryGuide = {
    b2b_outreach: "{{category}} — recipient's industry vertical (e.g., SaaS, Healthcare, Finance). Use to sharpen the value proposition for their sector.",
    real_estate:  "{{category}} — property type or buyer segment (e.g., residential, commercial, investment property). Use only if it makes the outreach more specific.",
    recruitment:  "{{category}} — job function or seniority level (e.g., Engineering, Sales, C-suite). Use to personalize the role pitch.",
    partnership:  "{{category}} — partner's industry or business type. Use to frame mutual benefit by sector.",
    follow_up:    "{{category}} — context from prior interaction. Use sparingly and only if it adds relevance.",
    general:      "{{category}} — recipient's category. Use only if it makes the message more natural and specific.",
  };

  const systemPrompt = `You are helping a sales professional write a short, direct, one-to-one email to a specific individual. The email must read as if one human typed it to one person — not automated, not templated, not a campaign. The only success metric is whether the recipient replies.

CAMPAIGN CONTEXT:
${campaignPreamble}

${senderIdentityBlock}

AVAILABLE RECIPIENT PLACEHOLDERS (use naturally — never mechanically):
- {{name}} — recipient's first name or full name
- {{company}} — recipient's company name (see campaign context above for when to use)
- {{email}} — recipient's email address (rarely needed)
- ${categoryGuide[campaignType] || categoryGuide.general}

SUBJECT LINE RULES:
- 3–7 words maximum. Lowercase preferred (capitalize only proper nouns and {{name}}/{{company}} placeholders).
- Write what a human types in their email client, not a campaign header. Specific beats generic.
- Good examples: "outreach at {{company}}", "question about your process", "{{company}} + us", "scaling your SDR team"
- Banned subject patterns: "Streamlining Your X", "Maximizing Your X", "Boost Your X", "Introduction — X", any verb-noun marketing headline
- Also banned (already covered by earlier rules): Quick question, Following up, Exclusive, Grand opening, Announcing, Introducing, Special

PROHIBITED OPENING PHRASES — the first sentence must not use any of these:
- "I hope this message finds you well" / "I hope this finds you well" / "Hope you're doing well"
- "I am reaching out" / "I'm reaching out to" / "reaching out because"
- "I wanted to reach out" / "I was hoping to connect"
- "I'm writing to inform you" / "I'm writing to introduce"
- "I'd like to introduce myself" / "Allow me to introduce" / "My name is X and I"
- "touching base" / "circling back" / "just checking in"
- Any opener that contains no information for the recipient

PROHIBITED SIGN-OFF PHRASES — never write these before or instead of the sender placeholder block:
- "Best regards" / "Kind regards" / "Warm regards" / "Regards"
- "Thanks" / "Thank you" / "Many thanks" (as a standalone closing line)
- "Sincerely" / "Yours truly" / "Cheers" / "Best"
- "Looking forward to hearing from you"
- "Please let me know if you have any questions"
- "Feel free to reach out" / "Don't hesitate to contact me"
The CTA question is the last sentence of the body. The sender placeholder block is the only thing that follows — nothing else.

BODY RULES:
- Maximum 3 short paragraphs, under 120 words total. Every sentence must earn its place.
- Write from the perspective of a real individual, not a company or platform
- Explain WHY this recipient is relevant — connect the outreach to their role, company stage, or industry context. Avoid superficial personalization like "I noticed you work at {{company}}."
- Do not imply knowledge of conversations, projects, or priorities unless explicitly provided
- When describing the recipient's situation, frame it as observation ("Teams scaling past 20 reps often...") not assertion ("Most companies at your size...")
- Use {{name}} in the greeting — but rephrase if it sounds forced
- Only use {{company}} when the campaign context says it is appropriate AND it sounds natural
- No ALL CAPS anywhere
- No exclamation marks unless the tone specifically requires one
- Avoid all spam vocabulary: free, winner, urgent, guaranteed, "click here", "limited time", "act now", exclusive, luxury, premium, bonus, "limited offer", "special offer", VIP, complimentary, sale, deal, "don't miss", "reserve your spot", announcing, launch, invitation
- Plain conversational language — no corporate jargon, no hype, no pressure

CTA RULES:
- Exactly one low-commitment question at the end of the body
- "Worth a quick conversation?" beats "Would you like to schedule a call?"
- "Open to a brief chat?" beats "I'd love to show you a demo."
- One question. The reader should feel like saying yes costs them nothing.

OUTPUT RULES:
- Output ONLY the email content — subject and body. No meta-commentary, instructions, notes, alternatives, or explanations inside the output.
- Never write text like "Rephrase to", "Note:", "Insert here", "Customize this", "Alternative:", "[Personalize]", or any directive
- NEVER write [Your Name], [Title], [Company] or any text in square brackets
- CRITICAL PLACEHOLDER RULE: ALL {{...}} placeholders MUST appear verbatim in your output exactly as written. DO NOT substitute {{sender_name}}, {{sender_title}}, {{sender_company}}, {{name}}, or {{company}} with their actual values. The platform replaces placeholders at send time — your job is to write the template with the {{placeholder}} tags intact.
- Output ONLY valid JSON: {"subject": "...", "body": "..."}`;

  const userPrompt = `Write a complete email template for this campaign:

${composedPrompt}
TONE: ${tone} — ${toneGuide[tone] || toneGuide.professional}

Return JSON:
{
  "subject": "subject line under 50 chars",
  "body": "full email body"
}`;

  try {
    const requestHash = cache.makeKey(
      intake.recipientDescription,
      intake.valueProposition,
      intake.objectiveType,
      intake.objectiveDetail || "",
      intake.relevanceReason || "",
      intake.previousContext || "",
      intake.roleSummary || "",
      intake.additionalInstructions || "",
      tone,
      campaignType,
      senderCtx.name || ""
    );
    const t0 = Date.now();
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 900
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
      subject: parsed.subject.trim(),
      body:    parsed.body.replace(/\n{3,}/g, "\n\n").trim(),
      _model:  model,
    };
  } catch (err) {
    markAiHealthError(err);
    console.error("[AI] generateTemplate error:", err.message);
    throw err;
  }
}

// ─── Template Validation ───────────────────────────────────────────────────────

const VALID_PLACEHOLDERS = new Set([
  '{{name}}', '{{company}}', '{{email}}', '{{category}}',
  '{{sender_name}}', '{{sender_title}}', '{{sender_company}}', '{{sender_phone}}',
]);

const PROHIBITED_SUBJECT_STARTERS = [
  /^quick question\b/i,
  /^following up\b/i,
  /^introduction\b/i,
  /^exclusive\b/i,
  /^grand\b/i,
  /^announcing\b/i,
  /^introducing\b/i,
  /^special\b/i,
];

const PROMOTIONAL_SUBJECT_RE = /\b(exclusive|luxury|premium|bonus|grand opening|limited offer|special offer|reserve your spot|invitation|launch event|grand launch)\b/i;

const FABRICATED_RELATIONSHIP_PATTERNS = [
  /\bas we discussed\b/i,
  /\bas i mentioned\b/i,
  /\bas you (may |might )?know\b/i,
  /\bas i shared\b/i,
  /\bas we (talked|agreed|chatted)\b/i,
  /\bas you'?ll recall\b/i,
  /\byou'?ll remember\b/i,
  /\byou may remember\b/i,
  /\bwhen we (last )?(spoke|talked|met|chatted|connected|discussed)\b/i,
  /\blast time we (spoke|talked|met|chatted|connected)\b/i,
  /\b(investors?|people|contacts?|colleagues?) i know\b/i,
  /\bour (previous |prior |last )?(conversation|chat|discussion|meeting|call)\b/i,
];

// Detects leaked AI instructions in generated output
const LEAKED_INSTRUCTION_RE = /\b(rephrase\s+to\b|note:\s|insert\s+here\b|customize\s+this\b|alternative:\s|\[customize\]|\[insert\]|\[add\s|\[your\s|step\s+\d+:|option\s+[a-z]:|e\.g\.,\s+")/i;

// Detects standalone sign-off phrases that precede (or replace) the sender placeholder
const SIGNOFF_PHRASE_RE = /^(best\s+regards|kind\s+regards|warm\s+regards|regards,|thanks,|thank\s+you,|sincerely,|cheers,|best,|yours\s+truly|yours\s+sincerely|looking\s+forward|feel\s+free\s+to\s+reach|don'?t\s+hesitate)\b/im;

// Detects generic cold-email opener clichés in the first 60 characters of body
const FILLER_OPENER_RE = /^(i\s+hope\s+this|hope\s+you'?re|i\s+am\s+reaching\s+out|i'?m\s+reaching\s+out\s+to|i\s+wanted\s+to\s+reach\s+out|i\s+was\s+hoping\s+to\s+connect|i'?m\s+writing\s+to|allow\s+me\s+to\s+introduce|my\s+name\s+is\s+\S+\s+and\s+i|just\s+wanted\s+to\s+touch\s+base|just\s+checking\s+in|circling\s+back|touching\s+base)/i;

// Marketing buzzwords that make cold outreach sound like a press release
const MARKETING_BUZZWORD_RE = /\b(game[- ]changer|revolutionize|cutting[- ]edge|best[- ]in[- ]class|world[- ]class|paradigm\s+shift|synergy|synergize|leverage\s+our|seamless\s+integrat|best[- ]of[- ]breed|end[- ]to[- ]end\s+solution|robust\s+platform|next[- ]level\s+solution|truly\s+transformative|unparalleled\s+(results|value|service|experience)|innovative\s+solution)\b/i;

// Weak deferential CTAs — low-confidence asks that telegraph "you can easily say no"
const WEAK_CTA_RE = /\b(i\s+would\s+love\s+to\s+connect|i'?d\s+love\s+to\s+connect|i'?d\s+be\s+happy\s+to|feel\s+free\s+to\s+schedule|would\s+you\s+be\s+interested\s+in\s+hearing\s+more\s+about|just\s+let\s+me\s+know\s+if\s+you'?re\s+interested|please\s+feel\s+free|don'?t\s+hesitate\s+to\s+reach)\b/i;

// Filler phrases anywhere in the body (not just as openers)
const BODY_FILLER_RE = /\b(hope\s+you'?re\s+doing\s+well|hope\s+this\s+finds\s+you\s+well|hope\s+all\s+is\s+well|trust\s+this\s+email\s+finds\s+you|hope\s+this\s+message\s+finds\s+you)\b/i;

// Sender name patterns that indicate a platform/product rather than a real person
const PLATFORM_NAME_RE = /^(repmail|hubspot|salesforce|mailchimp|marketo|outreach|salesloft|apollo|instantly|clay|lemlist|admin|administrator|bot|system|crm|platform|noreply|no-reply|no\s+reply|sales\s+team|marketing\s+team|support\s+team|info|contact)\s*$/i;

// Suspicious job title values (placeholders, test data, non-titles)
const SUSPICIOUS_TITLE_RE = /^(n\/a|na|none|test|user|admin|administrator|null|undefined|tbd|[-_])\s*$/i;

// Validates the sender identity context before AI generation.
// Returns an array of warnings (same shape as validateTemplate warnings).
export function validateSenderProfile(senderCtx) {
  const warnings = [];
  const name    = (senderCtx.name    || "").trim();
  const title   = (senderCtx.title   || "").trim();
  const company = (senderCtx.company || "").trim();

  if (!name) {
    warnings.push({ code: 'SENDER_NAME_MISSING',   message: 'Sender name is required. Recipients see this as the From display name.', severity: 'error' });
  } else {
    if (PLATFORM_NAME_RE.test(name)) {
      warnings.push({ code: 'SENDER_NAME_IS_PLATFORM', message: `Sender name "${name}" looks like a product or platform name, not a person. Cold outreach from a brand name has significantly lower reply rates. Use your real full name.`, severity: 'warn' });
    }
    if (/@/.test(name)) {
      warnings.push({ code: 'SENDER_NAME_IS_EMAIL', message: 'Sender name contains "@" — an email address was entered in the name field. Enter your full name (e.g., "Jane Smith") instead.', severity: 'warn' });
    }
    if (name.split(/\s+/).filter(Boolean).length === 1 && name.length < 4) {
      warnings.push({ code: 'SENDER_NAME_TOO_SHORT', message: `Sender name "${name}" is a single short word. Use your full name (first and last) — single-word short names reduce deliverability trust.`, severity: 'warn' });
    }
    if (name.length > 3 && name === name.toUpperCase() && /[A-Z]/.test(name)) {
      warnings.push({ code: 'SENDER_NAME_ALL_CAPS', message: 'Sender name is all uppercase. Use title case (e.g., "John Smith") — all-caps names trigger spam filters.', severity: 'warn' });
    }
  }

  if (title && SUSPICIOUS_TITLE_RE.test(title)) {
    warnings.push({ code: 'SENDER_TITLE_SUSPICIOUS', message: `Job title "${title}" doesn't look like a real role. Use a specific title (e.g., "Account Executive", "Founder", "Head of Sales").`, severity: 'warn' });
  }

  if (!company) {
    warnings.push({ code: 'SENDER_COMPANY_MISSING', message: 'Company name is required. It appears in the email signature and provides context recipients use to evaluate credibility.', severity: 'error' });
  }

  return warnings;
}

// Fresh instance per call — avoids g-flag lastIndex state across calls
function bracketArtifactRe() {
  return /\[\s*(?:Your\s+|The\s+|A\s+)?(?:Name|First\s*Name|Last\s*Name|Full\s*Name|Title|Job\s*Title|Position|Role|Company|Organization|Company\s*Name|Phone(?:\s*Number)?|Email(?:\s*Address)?|Signature|Department|Team)[^\]]{0,30}\]/gi;
}

function findUnknownPlaceholders(text) {
  const found = [];
  const re = /\{\{[^}]+\}\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!VALID_PLACEHOLDERS.has(m[0].toLowerCase())) found.push(m[0]);
  }
  return [...new Set(found)];
}

function hasSignoff(body) {
  if (body.includes('{{sender_name}}')) return true;
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  let count = 0;
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 4); i--) {
    const line = lines[i];
    const words = line.split(/\s+/).length;
    if (words >= 1 && words <= 5 && line.length <= 50 && !/[.?!]$/.test(line)) {
      count++;
    } else {
      break;
    }
  }
  return count >= 1;
}

function logValidationTelemetry({ userId, campaignType, model, warnings, repaired }) {
  console.log(JSON.stringify({
    ts:           new Date().toISOString(),
    event:        'ai_validation',
    userId:       userId ?? null,
    campaignType,
    model,
    warnings:     warnings.map(w => w.code),
    warningCount: warnings.length,
    repaired,
  }));
}

export function validateTemplate(subject, body, { campaignType = 'general', intake = {}, model = 'unknown', userId = null } = {}) {
  const warnings = [];
  let s = (subject ?? '').trim();
  let b = (body ?? '');
  let repaired = false;

  // ── Step 1: Bracket artifact repair ─────────────────────────────────────────
  const subjectBrackets = s.match(bracketArtifactRe()) ?? [];
  const bodyBrackets    = b.match(bracketArtifactRe()) ?? [];
  if (subjectBrackets.length > 0 || bodyBrackets.length > 0) {
    s = s.replace(bracketArtifactRe(), '').replace(/\s{2,}/g, ' ').trim();
    b = b.replace(bracketArtifactRe(), '').replace(/\n{3,}/g, '\n\n').trim();
    repaired = true;
    const found = [...subjectBrackets, ...bodyBrackets].join(', ');
    warnings.push({
      code:     'BRACKET_ARTIFACT',
      message:  `Bracket-style placeholders removed (${found}). Verify sign-off is complete.`,
      severity: 'warn',
    });
  }

  // ── Step 2: Post-repair empty check (unrecoverable) ──────────────────────────
  if (!s) {
    logValidationTelemetry({ userId, campaignType, model, warnings: [{ code: 'EMPTY_SUBJECT' }], repaired });
    return { subject: s, body: b, hardBlocked: true, warnings: [{ code: 'EMPTY_SUBJECT', message: 'Generated subject is empty — template cannot be used.', severity: 'error' }] };
  }
  if (!b.trim()) {
    logValidationTelemetry({ userId, campaignType, model, warnings: [{ code: 'EMPTY_BODY' }], repaired });
    return { subject: s, body: b, hardBlocked: true, warnings: [{ code: 'EMPTY_BODY', message: 'Generated body is empty — template cannot be used.', severity: 'error' }] };
  }

  // ── Step 3: Unknown placeholder detection — hard block ───────────────────────
  // Valid placeholders ({{name}}, {{company}}, {{sender_name}}, etc.) are in
  // VALID_PLACEHOLDERS and get substituted at send time. Anything else is an
  // AI-hallucinated tag (e.g. {{firstName}}, {{title}}) that would appear
  // verbatim in the recipient's inbox and trigger spam filters.
  const unknownInSubject = findUnknownPlaceholders(s);
  const unknownInBody    = findUnknownPlaceholders(b);

  if (unknownInSubject.length > 0 || unknownInBody.length > 0) {
    const blocked = [];
    if (unknownInSubject.length > 0) {
      blocked.push({
        code:     'PLACEHOLDER_IN_SUBJECT',
        message:  `Unrecognised placeholder(s) in subject: ${unknownInSubject.join(', ')}. Not in the known merge-tag set — would appear as literal text. Regenerate.`,
        severity: 'error',
      });
    }
    if (unknownInBody.length > 0) {
      blocked.push({
        code:     'PLACEHOLDER_IN_BODY',
        message:  `Unrecognised placeholder(s) in body: ${unknownInBody.join(', ')}. Not in the known merge-tag set — would appear as literal text. Regenerate.`,
        severity: 'error',
      });
    }
    logValidationTelemetry({ userId, campaignType, model, warnings: blocked, repaired });
    return { subject: s, body: b, hardBlocked: true, warnings: blocked };
  }

  // ── Step 4: Subject checks ───────────────────────────────────────────────────
  if (s.length > 50) {
    warnings.push({ code: 'SUBJECT_TOO_LONG', message: `Subject is ${s.length} characters (aim for 50 or under). Shorten before sending.`, severity: 'warn' });
  } else if (s.length > 40) {
    warnings.push({ code: 'SUBJECT_LENGTH_WARNING', message: `Subject is ${s.length} characters. Aim for 40 or under.`, severity: 'warn' });
  }

  if (/^re:/i.test(s)) {
    warnings.push({ code: 'RE_PREFIX_SUBJECT', message: '"Re:" at the start of a cold email subject falsely implies a prior thread. Recipients\' email clients will display this as a reply.', severity: 'warn' });
  }

  for (const pattern of PROHIBITED_SUBJECT_STARTERS) {
    if (pattern.test(s)) {
      warnings.push({ code: 'SUBJECT_PROHIBITED_PATTERN', message: 'Subject matches a generic or promotional prohibited pattern. Use specific, personal language instead.', severity: 'warn' });
      break;
    }
  }

  if (PROMOTIONAL_SUBJECT_RE.test(s)) {
    warnings.push({
      code:     'SUBJECT_PROMOTIONAL_LANGUAGE',
      message:  'Subject contains promotional vocabulary that triggers Gmail Promotions/Spam classification. Replace with specific, personal language.',
      severity: 'warn',
    });
  }

  // ── Step 5: Body length checks ───────────────────────────────────────────────
  const wordCount = b.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 180) {
    warnings.push({ code: 'BODY_TOO_LONG', message: `Body is ${wordCount} words (limit: 180). Trim for better reply rates.`, severity: 'warn' });
  } else if (wordCount < 30) {
    warnings.push({ code: 'BODY_TOO_SHORT', message: `Body is ${wordCount} words — suspiciously short. Verify the template is complete.`, severity: 'warn' });
  }

  // ── Step 6: CTA checks ───────────────────────────────────────────────────────
  // Find the last paragraph containing a '?' — skips sign-off lines which have none.
  const paras = b.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const ctaPara = [...paras].reverse().find(p => p.includes('?')) ?? '';
  const ctaQuestionCount = (ctaPara.match(/\?/g) ?? []).length;

  if (!b.includes('?')) {
    warnings.push({ code: 'NO_CTA_QUESTION', message: 'No question found in body. CTA should be a low-commitment permission question.', severity: 'warn' });
  } else if (ctaQuestionCount > 1) {
    warnings.push({ code: 'MULTIPLE_CTA_QUESTIONS', message: 'Multiple questions found in the closing paragraph. End with a single, low-commitment CTA question.', severity: 'warn' });
  }

  // ── Step 7: Sign-off check ───────────────────────────────────────────────────
  if (!hasSignoff(b)) {
    warnings.push({ code: 'NO_SIGNOFF_DETECTED', message: 'No sign-off detected. The email should end with the sender\'s name (and title/company for non-real-estate campaigns).', severity: 'warn' });
  }

  // ── Step 8: Campaign-type-specific checks ────────────────────────────────────
  if (campaignType === 'real_estate' && (s.includes('{{company}}') || b.includes('{{company}}'))) {
    warnings.push({ code: 'REAL_ESTATE_COMPANY_PLACEHOLDER', message: '{{company}} should not appear in real estate emails — this is person-to-person contact, not a B2B pitch.', severity: 'warn' });
  }

  // ── Step 9: Fabricated relationship check ────────────────────────────────────
  // Suppressed for follow_up campaigns with explicit prior context — those phrases are grounded in real history.
  const hasPriorContext = campaignType === 'follow_up' && !!intake?.previousContext?.trim();
  if (!hasPriorContext) {
    const fullText = `${s} ${b}`;
    if (FABRICATED_RELATIONSHIP_PATTERNS.some(p => p.test(fullText))) {
      warnings.push({ code: 'FABRICATED_RELATIONSHIP', message: 'Email implies a prior relationship that may not exist. Review before sending to cold contacts.', severity: 'warn' });
    }
  }

  // ── Step 10: Leaked instruction detection — hard block ────────────────────────
  // Catches cases where the model outputs its own prompt (temperature artefact or
  // prompt-injection). Any instruction-like phrase in the subject or body means
  // the output cannot be used as an email.
  if (LEAKED_INSTRUCTION_RE.test(s) || LEAKED_INSTRUCTION_RE.test(b)) {
    const blocked = [{
      code:     'LEAKED_INSTRUCTION',
      message:  'Generated output contains an AI instruction phrase (e.g. "Rephrase to", "Note:", "Insert here"). The model leaked its prompt. Regenerate.',
      severity: 'error',
    }];
    logValidationTelemetry({ userId, campaignType, model, warnings: blocked, repaired });
    return { subject: s, body: b, hardBlocked: true, warnings: blocked };
  }

  // ── Step 11: Sign-off phrase detection — hard block ──────────────────────────
  // The body should end with the sender placeholder block only.
  // A standalone sign-off phrase (Best regards, Thanks, Sincerely, etc.) before
  // the placeholder creates "Best regards,\nrepmail\nComplimentary Lance\nletszero"
  // output that is both unprofessional and a spam signal.
  if (!b.includes('{{sender_name}}') && SIGNOFF_PHRASE_RE.test(b)) {
    const blocked = [{
      code:     'SIGNOFF_PHRASE_WITHOUT_PLACEHOLDER',
      message:  'Body ends with a sign-off phrase (Best regards, Thanks, etc.) but no {{sender_name}} placeholder. The platform appends sender identity — remove the greeting phrase and end with the sender placeholder block instead.',
      severity: 'error',
    }];
    logValidationTelemetry({ userId, campaignType, model, warnings: blocked, repaired });
    return { subject: s, body: b, hardBlocked: true, warnings: blocked };
  }
  if (b.includes('{{sender_name}}') && SIGNOFF_PHRASE_RE.test(b)) {
    warnings.push({
      code:     'SIGNOFF_PHRASE_WITH_PLACEHOLDER',
      message:  'Body contains a sign-off phrase (Best regards, Thanks, etc.) before {{sender_name}}. Remove the phrase — the sender placeholder block is the sign-off. Leaving it creates double sign-off.',
      severity: 'warn',
    });
  }

  // ── Step 12: Filler opener detection — warning ───────────────────────────────
  const bodyTrimmed = b.trimStart();
  if (FILLER_OPENER_RE.test(bodyTrimmed)) {
    warnings.push({
      code:     'FILLER_OPENER',
      message:  'Body opens with a generic cold-email cliché ("I hope this finds you well", "I\'m reaching out", "Just touching base", etc.). Replace with a specific, information-carrying first sentence.',
      severity: 'warn',
    });
  }

  // ── Step 13: Marketing buzzword check — warning ──────────────────────────────
  if (MARKETING_BUZZWORD_RE.test(b)) {
    warnings.push({
      code:     'MARKETING_BUZZWORDS',
      message:  'Body contains marketing-speak (game-changer, cutting-edge, best-in-class, etc.). Cold outreach with press-release language gets lower reply rates. Rewrite in plain, specific language.',
      severity: 'warn',
    });
  }

  // ── Step 14: Weak CTA check — warning ────────────────────────────────────────
  if (WEAK_CTA_RE.test(b)) {
    warnings.push({
      code:     'WEAK_CTA',
      message:  'CTA phrasing is weak or overly deferential ("I would love to", "feel free to schedule", etc.). Replace with a direct, low-friction question: "Worth a quick call?" or "Open to a 15-min chat?"',
      severity: 'warn',
    });
  }

  // ── Step 15: Body filler phrases — warning ────────────────────────────────────
  // Unlike FILLER_OPENER_RE which only checks the start, this finds clichés anywhere in the body.
  if (BODY_FILLER_RE.test(b)) {
    warnings.push({
      code:     'BODY_FILLER_PHRASE',
      message:  'Body contains a filler phrase ("hope you\'re doing well", "hope this finds you well", etc.) somewhere in the text. Every sentence should carry information — remove or replace.',
      severity: 'warn',
    });
  }

  // ── Step 16: Telemetry ───────────────────────────────────────────────────────
  if (warnings.length > 0 || repaired) {
    logValidationTelemetry({ userId, campaignType, model, warnings, repaired });
  }

  return { subject: s, body: b, hardBlocked: false, warnings };
}

// Startup health probe — called once at boot to avoid "unknown" status until first user AI call
export async function verifyAiHealth() {
  if (!process.env.OPENAI_API_KEY) {
    aiHealthCache.status = "not_configured";
    aiHealthCache.updatedAt = Date.now();
    return;
  }
  try {
    const client = getClient();
    await client.models.list();
    markAiHealthOk();
    console.log("[AI] Startup health probe: ok");
  } catch (err) {
    markAiHealthError(err);
    console.warn("[AI] Startup health probe failed:", err.message);
  }
}
