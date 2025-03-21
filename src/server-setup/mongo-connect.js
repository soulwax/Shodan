// File: src/server-setup/mongo-connect.js

require('dotenv').config()
const mongoose = require('mongoose')
const chalk = require('chalk')

const bold = chalk.bold

const { cyan, yellow, red, green } = bold

const connected = green
const error = yellow
const disconnected = red
const connectionDetails = cyan
const dbUrl = process.env.MONGODB_CONNECTION_STRING

// export let db
// export this function and imported by server.js

const mongoConnect = async () => {
  mongoose.set('strictQuery', true)
  mongoose.connect(dbUrl)
  const db = mongoose.connection
  db.on('connected', () => {
    // save the DB_URI as string from .env file, cut out username and password, and replace with ****
    const dbUrlHidden = dbUrl.replace(/\/\/(.*):(.*)@/, '//****:****@')

    console.log(connected(`Mongoose default connection is open to ${connectionDetails(dbUrlHidden)}`))
  })

  db.on('error', (err) => {
    console.log(error(`Mongoose default connection has occured ${err} error`))
  })

  db.on('disconnected', () => {
    console.log(disconnected('Mongoose default connection is disconnected'))
  })
}

module.exports = mongoConnect
