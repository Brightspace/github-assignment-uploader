/**
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
            let num = context.payload.issue.number;
            let branch_name = '';
            
            // Parameters for the API call
            const https = require('https');
            const get_options = {
                hostname: 'api.github.com',
                port: 443,
                path: '/repos/BrightspaceHypermediaComponents/activities/pulls/' + num,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'visual-difference'
                }
            };

            // Get the branch name first
            https.get(get_options, (res) => {
                let data = '';
                let pr_info = {};

                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    pr_info = JSON.parse(data);
                    branch_name = pr_info.head.ref;
                    secondRequest(num, branch_name, context);
                });
            }).on("error", (err) => {
                console.log("Error: " + err.message);
            });
        }
    })
}

function secondRequest(number, branch_name, context) {
    const token = process.env.AUTH_TOKEN;
    // Format the second request
    const https = require('https');
    const data = JSON.stringify({
        "request": {
            "config": {
                "merge_mode": "merge",
                "script": [
                    "npm run test:diff:golden"
                ]
            },
            "branch": "master"
        }
    })
    const post_options = {
        hostname: 'api.travis-ci.com',
        port: 443,
        path: '/repo/BrightspaceHypermediaComponents%2Factivities/requests',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'Accept': 'application/json',
            'Travis-API-Version': '3',
            'Authorization': 'token ' + token
        }
    }

    // Send the request
    const req = https.request(post_options, (res) => {
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
        body: 'The goldens will be regenerated shortly. Once it is done, you should re-run the failing tests. :) ',
        issue_number: number
    })
    delete params["number"];

    // Post a comment on the PR
    return context.github.issues.createComment(params)
}