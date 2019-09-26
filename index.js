// index.js
// Constants
const CHECK_RUN_NAME = 'Visual Difference Tests';
const VD_TEST_MSG = 'Stage 2: Visual-difference-tests';
const VD_TEST_FAILURE = '### Stage 2: Visual-difference-tests\nThis stage **failed**';
const VD_TEST_CANCEL = '### Stage 2: Visual-difference-tests\nThis stage **canceled**.';
const VD_TEST_PASS = '### Stage 2: Visual-difference-tests\nThis stage **passed**.';
const GITHUB_API_BASE = 'https://api.github.com';
const TRAVIS_API_BASE = 'https://api.travis-ci.com'
const TRAVIS_HOME_BASE = 'https://travis-ci.com/';
const TRAVIS_BUILDS_PATH = '/builds/';
const TRAVIS_PR_BUILD = 'Travis CI - Pull Request';

// Statuses
const QUEUED = 'queued';
const COMPLETED = 'completed';
const IN_PROG = 'in_progress';

// Conclusions
const FAILURE = 'failure';
const SUCCESS = 'success';
const CANCELLED = 'cancelled';

const REGEN_CMD = 'r';
const MASTER_CMD = 'm';
const REGEN_NPM_CMD = 'npm run test:diff:golden';
const INFO_PREFIX = '[INFO] ';
const ERROR_PREFIX = '[ERROR] ';
const DEFAULT_BRANCH = 'master';

// Global Variables
var repoPath = '';
var repoPathTravis = ''
var installationID = 0;
var map = {};

// Imports
const got = require('got');

/**
 * @param {import('probot').Application} app
 */
module.exports = app => {
    // Update our stored information anytime there is an event.
    app.on('*', async context => {
        console.log(`${INFO_PREFIX}Updated global information from GitHub event.`);
        await updateGlobals(context);
    });

    // On a check run event perform some actions.
    app.on('check_run', async context => {
        // If it's a travis PR build, create/update a Visual Difference check run.
        if (context.payload.check_run.name == TRAVIS_PR_BUILD) {
            const hasVDTest = await hasVisualDiffTest(context);

            if (hasVDTest && context.payload.check_run.status == QUEUED) {
                // If this travis PR has a VD test and it's queued.
                // Create our VD check run.
                await createInProgressCR(context);
            } else if (hasVDTest && context.payload.check_run.status == COMPLETED && context.payload.check_run.conclusion == SUCCESS) {
                // If this travis PR has a VD test and it's finished.
                // Finish our VD check run.
                await markCRComplete(context);
            } else if (hasVDTest && context.payload.check_run.status == COMPLETED && context.payload.check_run.conclusion == FAILURE && await confirmVDFailure(context)) {
                // If this travis PR has a VD test and it has failed.
                // Mark our VD check run as failed.
                await markCRFailed(context);
            } else if (hasVDTest && context.payload.check_run.status == COMPLETED && context.payload.check_run.conclusion == CANCELLED) {
                // If this travis PR has a VD test and it has failed.
                // Mark our VD check run as failed.
                await markCRCancelled(context);
            } else if(hasVDTest && context.payload.check_run.status == COMPLETED && context.payload.check_run.conclusion == FAILURE && await confirmVDCancel(context)) {
                // If this travis PR has a VD test and the build failed and the VD was cancelled.
                // Mark our VD check run as cancelled.
                await markCRCancelled(context);
            } else if(hasVDTest && context.payload.check_run.status == COMPLETED && context.payload.check_run.conclusion == FAILURE && await confirmVDPass(context)) {
                // If this travis PR has a VD test and the build failed but the VD passed.
                // Mark our VD check run as passed.
                await markCRComplete(context);
            }
        }
    });

    // When the user requests an action on a failed check run.
    app.on('check_run.requested_action', async context => {
        let issueNum = JSON.parse(context.payload.requested_action.identifier).n;
        // Are we regenerating the goldens from the current branch?
        if (context.payload.requested_action.identifier.includes(REGEN_CMD)) {
            const branch = await getBranchFromPR(context, issueNum);
            await regenGoldens(context, issueNum, branch);
        }

        // Are we regenerating the goldens from the master branch?
        if (context.payload.requested_action.identifier.includes(MASTER_CMD)) {
            await regenGoldens(context, issueNum, DEFAULT_BRANCH);
        }
    });
}

// Timer function
const timer = ms => new Promise(res => setTimeout(res, ms));

// Update our global variables
async function updateGlobals(context) {
    installationID = context.payload.installation.id;
    repoPath = context.payload.repository.url.split(GITHUB_API_BASE)[1];
    repoPathTravis = repoPath.replace('/repos', '/repo');
    var regex = /\/(?=[^\/]*$)/g;
    repoPathTravis = repoPathTravis.replace(regex, '%2F');
}

// Does this check run have a visual difference test?
async function hasVisualDiffTest(context) {
    const params = context.issue({
        check_run_id: context.payload.check_run.id
    });

    const check_run_info = await context.github.checks.get(params);
    return check_run_info.data.output.text.includes(VD_TEST_MSG);
}

// Did the visual difference tests fail for this check run?
async function confirmVDFailure(context) {
    const params = context.issue({
        check_run_id: context.payload.check_run.id
    });

    const check_run_info = await context.github.checks.get(params);
    return String(check_run_info.data.output.text).includes(VD_TEST_FAILURE);
}

// Did the visual difference tests get cancelled this check run?
async function confirmVDCancel(context) {
    const params = context.issue({
        check_run_id: context.payload.check_run.id
    });

    const check_run_info = await context.github.checks.get(params);
    return String(check_run_info.data.output.text).includes(VD_TEST_CANCEL);
}

// Did the visual difference tests pass this check run?
async function confirmVDPass(context) {
    const params = context.issue({
        check_run_id: context.payload.check_run.id
    });

    const check_run_info = await context.github.checks.get(params);
    return String(check_run_info.data.output.text).includes(VD_TEST_PASS);
}

// Creates an in-progress VD check run.
async function createInProgressCR(context) {
    const params = context.issue({
        name: CHECK_RUN_NAME,
        head_sha: context.payload.check_run.head_sha,
        status: IN_PROG,
        started_at: context.payload.check_run.started_at,
        output: {
            title: CHECK_RUN_NAME,
            summary: 'Visual difference tests are in progress.'
        },
        details_url: context.payload.check_run.details_url
    });

    console.log(`${INFO_PREFIX}Visual difference tests are in progress.`);

    return context.github.checks.create(params);
}

// Creates a completed VD check run.
async function markCRComplete(context) {
    const params = context.issue({
        name: CHECK_RUN_NAME,
        head_sha: context.payload.check_run.head_sha,
        status: COMPLETED,
        conclusion: SUCCESS,
        started_at: context.payload.check_run.started_at,
        completed_at: context.payload.check_run.completed_at,
        output: {
            title: CHECK_RUN_NAME,
            summary: 'Visual difference tests passed!'
        },
        details_url: context.payload.check_run.details_url
    });

    console.log(`${INFO_PREFIX}Visual difference tests passed.`);

    return context.github.checks.create(params);
}

// Creates a completed VD check run.
async function markCRCancelled(context) {
    const params = context.issue({
        name: CHECK_RUN_NAME,
        head_sha: context.payload.check_run.head_sha,
        status: COMPLETED,
        conclusion: CANCELLED,
        started_at: context.payload.check_run.started_at,
        completed_at: context.payload.check_run.completed_at,
        output: {
            title: CHECK_RUN_NAME,
            summary: 'Visual difference tests were cancelled.'
        },
        details_url: context.payload.check_run.details_url
    });

    console.log(`${INFO_PREFIX}Visual difference tests were cancelled.`);

    return context.github.checks.create(params);
}

// Creates a failed VD check run.
async function markCRFailed(context) {
    await makeCommentFailure(context);

    const issueNum = await getIssueNumFromCR(context);
    const extID = context.payload.check_run.external_id;

    map.issueNum = extID;

    const params = context.issue({
        name: CHECK_RUN_NAME,
        head_sha: context.payload.check_run.head_sha,
        status: COMPLETED,
        conclusion: FAILURE,
        started_at: context.payload.check_run.started_at,
        completed_at: context.payload.check_run.completed_at,
        actions: [{
            label: 'Regenerate Goldens',
            description: 'Regenereate the Golden images.',
            identifier: JSON.stringify({
                c: REGEN_CMD,
                n: issueNum
            })
        }, {
            label: 'Reset Goldens',
            description: 'Reset Goldens to master.',
            identifier: JSON.stringify({
                c: MASTER_CMD,
                n: issueNum
            })
        }],
        output: {
            title: CHECK_RUN_NAME,
            summary: 'Visual difference tests failed.'
        },
        details_url: context.payload.check_run.details_url
    });

    console.log(`${INFO_PREFIX}Visual difference tests failed.`);

    return context.github.checks.create(params);
}

// Leaves a comment on a failed PR.
async function makeCommentFailure(context) {
    // Extract the URL and issueNum from the CR.
    const URL = context.payload.check_run.details_url;
    const issueNum = await getIssueNumFromCR(context);

    // Post a comment letting the dev know their build failed.
    const params = context.issue({
        body: `Hey there! It looks like your "${TRAVIS_PR_BUILD}" \
               build failed, due to the visual difference test failing. \
               Check out the details of the Travis build [here](${URL}). \
               To regenerate the goldens please see the "Details" link on the "Visual Difference Tests" check.`,
        number: issueNum
    });

    console.log(`${INFO_PREFIX}Leaving a comment on the PR due to a failed visual difference test.`);

    // Post a comment on the PR
    return context.github.issues.createComment(params);
}

// Gets the issue number associated with a CR.
async function getIssueNumFromCR(context) {
    let issueNum = 0;

    for (let element of context.payload.check_run.pull_requests) {
        if (element.hasOwnProperty('number')) {
            issueNum = element.number;
            break;
        }
    }

    return issueNum;
}

// Gets the branch name of the pull associated with a check run event
async function getBranchFromPR(context, issueNum) {
    const params = context.issue({
        pull_number: issueNum
    });

    const pr_info = await context.github.pulls.get(params);
    return pr_info.head.ref;
}

// Regenerates the Goldens, given the branch name
async function regenGoldens(context, issueNum, branchName) {
    // Custom build data to send to Travis
    const data = JSON.stringify({
        request: {
            config: {
                merge_mode: 'merge',
                script: [
                    REGEN_NPM_CMD
                ]
            },
            branch: branchName,
            message: `[${issueNum}] Regenerating the Goldens from the "${branchName}" branch.`
        }
    });

    // Ask Travis to regenerate the Goldens
    try {
        const response = await got.post(
            `${repoPathTravis}/requests`, {
            baseUrl: TRAVIS_API_BASE,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Travis-API-Version': '3',
                'Authorization': `token ${process.env.TRAVIS_AUTH}`
            },
            body: data,
            timeout: 5000
        });

        if (response.statusCode == 202) {
            console.log(`${INFO_PREFIX}Requsted a regenration of the Goldens from the ${branchName}.`);

            const data = await JSON.parse(response.body);
            const reqID = data.request.id;

            console.log(`${INFO_PREFIX}Waiting for 8 seconds...`);
            await timer(8000).then(_ => makeCommentRegen(context, issueNum, branchName, reqID));
        }
    } catch (error) {
        console.log(`${ERROR_PREFIX}${error}`);
    }
}

// Leave a comment on the PR about the regeneration
async function makeCommentRegen(context, issueNum, branchName, reqID) {
    try {
        const response = await got(
            `${repoPathTravis}/request/${reqID}`, {
            baseUrl: TRAVIS_API_BASE,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Travis-API-Version': '3',
                'Authorization': `token ${process.env.TRAVIS_AUTH}`
            },
            timeout: 5000
        });

        if (response.statusCode == 200 || response.statusCode == 201) {
            let buildID = 0;

            const data = await JSON.parse(response.body);
            for (let element of data.builds) {
                buildID = element.id;
                break;
            }
            const buildURL = `${TRAVIS_HOME_BASE}${repoPath.split('/repos/')[1]}${TRAVIS_BUILDS_PATH}${buildID}`;

            console.log(`${INFO_PREFIX}Leaving a comment on the PR to notify the dev of the regeneration.`);

            // Let the dev know what is going on.
            const params = context.issue({
                body: `The goldens will be regenerated off of the "${branchName}" branch shortly. \
                        You can check the status of the build [here](${buildURL}). \
                        Once the build is done, the visual difference tests will be re-run automatically.`,
                number: issueNum
            });

            await reRunBuild(map.issueNum);

            // Post a comment on the PR
            return context.github.issues.createComment(params);
        }
    } catch (error) {
        console.log(`${ERROR_PREFIX}${error}`);
    }
}

// Re-run the Travis PR Build
async function reRunBuild(buildID) {
    try {
        const response = await got.post(
            `/build/${buildID}/restart`, {
            baseUrl: TRAVIS_API_BASE,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Travis-API-Version': '3',
                'Authorization': `token ${process.env.TRAVIS_AUTH}`
            },
            timeout: 5000
        });

        if (response.statusCode == 200 || response.statusCode == 201) {
            console.log(`${INFO_PREFIX}Requsted a re-run of the Travis PR build.`);
        }
    } catch (error) {
        console.log(`${ERROR_PREFIX}${error}`);
    }
}