const got = require('got')

// Returns a zip archive for the given user repo
async function getRepoArchive(github, params) {
    const resp = await github.repos.getArchiveLink(params)

    // schema validate resp here

    let buffer = undefined;

    if(!('url' in resp)) {
        buffer = resp.data
    } else if('url' in resp) {
        const url = resp.url
        buffer = await loadBuffer(url)
    }

    return buffer
}

function loadBuffer(url) {
    return new Promise((resolve, reject) => {
        let buffer = []
        const stream = got.stream(url)

        stream.on('data', (d) => {
            buffer.push(d)
        })

        stream.on('end', () => {
            buffer  = Buffer.concat(buffer)
            resolve(buffer)
        })
    })
}

module.exports = getRepoArchive