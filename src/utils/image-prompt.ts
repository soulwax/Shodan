import { AIService } from '../services/ai';

export async function refineImagePrompt(
  ai: AIService,
  prompt: string,
  isEdit: boolean,
  guildId?: string | null
): Promise<string> {
  const systemPrompt = isEdit
    ? 'Turn the user request into concise, vivid instructions for editing the supplied image. Keep the original subject, composition, and details the user did not ask to change. Add useful visual details, and do not add text or lettering unless the user asks for it. Return only the image-edit prompt.'
    : 'Turn the user request into one concise, vivid prompt for an image-generation model. Preserve the requested subject and intent, add useful visual composition and style details, and do not add text or lettering unless the user asks for it. Return only the image prompt.';
  const refinedPrompt = await ai.createOpenAICompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ], { guildId, max_tokens: 400 });

  if (!refinedPrompt?.trim()) {
    throw new Error(`Luna returned an empty ${isEdit ? 'image-edit' : 'image'} prompt`);
  }
  return refinedPrompt.trim();
}
