# visual-difference-bot

[![Build Status](https://travis-ci.com/BrightspaceUI/visual-difference-bot.svg?branch=master)](https://travis-ci.com/BrightspaceUI/visual-difference-bot)

> A GitHub App built with [Probot](https://github.com/probot/probot) that comments on PRs when Visual Difference checks fail.

## Table of Contents
- 1 - [Setup](README.md/#setup)
- 2 - [Creating a GitHub app](README.md/#creating-a-github-app)
- 3 - [Serverless Deployment to AWS Lambda](README.md/#serverless-deployment-to-aws-lambda)
- 4 - [Testing Locally](README.md/#testing-locally)
- 5 - [Repository Setup](README.md/#repository-setup)
- 6 - [Secrets Management](README.md/#secrets-management)
- 7 - [Screenshots](README.md/#screenshots)
- 8 - [Tests](README.md/#tests)

## Setup

```sh
# Install dependencies.
npm install

# Run the bot.
npm start

# Run the bot in development mode (will automatically restart on code changes).
npm run dev
```

## Creating a GitHub app

1. Run the application in development mode.
2. Visit `http://localhost:3000` and then authenticate with GitHub.
3. Be sure to update the **Webhook URL** in the **application settings on GitHub.**

## Serverless Deployment to AWS Lambda

1. Ensure that you have Python 3.7.X installed on your system.
2. Ensure that you have created a [.env file](README.md/#secrets-management).

```sh
# Install serverless.
npm install -g serverless

# Install the python3 deploy script dependencies.
pip3 install -r requirements.txt

# To deploy a new stack to AWS/update the existing one (Requires your AWS credentials to be set).
python3 deploy.py

# Remove the existing stack from AWS.
python3 deploy.py --remove-stack

# Spy on the CloudWatch logs as they come in (for debugging purposes).
serverless logs -f probot -t
```

3. Be sure to update the **Webhook URL** in the **application settings on GitHub** to be the URL of the API Gateway for the Lambda function.

## Testing Locally
You can test the bot locally on your own machine using [ngrok](https://ngrok.com/).

1. Start the bot:
```sh
npm run dev
```
2. Start the ngrok tunnel:
```sh
ngrok http 3000
```
3. Be sure to change the **Webhook URL** in the **GitHub application settings to be your ngrok tunnel URL**.
4. Create a GitHub event to trigger the bot.

## Repository Setup

In order to have this bot watch the Visual Difference tests for a specific repo, you need to have a custom Travis CI configuration.

1. Ensure that your repository is setup with the [visual-diff package](https://github.com/BrightspaceUI/visual-diff).
2. Make sure that the GitHub application is installed on the desired repo.
3. Modify your Travis CI config so that it has the following `jobs/stages` section.

```yaml
jobs:
  include:
  - stage: code-tests-or-whatever-name-you-want
    script:
    - npm run lint
    - do-some-other-tests
  - stage: visual-difference-tests
    script:
    - |
      if [ $TRAVIS_SECURE_ENV_VARS == true ]; then
        echo "Running visual difference tests...";
        npm run test:diff || travis_terminate 1;
      fi
  - stage: update-version
    script: frauci-update-version && export TRAVIS_TAG=$(frauci-get-version)
```

Make sure you have the appropriate Travis secure environment variables required by the [visual-diff package](https://github.com/BrightspaceUI/visual-diff#running-in-ci).

```yaml
env:
  global:
  # VISUAL_DIFF_S3_ID
  - secure: TOKEN
  # VISUAL_DIFF_S3_SECRET
  - secure: TOKEN
```

4. The important thing to note above, is that the jobs have been split into multiple stages. The first stage is the normal tests you want to run (with whatever name you would like it to be). The second stage is the important one (it must be the second stage) and the name must be named `visual-difference-tests`. This is what the bot will use to check the status of your Visual Difference tests, additionally the Travis check's name must be `Travis CI - Pull Request`.
5. Finally, if your repo is using the `after_success` option to create a release and increment versions, this needs to be moved into it's own stage (can be named anything, but in the example above it is `update-version`). If this stage isn't created, `after_success` gets run twice after the completion of each stage, which results in your version being incremented twice. It's best to avoid this 👍.

## Secrets Management

1. Create a .env file (see [example](.env.example)) with the appropriate values for your situation.
2. The `deploy.py` script will use this file to create the same environment variables for the deployed Lambda.

## Screenshots
![Screenshot of the Visual Difference GitHub Check](screenshot.png)

## Tests
Tests for this project are written with [Jest](https://facebook.github.io/jest/) and [Nock](https://github.com/nock/nock).
