const Joi = require('@hapi/joi');
const { validate } = require('./schema');

async function getRepoArchiveLink(github, params) {
    const resp = await github.repos.getArchiveLink(params)
    validate(resp, schema)
    return resp.url
}

const schema = Joi.object().keys({
    status: Joi.number().min(200).max(299).required(),
    url: Joi.string().required()
}).unknown(true)

module.exports = getRepoArchiveLink