const GH_APP_NAME = 'visual-difference'
const VD_TEST = 'Stage 2: Visual-difference-tests'
const VD_TEST_FAILURE = 'Stage 2: Visual-difference-tests\\nThis stage **failed**'
const CHECK_RUN_NAME = 'Visual Difference Tests'
const PREFIX = "https://api.github.com"
const TRAVIS_PREFIX = "https://travis-ci.com/"
const TRAVIS_MIDDLE = "/builds/"

var repoPath = ''
var repoPathTravis = ''

var travis_pr_build = 'Travis CI - Pull Request'
var failure = 'failure'
var success = 'success'
var regenCommand = 'r'
var masterCommand = 'm'

var latestToken = ''
var installationID = 0

/**
 * @param {import('probot').Application} app
 */
module.exports = app => {
    // Update our stored information anytime there is an event.
    app.on('*', async context => {
        installationID = context.payload.installation.id
        repoPath = context.payload.repository.url.split(PREFIX)[1]
        repoPathTravis = repoPath.replace("/repos", "/repo")
        var regex = /\/(?=[^\/]*$)/g
        repoPathTravis = repoPathTravis.replace(regex, "%2F")
        updateToken()
    })

    // On a check run event perform some checks
    app.on('check_run', async context => {
        updateToken()

        // If it's a travis PR build, check the progress and make a VD check run.
        if (context.payload.check_run.name == travis_pr_build) {
            hasVisualDiffTest(context, context.payload.check_run.id, createCheckRunProgress)
        }

        // If the travis PR build finished and failed, check if VD tests failed.
        if (context.payload.check_run.conclusion == failure && context.payload.check_run.name == travis_pr_build) {
            getCheckRunSummaryAndCommentOnFailure(context, context.payload.check_run.id)
        }

        // If the travis PR build finished and finished, mark VD tests as completed.
        if (context.payload.check_run.conclusion == success && context.payload.check_run.name == travis_pr_build) {
            hasVisualDiffTest(context, context.payload.check_run.id, createCheckRunComplete)
        }
    })

    // On a requested action button press from the user
    app.on('check_run.requested_action', async context => {
        updateToken()

        // Are we regenerating the goldens from the current branch?
        if (context.payload.requested_action.identifier.includes(regenCommand)) {
            getBranchNameAndRegenGoldens(context, JSON.parse(context.payload.requested_action.identifier).n)
        }

        // are we regenerating the goldens from the master branch?
        if (context.payload.requested_action.identifier.includes(masterCommand)) {
            regenGoldens(JSON.parse(context, context.payload.requested_action.identifier).n, "master")
        }
    })
}

// Does this check run have a visual difference test?
function hasVisualDiffTest(context, checkRunID, callback) {
    // Parameters for the API call
    const https = require('https')
    const getOptions = {
        hostname: 'api.github.com',
        port: 443,
        path: repoPath + '/check-runs/' + checkRunID,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': GH_APP_NAME,
            'Accept': 'application/vnd.github.antiope-preview+json'
        }
    }

    // Get the summary
    https.get(getOptions, (res) => {
        let data = ''

        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            // Is there a visual difference test?
            checkIfHasVD(context, String(data), callback)
        })
    }).on("error", (err) => {
        console.log("Error: " + err.message)
    })
}
// Is there a visual difference test?
function checkIfHasVD(context, message, callback) {
    if (message.includes(VD_TEST)) {
        callback(context)
    }
}

// Get the Check Run Summary and Comment on a Failure
function getCheckRunSummaryAndCommentOnFailure(context, checkRunID) {
    // Parameters for the API call
    const https = require('https')
    const getOptions = {
        hostname: 'api.github.com',
        port: 443,
        path: repoPath + '/check-runs/' + checkRunID,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': GH_APP_NAME,
            'Accept': 'application/vnd.github.antiope-preview+json'
        }
    }

    // Get the summary
    https.get(getOptions, (res) => {
        let data = ''

        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            // Check if the build failed and comment
            checkIfVDBuildFailedAndComment(context, String(data))
        })
    }).on("error", (err) => {
        console.log("Error: " + err.message)
    })
}
// Did the visual difference test fail? Leave a comment if so.
function checkIfVDBuildFailedAndComment(context, message) {
    if (message.includes(VD_TEST_FAILURE)) {
        commentFailedVD(context)
    }
}
// Comment on the PR letting the dev know that the VD tests failed.
function commentFailedVD(context) {
    // Extract the number, repo and repo owner from the check run.
    let issueNumber = 0
    let repoName = ''
    let repoOwner = ''
    let url = context.payload.check_run.details_url

    for (let element of context.payload.check_run.pull_requests) {
        if (element.hasOwnProperty('number')) {
            issueNumber = element.number
            repoName = element.base.repo.name
            break;
        }
    }
    repoOwner = context.payload.organization.login

    // Post a comment letting the dev know their build failed.
    let params = ({
        body: 'Hey there! It looks like your "' + travis_pr_build + '" \
               build failed, due to the visual difference test failing. \
               Check out the details of the Travis build [here](' + url + '). \
               To regenerate the goldens please click the "Details" link on the "Visual Difference Tests" check. \
               If you decide to re-generate the goldens, please re-run the "Visual-difference-tests" Travis job afterwards.',
        number: issueNumber,
        owner: repoOwner,
        repo: repoName
    })

    // Mark the check run as failing
    createCheckRunFail(context, issueNumber);

    // Post a comment on the PR
    return context.github.issues.createComment(params)
}

// Create an in-progress check-run
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
        },
        'details_url': context.payload.check_run.details_url
    })

    const postOptions = {
        hostname: 'api.github.com',
        port: 443,
        path: repoPath + '/check-runs',
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
    const req = https.request(postOptions, (res) => {
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
// Create a failed check run
function createCheckRunFail(context, issueNum) {
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
                "c": regenCommand,
                "n": issueNum
            })
        }, {
            "label": "Reset Goldens",
            "description": "Reset goldens to master.",
            "identifier": JSON.stringify({
                "c": masterCommand,
                "n": issueNum
            })
        }],
        'output': {
            'title': CHECK_RUN_NAME,
            'summary': 'Visual difference tests failed.'
        },
        'details_url': context.payload.check_run.details_url
    })

    const postOptions = {
        hostname: 'api.github.com',
        port: 443,
        path: repoPath + '/check-runs',
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
    const req = https.request(postOptions, (res) => {
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
// Create a completed check run
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
        },
        'details_url': context.payload.check_run.details_url
    })

    const postOptions = {
        hostname: 'api.github.com',
        port: 443,
        path: repoPath + '/check-runs',
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
    const req = https.request(postOptions, (res) => {
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

// Gets the branch name from the current PR and regenerates the goldens
function getBranchNameAndRegenGoldens(context, issueNum) {
    let branchName = ''

    // Parameters for the API call
    const https = require('https')
    const getOptions = {
        hostname: 'api.github.com',
        port: 443,
        path: repoPath + '/pulls/' + issueNum,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': GH_APP_NAME
        }
    }

    // Get the branch name first
    https.get(getOptions, (res) => {
        let data = ''
        let pr_info = {}

        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            pr_info = JSON.parse(data)
            branchName = pr_info.head.ref
            regenGoldens(context, issueNum, branchName)
        })
    }).on("error", (err) => {
        console.log("Error: " + err.message)
    })
}

// Regenerates the goldens
function regenGoldens(context, issueNum, branchName) {
    // Format the request
    const https = require('https')
    const data = JSON.stringify({
        "request": {
            "config": {
                "merge_mode": "merge",
                "script": [
                    "npm run test:diff:golden"
                ]
            },
            "branch": branchName,
            "message": "Regenerating the goldens from the '" + branchName + "' branch."
        }
    })
    const postOptions = {
        hostname: 'api.travis-ci.com',
        port: 443,
        path: repoPathTravis + '/requests',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'Accept': 'application/json',
            'Travis-API-Version': '3',
            'Authorization': 'token ' + process.env.TRAVIS_AUTH
        }
    }

    // Send the request (ask travis to regenerate the goldens)
    const req = https.request(postOptions, (res) => {
        let data = ''
        let resp = ''
        let reqId = ''

        res.on('data', (chunk) => {
            data += chunk
        })

        res.on('end', () => {
            resp = JSON.parse(data)
            reqId = resp.request.id

            getStatusRegen(context, issueNum, branchName, reqId)
        })
    })
    req.on('error', (error) => {
        console.error(error)
    })
    req.write(data)
    req.end()
}

function getStatusRegen(context, issueNum, branchName, reqId) {
    // Get the build details from travis
    const https = require('https')
    const getOptions = {
        hostname: 'api.travis-ci.com',
        port: 443,
        path: repoPathTravis + '/request/' + reqId,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'Accept': 'application/json',
            'Travis-API-Version': '3',
            'Authorization': 'token ' + process.env.TRAVIS_AUTH
        }
    }

    // Get the build href first
    https.get(getOptions, (res) => {
        let data = ''
        let resp = ''
        let buildID = ''

        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            resp = JSON.parse(data)

            for (let element of resp.builds) {
                if (element.hasOwnProperty('id')) {
                    buildID = element.id
                    break;
                }
            }

            let buildUrl = TRAVIS_PREFIX + repoPath.split("/repos/")[0] + TRAVIS_MIDDLE + buildID

            // Let the dev know what is going on.
            let params = context.issue({
                body: 'The goldens will be regenerated off of the "' + branchName + '" branch shortly. \
                        You can check the status of the build [here](' + buildUrl + ') \
                        Once the build is done, the visual difference tests will be re- run automatically.',
                number: issueNum

            })

            reRequestCheckSuite(context)

            // Post a comment on the PR
            return context.github.issues.createComment(params)

        })
    }).on("error", (err) => {
        console.log("Error: " + err.message)
    })
}

function reRequestCheckSuite(context) {
    console.log(context)
}

// Authentication functions
function updateToken() {
    // Get the JWT
    var jwt = require('jsonwebtoken');

    let key = process.env.PRIVATE_KEY
    let buffer = new Buffer(key, 'base64')
    let decoded = buffer.toString('ascii')

    var token = jwt.sign({
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (10 * 60),
        iss: 41247
    }, decoded, {
        algorithm: 'RS256'
    });

    authenticateJWT(token);
}
function authenticateJWT(jwt) {
    // Authorize the JWT
    // Parameters for the API call
    const https = require('https')
    const getOptions = {
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
    const req = https.request(getOptions, (res) => {
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
    const postOptions = {
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
    https.get(postOptions, (res) => {
        let data = ''
        let token_info = {}

        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            token_info = JSON.parse(data)
            token = token_info.token
            latestToken = token

            if (res.statusCode == 200 || res.statusCode == 201) {
                console.log("Success: Authenticated with GitHub successfully.")
            }
        })
    }).on("error", (err) => {
        console.log("Error: " + err.message)
    })
}