#!/bin/bash
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