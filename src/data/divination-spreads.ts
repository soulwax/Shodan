export interface DivinationPosition {
  id: string
  name: string
  guidance: string
}

export interface DivinationSpread {
  id: string
  name: string
  description: string
  positions: readonly DivinationPosition[]
  synthesisGuidance: string
}

/** Reusable layouts; command code supplies cards and formats the response. */
export const DIVINATION_SPREADS: readonly DivinationSpread[] = [
  {
    id: 'one_card',
    name: 'One card',
    description: 'A single focused reflection.',
    positions: [{ id: 'reflection', name: 'Reflection', guidance: 'A useful lens on the question in this moment.' }],
    synthesisGuidance: 'Give one focused reflection.'
  },
  {
    id: 'three_card',
    name: 'Three card: situation, challenge, guidance',
    description: 'Understand the situation and consider a useful next step.',
    positions: [
      { id: 'situation', name: 'Situation', guidance: 'The main pattern or concern in the situation.' },
      { id: 'challenge', name: 'Challenge', guidance: 'A tension or perspective worth noticing, not a prediction of failure.' },
      { id: 'guidance', name: 'Guidance', guidance: 'A practical perspective or question to carry forward.' }
    ],
    synthesisGuidance: 'Connect the situation, challenge, and guidance into one coherent reflection.'
  },
  {
    id: 'past_present_future',
    name: 'Past, present, possible direction',
    description: 'Reflect on context, the present, and one possible direction.',
    positions: [
      { id: 'past', name: 'Past influence', guidance: 'Relevant context the questioner has already described; do not invent biography.' },
      { id: 'present', name: 'Present', guidance: 'The current pattern or choice in view.' },
      { id: 'possible_direction', name: 'Possible direction', guidance: 'A possible path if current patterns continue, never a fixed future.' }
    ],
    synthesisGuidance: 'Connect past influence to the present and describe the last card as a possibility, not fate.'
  },
  {
    id: 'yes_no',
    name: 'Yes / no leaning',
    description: 'A symbolic leaning with context, not a guaranteed answer.',
    positions: [{ id: 'leaning', name: 'Symbolic leaning', guidance: 'Offer a gentle leaning only when the card supports one; explain its limits and what the questioner can consider.' }],
    synthesisGuidance: 'Answer with a tentative leaning or say the card does not point clearly either way. Never promise an outcome.'
  },
  {
    id: 'decision',
    name: 'Decision crossroads',
    description: 'Compare two options and the trade-offs to consider.',
    positions: [
      { id: 'option_a_strength', name: 'Option A · opportunity', guidance: 'A constructive possibility in the first option.' },
      { id: 'option_a_tradeoff', name: 'Option A · trade-off', guidance: 'A cost, effort, or tension to consider in the first option.' },
      { id: 'option_b_strength', name: 'Option B · opportunity', guidance: 'A constructive possibility in the second option.' },
      { id: 'option_b_tradeoff', name: 'Option B · trade-off', guidance: 'A cost, effort, or tension to consider in the second option.' },
      { id: 'decision_compass', name: 'Decision compass', guidance: 'A value, question, or practical factor that may help compare the options.' }
    ],
    synthesisGuidance: 'Compare both paths fairly, use the final card as a reflection aid, and leave the decision with the questioner.'
  },
  {
    id: 'relationship',
    name: 'Relationship reflection',
    description: 'Explore your perspective, the dynamic, and a constructive next step.',
    positions: [
      { id: 'you', name: 'Your perspective', guidance: 'A lens on the questioner’s own stated perspective.' },
      { id: 'other', name: 'What to consider about the other person', guidance: 'A prompt to consider, not a claim about another person’s hidden thoughts or feelings.' },
      { id: 'dynamic', name: 'The dynamic', guidance: 'A symbolic lens on the interaction as the questioner describes it.' },
      { id: 'next_step', name: 'Constructive next step', guidance: 'A respectful action or question within the questioner’s control.' }
    ],
    synthesisGuidance: 'Focus on the questioner’s perspective and choices; do not claim to know the other person’s private thoughts.'
  },
  {
    id: 'celtic_cross',
    name: 'Celtic Cross',
    description: 'An advanced ten-card view of a situation and possible direction.',
    positions: [
      { id: 'present', name: 'Present situation', guidance: 'The central matter in view.' },
      { id: 'challenge', name: 'Crossing challenge', guidance: 'A tension or complication to consider.' },
      { id: 'foundation', name: 'Foundation', guidance: 'A background influence stated or suggested by the question, not invented biography.' },
      { id: 'recent_past', name: 'Recent past', guidance: 'A recent influence, framed as reflection rather than asserted fact.' },
      { id: 'conscious_focus', name: 'Conscious focus', guidance: 'The concern, aim, or value the questioner is focused on.' },
      { id: 'near_term', name: 'Near-term possibility', guidance: 'A possible development, not a prediction.' },
      { id: 'approach', name: 'Your approach', guidance: 'A perspective on the questioner’s own approach.' },
      { id: 'environment', name: 'Environment', guidance: 'A symbolic lens on surrounding circumstances, not a claim about other people’s motives.' },
      { id: 'hopes_fears', name: 'Hopes and worries', guidance: 'A prompt to examine hopes and worries without claiming to know private feelings.' },
      { id: 'possible_direction', name: 'Possible direction', guidance: 'One possible direction if patterns continue; never fate or certainty.' }
    ],
    synthesisGuidance: 'Give a complete integrated reading without explaining the cards one by one. Weave all ten positions into four connected movements: the present, challenge, and foundation as the central pattern; recent past and near-term possibility as the timeline; conscious focus, approach, environment, and hopes and worries as the surrounding context; and possible direction as a conditional synthesis. Show how the cards reinforce or complicate one another, then explain the overall practical implication. Do not omit a position, but do not give each card its own separate explanation. Do not present the final card as fixed fate.'
  }
]

export function getDivinationSpread(id: string): DivinationSpread | undefined {
  return DIVINATION_SPREADS.find(spread => spread.id === id)
}
