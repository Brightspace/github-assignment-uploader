const getPublicUrlImplementation = require('./use-cases/get-public-url')
const getUserInformationImplementation = require('./use-cases/get-user-information')
const getRepoArchiveImplementation = require('./use-cases/get-repo-archive');

exports.GitHubService = (app) => {
    const getAppContext = async () => {
        return await app.auth()
    }

    const getUserContext = async (installationID) => {
        return await app.auth(installationID)
    }

    const getInstallationID = async (username) => {
        let result = 0
        const github = await getAppContext()
        const output = await github.apps.listInstallations()
      
        // schema validation

        // Find the installation ID among all installations of this app
        for (const element of output.data) {
          const login = element.account.login
      
          if (login == username) {
            result = element.id
            break
          }
        }
      
        return result
    }

    const getPublicUrl = async () => {
        const github = await getAppContext()
        return await getPublicUrlImplementation(github);
    }

    const listReposForUser = async (username) => {
        const installationID = await getInstallationID(username)
        const github = await getUserContext(installationID)
        return await getUserInformationImplementation(github);
    }

    const getRepoArchive = async (username, repo_name) => {
        const installationID = await getInstallationID(username)
        const github = await getUserContext(installationID)

        const params = {
            owner: username,
            repo: repo_name,
            archive_format: 'zipball',
            ref: ''
        }

        return await getRepoArchiveImplementation(github, params);
    }

    return {
        getInstallationID,
        listReposForUser,
        getRepoArchive,
        getPublicUrl
    }
}
