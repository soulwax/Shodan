const QUESTION_STOP_WORDS = new Set([
  'about', 'after', 'all', 'also', 'and', 'any', 'are', 'been', 'but', 'can',
  'did', 'does', 'for', 'from', 'had', 'has', 'have', 'how', 'into', 'its',
  'not', 'our', 'out', 'that', 'the', 'them', 'there', 'they', 'this', 'was',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'why', 'with',
  'would', 'you', 'your'
]);

export function getQuestionSearchTerms(question: string): string[] {
  const words = question.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
  return [...new Set(words)]
    .filter(word => !QUESTION_STOP_WORDS.has(word))
    .slice(0, 8);
}

export function rankCampaignStoryEntries<T extends {
  content: string;
  interpretation: string | null;
  createdAt: Date;
}>(entries: T[], terms: string[]): T[] {
  return entries
    .map(entry => {
      const searchableText = `${entry.content}\n${entry.interpretation || ''}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (searchableText.includes(term) ? 1 : 0), 0);
      return { entry, score };
    })
    .sort((left, right) =>
      right.score - left.score || right.entry.createdAt.getTime() - left.entry.createdAt.getTime()
    )
    .slice(0, 12)
    .map(result => result.entry);
}
