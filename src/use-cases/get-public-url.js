const Joi = require('@hapi/joi');
const { validate } = require('./schema')

async function getPublicURL(github) {
    const output = await github.apps.getAuthenticated()
    validate(output, schema);
    return output.data.html_url
}

const schema = Joi.object().keys({
    status: Joi.number().min(200).max(299).required(),
    data: Joi.object().keys({
        html_url: Joi.string().required()
    }).unknown(true)
}).unknown(true)

module.exports = getPublicURL
