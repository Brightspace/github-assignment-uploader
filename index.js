const GH_APP_NAME = 'visual-difference'
const VD_TEST_FAILURE = 'Stage 2: Visual-difference-tests\\nThis stage **failed**'
const CHECK_RUN_NAME = 'Visual Difference Tests'
const PREFIX = "https://api.github.com"

var repo_path = ''
var repo_path_travis = ''

var travis_pr_build = 'Travis CI - Pull Request'
var failure = 'failure'
var success = 'success'
var regenCommand = 'regen'
var masterCommand = 'master'

var latestToken = ''
var installationID = 0

/**
 * @param {import('probot').Application} app
 */
module.exports = app => {
    updateToken()

    // Update our stored information anytime there is an event.
    app.on('*', async context => {
        installationID = context.payload.installation.id
        repo_path = context.payload.repository.owner.url.split(PREFIX)[1]
        repo_path_travis = repo_path.replace("/repos", "/repo")
        repo_path_travis = repo_path_travis.replace("\/(?=[^\/]*$)", "%2F")
        updateToken()
    })

    app.on('check_run', async context => {
        updateToken()
        if (context.payload.check_run.name == travis_pr_build) {
            createCheckRunProgress(context)
        }
        if (context.payload.check_run.conclusion == failure && context.payload.check_run.name == travis_pr_build) {
            getCheckRunSummary(context, context.payload.check_run.id)
        }
        if (context.payload.check_run.conclusion == success && context.payload.check_run.name == travis_pr_build) {
            createCheckRunComplete(context)
        }
    })

    app.on('check_run.requested_action', async context => {
        updateToken()
        console.log(context.payload.requested_action.identifier)
        if (context.payload.requested_action.identifier.includes(regenCommand)) {
            getBranchName(context, JSON.parse(context.payload.requested_action.identifier).number)
        }
        if (context.payload.requested_action.identifier.includes(masterCommand)) {
            regenGoldens(JSON.parse(context.payload.requested_action.identifier).number, masterCommand, context)
        }
    })
}

function getCheckRunSummary(context, check_run_id) {
    // Parameters for the API call
    const https = require('https')
    const get_options = {
        hostname: 'api.github.com',
        port: 443,
        path: repo_path + '/check-runs/' + check_run_id,
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

// Did the visual difference test fail?
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
        body: 'Hey there! It looks like your "' + travis_pr_build + '" \
               build failed, due to the visual difference test failing. \
               Check out the details of the Travis build [here](' + url + '). \
               To regenerate the goldens please click the "Details" link on the "Visual Difference Tests" check. \
               If you decide to re-generate the goldens, please re-run the "Visual-difference-tests" Travis job afterwards.',
        issue_number: number,
        owner: repo_owner,
        repo: the_repo
    })
    createCheckRunFail(context, number);

    // Post a comment on the PR
    return context.github.issues.createComment(params)
}

function createCheckRunProgress(context) {
    updateToken()
    // Parameters for the API call
    const https = require('https')
    const data = JSON.stringify({
        'name': CHECK_RUN_NAME,
        'head_sha': context.payload.check_run.head_sha,
        'status': 'in_progress',
        'started_at': context.payload.check_run.started_at,
        'output': {
            'title': CHECK_RUN_NAME,
            'summary': 'Visual difference tests are in progress.'
        }
    })

    const post_options = {
        hostname: 'api.github.com',
        port: 443,
        path: repo_path + '/check-runs',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'User-Agent': GH_APP_NAME,
            'Accept': 'application/vnd.github.antiope-preview+json',
            'Authorization': 'Token ' + latestToken
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
}

function createCheckRunFail(context, number) {
    updateToken()
    // Parameters for the API call
    const https = require('https')
    const data = JSON.stringify({
        'name': CHECK_RUN_NAME,
        'head_sha': context.payload.check_run.head_sha,
        'status': 'completed',
        'conclusion': failure,
        'started_at': context.payload.check_run.started_at,
        'completed_at': context.payload.check_run.completed_at,
        'actions': [{
            "label": "Regenerate Goldens",
            "description": "Regenereate the Golden images.",
            "identifier": JSON.stringify({
                "command": regenCommand,
                "number": number
            })
        }, {
            "label": "Reset Goldens",
            "description": "Reset goldens to master.",
            "identifier": JSON.stringify({
                "command": masterCommand,
                "number": number
            })
        }],
        'output': {
            'title': CHECK_RUN_NAME,
            'summary': 'Visual difference tests failed.'
        }
    })

    const post_options = {
        hostname: 'api.github.com',
        port: 443,
        path: repo_path + '/check-runs',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'User-Agent': GH_APP_NAME,
            'Accept': 'application/vnd.github.antiope-preview+json',
            'Authorization': 'Token ' + latestToken
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
}

function createCheckRunComplete(context) {
    updateToken()
    // Parameters for the API call
    const https = require('https')
    const data = JSON.stringify({
        'name': CHECK_RUN_NAME,
        'head_sha': context.payload.check_run.head_sha,
        'status': 'completed',
        'conclusion': success,
        'started_at': context.payload.check_run.started_at,
        'completed_at': context.payload.check_run.completed_at,
        'output': {
            'title': CHECK_RUN_NAME,
            'summary': 'Visual difference tests passed!'
        }
    })

    const post_options = {
        hostname: 'api.github.com',
        port: 443,
        path: repo_path + '/check-runs',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'User-Agent': GH_APP_NAME,
            'Accept': 'application/vnd.github.antiope-preview+json',
            'Authorization': 'Token ' + latestToken
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
}

function getBranchName(context, num) {
    let branch_name = ''

    // Parameters for the API call
    const https = require('https')
    const get_options = {
        hostname: 'api.github.com',
        port: 443,
        path: repo_path + '/pulls/' + num,
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
            regenGoldens(num, branch_name, context)
        })
    }).on("error", (err) => {
        console.log("Error: " + err.message)
    })
}

function regenGoldens(number, branch_name, context) {
    const token = process.env.TRAVIS_AUTH
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
        path: repo_path_travis + '/requests',
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
}

function updateToken() {
    // Get the JWT
    var exec = require("child_process").exec;
    var jwt = ''

    var token = jwt.sign({
        iat: dfssdaf,
        exp: Math.floor(Date.now() / 1000) + (10 * 60),
        iss: 41247
    }, process.env.PRIVATE_KEY, {
        algorithm: 'RS256'
    });

    authenticateJWT(token);
}

function authenticateJWT(jwt) {
    // Authorize the JWT
    // Parameters for the API call
    const https = require('https')
    const get_options = {
        hostname: 'api.github.com',
        port: 443,
        path: '/app',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + jwt,
            'User-Agent': GH_APP_NAME,
            'Accept': 'application/vnd.github.antiope-preview+json'
        }
    }
    // Send the request
    const req = https.request(get_options, (res) => {
        console.log(`statusCode: ${res.statusCode}`)
        let data = ''
        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            getAppToken(jwt)
        })
    })
    req.on('error', (error) => {
        console.error(error)
    })
    req.end()
}

function getAppToken(jwt) {
    const https = require('https')
    // Get the app token
    const post_options = {
        hostname: 'api.github.com',
        port: 443,
        path: '/app/installations/' + installationID + '/access_tokens',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + jwt,
            'Accept': 'application/vnd.github.machine-man-preview+json',
            'User-Agent': GH_APP_NAME,
            'Content-Type': 'application/json'
        }
    }
    https.get(post_options, (res) => {
        console.log(`statusCode: ${res.statusCode}`)
        let data = ''
        let token_info = {}

        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            token_info = JSON.parse(data)
            token = token_info.token
            latestToken = token
        })
    }).on("error", (err) => {
        console.log("Error: " + err.message)
    })
}