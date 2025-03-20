# Shodan Discord Bot

<div align="center">

<div align="center">
  <img src=".github/resources/logo" alt="Shodan Logo" width="50%" height="50%">
</div>

### A "getting there"-rich Discord bot powered by Discord.js and a tiny bit of OpenAI for spiciness
  
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
</div>

## 🌟 Features

Shodan offers a rich set of features across multiple categories:
Nothing is being logged, so you can be sure that your privacy is respected. This is my core value and I will never change it.

### 🔮 Tarot & Divination

- `/divine` - Get a personalized tarot reading with AI-generated interpretations
  - Options for wholesome or sarcastic readings
  - Full Rider-Waite tarot deck with custom card imagery

### 🛡️ Moderation Tools

- `/purge` - Delete multiple messages at once
- `/banned` - View a list of banned users
- `/members` - Get a comprehensive member list

### 🎲 Fun Commands

- `/coinflip` - Flip a coin with visual results
- `/dice` - Roll custom dice with configurable ranges
- `/roll` - Roll dice in standard NdX format (e.g., 2d6)

### 🛠️ Utility Commands

- `/avatar` - Display a user's avatar in an embed
- `/echo` - Make the bot repeat your message
- `/ping` - Check the bot's latency
- `/help` - Display a list of all available commands
- `/join` - Make the bot join a voice channel
- `/muse` - Music search functionality (WIP)

### 🧠 AI Integration

- OpenAI-powered tarot readings with personalized interpretations
- Easily extensible for more AI capabilities

## 📋 Requirements

- Node.js 16.x or higher
- Discord Bot Token
- OpenAI API Key (for tarot readings)

## 🚀 Quick Start

1. Clone the repository

    ```bash
      git clone https://github.com/soulwax/Shodan.git
      cd Shodan
    ```

2. Install dependencies

    ```bash
      npm install
    ```

3. Create a `.env` file in the root directory with the following:

    ```env
      BOT_TOKEN=your_discord_bot_token
      CLIENT_ID=your_client_id
      CLIENT_SECRET=your_client_secret
      OPENAI_API_KEY=your_openai_api_key
      TRACKING_CHANNEL_ID=your_channel_id
    ```

4. Build the TypeScript code

    ```bash
    npm run build
    ```

5. Start the bot

    ```bash
    npm start
    ```

## 💻 Development

### Available Scripts

- `npm run dev` - Run the bot in development mode with hot reloading
- `npm run build` - Compile TypeScript code
- `npm run lint` - Check for linting issues
- `npm run lint:fix` - Fix linting issues
- `npm run tree` - Generate a project structure tree
- `npm run clean` - Clean up node_modules and lock files
- `npm run pm2` - Run the bot with PM2 process manager

### Project Structure

```
├── src
│   ├── app.ts             # Main application bootstrap
│   ├── index.ts           # Entry point
│   ├── commands           # Bot commands
│   │   ├── fun            # Fun commands
│   │   ├── moderation     # Moderation commands
│   │   ├── tarot          # Tarot commands
│   │   └── utility        # Utility commands
│   ├── config             # Configuration files
│   ├── core               # Core functionality
│   ├── events             # Event handlers
│   ├── services           # Services (OpenAI, etc.)
│   ├── types              # TypeScript type definitions
│   └── utils              # Utility functions
└── static                 # Static assets
    ├── card-data.json     # Tarot card data
    └── rider-waite        # Tarot card images
```

## 📝 Adding New Commands

1. Create a new file in the appropriate commands directory
2. Use the following template:

```typescript
import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command';

const yourCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('commandname')
    .setDescription('Command description'),
  
  category: 'category',
  
  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    // Your command logic here
  }
};

export default yourCommand;
```

3. The command will be automatically registered on the next bot restart

## 🌟 Tarot Reading System

The `/divine` command provides AI-powered tarot readings:

- Random card selection from the Rider-Waite deck
- Card can be upright or reversed
- AI interprets the card in relation to the user's question
- Customizable reading tone (wholesome or sarcastic)
- Support for seed values to recreate specific readings

## 🔒 Security

- Never commit your `.env` file
- Keep your OpenAI API key secure
- Use proper Discord permission checks for moderation commands

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Discord.js](https://discord.js.org/) - The Discord API library
- [OpenAI](https://openai.com/) - AI capabilities
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [node-canvas](https://github.com/Automattic/node-canvas) - Image manipulation for tarot cards

---

Created with ❤️ by [soulwax](https://github.com/soulwax)
