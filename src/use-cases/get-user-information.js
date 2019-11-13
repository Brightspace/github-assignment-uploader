const Joi = require('@hapi/joi');
const { validate } = require('./schema')

// Returns a list of all the repos for the given user
async function listReposForUser(github) {
    const output = await github.apps.listRepos()
    const repos = output.data.repositories

    validate(output, schema)

    return repos.map(element => element.name)
}

const schema = Joi.object({
    status: Joi.number().min(200).max(299).required(),
    data: Joi.object({
        repositories: 
            Joi.array().items(
                Joi.object({
                    name: Joi.string().required()
                }).unknown(true)
            ).required()
    }).unknown(true).required()
}).unknown(true)

module.exports = listReposForUser