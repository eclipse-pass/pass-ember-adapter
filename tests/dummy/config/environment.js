/* eslint-env node */
'use strict';

module.exports = function(environment) {
  let ENV = {
    modulePrefix: 'dummy',
    environment,
    rootURL: '/',
    locationType: 'auto',
    EmberENV: {
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. 'with-controller': true
      },
      EXTEND_PROTOTYPES: {
        // Prevent Ember Data from overriding Date.parse.
        Date: false
      }
    },

    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    }
  };

  if (environment === 'development') {
    // ENV.APP.LOG_RESOLVER = true;
    // ENV.APP.LOG_ACTIVE_GENERATION = true;
    // ENV.APP.LOG_TRANSITIONS = true;
    // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
    // ENV.APP.LOG_VIEW_LOOKUPS = true;
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
  }

  if (environment === 'production') {
    // here you can enable a production-specific feature
  }

  // Test configuration for dummy app
  ENV.test = {
    host: 'http://localhost:8080',
    namespace: 'rest/farm',
    contextURI: 'http://localhost:4200/farm.jsonld',
    username: 'admin',
    password: 'admin',
    integration: true
  }

  if (process.env.FEDORA_ADAPTER_HOST) {
    ENV.test.host = process.env.FEDORA_ADAPTER_HOST;
  }

  if (process.env.FEDORA_ADAPTER_NAMESPACE) {
    ENV.test.namespace = process.env.FEDORA_ADAPTER_NAMESPACE;
  }

  if (process.env.FEDORA_ADAPTER_CONTEXT) {
    ENV.test.context = process.env.FEDORA_ADAPTER_CONTEXT;
  }

  if (process.env.FEDORA_ADAPTER_USER_NAME) {
    ENV.test.username = process.env.FEDORA_ADAPTER_USER_NAME;
  }

  if (process.env.FEDORA_ADAPTER_PASSWORD) {
    ENV.test.password = process.env.FEDORA_ADAPTER_PASSWORD;
  }

  if (process.env.FEDORA_ADAPTER_INTEGRATION_TEST) {
    ENV.test.integration = process.env.FEDORA_ADAPTER_INTEGRATION_TEST;
  }

  return ENV;
};
