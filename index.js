const { createRepoRouter } = require("./brightspace-github-api/build/src/routes/RepoRouter")
const { GitHubService } = require('./src/GitHubService')

/**
 * @param {import('probot').Application} app
 */
module.exports = async app => {
  const githubService = GitHubService(app)

  const baseRouter = app.route('/app')
  baseRouter.use(createRepoRouter({
    getInstallationId: githubService.getInstallationID,
    listRepos: githubService.listReposForUser,
    getArchive: githubService.getRepoArchive,
    getPublicURL: githubService.getPublicUrl,
    getArchiveLink: githubService.getRepoArchiveLink
  }))
}