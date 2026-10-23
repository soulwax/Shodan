// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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

