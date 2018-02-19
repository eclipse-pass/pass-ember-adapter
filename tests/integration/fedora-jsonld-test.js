import { module, test, skip } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { run } from "@ember/runloop";
import ENV from 'dummy/config/environment';

// Test the Fedora JSON-LD adapter hitting a live Fedora instance

// TODO Add support to adapter for setting up type support in Fedora.
// TODO Try to serve context out of ember server to simplify integration setup?


// Skip unless integration tests are turned on.
function integrationTest(name, stuff) {
    if (ENV.test.integration) {
      test(name, stuff);
    } else {
      skip(name, stuff);
    }
}

module('Integration | Adapter | fedora jsonld', function(hooks) {
  setupApplicationTest(hooks);


  integrationTest('findAll on empty type', function(assert) {
    let store = this.owner.lookup('service:store');

    let cows = run(() => store.findAll('cow'));

    assert.ok(cows);
    assert.equal(cows.get('length'), 0);
  });
});
