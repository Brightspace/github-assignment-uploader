// Constants
const CHECK_RUN_NAME = 'Visual Difference Tests';
const VD_TEST_MSG = 'Stage 2: Visual-difference-tests';
const VD_TEST_FAILURE = 'Stage 2: Visual-difference-tests\\nThis stage **failed**';
const PREFIX = "https://api.github.com";
const TRAVIS_PREFIX = "https://travis-ci.com/";
const TRAVIS_MIDDLE = "/builds/";

// Variables
var travis_pr_build = 'Travis CI - Pull Request';
var failure = 'failure';
var queued = 'queued';
var success = 'success';
var regenCommand = 'r';
var masterCommand = 'm';
var repoPath = '';
var repoPathTravis = ''
var latestToken = '';
var installationID = 0;

/**
 * @param {import('probot').Application} app
 */
module.exports = app => {
    // Update our stored information anytime there is an event.
    app.on('*', async context => {
        await updateGlobals(context);
    })

    // On a check run event perform some actions.
    app.on('check_run', async context => {
        // If it's a travis PR build, create/update a Visual Difference check run.
        if (context.payload.check_run.name == travis_pr_build) {
            const hasVDTest = await hasVisualDiffTest(context);

            if(hasVDTest && context.payload.check_run.status == queued) {
                // If this travis PR has a VD test and it's queued.
                // Create our VD check run.
                createInProgressCR(context);
            } else if(hasVDTest && context.payload.check_run.status == success)
            {
                // If this travis PR has a VD test and it's finished.
                // Finish our VD check run.
                markCRComplete(context);
            } else if(hasVDTest && context.payload.check_run.status == failure && await confirmVDFailure(context))
            {
                // If this travis PR has a VD test and it has failed.
                // Mark our VD check run as failed.
                markCRFailed(context);
            }
        }
    })
}

// Update our global variables
async function updateGlobals(context) {
    installationID = context.payload.installation.id;
    repoPath = context.payload.repository.url.split(PREFIX)[1];
    repoPathTravis = repoPath.replace("/repos", "/repo");
    var regex = /\/(?=[^\/]*$)/g;
    repoPathTravis = repoPathTravis.replace(regex, "%2F");
}

// Does this check run have a visual difference test?
async function hasVisualDiffTest(context) {
    const params = context.issue({
        check_run_id: context.payload.check_run.id
    })

    const check_run_info = await context.github.checks.get(params);
    return check_run_info.data.output.text.includes(VD_TEST_MSG);
}

// Did the visual difference tests fail for this check run?
async function confirmVDFailure(context) {
    const params = context.issue({
        check_run_id: context.payload.check_run.id
    })

    const check_run_info = await context.github.checks.get(params);
    return check_run_info.data.output.text.includes(VD_TEST_FAILURE);
}

// Creates an in-progress VD check run.
async function createInProgressCR(context) {
    const params = context.issue({
        name: CHECK_RUN_NAME,
        head_sha: context.payload.check_run.head_sha,
        status: 'in_progress',
        started_at: context.payload.check_run.started_at,
        output: {
            title: CHECK_RUN_NAME,
            summary: 'Visual difference tests are in progress.'
        },
        details_url: context.payload.check_run.details_url
    })

    return context.github.checks.create(params);
}

// Creates a completed VD check run.
async function markCRComplete(context) {
    const params = context.issue({
        name: CHECK_RUN_NAME,
        head_sha: context.payload.check_run.head_sha,
        status: 'completed',
        conclusion: success,
        started_at: context.payload.check_run.started_at,
        completed_at: context.payload.check_run.completed_at,
        output: {
            title: CHECK_RUN_NAME,
            summary: 'Visual difference tests passed!'
        },
        details_url: context.payload.check_run.details_url
    })

    return context.github.checks.create(params);
}

// Creates a failed VD check run.
async function markCRFailed(context) {
    await makeCommentFailure(context);

    const issueNum = await getIssueNumFromCR(context);
    const extID = context.payload.check_run.external_id;

    for (let element of context.payload.check_run.pull_requests) {
        if (element.hasOwnProperty('number')) {
            issueNum = element.number;
            break;
        }
    }

    const params = context.issue({
        name: CHECK_RUN_NAME,
        head_sha: context.payload.check_run.head_sha,
        status: 'completed',
        conclusion: failure,
        started_at: context.payload.check_run.started_at,
        completed_at: context.payload.check_run.completed_at,
        actions: [{
            label: 'Regenerate Goldens',
            description: 'Regenereate the Golden images.',
            identifier: JSON.stringify({
                c: regenCommand,
                n: issueNum
            })
        }, {
            label: 'Reset Goldens',
            description: 'Reset Goldens to master.',
            identifier: JSON.stringify({
                c: masterCommand,
                n: issueNum
            })
        }],
        output: {
            title: CHECK_RUN_NAME,
            summary: 'Visual difference tests failed.'
        },
        details_url: context.payload.check_run.details_url
    });

    return context.github.checks.create(params);
}

async function makeCommentFailure(context) {
    // Extract the number, repo and repoOwner from the checkRun.
    let url = context.payload.check_run.details_url;

    const issueNum = await getIssueNumFromCR(context);

    // Post a comment letting the dev know their build failed.
    const params = context.issue({
        body: 'Hey there! It looks like your "' + travis_pr_build + '" \
               build failed, due to the visual difference test failing. \
               Check out the details of the Travis build [here](' + url + '). \
               To regenerate the goldens please see the "Details" link on the "Visual Difference Tests" check.',
        number: issueNum
    })

    // Post a comment on the PR
    return context.github.issues.createComment(params)
}

async function getIssueNumFromCR(context) {
    let issueNum = 0;

    for (let element of context.payload.check_run.pull_requests) {
        if (element.hasOwnProperty('number')) {
            issueNum = element.number;
            break;
        }
    }

    return issueNum
}