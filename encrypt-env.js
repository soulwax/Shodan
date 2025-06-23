const fs = require('fs');
const crypto = require('crypto');

// Generate a key
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
\
// Read .env file
const envContent = fs.readFileSync('.env', 'utf8');

// Encrypt
const cipher = crypto.createCipher('aes-256-cbc', key);
let encrypted = cipher.update(envContent, 'utf8', 'hex');
encrypted += cipher.final('hex');

// Save encrypted content
fs.writeFileSync('.env.vault', `DOTENV_VAULT="${encrypted}"`);

// Save key
fs.writeFileSync('.env.keys', `DOTENV_PRIVATE_KEY="${key.toString('hex')}"`);

console.log('⃼�� encrypted (.env)');
console.log('⃼�� key saved to .env.keys');
console.log(`Private key: ${key.toString('hex')}`);
