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

/** Split complete prose into bounded Discord fields, retaining every word. */
export function splitLongText(text: string, maxLength = 1024): string[] {
  if (!Number.isInteger(maxLength) || maxLength < 1) throw new Error('Text chunk length must be a positive integer.');
  if (text.length <= maxLength) return [text]
  const parts: string[] = []
  let remaining = text
  while (remaining.length > maxLength) {
    let splitIndex = remaining.lastIndexOf('.', maxLength - 1)
    if (splitIndex === -1)
      splitIndex = remaining.lastIndexOf(' ', maxLength - 1)
    const end = splitIndex <= 0 ? maxLength : splitIndex + 1
    parts.push(remaining.substring(0, end).trimEnd())
    remaining = remaining.substring(end).trimStart()
  }
  if (remaining) parts.push(remaining)
  return parts
}
