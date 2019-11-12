// handler.js
const serverless = require('serverless-http');
const appFn = require('./')
module.exports.probot = serverless(appFn)