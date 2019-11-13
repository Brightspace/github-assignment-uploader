const got = require('got')
const Joi = require('@hapi/joi');
const { validate } = require('./schema');

// Returns a zip archive for the given user repo
async function getRepoArchive(github, params) {
    const resp = await github.repos.getArchiveLink(params)
    validate(resp, schema)
    return resp.url ? await loadBuffer(resp.url) : resp.data;
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

const schema = Joi.object().keys({
    status: Joi.number().min(200).max(299).required(),
    data: Joi.object().optional(),
    url: Joi.string().optional()
}).unknown(true).or('data', 'url')


module.exports = getRepoArchive