import type { ChatMessage } from '../../types/ai';

export function addStyleInstruction(messages: ChatMessage[], instruction?: string): ChatMessage[] {
  if (!instruction) return messages;
  const withStyle = messages.slice();
  const systemIndex = withStyle.findIndex(message => message.role === 'system');
  if (systemIndex >= 0) {
    withStyle[systemIndex] = { ...withStyle[systemIndex], content: `${withStyle[systemIndex].content}\n\n${instruction}` };
  } else {
    withStyle.unshift({ role: 'system', content: instruction });
  }
  return withStyle;
}

