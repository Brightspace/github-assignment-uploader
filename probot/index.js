// index.js

const got = require('got')
const fs = require('fs')
const path = require('path')

const INFO_PREFIX = '[INFO] '
const ERROR_PREFIX = '[ERROR] '

// Globals
var theApp = null

/**
 * @param {import('probot').Application} app
 */
module.exports = app => {
  theApp = app
}

async function getContext() {
  return await theApp.auth()
}

async function getContext(installation_id) {
  return await theApp.auth(installation_id)
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

async function listReposForUser(username) {
  const github = await getContext(await getInstallationID(username));
  const output = await github.apps.listRepos()
  let result = []

  const repos = output.data.repositories
   
  for (const element of repos) {
    result.push(element.full_name)
  }

  return result
}

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
    const url = (await github.repos.getArchiveLink(params)).url

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

    return buffer

  } catch (error) {
    console.log(`${ERROR_PREFIX}${error}`)
  }
}

async function getPublicURL() {
  const github = await getContext()
  const output = await github.apps.getAuthenticated()

  return output.data.html_url
}

const UserServiceImplementation = {
  getInstallationId: getInstallationID,
  listRepos: listReposForUser,
  getArchive: getRepoArchive,
  getPublicURL: getPublicURL
}