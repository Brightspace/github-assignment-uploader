# GitHub Assignment Uploader for Brightspace

> A GitHub app built with [Probot](https://github.com/probot/probot). Wraps the GitHub API to easily fetch entire user repositories as a ZIP archive. Built to support the GitHub repository uploading within the assignment file uploader in Brightspace (coming soon™).

# Table of Contents

- 1 - [API Documentation](README.md/#api-documentation)
- 2 - [Installation](README.md/#installation)
- 3 - [Creating your own GitHub app](README.md/#creating-your-own-github-app)
- 4 - [Testing the Web API without Probot](README.md/#testing-the-web-api-without-probot)
- 5 - [Secrets Management](README.md/#secrets-management)
- 6 - [Serverless Deployment to AWS Lambda](README.md/#serverless-deployment-to-aws-lambda)
- 7 - [Tests](README.md/#tests)
- 8 - [Contributing](README.md/#contributing)

## API Documentation

API Endpoints that this application provides with descriptions.

```
GET /app/login - Redirect the user to the application login screen / Prompt them to install the app (if they haven't already).
GET /app/logged_in - Is the user logged in to the app?
GET /app/installed/:user - Has the user installed the app?
GET /app/repo/:user - List all of the repositories that :user has granted the app access to read.
GET /app/repo/:user/:repo - Fetch the ZIP blob of :user/:repo.
GET /app/repo/:user/:repo/link - Fetch a link to the ZIP file of :user/:repo (Link is only valid for 5 minutes for private repositories).
```

## Installation

```sh
# Install dependencies.
npm install

# Run the app.
npm start

# Run the app in development mode (will automatically restart on code changes).
npm run dev
```

## Creating your own GitHub app

1. Run the application in development mode.
2. Visit `http://localhost:3000` and then authenticate with GitHub.
3. Be sure to update the **Webhook URL** and **Callback URL** in the **application settings on GitHub.**

## Testing the Web API without Probot

```sh
# Change to the `brightspace-github-api` directory
cd brightspace-github-api

# Install dependencies.
npm install

# Compile the TypeScript code.
npm run compile

# Run the app.
npm start

# Run the app in development mode (will automatically restart on code changes).
npm run dev
```

## Secrets Management

1. Create a .env file (see [example](.env.example)) with the appropriate values for your situation.
2. The `deploy.py` script will use this file to create the same environment variables for the deployed Lambda.

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
# Output the serverless template and quit (dry mode).
python3 deploy.py -d
# View the logs
serverless logs -f probot -t
```

3. Be sure to update the **Webhook URL** and **Callback URL** in the **application settings on GitHub** to be the URL of the API Gateway for the Lambda function.

## Tests

Tests for this project are written with [Jest](https://facebook.github.io/jest/) and [Nock](https://github.com/nock/nock).
**Currently the tests for the Probot application are outdated and written for different repository and need to be updated.**

## Contributing

Contributions are welcome, please submit a pull request!
