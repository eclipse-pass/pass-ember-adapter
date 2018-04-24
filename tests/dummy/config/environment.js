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
    base: 'http://localhost:8080/fcrepo/rest/farm/',
    elasticsearch: 'http://localhost:9200/farm/_search',
    elasticsearch_index: 'http://localhost:9200/farm/',
    context: 'https://raw.githubusercontent.com/OA-PASS/ember-fedora-adapter/master/tests/dummy/public/farm.jsonld',
    username: 'admin',
    password: 'moo',
    integration: true
  }

  if (process.env.FEDORA_ADAPTER_BASE) {
    ENV.test.base = process.env.FEDORA_ADAPTER_BASE;
  }

  if (process.env.FEDORA_ADAPTER_ES_SEARCH) {
    ENV.test.elasticsearch = process.env.FEDORA_ADAPTER_ES_SEARCH;
  }

  if (process.env.FEDORA_ADAPTER_ES_INDEX) {
    ENV.test.elasticsearch_index = process.env.FEDORA_ADAPTER_ES_INDEX;
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
    ENV.test.integration = process.env.FEDORA_ADAPTER_INTEGRATION_TEST != '0';
  }

  return ENV;
};
