async function getPublicURL(github) {
    const output = await github.apps.getAuthenticated()
    // schema validation
    return output.data.html_url
}

module.exports = getPublicURL
