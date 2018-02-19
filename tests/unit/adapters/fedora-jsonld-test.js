import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import Pretender from 'pretender';
import { run } from "@ember/runloop";
import ENV from 'dummy/config/environment';

// Test the Fedora JSON-LD adapter configured in the dummy.

// Used for Pretender so it can be cleaned up.
var server;

module('Unit | Adapter | fedora jsonld', function(hooks) {
  setupTest(hooks);

  // Configure the adapter for this test by modifing what the application adapter
  // will load. The adapter itself cannot be looked up and modifed because a new
  // instance is created every time.

  hooks.before(() => {
    ENV.test.override = {
      host: 'http://localhost',
      namespace: 'data',
      context: 'http://localhost/farm/'
    }
  });

  hooks.after(() => {
    delete ENV.test.override;
  });

  hooks.afterEach(() => {
    server.shutdown();
  });

  test('findAll on empty type', function(assert) {
    server = new Pretender(function() {
      this.get('http://localhost/data/kine', function() {
        let response = {
          '@id': 'http://localhost/data/kine',
          '@context': {prefix: 'http://localhost/farm/'},
          '@graph': []
        };

        return [200, { "Content-Type": "application/ld+json" }, JSON.stringify(response)];
      });
    });

    // Useful for debugging tests.
    //server.unhandledRequest = function(verb, path) {
    //  console.log('Unhandled request: ' + verb + ' ' + path);
    //}

    let store = this.owner.lookup('service:store');
    let cows = run(() => store.findAll('cow'));

    assert.equal(cows.get('length'), 0);
  });
});
