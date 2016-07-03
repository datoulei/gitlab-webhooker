var app = require('orangebox').app(1);
var exec = require('child_process').exec;
var path = require('path').resolve();
var extend = require('util')._extend;
var log = require('loglevel');

module.exports.init = function(opt) {

  var config = {
    token: '',
    port: 4400,
    branches: '*',
    events: 'push',
    onEvent: null,
    command: 'cd ' + path + '; git pull origin master; if git diff --name-status HEAD HEAD~1 | grep -e package.json -e shrinkwrap.js; then npm update; fi',
    exit: false
    logLevel: 'warn'
  };

  extend(config, opt);

  log.setDefaultLevel(config.logLevel || 'warn')
  app.all('/', function(req, res) {

    try {
      log.info('Request received!');
      log.debug(req);
      var json = JSON.parse(Object.keys(req.body)[0]);
    } catch (e) {
      console.error('gitlab-webhooker: Post data are not GitLab JSON');
      log.warn('gitlab-webhooker: Post data are not GitLab JSON');
      log.debug(e);
      var json = {};
    }

    var branch = '*';
    if (config.branches.indexOf('*') === -1) {
      branch = (json.object_kind === 'push') ? json.ref.split('/').pop() :
        (json.object_kind === 'merge_request') ? json.object_attributes.target_branch : '*';
    }

    if (
      config.token === req.query.token &&
      config.events.indexOf(json.object_kind) !== -1 &&
      config.branches.indexOf(branch) !== -1
    ) {

      res.status(200).send({status: 'OK'});

      if (typeof config.onEvent === 'function') config.onEvent();

      exec(config.command, function(err, stdout, stderr) {
        if (config.exit) process.exit(0);
      });

    } else {
      res.status(400).send({ status: 'Bad request' });
      log.warn("Bad request")
      log.info(req)
    }
  });

  app.listen(config.port, function() {
    log.info('gitlab-webhooker started on http://localhost:' + config.port);
  });
};