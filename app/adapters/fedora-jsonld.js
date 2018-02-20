import DS from 'ember-data';
import RSVP from 'rsvp';
import $ from 'jquery';
import { camelize } from '@ember/string';
import { get } from '@ember/object';
import { pluralize } from 'ember-inflector';


export default DS.Adapter.extend({
  username: null,
  password: null,
  defaultSerializer: '-fedora-jsonld',

  // Merge standard headers into provided heades and return the result.
  // In particular, a basic authorization header is added if appropriate.
  _merge_headers(headers = {}) {
    let user = this.get('username');
    let pass = this.get('password');

    if (user && pass) {
      headers['Authorization'] = "Basic " + btoa(user + ':' + pass);
    }

    return headers;
  },

  // Helper for making an ajax calls.
  // Use headers option to add headers.
  _ajax(url, method, options = {}) {
    options.url = url;
    options.method = method;

    //console.log(method + " " + url);

    let headers = this._merge_headers(options.header);

    options.beforeSend = function (xhr) {
      Object.keys(headers).forEach((key) => xhr.setRequestHeader(key, headers[key]));
    };

    return $.ajax(options);
  },

  /**
    Called by the store when a newly created record is
    saved via the `save` method on a model record instance.
    The `createRecord` method serializes the record and makes an Ajax (HTTP POST) request
    to a URL computed by `buildURL`.
    See `serialize` for information on how to customize the serialized form
    of a record.

    The returned Promise should on success resolve to JSON with an id.

    @method createRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  createRecord(store, type, snapshot) {
    let serializer = store.serializerFor(type.modelName);
    let url = this.buildModelURL(type.modelName);
    let data = serializer.serialize(snapshot);

    return this._ajax(url, "POST", {
      data: JSON.stringify(data),
      headers: {'Content-Type': 'application/ld+json; charset=utf-8'},
      dataFilter: function(resp) {
        // Fedora returns assigned URI as plain text.
        // Return JSON-LD object for serializer.normalizeResponse.

        data['@id'] = resp.trim();

        return data;
      }
    });
  },

  // TODO Could do a sparql PATCH on changedAttributres? Too complex?

  /**
    Called by the store when an existing record is saved
    via the `save` method on a model record instance.

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

    return this._ajax(url, 'PUT', {
      headers: {
        'Content-Type': 'application/ld+json; charset=utf-8',
        'Prefer': 'return=representation; omit="http://fedora.info/definitions/v4/repository#ServerManaged"'
      },
      data: JSON.stringify(data)
    });
  },

 /**
    Called by the store in order to fetch the JSON for a given
    type and ID.

    The `findRecord` method makes an Ajax request to a URL computed by
    `buildURL`, and returns a promise for the resulting payload.

    This method performs an HTTP `GET` request with the id provided as part of the query string.

    @since 1.13.0
    @method findRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {String} id
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  /* eslint no-unused-vars: 0 */
  findRecord(store, type, id, snapshot) {
    return this._ajax(id, 'GET', {
      headers: {
        'Accept': 'application/ld+json; profile="http://www.w3.org/ns/json-ld#compacted"',
        'Prefer': 'return=representation; omit="http://fedora.info/definitions/v4/repository#ServerManaged"'
      }
    });
  },

  /**
    Called by the store in order to fetch a JSON array for all
    of the records for a given type.

    The `findAll` method makes an Ajax (HTTP GET) request to a URL computed by `buildURL`, and returns a

    promise for the resulting payload.
    @method findAll
    @param {DS.Store} store
    @param {DS.Model} type
    @param {String} sinceToken
    @param {DS.SnapshotRecordArray} snapshotRecordArray
    @return {Promise} promise
  */
  findAll(store, type, sinceToken, snapshotRecordArray) {
    let url = this.buildModelURL(type.modelName);
    let query = {};

    //console.log('findAll ' + url);

    return this._ajax(url, 'GET', {
      data: query,
      headers: {
        'Accept': 'application/ld+json; profile="http://www.w3.org/ns/json-ld#compacted"',
        'Prefer': 'return=representation; omit="http://fedora.info/definitions/v4/repository#ServerManaged"; include="http://fedora.info/definitions/v4/repository#EmbedResources"'
      }
    });
  },

 /**
    Called by the store in order to fetch a JSON array for
    the records that match a particular query.

    The `query` method makes an Ajax (HTTP GET) request to a URL
    computed by `buildURL`, and returns a promise for the resulting
    payload.

    The `query` argument is a simple JavaScript object that will be passed directly
    to the server as parameters.

    @method query
    @param {DS.Store} store
    @param {DS.Model} type
    @param {Object} query
    @return {Promise} promise
  */
  query(store, type, query) {
    let url = this.buildModelURL(type.modelName);

    return this._ajax(url, 'GET', {
      data: query,
      headers: {
        'Accept': 'application/ld+json; profile="http://www.w3.org/ns/json-ld#compacted"',
        'Prefer': 'return=representation; omit="http://fedora.info/definitions/v4/repository#ServerManaged"; include="http://fedora.info/definitions/v4/repository#EmbedResources"'
      }
    });
  },

  // Code to build URL adapted from BuildURLMixin
  // TODO All of this is much too complex, should be refactored.

  buildModelURL(modelName) {
    let path;
    let url = [];
    let prefix = this.urlPrefix();

    path = this.pathForType(modelName);

    if (path) {
      url.push(path);
    }

    if (prefix) {
      url.unshift(prefix);
    }

    url = url.join('/');
    if (!this.host && url && url.charAt(0) !== '/') {
      url = '/' + url;
    }

    return url;
  },

  pathForType(modelName) {
    let camelized = camelize(modelName);
    return pluralize(camelized);
  },

  urlPrefix(path, parentURL) {
    let host = get(this, 'host');
    let namespace = get(this, 'namespace');

    if (!host || host === '/') {
      host = '';
    }

    if (path) {
      // Protocol relative url
      if (/^\/\//.test(path) || /http(s)?:\/\//.test(path)) {
        // Do nothing, the full host is already included.
        return path;

      // Absolute path
      } else if (path.charAt(0) === '/') {
        return `${host}${path}`;
      // Relative path
      } else {
        return `${parentURL}/${path}`;
      }
    }

    // No path provided
    let url = [];
    if (host) { url.push(host); }
    if (namespace) { url.push(namespace); }
    return url.join('/');
  },
});
