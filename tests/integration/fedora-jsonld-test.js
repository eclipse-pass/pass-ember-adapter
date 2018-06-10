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

// Return a Promise that ways the given ms until resolving
function delay(ms) {
  return new RSVP.Promise(resolve => setTimeout(resolve, ms));
}

module('Integration | Adapter | fedora jsonld', function(hooks) {
  setupApplicationTest(hooks);

  // Clear Fedora resources and Elasticsearch index for each test.
  // Small delays help indexer sync with Fedora and Elasticsearch

  hooks.beforeEach(function() {
    return delay(5000);
  });

  hooks.beforeEach(function() {
    let adapter = this.owner.lookup('adapter:application');

    return adapter.setupFedora(['cow', 'barn']);
  });

  hooks.beforeEach(function() {
    return delay(5000);
  });

  hooks.beforeEach(function() {
    let adapter = this.owner.lookup('adapter:application');
    let es_index = ENV.test.elasticsearch_index;

    return adapter.clearElasticsearch(es_index);
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

      return barn1_record.save();
    }).then(barn1 => {
      assert.ok(barn1);
      assert.ok(barn1.get('id'));

      return barn2_record.save();
    }).then(barn2 => {
      assert.ok(barn2);
      assert.ok(barn2.get('id'));

      assert.step('save');

      barn1_id = barn1_record.get('id');
      barn2_id = barn2_record.get('id');

      return store.findAll('barn', {reload: true});
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
      colors: ['blue'],
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
      assert.equal(record.get('colors'), data.colors);
      assert.equal(record.get('birthDate'), data.birthDate);

      return record.save().then(() => {
        assert.step('save');

        let id = record.get('id');
        assert.ok(id);

        return store.findRecord('cow', id, {reload: true});
      }).then(cow => {
          assert.step('findRecord');

          assert.equal(cow.get('weight'), data.weight);
          assert.equal(cow.get('healthy'), data.healthy);
          assert.equal(cow.get('milkVolume'), data.milkVolume);
          assert.deepEqual(cow.get('colors'), data.colors);
          assert.equal(cow.get('birthDate').toISOString(), data.birthDate.toISOString());
        });
    });

    return result.then(() => {
      assert.verifySteps(['save', 'findRecord'])
    });
  });

  // Show that updateRecord is working.
  integrationTest('update a cow', function(assert) {
    let store = this.owner.lookup('service:store');

    let name = 'dumbo';
    let weight = 10;
    let healthy = true;
    let record;
    let id;

    return run(() => {
      record = store.createRecord('cow', {name: name});
      assert.ok(record);

      assert.equal(record.get('name'), name);

      return record.save();
    }).then(() => {
      assert.step('save');

      id = record.get('id');
      assert.ok(id);

      return store.findRecord('cow', id, {reload: true});
    }).then(cow => {
      assert.step('findRecord');

      assert.ok(cow);
      assert.equal(cow.get('name'), name);

      // Add properties
      cow.set('weight', weight);
      cow.set('healthy', healthy);

      return cow.save();
    }).then(() => {
      assert.step('save');

      return store.findRecord('cow', id, {reload: true});
    }).then(cow => {
      assert.step('findRecord');
      assert.verifySteps(['save', 'findRecord', 'save', 'findRecord'])

      assert.ok(cow);
      assert.equal(cow.get('name'), name);
      assert.equal(cow.get('weight'), weight);
      assert.equal(cow.get('healthy'), healthy);
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

      return barn.destroyRecord();
    }).then(() => {
      assert.step('delete');

      // TODO Must clear store or findRecord causes internal ember data error
      store.unloadAll();

      return store.findRecord('barn', id, {reload: true}).catch(() => assert.step('get fail'));
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
      colors: [],
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

        return store.findRecord('cow', cow_id, {reload: true});
      }).then(cow => {
          assert.step('cow findRecord');

          assert.equal(cow.get('name'), cow_data.name);
          assert.equal(cow.get('weight'), cow_data.weight);

          // Empty set not expected to be persisted.
          assert.deepEqual(cow.get('colors'), []);

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
            return store.findRecord('cow', cow_id, {reload: true});
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

  integrationTest('simple query for a cow', function(assert) {
    let store = this.owner.lookup('service:store');

    let cow_data = {
      name: 'Mooni',
      weight: 80,
      milkVolume: 100,
      colors: ['red'],
      birthDate: new Date()
    };

    let query = {
      'match' : { 'name' : cow_data.name}
    };

    return run(() => {
      let cow_record = store.createRecord('cow', cow_data);
      assert.ok(cow_record);

      return cow_record.save();
    }).then(() => {
      assert.step('save');

      // Wait for record to be pushed to index
      return delay(3000);
    }).then(() => {
      assert.step('wait');

      return store.query('cow', query);
    }).then(result => {
      assert.step('query');

      assert.ok(result);
      assert.equal(result.get('length'), 1);

      assert.equal(result.get('firstObject.name'), cow_data.name);
      assert.equal(result.get('firstObject.milkVolume'), cow_data.milkVolume);
      assert.equal(result.get('firstObject.weight'), cow_data.weight);
      assert.equal(result.get('firstObject.birthDate'), cow_data.birthDate);
      assert.deepEqual(result.get('firstObject.colors'), cow_data.colors);

    }).then(() => assert.verifySteps(['save', 'wait', 'query']));
  });

  // Persist three barns and test from, size, sort, and info when doing a query
  integrationTest('query with sort, from. and limit', function(assert) {
    let store = this.owner.lookup('service:store');

    let barn1_data = {
      name: 'barn one',
      colors: ['pink', 'green']
    };

    let barn2_data = {
      name: 'barn two',
      colors: ['red', 'green']
    };

    let barn3_data = {
      name: 'barn three',
      colors: ['blue', 'green']
    };

    let info = {};

    return run(() => {
      return store.createRecord('barn', barn1_data).save();
    }).then(() => {
      return store.createRecord('barn', barn2_data).save();
    }).then(() => {
      return store.createRecord('barn', barn3_data).save();
    }).then(() => {
      assert.step('save');

      // Wait for barns to be indexed
      return delay(5000);
    }).then(() => {
      assert.step('wait');
      return store.query('barn', {term: {colors: 'green'}});
    }).then(result => {
      assert.step('query');

      assert.ok(result);
      assert.equal(result.get('length'), 3);

      return store.query('barn', {term: {colors : 'green'}, size: 2});
    }).then(result => {
      assert.ok(result);
      assert.equal(result.get('length'), 2);

      return store.query('barn', {term: {colors : 'green'}, sort: {colors: {order: 'asc', mode: 'max'}},
        from: 1, size: 2});
    }).then(result => {
      assert.ok(result);
      assert.equal(result.get('length'), 2);

      return store.query('barn', {query: {term: {colors : 'green'}}, from: 2, size: 1, info: info});
    }).then(result => {
      assert.ok(result);
      assert.equal(result.get('length'), 1);
      assert.equal(info.total, 3);
    }).then(() => assert.verifySteps(['save', 'wait', 'query']));
  });
});
