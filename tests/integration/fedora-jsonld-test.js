import { module, test, skip } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { run } from "@ember/runloop";
import ENV from 'dummy/config/environment';

// Test the Fedora JSON-LD adapter hitting a live Fedora instance

// TODO Add support to adapter for setting up type support in Fedora.
// and cleaning up for each test?

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

  hooks.beforeEach(function() {
    let adapter = this.owner.lookup('adapter:application');

    return adapter.setupFedora(['cow']);
  });

  skip('findAll on empty type', function(assert) {
    let store = this.owner.lookup('service:store');

    let cows = run(() => store.findAll('cow'));

    assert.ok(cows);
    assert.equal(cows.get('length'), 0);
  });

  integrationTest('create a simple cow', function(assert) {
    let store = this.owner.lookup('service:store');

    let data = {
      name: 'yoda',
      weight: 124,
      healthy: false,
      milkVolume: 30.5,
      birthDate: new Date(Date.UTC(80, 11, 1, 0, 0, 0))
    };

    // Create a record, persist it, and retrieve it.
    let result = run(() => {
      let record = store.createRecord('cow', data);
      assert.ok(record);

      return record.save().then(() => {
        assert.step('save');

        assert.equal(record.get('name'), data.name);
        assert.equal(record.get('weight'), data.weight);
        assert.equal(record.get('healthy'), data.healthy);
        assert.equal(record.get('milkVolume'), data.milkVolume);
        assert.equal(record.get('birthDate'), data.birthDate);

        let id = record.get('id');
        assert.ok(id);

        // Clear the cache to make sure we test the retrieved record.
        store.unloadAll();

        return store.findRecord('cow', id);
      }).then(cow => {
          assert.step('findRecord');

          assert.equal(cow.get('name'), data.name);
          assert.equal(cow.get('weight'), data.weight);
          assert.equal(cow.get('healthy'), data.healthy);
          assert.equal(cow.get('milkVolume'), data.milkVolume);
          assert.equal(cow.get('birthDate').toISOString(), data.birthDate.toISOString());
        });
    });

    return result.then(() => {
      assert.verifySteps(['save', 'findRecord'])
    }, error => {
      assert.ok(false, 'Error in runloop: ' + JSON.stringify(error));
    });
  });
});
