// handler.js
const { Probot } = require('probot')
const serverless = require('serverless-http')

const probotApp = require('./')
myProbot = new Probot({})

const app = myProbot.load(probotApp)

module.exports.probot = serverless(myProbot.server)