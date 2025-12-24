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
  
  const text = ((subject || "") + " " + (body || "")).toLowerCase();
  let score = 0;
  const riskyWords = [];
  
  spamWords.forEach(word => {
    if (text.includes(word)) {
      score += 5;
      riskyWords.push(word);
    }
  });
  
  if (subject && subject === subject.toUpperCase() && subject.length > 5) {
    score += 15;
  }
  
  const exclamationCount = (text.match(/!/g) || []).length;
  score += Math.min(exclamationCount * 2, 10);
  
  const alternatives = {
    "free": "complimentary",
    "winner": "selected participant",
    "click here": "learn more",
    "buy now": "explore options",
    "limited time": "time-sensitive"
  };
  
  const suggestions = riskyWords.slice(0, 5).map(word => ({
    original: word,
    suggestion: alternatives[word] || word
  }));
  
  return {
    score: Math.min(score, 100),
    riskyWords,
    suggestions
  };
}
