const REPO_PATH = '/repos/BrightspaceHypermediaComponents/activities'
const REPO_PATH_TRAVIS = '/repo/BrightspaceHypermediaComponents%2Factivities/'

const TRAVIS_PI_BUILD = 'Travis CI - Pull Request'
const FAIL = 'failure'
const REGEN_CMD = '/regen'
const GH_APP_NAME = 'visual-difference'
const VD_TEST_FAILURE = 'Stage 2: Visual-difference-tests\\nThis stage **failed**'

/**
 * @param {import('probot').Application} app
 */
module.exports = app => {

    app.on('check_run', async context => {
        // app.log(context.payload)
        if (context.payload.check_run.conclusion == FAIL && context.payload.check_run.name == TRAVIS_PI_BUILD) {
            getCheckRunSummary(context, context.payload.check_run.id)
        }
    })

    app.on('issue_comment', async context => {
        if (context.payload.comment.body == REGEN_CMD) {
            getBranchNameAndReply(context);
        }
    })
}

function getCheckRunSummary(context, check_run_id) {
    // Parameters for the API call
    const https = require('https')
    const get_options = {
        hostname: 'api.github.com',
        port: 443,
        path: REPO_PATH + '/check-runs/' + check_run_id,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': GH_APP_NAME,
            'Accept': 'application/vnd.github.antiope-preview+json'
        }
    }

    // Get the summary
    https.get(get_options, (res) => {
        let data = ''

        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            checkIfVDBuildFailed(context, String(data))
        })
    }).on("error", (err) => {
        console.log("Error: " + err.message)
    })
}

function checkIfVDBuildFailed(context, message) {
    if (message.includes(VD_TEST_FAILURE)) {
        commentFailedVD(context)
    }
}

function commentFailedVD(context) {
    // Extract the number, repo and repo owner from the check run.
    let number = 0
    let the_repo = ''
    let repo_owner = ''
    let url = context.payload.check_run.details_url
    context.payload.check_run.pull_requests.forEach(element => {
        number = element.number
        the_repo = element.base.repo.name
    })
    repo_owner = context.payload.organization.login

    // Post a comment letting the dev know their build failed.
    let params = ({
        body: 'Hey there! It looks like your "' + TRAVIS_PI_BUILD + '" \
               build failed, due to the visual difference test failing. \
               Check out the details of the build [here](' + url + '). \
               To regenerate the goldens please comment with "/regen".',
        issue_number: number,
        owner: repo_owner,
        repo: the_repo
    })

    // Post a comment on the PR
    return context.github.issues.createComment(params)
}

function getBranchNameAndReply(context) {
    let num = context.payload.issue.number
    let branch_name = ''

    // Parameters for the API call
    const https = require('https')
    const get_options = {
        hostname: 'api.github.com',
        port: 443,
        path: REPO_PATH + '/pulls/' + num,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': GH_APP_NAME
        }
    }

    // Get the branch name first
    https.get(get_options, (res) => {
        let data = ''
        let pr_info = {}

        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            pr_info = JSON.parse(data)
            branch_name = pr_info.head.ref
            regenGoldensComment(num, branch_name, context)
        })
    }).on("error", (err) => {
        console.log("Error: " + err.message)
    })
}

function regenGoldensComment(number, branch_name, context) {
    const token = process.env.AUTH_TOKEN
    // Format the second request
    const https = require('https')
    const data = JSON.stringify({
        "request": {
            "config": {
                "merge_mode": "merge",
                "script": [
                    "npm run test:diff:golden"
                ]
            },
            "branch": branch_name
        }
    })
    const post_options = {
        hostname: 'api.travis-ci.com',
        port: 443,
        path: REPO_PATH_TRAVIS + '/requests',
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
        body: 'The goldens will be regenerated shortly. Once it is done, you should re-run the failing tests.',
        issue_number: number
    })
    delete params["number"]

    // Post a comment on the PR
    return context.github.issues.createComment(params)
}