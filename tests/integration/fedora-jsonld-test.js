import { module, test, skip } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { run } from "@ember/runloop";
import ENV from 'dummy/config/environment';
import RSVP from 'rsvp';


// Test the Fedora JSON-LD adapter hitting a live Fedora instance

// Skip unless integration tests are turned on.
function integrationTest(name, stuff) {
    if (ENV.test.integration) {
      test(name, stuff);
    } else {
      skip(name, stuff);
    }
}
// TODO try removing xsd:string from context
module('Integration | Adapter | fedora jsonld', function(hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function() {
    let adapter = this.owner.lookup('adapter:application');

    return adapter.setupFedora(['cow', 'barn']);
  });

  integrationTest('findAll on empty type', function(assert) {
    let store = this.owner.lookup('service:store');

    return run(() => store.findAll('cow')).then(cows => {
      assert.ok(cows);
      assert.equal(cows.get('length'), 0);
    });
  });

  integrationTest('findAll on two barns', function(assert) {
    let store = this.owner.lookup('service:store');

    let barn1_data = {
      name: 'Number one'
    };

    let barn2_data = {
      name: 'Number two'
    };

    let barn1_record, barn2_record;
    let barn1_id, barn2_id;

    let result = run(() => {
      barn1_record = store.createRecord('barn', barn1_data);
      assert.ok(barn1_record);

      barn2_record = store.createRecord('barn', barn2_data);
      assert.ok(barn2_record);

      return RSVP.all([barn1_record.save(), barn2_record.save()]);
    }).then(() => {
      assert.step('save');

      barn1_id = barn1_record.get('id');
      barn2_id = barn2_record.get('id');

      // Clear the cache to make sure we test the retrieved records.
      store.unloadAll();

      return store.findAll('barn');
    }).then(result => {
      assert.step('findAll');

      assert.ok(result);
      assert.equal(result.get('length'), 2);

      let barn1 = result.find(b => b.get('id') === barn1_id);
      let barn2 = result.find(b => b.get('id') === barn2_id);

      assert.ok(barn1);
      assert.ok(barn2);

      assert.equal(barn1.get('id'), barn1_id);
      assert.equal(barn1.get('name'), barn1_data.name);

      assert.equal(barn2.get('id'), barn2_id);
      assert.equal(barn2.get('name'), barn2_data.name);
    });

    return result.then(() => {
      assert.verifySteps(['save', 'findAll'])
    });
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

      assert.equal(record.get('name'), data.name);
      assert.equal(record.get('weight'), data.weight);
      assert.equal(record.get('healthy'), data.healthy);
      assert.equal(record.get('milkVolume'), data.milkVolume);
      assert.equal(record.get('birthDate'), data.birthDate);

      return record.save().then(() => {
        assert.step('save');

        let id = record.get('id');
        assert.ok(id);

        // Clear the cache to make sure we test the retrieved record.
        store.unloadAll();

        return store.findRecord('cow', id);
      }).then(cow => {
          assert.step('findRecord');


          assert.equal(cow.get('weight'), data.weight);
          assert.equal(cow.get('healthy'), data.healthy);
          assert.equal(cow.get('milkVolume'), data.milkVolume);
          assert.equal(cow.get('birthDate').toISOString(), data.birthDate.toISOString());
        });
    });

    return result.then(() => {
      assert.verifySteps(['save', 'findRecord'])
    });
  });

  integrationTest('delete a barn', function(assert) {
    let store = this.owner.lookup('service:store');

    let data = {
      name: 'skywalker',
    };

    let id;

    // Persist a barn and then delete it
    let result = run(() => {
      let barn = store.createRecord('barn', data);
      assert.ok(barn);

      assert.equal(barn.get('name'), data.name);

      return barn.save().then(() => barn);
    }).then(barn => {
      assert.step('save');

      id = barn.get('id');
      assert.ok(id);

      // Clear the cache to make sure we test the retrieved record.
      //store.unloadAll();

      return barn.destroyRecord();
    }).then(() => {
      assert.step('delete');

      // TODO Must clear store or findRecord causes internal ember data error 
      store.unloadAll();

      return store.findRecord('barn', id).catch(() => assert.step('get fail'));
    });

    return result.then(() => {
      assert.verifySteps(['save', 'delete', 'get fail']);
    });
  });

  integrationTest('create related cow and barn', function(assert) {
    let store = this.owner.lookup('service:store');

    let barn_data = {
      name: 'moo-thru'
    };

    let cow_data = {
      name: 'icecream',
      weight: 890,
      birthDate: new Date()
    };

    // Create related records, persist them, and retrieve them.
    let result = run(() => {
      let cow_record = store.createRecord('cow', cow_data);
      assert.ok(cow_record);

      let barn_record = store.createRecord('barn', barn_data);
      assert.ok(barn_record);

      assert.equal(cow_record.get('name'), cow_data.name);
      assert.equal(cow_record.get('weight'), cow_data.weight);
      assert.equal(cow_record.get('birthDate'), cow_data.birthDate);
      assert.equal(barn_record.get('name'), barn_data.name);

      let cow_id, barn_id;

      return cow_record.save().then(() => {
        assert.step('cow save');

        cow_id = cow_record.get('id');
        assert.ok(cow_id);

        return barn_record.save();
      }).then(() => {
        assert.step('barn save');

        // Check persisted records

        barn_id = barn_record.get('id');
        assert.ok(barn_id);

        // Clear the cache to make sure we test retrieved records.
        store.unloadAll();

        return store.findRecord('cow', cow_id);
      }).then(cow => {
          assert.step('cow findRecord');

          assert.equal(cow.get('name'), cow_data.name);
          assert.equal(cow.get('weight'), cow_data.weight);
          assert.equal(cow.get('birthDate').toISOString(), cow_data.birthDate.toISOString());

          return store.findRecord('barn', barn_id);
        }).then(barn => {
          assert.step('barn findRecord');

          assert.equal(barn.get('name'), barn_data.name);
        }).then(() => {
          let cow = store.peekRecord('cow', cow_id);
          let barn = store.peekRecord('barn', barn_id);

          cow.set('barn', barn);
          barn.get('cows').pushObject(cow);

          return cow.save().then(() => barn.save());
        }).then(() => {
            // Clear the cache to make sure we test retrieved records.
            store.unloadAll();

            return store.findRecord('cow', cow_id);
        }).then(cow => {
          assert.equal(cow.get('barn.id'), barn_id);

          return store.findRecord('barn', barn_id);
        }).then(barn => {
          let cows = barn.get('cows');
          assert.ok(cows);
          assert.equal(cows.get('length'), 1);
          assert.equal(cows.get('firstObject.id'), cow_id);
        });
    });

    return result.then(() => {
      assert.verifySteps(['cow save', 'barn save', 'cow findRecord', 'barn findRecord'])
    });
  });
});
