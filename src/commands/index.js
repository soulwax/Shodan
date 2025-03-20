// File: src/commands/index.js

const fs = require('node:fs')
const path = require('node:path')

// Dynamically load all command modules
const commandModules = {}
const commandFiles = fs
  .readdirSync(__dirname)
  .filter((file) => file.endsWith('.js') && file !== 'index.js')

for (const file of commandFiles) {
  const commandName = file.replace('.js', '')
  commandModules[commandName] = require(`./${file}`)
}

module.exports = commandModules
