/** Shorten user-facing prose without cutting in the middle of a word. */
export function truncateAtBoundary(text: string, maxLength: number): string {
  const value = text.trim();
  if (value.length <= maxLength) return value;
  if (maxLength <= 1) return '…'.slice(0, maxLength);

  const marker = '…';
  const contentLimit = maxLength - marker.length;
  const sentenceEndings = /[.!?](?:["'’”)]*)(?=\s|$)/g;
  let lastSentenceEnd = -1;
  let match: RegExpExecArray | null;
  while ((match = sentenceEndings.exec(value)) !== null && match.index + match[0].length <= contentLimit) {
    lastSentenceEnd = match.index + match[0].length;
  }

  // Prefer a complete sentence when doing so keeps most of the requested text.
  if (lastSentenceEnd >= Math.floor(contentLimit * 0.6)) {
    return `${value.slice(0, lastSentenceEnd).trimEnd()} ${marker}`;
  }

  const whitespace = value.lastIndexOf(' ', contentLimit);
  const end = whitespace > 0 ? whitespace : contentLimit;
  return `${value.slice(0, end).trimEnd()}${marker}`;
}

/** Keep prompt input within budget and make any omitted tail explicit. */
export function shortenPromptText(text: string, maxLength: number): string {
  const value = text.trim();
  if (value.length <= maxLength) return value;
  const note = '\n[The source text continues beyond this point.]';
  return `${truncateAtBoundary(value, Math.max(1, maxLength - note.length))}${note}`;
}
