/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.on('check_run.completed', async context => {
    if(context.payload.conclusion == 'failure') {
      app.log('Oopsie daisy')
      context.github.query(addComment, {
        id: context.payload.check_suite.pull_requests.id,
        body: 'It looks like that build failed.'
      })
    }
  })
  app.on('pull_request_review_comment', async context => {
    if(context.payload.body == '/goldens') {
      app.log('Regenerating the goldens')
      var goldenReq = new XMLHttpRequest();
      goldenReq.open("POST", "https://api.travis-ci.com/repo/BrightspaceHypermediaComponents%2Factivities/requests")
      var body='{ \
        "request":{ \
           "config":{ \
              "merge_mode":"merge",\
              "script":[ \
                 "npm run test:diff:golden" \
              ] \
           }, \
           "branch":"perceptual-diff-stage-2" \
        } \
     }'
      goldenReq.setRequestHeader('Content-Type', 'application/json');
      goldenReq.setRequestHeader('Accept', 'application/json');
      goldenReq.setRequestHeader('Travis-API-Version', '3');
      goldenReq.setRequestHeader('Authorization', 'token ' + context.github);
      goldenReq.body = body;
      goldenReq.send();
    }
  })
}
