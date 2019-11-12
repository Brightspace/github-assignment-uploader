// index.js

const got = require('got')

const { createRepoRouter } = require("./brightspace-github-api/build/src/routes/RepoRouter")
const INFO_PREFIX = '[INFO] '
const ERROR_PREFIX = '[ERROR] '

// Globals
var theApp = null

/**
 * @param {import('probot').Application} app
 */
module.exports = app => {
  theApp = app
  const baseRouter = app.route('/api')
  baseRouter.use(createRepoRouter(UserServiceImplementation))
}

// Returns the authenticated app context
async function getContext() {
  return await theApp.auth()
}

// Returns the authenticated app context as the given installation ID
async function getContext(installation_id) {
  return await theApp.auth(installation_id)
}

// Returns the user's installation ID for this app
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

// Returns a list of all the repos for the given user
async function listReposForUser(username) {
  const github = await getContext(await getInstallationID(username));
  const output = await github.apps.listRepos()
  let result = []

  const repos = output.data.repositories
   
  for (const element of repos) {
    result.push(element.name)
  }

  return result
}

// Returns a zip archive for the given user repo
async function getRepoArchive(username, repo_name) {
  try {
    let buffer = []

    const params = {
      owner: username,
      repo: repo_name,
      archive_format: 'zipball',
      ref: ''
    }

    const github = await getContext(await getInstallationID(username));
    const resp = await github.repos.getArchiveLink(params)

    // If the API gives us a URL, we can stream the zip into a buffer
    // Otherwise, we were given the ZIP directly
    if(resp.status == 200 && !('url' in resp)) {
      buffer = resp.data
    } else if('url' in resp) {
      await new Promise((resolve, reject) => {
        const stream = got.stream(url)

        stream.on('data', (d) => {
          buffer.push(d)
        })

        stream.on('end', () => {
          buffer  = Buffer.concat(buffer)
          resolve()
        })
      })
    }

    return buffer

  } catch (error) {
    console.log(`${ERROR_PREFIX}${error}`)
  }
}

// Gives the public installation URL of the GitHub app
async function getPublicURL() {
  const github = await getContext()
  const output = await github.apps.getAuthenticated()

  return output.data.html_url
}

// Wrapper for the above class 
const UserServiceImplementation = {
  getInstallationId: getInstallationID,
  listRepos: listReposForUser,
  getArchive: getRepoArchive,
  getPublicURL: getPublicURL
}