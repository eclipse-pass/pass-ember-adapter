import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import Pretender from 'pretender';
import { run } from "@ember/runloop";
import ENV from 'dummy/config/environment';

// Test the Fedora JSON-LD adapter configured in the dummy.

// Used for Pretender so it can be cleaned up.
var server;

module('Unit | Adapter | fedora jsonld', function(hooks) {
  setupApplicationTest(hooks);

  // Configure the adapter for this test by modifing what the application adapter
  // will load. The adapter itself cannot be looked up and modifed because a new
  // instance is created every time.

  hooks.before(() => {
    ENV.test.override = {
      base: 'http://localhost/data',
      context: 'http://localhost/farm.jsonld',
      elasticsearch: 'http://localhost:9200/_search'
    }
  });

  hooks.after(() => {
    delete ENV.test.override;
  });

  hooks.afterEach(() => {
    server.shutdown();
  });

  // Useful for debugging tests.
  //server.unhandledRequest = function(verb, path) {
  //  console.log('Unhandled request: ' + verb + ' ' + path);
  //}

  test('findAll on empty type', function(assert) {
    server = new Pretender(function() {
      this.get('http://localhost/data/kine', function() {
        let response = {
          '@id': 'http://localhost/data/kine',
          '@context': {farm: 'http://example.com/farm/'},
          '@graph': []
        };

        return [200, { "Content-Type": "application/ld+json" }, JSON.stringify(response)];
      });
    });

    let store = this.owner.lookup('service:store');

    return run(() => store.findAll('cow')).then(cows => {
      assert.equal(cows.get('length'), 0);
    });
  });

  test('findAll returning two barns', function(assert) {
    server = new Pretender(function() {
      this.get('http://localhost/data/barns', function() {
        let response = {
          '@context': {
            farm: 'http://example.com/farm/',
            Barn: 'farm:Barn',
            name: 'farm:name',
            fedora: 'http://fedora.info/definitions/v4/repository#'
          },
          '@graph': [{
            "@id": "http://localhost/data/barns",
            "contains": ["http://localhost/data/barns/1", "http://localhost/data/barns2"]
          },{
            "@id": "http://localhost/data/barns/1",
            "@type": ["farm:Barn", "fedora:Resource", "fedora:Container"],
            "farm:name": "Number one",
          },{
            "@id": "http://localhost/data/barns/2",
            "@type": ["Barn", "fedora:Resource", "fedora:Container"],
            "name": "Number two",
          }]
        };

        return [200, { "Content-Type": "application/ld+json" }, JSON.stringify(response)];
      });
    });

    let store = this.owner.lookup('service:store');

    return run(() => store.findAll('barn')).then(barns => {
      assert.equal(barns.get('length'), 2);
      assert.ok(barns.find(b => b.get('name') === 'Number one'));
      assert.ok(barns.find(b => b.get('name') === 'Number two'));
    });
  });

  // Create a barn and then a cow with a relationship to the barn
  test('createRecord and with a relationship', function(assert) {
    let store = this.owner.lookup('service:store');
    let barn_id = 'http://localhost/data/barns/a/b/21';
    let cow_id = 'http://localhost/data/kine/123';

    let barn_data = {
      name: 'cave'
    };

    let cow_data = {
      name: 'bear'
    };

    server = new Pretender(function() {
      this.post('http://localhost/data/barns', function() {
        assert.step('post barn');
        return [200, { "Content-Type": "plain/text", "Location": barn_id }, barn_id];
      });

      this.post('http://localhost/data/kine', function() {
        assert.step('post cow');
        return [200, { "Content-Type": "plain/text", "Location": cow_id }, cow_id];
      });
    });

    return run(() => {
      let barn = store.createRecord('barn', barn_data);
      assert.ok(barn);

      return barn.save();
    }).then(barn => {
      assert.step('save barn')

      assert.ok(barn);
      assert.equal(barn.get('id'), barn_id);

      let cow = store.createRecord('cow', cow_data);
      cow.set('barn', barn);

      return cow.save();
    }).then(cow => {
      assert.step('save cow');

      assert.ok(cow);
      assert.equal(cow.get('barn.id'), barn_id);

    }).then(() => assert.verifySteps(['post barn', 'save barn', 'post cow', 'save cow']));
  });

  test('createRecord and updateRecord for barn and related cow', function(assert) {
    let store = this.owner.lookup('service:store');
    let barn_id = 'http://localhost/data/barns/a/b/21';
    let cow_id = 'http://localhost/data/kine/123';

    let barn_data = {
      name: 'byrne'
    };

    let cow_data = {
      name: 'luke'
    };

    server = new Pretender(function() {
      this.post('http://localhost/data/barns', function() {
        assert.step('post barn');
        return [200, { "Content-Type": "plain/text", "Location": barn_id }, barn_id];
      });

      this.post('http://localhost/data/kine', function() {
        assert.step('post cow');
        return [200, { "Content-Type": "plain/text", "Location": cow_id }, cow_id];
      });

      this.patch('http://localhost/data/kine/123', function() {
        assert.step('put cow');
        return [200, { "Content-Type": "plain/text" }, ''];
      });

      this.patch('http://localhost/data/barns/a/b/21', function() {
        assert.step('put barn');
        return [200, { "Content-Type": "plain/text" }, ''];
      });
    });

    return run(() => {
      let barn = store.createRecord('barn', barn_data);
      assert.ok(barn);

      let cow = store.createRecord('cow', cow_data);
      assert.ok(cow);

      return cow.save().then(() => barn.save());
    }).then(() => {
      assert.step('save')

      let barn = store.peekRecord('barn', barn_id);
      let cow = store.peekRecord('cow', cow_id);

      assert.ok(barn);
      assert.ok(cow);

      assert.equal(barn_data.name, barn.get('name'));
      assert.equal(cow_data.name, cow.get('name'));

      // Add relationships and update the objects

      barn.get('cows').pushObject(cow);
      cow.set('barn', barn);

      return cow.save().then(() => barn.save());
    }).then(() => {
      assert.step('update');

      let barn = store.peekRecord('barn', barn_id);
      let cow = store.peekRecord('cow', cow_id);

      let cows = barn.get('cows');

      assert.equal(cows.get('length'), 1);
      assert.equal(cows.get('firstObject.id'), cow_id);
      assert.equal(cow.get('barn.id'), barn_id);

    }).then(() => assert.verifySteps(['post cow', 'post barn', 'save', 'put cow', 'put barn', 'update']));
  });

  test('createRecord for simple cow', function(assert) {
    let store = this.owner.lookup('service:store');
    let id = 'http://localhost/data/kine/a/b/21'

    let data = {
      name: 'yoda',
      weight: 124,
      healthy: false,
      milkVolume: 30.5,
      colors: ['mauve'],
      birthDate: new Date(Date.UTC(80, 11, 1, 0, 0, 0))
    };

    server = new Pretender(function() {
      this.post('http://localhost/data/kine', function() {
        assert.step('post');
        return [200, { "Content-Type": "plain/text", "Location": id }, id];
      });
    });

    return run(() => {
      let record = store.createRecord('cow', data);
      assert.ok(record);

      return record.save().then(() => {
        assert.step('save')

        assert.equal(data.name, record.get('name'));
        assert.equal(data.weight, record.get('weight'));
        assert.equal(data.healthy, record.get('healthy'));
        assert.equal(data.milkVolume, record.get('milkVolume'));
        assert.equal(data.birthDate, record.get('birthDate'));
        assert.deepEqual(data.colors, record.get('colors'));
      });

    }).then(() => assert.verifySteps(['post', 'save']));
  });

  test('createRecord handles %20 in attributes', function(assert) {
    let store = this.owner.lookup('service:store');
    let id = 'http://localhost/data/kine/21'

    let data = {
      name: 'yoda%20luke%20bessie the fourth'
    };

    server = new Pretender(function() {
      this.post('http://localhost/data/kine', function(req) {
        assert.step('post');
        assert.equal(data.name, JSON.parse(req.requestBody).name);
        return [200, { "Content-Type": "plain/text", "Location": id }, id];
      });
    });

    return run(() => {
      let record = store.createRecord('cow', data);
      assert.ok(record);

      return record.save().then(() => {
        assert.step('save')

        assert.equal(data.name, record.get('name'));
      });

    }).then(() => assert.verifySteps(['post', 'save']));
  });

  test('query matching two cows', function(assert) {
    let store = this.owner.lookup('service:store');

    let es_result = {
      "took" : 12,
      "timed_out" : false,
      "_shards" : {
        "total" : 5,
        "successful" : 5,
        "skipped" : 0,
        "failed" : 0
      },
      "hits" : {
        "total" : 2,
        "max_score" : 1.9924302,
        "hits" : [{
          "_index" : "pass",
          "_type" : "_doc",
          "_id" : "L2ZjcmVwby9yZXN0L2dyYW50cy9iOC82Mi9hNi9jNy9iODYyYTZjNy0wMzEyLTRjZWYtYjg1NC1iNDZmMGMzNWNhZWQ=",
          "_score" : 1.9924302,
          "_source" : {
            "@id" : "http://localhost/data/kine/bob/1",
            "@type" : "Cow",
            "name" : "Bob",
            "healthy": true
          }
        }, {
          "_index" : "pass",
          "_type" : "_doc",
          "_id" : "L2ZjcmVwby9yZXN0L2dyYW50cy81Mi83Zi85Ny81Zi81MjdmOTc1Zi03MmNlLTQzYjEtYjJmNC0yM2EwMDhlN2FmOWY=",
          "_score" : 1.7917595,
          "_source" : {
            "@id" : "http://localhost/data/kine/bob/1",
            "@type" : "Cow",
            "name" : "Bobby",
            "healthy": false
          }
        }]
      }
    };

    server = new Pretender(function() {
      this.post('http://localhost:9200/_search', function(request) {
        let query = request.requestBody;

        let o = JSON.parse(query);

        // Check that the query looks ok.
        assert.ok(o.query);
        assert.ok(o.query.bool);
        assert.ok(o.query.bool.must);
        assert.ok(o.query.bool.filter);

        assert.ok(query.includes('bob'));
        assert.ok(query.includes('Cow'));

        assert.step('post');

        return [200, { "Content-Type": "application/json"}, JSON.stringify(es_result)];
      });
    });

    let info = {};

    return run(() => {
      // Try a simple query

      let query = {
        match: {name: 'bob'}
      };

      return store.query('cow', query);
    }).then(result => {
      assert.verifySteps(['post'])

      assert.ok(result, "query 1 ok");
      assert.equal(result.get('length'), 2);

      result.forEach(cow => {
        assert.equal(cow.get('constructor.modelName'), 'cow');
      });

      // Try a query with from, size, and info

      let query = {
        match: {name: 'bob'},
        from: 0,
        size: 100,
        info: info
      };

      return store.query('cow', query);
    }).then(result => {
      assert.verifySteps(['post'])

      assert.ok(result, "query 2 ok");
      assert.equal(result.get('length'), 2);
      assert.equal(info.total, 2);

      result.forEach(cow => {
        assert.equal(cow.get('constructor.modelName'), 'cow');
      });

      // Try the query clause separated out

      let query = {
        query: {match: {name: 'bob'}},
        from: 10,
        size: 30,
        info: info
      };

      info.total = 0;

      return store.query('cow', query);
    }).then(result => {
      assert.verifySteps(['post'])

      assert.ok(result, "query 3 ok");
      assert.equal(result.get('length'), 2);
      assert.equal(info.total, 2);

      result.forEach(cow => {
        assert.equal(cow.get('constructor.modelName'), 'cow');
      });
    });
  });
});
