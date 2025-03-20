// File: scripts/setup-project.js

const fs = require('fs');
const path = require('path');

// Define all project structure with initial content
const projectStructure = {
  'src/config': {
    'environment.js': `// File: src/config/environment.js
require('dotenv').config();

module.exports = {
  TOKEN: process.env.TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  TRACKING_CHANNEL_ID: process.env.TRACKING_CHANNEL_ID,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LANGUAGE_CHANNEL_ID: process.env.LANGUAGE_CHANNEL_ID
};`,
    'discord-config.js': `// File: src/config/discord-config.js
const { IntentsBitField } = require('discord.js');

const intents = [
  IntentsBitField.Flags.Guilds,
  IntentsBitField.Flags.GuildMembers,
  IntentsBitField.Flags.GuildMessages,
  IntentsBitField.Flags.MessageContent,
  // Add other intents as needed
];

module.exports = {
  intents
};`
  },
  'src/commands/handlers': {
    'base-command.js': `// File: src/commands/handlers/base-command.js
class BaseCommand {
    async execute(interaction) {
        throw new Error('execute() must be implemented');
    }
}

module.exports = BaseCommand;`,
    'divine-command.js': `// File: src/commands/handlers/divine-command.js
const BaseCommand = require('./base-command');

class DivineCommand extends BaseCommand {
    async execute(interaction) {
        // TODO: Implement divine command logic
    }
}

module.exports = DivineCommand;`
  },
  'src/commands/definitions': {
    'index.js': `// File: src/commands/definitions/index.js
const { Collection } = require('discord.js');

const commands = new Collection();
// Command definitions will be registered here

module.exports = commands;`
  },
  'src/commands': {
    'index.js': `// File: src/commands/index.js
const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const registerCommands = (client) => {
    client.commands = new Collection();
    const commandFiles = fs.readdirSync(path.join(__dirname, 'handlers'))
        .filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const command = require(\`./handlers/\${file}\`);
        client.commands.set(command.name, command);
    }
};

module.exports = { registerCommands };`
  },
  'src/events/handlers': {
    'base-event.js': `// File: src/events/handlers/base-event.js
class BaseEvent {
    constructor(client) {
        this.client = client;
    }
    
    register() {
        throw new Error('register() must be implemented');
    }
}

module.exports = BaseEvent;`,
    'message-event.js': `// File: src/events/handlers/message-event.js
const BaseEvent = require('./base-event');

class MessageEvent extends BaseEvent {
    register() {
        this.client.on('messageCreate', this.handle.bind(this));
    }
    
    async handle(message) {
        // TODO: Implement message handling logic
    }
}

module.exports = MessageEvent;`
  },
  'src/events/definitions': {
    'index.js': `// File: src/events/definitions/index.js
// Event definitions will be registered here
module.exports = {};`
  },
  'src/events': {
    'index.js': `// File: src/events/index.js
const fs = require('fs');
const path = require('path');

const registerEvents = (client) => {
    const eventFiles = fs.readdirSync(path.join(__dirname, 'handlers'))
        .filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const Event = require(\`./handlers/\${file}\`);
        const event = new Event(client);
        event.register();
    }
};

module.exports = { registerEvents };`
  },
  'src/services': {
    'discord.js': `// File: src/services/discord.js
const { Client } = require('discord.js');
const config = require('../config/discord-config');

class DiscordService {
    constructor() {
        this.client = new Client({ intents: config.intents });
    }

    async connect(token) {
        await this.client.login(token);
    }
}

module.exports = new DiscordService();`,
    'tarot.js': `// File: src/services/tarot.js
class TarotService {
    async drawCard() {
        // TODO: Implement tarot card drawing logic
    }
}

module.exports = new TarotService();`,
    'openai.js': `// File: src/services/openai.js
const { OpenAI } = require('openai');
const config = require('../config/environment');

const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY
});

module.exports = openai;`
  },
  'src/utils': {
    'error-handler.js': `// File: src/utils/error-handler.js
class ErrorHandler {
    static handle(error, context = '') {
        console.error(\`Error in \${context}:\`, error);
        // TODO: Add proper error handling logic
    }
}

module.exports = ErrorHandler;`,
    'logger.js': `// File: src/utils/logger.js
class Logger {
    static log(message, context = '') {
        console.log(\`[\${context}] \${message}\`);
    }

    static error(message, context = '') {
        console.error(\`[\${context}] \${message}\`);
    }
}

module.exports = Logger;`
  }
};

// Get the project root directory (one level up from scripts)
const projectRoot = path.join(__dirname, '..');

// Create directories and files
Object.entries(projectStructure).forEach(([dir, files]) => {
  const fullPath = path.join(projectRoot, dir);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(fullPath)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(fullPath, { recursive: true });
  }

  // Create files
  Object.entries(files).forEach(([filename, content]) => {
    const filePath = path.join(fullPath, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`Creating file: ${dir}/${filename}`);
      fs.writeFileSync(filePath, content);
    } else {
      console.log(`File already exists: ${dir}/${filename}`);
    }
  });
});

console.log('Project structure setup complete!');