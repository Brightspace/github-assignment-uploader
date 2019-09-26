# visual-difference-bot

> A GitHub App built with [Probot](https://github.com/probot/probot) that comments on PRs when Visual Difference checks fail.

## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start

# Run the bot in development mode (will automatically restart on code changes)
npm run dev
```

## Creating a GitHub app

1. Run the bot in development mode.
2. Visit `http://localhost:3000` and then authenticate with GitHub.
3. Be sure to update the Webhook URL in the application settings on GitHub.

## Serverless Deployment to AWS Lambda

```sh
# Install serverless
npm install -g serverless

# To deploy to AWS (Requires your credentials to be set)
serverless deploy

# Remove the stack from AWS
serverless remove

# Spy on the CloudWatch logs as they come in (for debugging purposes)
serverless logs -f probot -t
```

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
3. Be sure to change the Webhook URL in the GitHub application settings to be your ngrok tunnel URL.
4. Create a GitHub event to trigger the bot.

## Setup needed for Visual Difference testing on a Repo

In order to have this bot watch the Visual Difference tests for a specific repo, you need to have a custom Travis CI configuration.

1. Firstly, make sure that the application is installed on the desired repo.
2. Modify your Travis CI config so that it has the following `jobs` section.
```yaml
jobs:
  include:
  - stage: whatever-tests
    script:
    - do something
  - stage: visual-difference-tests
    script:
    - |
      if [ $TRAVIS_PULL_REQUEST != false ] && [ $TRAVIS_SECURE_ENV_VARS == true ]; then
        echo "Pull request, running visual difference tests...";
        npm run test:diff || travis_terminate 1;
      fi
```
3. The important thing to note above, is that the jobs have been split into multiple stages. The first stage is the regular code tests you want to run (with whatever name you would like it to be). The second stage is the important one (it must be the second stage) and the name must be `visual-difference-tests`. This is what the bot will use to check the status of your Visual Difference tests, additionally the Travis check's name must be `Travis CI - Pull Request`.

## License

Copyright 2019 D2L Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

See the [LICENSE](LICENSE) file for more details.
