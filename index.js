// index.js

/**
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.on(`*`, async context => {
      console.log("Triggered")
    })
}
