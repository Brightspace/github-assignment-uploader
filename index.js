/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {

    app.on('check_run', async context => {
        if (context.payload.check_run.conclusion == 'failure' && context.payload.check_run.name == 'Travis CI - Pull Request') {
            // Extract the number, repo and repo owner from the check run.
            let number = 0
            let the_repo = ''
            let repo_owner = ''
            let url = context.payload.check_run.details_url
            context.payload.check_run.pull_requests.forEach(element => {
                number = element.number
                the_repo = element.base.repo.name
            });
            repo_owner = context.payload.organization.login

            // Post a comment letting the dev know their build failed.
            let params = ({
                body: 'Hey there! It looks like your "Travis CI - Pull Request" \
                       build failed. Possibily due to the visual difference test failing. \
                       Check out the details of the build [here](' + url + '). \
                       To regenerate the goldens please comment with "/regen".',
                issue_number: number,
                owner: repo_owner,
                repo: the_repo
            })

            // Post a comment on the PR
            return context.github.issues.createComment(params)
        }
    })

    app.on('issue_comment', async context => {
        if (context.payload.comment.body == '/regen') {
            const token = process.env.AUTH_TOKEN;

            // Parameters for the API call
            const https = require('https')
            const data = JSON.stringify({
                "value1": {
                    "request": {
                        "config": {
                            "merge_mode": "merge",
                            "script": [
                                "npm run test:diff:golden"
                            ]
                        },
                        "branch": "perceptual-diff-stage-2"
                    }
                }
            })
            const options = {
                hostname: 'maker.ifttt.com',
                port: 443,
                path: '/trigger/test/with/key/m9wz_pX3eVTvAb6vm6SYf',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length,
                    'Accept': 'application/json',
                    'Authorization': 'token ' + token
                }
            }

            // Send the request
            const req = https.request(options, (res) => {
                console.log(`statusCode: ${res.statusCode}`)

                res.on('data', (d) => {
                    process.stdout.write(d)
                })
            })
            req.on('error', (error) => {
                console.error(error)
            })
            req.write(data)
            req.end()
            
            // Let the dev know what is going on.
            let params = context.issue({
                body: 'The goldens will be regenerated shortly. Once it is done, you should re-run the failing tests. :)',
                issue_number: context.payload.issue.number
            })
            delete params["number"];

            // Post a comment on the PR
            return context.github.issues.createComment(params)
        }
    })
}