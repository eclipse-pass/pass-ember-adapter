import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { run } from "@ember/runloop";
import ENV from 'dummy/config/environment';

// Test the Fedora JSON-LD serializer configured in the dummy.

// TODO Figure out how to test normalizePayload directly.

module('Unit | Serializer | fedora-jsonld', function(hooks) {
  setupTest(hooks);

  test('it serializes simple cow', function(assert) {
    let store = this.owner.lookup('service:store');

    let data = {
      name: 'bessie',
      weight: 470,
      healthy: true,
      milkVolume: 10.5,
      birthDate: new Date(Date.UTC(96, 11, 1, 0, 0, 0))
    };

    let record = run(() => store.createRecord('cow', data));

    let expected = {
      '@context': ENV.test.context,
      '@id': '',
      '@type': 'Cow',
      name: data.name,
      weight: data.weight,
      healthy: data.healthy,
      milkVolume: data.milkVolume,
      birthDate: data.birthDate.toISOString(),
      colors: null,
      barn: null
    };

    let result = record.serialize();

    assert.deepEqual(result, expected);
  });

  test('it serializes cow with hidden attribute', function(assert) {
    let store = this.owner.lookup('service:store');

    let data = {
      name: 'wilbur',
      weight: 800,
      _moo: 'excellent'
    };

    let record = run(() => store.createRecord('cow', data));

    let expected = {
      '@context': ENV.test.context,
      '@id': '',
      '@type': 'Cow',
      name: data.name,
      weight: data.weight,
      healthy: null,
      milkVolume: null,
      birthDate: null,
      colors: null,
      barn: null
    };

    let result = record.serialize();

    assert.deepEqual(result, expected);
  });

  test('it serializes cow with array property', function(assert) {
    let store = this.owner.lookup('service:store');

    let data = {
      name: 'bob',
      weight: 120,
      colors: ['teal', 'purple'],
      healthy: false,
      milkVolume: 1.5,
      birthDate: new Date(Date.UTC(96, 11, 1, 0, 0, 0)),
    };

    let record = run(() => store.createRecord('cow', data));

    let expected = {
      '@context': ENV.test.context,
      '@id': '',
      '@type': 'Cow',
      name: data.name,
      weight: data.weight,
      colors: data.colors,
      healthy: data.healthy,
      milkVolume: data.milkVolume,
      birthDate: data.birthDate.toISOString(),
      barn: null
    };

    let result = record.serialize();

    assert.deepEqual(result, expected);
  });

  test('it serializes empty record', function(assert) {
    let store = this.owner.lookup('service:store');
    let record = run(() => store.createRecord('cow'));

    let expected = {
      '@context': ENV.test.context,
      '@id': '',
      '@type': 'Cow',
      name: null,
      weight: null,
      healthy: null,
      birthDate: null,
      milkVolume: null,
      colors: null,
      barn: null
    };

    let result = record.serialize();

    assert.deepEqual(result, expected);
  });

  test('it serializes related cow and barn', function(assert) {
    let store = this.owner.lookup('service:store');

    let barn_data = {
      name: 'moo-thru'
    };

    let cow_data = {
      name: 'icecream',
      weight: 890,
      birthDate: new Date()
    };

    let cow_record = run(() => store.createRecord('cow', cow_data));
    let barn_record = run(() => store.createRecord('barn', barn_data));

    let cow_expected = {
      '@context': ENV.test.context,
      '@id': '',
      '@type': 'Cow',
      name: cow_data.name,
      weight: cow_data.weight,
      birthDate: cow_data.birthDate.toISOString(),
      healthy: null,
      milkVolume: null,
      colors: null,
      barn: null
    };

    let cow_result = cow_record.serialize();

    let barn_expected = {
      '@context': ENV.test.context,
      '@id': '',
      '@type': 'Barn',
      name: barn_data.name,
      cows: null,
      colors: null
    };

    let barn_result = barn_record.serialize();

    assert.deepEqual(cow_result, cow_expected);
    assert.deepEqual(barn_result, barn_expected);

    // Set relationships and test serialization again.

    run(() => {
      cow_record.set('id', 'cow:34');
      barn_record.set('id', 'barn:10');

      // Also try setting a hidden relationship which should be ignored
      cow_record.set('_has_bff', cow_record);

      cow_record.set('barn', barn_record);
      barn_record.get('cows').pushObject(cow_record);

      cow_expected['@id'] = cow_record.get('id');
      barn_expected['@id'] = barn_record.get('id');
      cow_expected.barn = {"@id": barn_record.get('id')};
      barn_expected.cows = [{"@id": cow_record.get('id')}];

      cow_result = cow_record.serialize();
      barn_result = barn_record.serialize();

      assert.deepEqual(cow_result, cow_expected);
      assert.deepEqual(barn_result, barn_expected);
    });
  });
});
