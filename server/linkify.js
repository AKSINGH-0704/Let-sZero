// Converts plain-text URLs in a string into HTML anchor tags.
// Called on each paragraph before wrapping in <p> tags so that SES click
// tracking can rewrite the links server-side.
//
// Handles:
//   https://...  and  http://...  URLs
//   www.example.com bare URLs (no protocol)
//   Trailing sentence punctuation (. , ; : ! ? ) ]) stripped from the URL
//
// Does NOT modify text that contains no URLs — returns the same string.
export function linkifyUrls(text) {
  // Match http(s) URLs and bare www. URLs.
  // Character class exclusions prevent greedily consuming surrounding HTML or quotes.
  const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[a-zA-Z0-9][^\s<>"']*)/gi;

  return text.replace(URL_RE, (match) => {
    // Strip trailing punctuation that belongs to the enclosing sentence, not the URL.
    const trailingMatch = match.match(/([.,;:!?)\]]+)$/);
    const trailing = trailingMatch ? trailingMatch[1] : "";
    const url      = trailing ? match.slice(0, -trailing.length) : match;

    // Bare www. URLs need an explicit protocol so browsers open them correctly.
    const href = url.startsWith("www.") ? `https://${url}` : url;

    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>${trailing}`;
  });
}
