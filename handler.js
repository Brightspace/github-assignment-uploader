// handler.js

const { createProbot } = require('probot')
const { findPrivateKey } = require('probot/lib/private-key')
const serverless = require('serverless-http')
const probotApp = require('./')

const options = {
  id: process.env.APP_ID,
  port: process.env.PORT || 3000,
  secret: process.env.WEBHOOK_SECRET,
  clientid: process.env.CLIENT_ID,
  clientsecret: process.env.CLIENT_SECRET,
  cert: findPrivateKey()
}

const probot = createProbot(options)
const app = probot.load(probotApp)

module.exports.probot = serverless(probot.server)