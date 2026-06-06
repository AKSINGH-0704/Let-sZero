import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatDate(date) {
  if (!date) return "-";
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

export function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function calculateCreditsRemaining(received, allocated, used) {
  return Math.max(0, (received || 0) - (allocated || 0) - (used || 0));
}

export function replacePlaceholders(text, data) {
  if (!text) return "";
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined && data[key] !== "" ? data[key] : match;
  });
}

export function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const detectDelimiter = (line) => {
    const delimiters = [",", ";", "\t"];
    let maxCount = 0;
    let detected = ",";
    
    for (const delim of delimiters) {
      const count = (line.match(new RegExp("\\" + delim, "g")) || []).length;
      if (count > maxCount) {
        maxCount = count;
        detected = delim;
      }
    }
    return detected;
  };

  const delimiter = detectDelimiter(lines[0]);
  
  const parseRow = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.replace(/^["']|["']$/g, ""));
  
  const rows = lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = parseRow(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].replace(/^["']|["']$/g, "") : "";
      });
      return row;
    });

  return { headers, rows };
}

export function calculateSpamScore(subject, body) {
  const spamWords = [
    "free", "winner", "click here", "buy now", "limited time",
    "act now", "urgent", "congratulations", "guarantee", "no obligation",
    "risk free", "special offer", "exclusive deal", "you won", "cash"
  ];

  const alternatives = {
    "free": "complimentary",
    "winner": "selected participant",
    "click here": "learn more at [link]",
    "buy now": "explore your options",
    "limited time": "time-sensitive opportunity",
    "act now": "consider this soon",
    "urgent": "important",
    "congratulations": "we're pleased to inform you",
    "guarantee": "assurance",
    "no obligation": "no commitment required",
    "risk free": "with full confidence",
    "special offer": "exclusive opportunity",
    "exclusive deal": "tailored offer",
    "you won": "you've been selected",
    "cash": "payment"
  };

  const text = ((subject || "") + " " + (body || "")).toLowerCase();
  let score = 0;
  const riskyWords = [];
  const suggestions = [];

  spamWords.forEach(word => {
    if (text.includes(word)) {
      score += 5;
      riskyWords.push(word);
      suggestions.push({ original: word, suggestion: alternatives[word] });
    }
  });

  if (subject && subject === subject.toUpperCase() && subject.length > 5) {
    score += 15;
    suggestions.push({
      original: subject,
      suggestion: "Rewrite the subject in sentence case — all-caps reads as shouting and triggers spam filters",
      actionable: false
    });
  } else if (subject && subject.length > 50) {
    score += 5;
    suggestions.push({
      original: subject,
      suggestion: `Subject is ${subject.length} characters — trim to under 50 to avoid truncation on mobile`,
      actionable: false
    });
  }

  let hasDeceptiveSubject = false;
  if (subject && /^\s*(re|fwd|fw)\s*:/i.test(subject)) {
    hasDeceptiveSubject = true;
    score += 15;
    suggestions.push({
      original: subject,
      suggestion: "Subject begins with 'Re:' or 'Fwd:' — implying a prior thread on a cold email is deceptive, triggers complaint rates, and violates CAN-SPAM",
      actionable: false
    });
  }

  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 0) {
    score += Math.min(exclamationCount * 2, 10);
    suggestions.push({
      original: `${exclamationCount} exclamation mark${exclamationCount > 1 ? "s" : ""}`,
      suggestion: exclamationCount > 1
        ? "Remove all exclamation marks — multiple instances signal promotional content"
        : "Remove the exclamation mark for a more professional tone",
      actionable: false
    });
  }

  const wordCount = (body || "").trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 200) {
    score += 5;
    suggestions.push({
      original: `${wordCount}-word body`,
      suggestion: "Trim the email to under 200 words — long emails are truncated on mobile and hurt engagement",
      actionable: false
    });
  }

  const linkCount = ((body || "").match(/https?:\/\//gi) || []).length;
  if (linkCount >= 6) {
    score += 10;
    suggestions.push({
      original: `${linkCount} links`,
      suggestion: "6 or more links — high link density is consistently classified as bulk mail by spam filters. Aim for 0–1 links in cold outreach",
      actionable: false
    });
  } else if (linkCount >= 4) {
    score += 5;
    suggestions.push({
      original: `${linkCount} links`,
      suggestion: "4 or more links — cold outreach performs best with 0–1 links. Consider removing all but the most essential",
      actionable: false
    });
  }

  const GENERIC_GREETINGS = [
    /^\s*(dear\s+(sir|madam|sir\s*\/\s*madam|ma'am|customer|valued\s+customer|friend))\b/i,
    /^\s*to\s+whom\s+it\s+may\s+concern/i,
    /^\s*(hello|hi)\s+there\b/i,
    /^\s*greetings\b/i,
    /^\s*dear\s+all\b/i,
  ];
  const bodyStart = (body || "").trimStart().slice(0, 200);
  let hasGenericGreeting = false;
  if (GENERIC_GREETINGS.some(re => re.test(bodyStart))) {
    hasGenericGreeting = true;
    score += 5;
    suggestions.push({
      original: "generic greeting",
      suggestion: "Impersonal openers like 'Hi there', 'Dear Sir/Madam', or 'To Whom It May Concern' signal mass sending — open with the recipient's name or a specific reference",
      actionable: false
    });
  }

  const allText = (subject || "") + " " + (body || "");
  const uniquePlaceholders = new Set((allText.match(/\{\{[^}]+\}\}/g) || []).map(p => p.toLowerCase()));
  if (uniquePlaceholders.size >= 4) {
    suggestions.push({
      original: `${uniquePlaceholders.size} merge fields`,
      suggestion: `Template uses ${uniquePlaceholders.size} personalization fields — each unmapped column will expose a raw {{placeholder}} to recipients. Consider simplifying to {{name}} and {{company}}`,
      actionable: false
    });
  }

  const CTA_PHRASES = [
    "schedule a", "book a", "book time", "grab time",
    "click here",
    "visit our", "check out our",
    "download", "register", "sign up",
    "learn more", "get started",
    "call us", "call me",
  ];
  const ctaCount = CTA_PHRASES.filter(phrase => text.includes(phrase)).length;
  if (ctaCount >= 3) {
    suggestions.push({
      original: `${ctaCount} calls to action`,
      suggestion: ctaCount >= 4
        ? `Email contains ${ctaCount} calls to action — cold outreach performs best with a single clear ask. Consider removing all but the most important`
        : "3 calls to action detected — consider reducing to one clear ask to improve reply rates",
      actionable: false
    });
  }

  const issues = [];
  if (riskyWords.length > 0) issues.push(`${riskyWords.length} spam trigger word${riskyWords.length > 1 ? "s" : ""}`);
  if (exclamationCount > 1) issues.push("excessive punctuation");
  if (subject && subject.length > 50) issues.push("long subject line");
  if (wordCount > 200) issues.push("long body");
  if (hasDeceptiveSubject) issues.push("deceptive subject prefix");
  if (linkCount >= 4) issues.push("high link count");
  if (hasGenericGreeting) issues.push("generic greeting");
  const summary = issues.length > 0
    ? `Keyword-based scan found: ${issues.join(", ")}. Run AI analysis for deeper insights.`
    : "No common spam triggers detected. Run AI analysis for a full deliverability review.";

  return {
    score: Math.min(score, 100),
    riskyWords,
    suggestions,
    summary
  };
}
