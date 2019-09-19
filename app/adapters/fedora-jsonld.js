import DS from 'ember-data';
import RSVP from 'rsvp';
import { camelize } from '@ember/string';
import { pluralize } from 'ember-inflector';

const JSON_LD_ACCEPT_HEADER = 'application/ld+json; profile="http://www.w3.org/ns/json-ld#compacted"';
const JSON_LD_PREFER_HEADER = 'return=representation; omit="http://fedora.info/definitions/v4/repository#ServerManaged"';
const JSON_LD_INCLUDE_PREFER_HEADER = 'return=representation; omit="http://fedora.info/definitions/v4/repository#ServerManaged"; include="http://fedora.info/definitions/v4/repository#EmbedResources"'

// Configuration properties:
//   baseURI: Absolute URI of Fedora container used to store data.
//   elasticsearchURI: Absolute URI of Elasticsearch search service.
//   username: Usernmae to use for HTTP Basic.
//   password: Password to use for HTTP Basic


export default DS.Adapter.extend({
  username: null,
  password: null,
  defaultSerializer: '-fedora-jsonld',

  // Helper for making an ajax calls that returns a fetch response.
  // Throws an error if call not successful.
  // Adds a basic authorization header if appropriate.
  _ajax(url, method, options = {}) {
    options.method = method;

    // Needed for cross-site support.
    options.credentials = 'include';

    let user = this.get('username');
    let pass = this.get('password');

    if (user && pass) {
      options.headers = options.headers || {};
      options.headers['Authorization'] = "Basic " + btoa(user + ':' + pass);
    }

    return fetch(url, options).then(response => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response;
    });
  },

  // Return a Promise which delete an object and its tombstone from Fedora.
  // Always tries to delete tombstone as well and never fails.
  _delete(url) {
    let deltomb = () => this._ajax(url + '/fcr:tombstone', 'DELETE').catch(() => {});
    return this._ajax(url, 'DELETE').then(deltomb, deltomb);
  },

  // Return a Promise which creates an empty container in Fedora.
  _create(url) {
    return this._ajax(url, 'PUT', {headers: {'Content-Type': 'text/turtle'}});
  },

  // Return a Promise which deletes the root container used by the adapter if it
  // exists, recreates the root container, and then creates type containers.
  setupFedora(modelNames) {
    let base = this.buildURL();
    let result = this._delete(base).then(() => this._create(base));

    return result.then(() => RSVP.all(modelNames.map(name => this._create(this.buildURL(name)))));
  },

  // Return a Promise which clears the specified Elasticsearch index
  clearElasticsearch(index_url) {
    let url = index_url + '_doc/_delete_by_query?conflicts=proceed&refresh';
    let query =  {query: {match_all: {}}};

    return this._ajax(url, 'POST', {
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(query)
    });
  },

  /**
    Persists a record to Fedora. Uses serializer.serialize to turn the record into
    JSON-LD.

    The returned Promise should resolve to the created JSON-LD object
    with @id set so it is ready for serializer.normalizeResponse.

    @method createRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  createRecord(store, type, snapshot) {
    let serializer = store.serializerFor(type.modelName);
    let url = this.buildURL(type.modelName);
    let data = serializer.serialize(snapshot);

    return this._ajax(url, "POST", {
      body: JSON.stringify(data),
      headers: {'Content-Type': 'application/ld+json; charset=utf-8'},
    }).then((response) => {
      // Return JSON-LD object with @id for serializer.normalizeResponse.
      let id = response.headers.get('Location');
      data['@id'] = id;

      return data;
    });
  },

  /**
    Called by the store when an existing record is saved
    via the `save` method on a model record instance. The Fedora container representing
    the record is updated with a PATCH which relies on Fedora supporting
    JSON Merge Patch.

    TODO Handle concurrency, if-modified

    @method updateRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  updateRecord(store, type, snapshot) {
    let url = snapshot.id;
    let serializer = store.serializerFor(type.modelName);
    let data = serializer.serialize(snapshot);

    return this._ajax(url, 'PATCH', {
      headers: {
        'Content-Type': 'application/merge-patch+json; charset=utf-8',
        'Prefer': JSON_LD_PREFER_HEADER
      },
      body: JSON.stringify(data)
    });
  },

  /**
    Called by the store when a record is deleted.

    Deletes both the specified object and the tombstone from Fedora.

    @method deleteRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  deleteRecord(store, type, snapshot) {
      return this._delete(snapshot.id);
  },

 /**
    Called by the store in order to fetch the JSON for a given
    type and ID. The normalizeResponse method on the serializer is called on the result.


    @since 1.13.0
    @method findRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {String} id
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  // eslint-disable-next-line no-unused-vars
  findRecord(store, type, id, snapshot) {
    return this._ajax(id, 'GET', {
      headers: {
        'Accept': JSON_LD_ACCEPT_HEADER,
        'Prefer': JSON_LD_PREFER_HEADER
      }
    }).then(response => response.json());
  },

  /**
    Called by the store in order to fetch all instances of a type.
    Fedora keeps all instances of a type in a container. This GET returns
    all of those children in a @graph.

    The normalizeResponse method on the serializer is called on the result.

    @method findAll
    @param {DS.Store} store
    @param {DS.Model} type
    @param {String} sinceToken
    @param {DS.SnapshotRecordArray} snapshotRecordArray
    @return {Promise} promise
  */
  // eslint-disable-next-line no-unused-vars
  findAll(store, type, sinceToken, snapshotRecordArray) {
    let url = this.buildURL(type.modelName);

    // TODO Investigate query
    //console.log('findAll ' + url);

    return this._ajax(url, 'GET', {
      headers: {
        'Accept': JSON_LD_ACCEPT_HEADER,
        'Prefer': JSON_LD_INCLUDE_PREFER_HEADER
      }
    }).then(response => response.json());
  },

  // Create an elasticsearch query that restricts the given query to the given type.
  // Add size, sort, and from from options if presents
  _create_elasticsearch_query(query, jsonld_type) {
    let result = {};
    let clause = Object.assign({}, query);

    ['size', 'from', 'sort'].forEach(key => {
        if (key in clause) {
          result[key] = query[key];
          delete clause[key];
        }
    });

    if ('query' in clause) {
      clause = clause.query;
    }

    result.query = {
      bool: {
        must: clause,
        filter: {term: {'@type': jsonld_type}}
      }
    };

    result._source = {
      excludes: "*_suggest"
    };

    return result;
  },

  // Turn Elasticsearch results into a JSON-LD @graph suitable for normalizeResponse.
  // Return metadata about the search through info object.
  _parse_elasticsearch_result(result, info) {
    if (info) {
      info.total = result.hits.total;
    }

    return {
      '@graph': result.hits.hits.map(hit => hit._source)
    };
  },

 /**
    Called by the store in order to fetch an array of records that match an
    Elasticsearch query.

    The query must be a clause in the Elasticsearch query syntax or an object
    containing that clause.
    See https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html.
    The clause is the subject of a must and then combined with a filter for the
    given type.

    The query argument can be the form: clause or
    {
      query: clause,
      from: number,
      size: number,
      info: object_ref
    }.

    If the query argument has a 'query' key, the clause is taken
    to be the value of that key. If 'from' or 'size' keys are present in the
    query argument, they are used to modify what results are returned. If the
    'info' key is present, its value is an object reference upon which the 'total'
    key is set to the total number of matching results. Note that if the query
    argument is the clause, these optional keys can still be used.

    Each property of a model object is available as an Elasticsearch field. The type of
    field influences how it can be searched. Check the index configuration to find the
    types.

    @method query
    @param {DS.Store} store
    @param {DS.Model} type
    @param {Object} query
    @return {Promise} promise
  */

  query(store, type, query) {
    let url = this.get('elasticsearchURI');
    let serializer = store.serializerFor(type.modelName);
    let jsonld_type = serializer.serializeModelName(type.modelName);

    let info = query.info;

    if (info) {
      delete query.info;
    }

    let data = this._create_elasticsearch_query(query, jsonld_type);

    return this._ajax(url, 'POST', {
      body: JSON.stringify(data),
      headers: {'Content-Type': 'application/json; charset=utf-8'},
    }).then(response => response.json()).then(result => {
      return this._parse_elasticsearch_result(result, info);
    });
  },

  // Return the path relative to the adapter root in the Fedora repository
  // for the container holding all instances of a type.
  buildModelPath(modelName) {
    let camelized = camelize(modelName);
    return pluralize(camelized);
  },

  // Return the path to the root container in a Fedora container which will hold all data
  // managed by the adapter.
  buildURL(modelName = null) {
    let base = this.get('baseURI');

    if (base.endsWith('/')) {
      base = base.slice(0, base.length - 1);
    }

    let url = [base];

    if (modelName) {
      url.push(this.buildModelPath(modelName));
    }

    return url.join('/');
  },
});
