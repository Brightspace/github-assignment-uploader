// index.js

// Globals
var theApp = null

/**
 * @param {import('probot').Application} app
 */
module.exports = app => {
  theApp = app
  onStart()
}

async function getContext() {
  return await theApp.auth()
}

async function getContext(installID) {
  return await theApp.auth(installID)
}

async function getInstallationID(username) {
  let result = 0
  const github = await getContext()
  const output = await github.apps.listInstallations()

  for (const element of output.data) {
    const login = element.account.login

    if (login == username) {
      result = element.id
      break
    }
  }

  return result
}

// /async function listReposForUser( )

async function onStart() {
  console.log(await getInstallationID("DiljotSG"))
}