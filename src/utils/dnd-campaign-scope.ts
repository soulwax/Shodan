/** Campaign routing checks the current channel, then a thread's parent. */
export function campaignChannelScope(channelId: string, parentChannelId?: string | null): string[] {
  return parentChannelId && parentChannelId !== channelId
    ? [channelId, parentChannelId]
    : [channelId];
}
