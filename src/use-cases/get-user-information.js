// Returns a list of all the repos for the given user
async function listReposForUser(github) {
    const output = await github.apps.listRepos()
    let result = []

    // schema validation

    const repos = output.data.repositories

    // Create the repo list
    for (const element of repos) {
        result.push(element.name)
    }

    return result
}

module.exports = listReposForUser