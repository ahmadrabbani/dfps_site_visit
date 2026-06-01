/** Lowercase words kept short in titles (unless first word). */
const CONNECTORS = new Set([
  'a',
  'an',
  'the',
  'and',
  'but',
  'or',
  'for',
  'nor',
  'on',
  'at',
  'to',
  'from',
  'by',
  'of',
  'in',
]);

function capitalizeWord(word: string): string {
  if (!word) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Title case for labels: "Application case" → "Application Case";
 * connectors (of, on, the, …) stay lowercase except as the first word.
 */
export function toTitleCase(text: string): string {
  return text
    .split(/(\s+|—)/)
    .map((part, index, parts) => {
      if (part === '—' || /^\s+$/.test(part)) {
        return part;
      }
      const wordIndex = parts.slice(0, index).filter(p => p.trim() && p !== '—').length;
      const lower = part.toLowerCase();
      if (wordIndex > 0 && CONNECTORS.has(lower)) {
        return lower;
      }
      return capitalizeWord(part);
    })
    .join('');
}
