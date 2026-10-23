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

import { AsyncLocalStorage } from 'node:async_hooks';

type AIRequestContext = { guildId: string | null; userId: string };
const aiRequestContext = new AsyncLocalStorage<AIRequestContext>();

/** Carry server and requesting-user scope into AI calls made by a command. */
export function withAIRequestContext<T>(guildId: string | null, userId: string, run: () => Promise<T>): Promise<T> {
  return aiRequestContext.run({ guildId, userId }, run);
}

export function getAIRequestContext(): AIRequestContext | null {
  return aiRequestContext.getStore() ?? null;
}
