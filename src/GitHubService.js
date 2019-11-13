const getPublicUrlImplementation = require('./use-cases/get-public-url')
const getUserInformationImplementation = require('./use-cases/get-user-information')
const getRepoArchiveImplementation = require('./use-cases/get-repo-archive');

const Joi = require('@hapi/joi');
const { validate } = require('./use-cases/schema')

exports.GitHubService = (app) => {
    const getAppContext = async () => {
        return await app.auth()
    }

    const getUserContext = async (installationID) => {
        return await app.auth(installationID)
    }

    const getInstallationID = async (username) => {
        const github = await getAppContext()
        const output = await github.apps.listInstallations()
      
        const schema = Joi.object().keys({
            status: Joi.number().min(200).max(299).required(),
            data: Joi.array().items(Joi.object({
                id: Joi.number().required()
            }).unknown(true))
        }).unknown(true)

        validate(output, schema)

        return output.data.filter(element => username == element.account.login)[0].id
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
