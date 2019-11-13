const { createProbot } = require('probot')
const { findPrivateKey } = require('probot/lib/private-key')
const serverless = require('serverless-http')
const probotApp = require('./')

// Create a probot installation with our app details
const options = {
  id: process.env.APP_ID,
  port: process.env.PORT || 3000,
  secret: process.env.WEBHOOK_SECRET,
  clientid: process.env.CLIENT_ID,
  clientsecret: process.env.CLIENT_SECRET,
  cert: findPrivateKey()
}

// Create and load the probot app
const probot = createProbot(options)
const app = probot.load(probotApp)

// Send the probot express server to the serverless framework
module.exports.probot = serverless(probot.server)