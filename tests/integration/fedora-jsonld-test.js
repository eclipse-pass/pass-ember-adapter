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

    run(() => {
      let record = store.createRecord('cow', data);
      assert.ok(record);

      return record.save().then(() => {
        assert.step('save');

        assert.equal(data.name, record.get('name'));
        assert.equal(data.weight, record.get('weight'));
        assert.equal(data.healthy, record.get('healthy'));
        assert.equal(data.milkVolume, record.get('milkVolume'));

        let id = record.get('id');
        assert.ok(id);

        return store.findRecord('cow', id).then(cow => {
          assert.step('findRecord');

          assert.equal(data.name, cow.get('name'));
          assert.equal(data.weight, cow.get('weight'));
          assert.equal(data.healthy, cow.get('healthy'));
          assert.equal(data.milkVolume, cow.get('milkVolume'));
          assert.equal(data.birthDate, cow.get('birthDate'));
        });
      });
    }).then(() => assert.verifySteps(['save', 'findRecord']));

  });
});
