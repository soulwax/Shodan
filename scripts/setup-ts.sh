#!/bin/bash
# Copyright (C) 2025 soulwax@github
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

# File: scripts/setup-ts.sh

# Create main directories
mkdir -p src/{core,commands,events,services,utils,types,config}

# Create command subdirectories
mkdir -p src/commands/{utility,moderation,fun,tarot}

# Create event subdirectories
mkdir -p src/events/{guild,interaction,voice}

# Create core files
touch src/core/client.ts
touch src/core/commands.ts
touch src/core/events.ts

# Create command index file
touch src/commands/index.ts

# Create event index file
touch src/events/index.ts

# Create service files
touch src/services/openai.ts
touch src/services/database.ts

# Create utility files
touch src/utils/random.ts
touch src/utils/embed.ts
touch src/utils/logger.ts

# Create type definition files
touch src/types/command.ts
touch src/types/event.ts
touch src/types/environment.ts

# Create configuration files
touch src/config/discord.ts
touch src/config/environment.ts

# Create main application files
touch src/app.ts
touch src/index.ts

# Give feedback about created structure
echo "Directory structure and files created successfully!"
echo "Next steps:"
echo "1. Install TypeScript dependencies: npm install -D typescript @types/node ts-node-dev"
echo "2. Create tsconfig.json file"
echo "3. Begin migrating your JavaScript code to TypeScript"