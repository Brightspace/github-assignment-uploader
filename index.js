const { createRepoRouter } = require("./brightspace-github-api/build/src/routes/RepoRouter")
const { GitHubService } = require('./src/GitHubService')

/**
 * @param {import('probot').Application} app
 */
module.exports = async app => {
  const githubService = GitHubService(app)

  await githubService.getRepoArchive("dmackenz", "CIS-3490")

  const baseRouter = app.route('/api')
  baseRouter.use(createRepoRouter({
    getInstallationId: githubService.getInstallationID,
    listRepos: githubService.listReposForUser,
    getArchive: githubService.getRepoArchive,
    getPublicURL: githubService.getPublicUrl,
    getArchiveLink: githubService.getRepoArchiveLink
  }))
}