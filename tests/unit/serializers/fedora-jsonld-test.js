import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { run } from "@ember/runloop";
import ENV from 'dummy/config/environment';

// Test the Fedora JSON-LD serializer configured in the dummy.

// TODO Figure out how to test normalizePayload directly.

module('Unit | Serializer | fedora-jsonld', function(hooks) {
  setupTest(hooks);

  test('it serializes simple cow as JSON-LD', function(assert) {
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
      birthDate: data.birthDate.toISOString()
    };

    let result = record.serialize();

    assert.deepEqual(result, expected);
  });

  test('it serializes empty record as JSON-LD', function(assert) {
    let store = this.owner.lookup('service:store');
    let record = run(() => store.createRecord('cow'));

    let expected = {
      '@context': ENV.test.context,
      '@id': '',
      '@type': 'Cow'
    };

    let result = record.serialize();

    assert.deepEqual(result, expected);
  });
});
