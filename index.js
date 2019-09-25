// Constants
const GH_APP_NAME = 'visual-difference';
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
var dictionary = {};

// Libraries
const got = require('got');
const { App } = require("@octokit/app");
const Octokit = require("@octokit/rest");

/**
 * @param {import('probot').Application} app
 */
module.exports = app => {
    // Update our stored information anytime there is an event.
    app.on('*', async context => {
        await updateGlobals(context);
    })

    // On a check run event perform some checks
    app.on('check_run', async context => {
        // If it's a travis PR build, create/update a Visual Difference check run
        if (context.payload.check_run.name == travis_pr_build && context.payload.check_run.status == queued) {
            if(await hasVisualDiffTest(context)) {
                createInProgressCR(context);
            }
        }
    })

    // // On a requested action button press from the user
    // app.on('check_run.requested_action', async context => {
    //     // Are we regenerating the goldens from the current branch?
    //     if (context.payload.requested_action.identifier.includes(regenCommand)) {
    //         getBranchNameAndRegenGoldens(context, JSON.parse(context.payload.requested_action.identifier).n)
    //     }

    //     // Are we regenerating the goldens from the master branch?
    //     if (context.payload.requested_action.identifier.includes(masterCommand)) {
    //         regenGoldens(context, JSON.parse(context.payload.requested_action.identifier).n, "master")
    //     }
    // })
}

// Update our global variables
async function updateGlobals(context) {
    installationID = context.payload.installation.id;
    repoPath = context.payload.repository.url.split(PREFIX)[1];
    repoPathTravis = repoPath.replace("/repos", "/repo");
    var regex = /\/(?=[^\/]*$)/g;
    repoPathTravis = repoPathTravis.replace(regex, "%2F");
}

async function hasVisualDiffTest(context) {
    const params = context.issue({
        check_run_id: context.payload.check_run.id
    })

    const check_run_info = await context.github.checks.get(params);
    return check_run_info.data.output.text.includes(VD_TEST_MSG);
}

// async function createInProgressCR(context) {
//     context.gith
// }