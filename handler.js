// handler.js
const { serverless } = require('@probot/serverless-lambda')
const appFn = require('./probot')
module.exports.probot = serverless(appFn)
