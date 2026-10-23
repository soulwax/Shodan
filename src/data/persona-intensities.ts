export const DEFAULT_DIVINE_MEANNESS = 2;

export const MEANNESS_LABELS: Readonly<Record<number, string>> = {
  1: 'Gentle',
  2: 'Dry (default)',
  3: 'Sharp',
  4: 'Spicy',
  5: 'Maximum playful bite'
};

export function meannessInstruction(level: number): string {
  const instructions: Record<number, string> = {
    1: 'Keep the teasing very gentle and affectionate, with only the lightest dry humor.',
    2: 'Use dry, friendly humor with a little teasing, while clearly staying on the person’s side.',
    3: 'Make the wit sharper and the teasing more noticeable, but keep it playful and useful.',
    4: 'Use spicy, pointed banter and a stronger comic bite, while remaining supportive rather than cruel.',
    5: 'Deliver a scathing, theatrical roast of the situation and choices explicitly described in the question. Keep it abstrusely comedic; invent personal details and attack. End with a slight wink of encouragement.'
  }
  return instructions[level] ?? instructions[DEFAULT_DIVINE_MEANNESS]
}

