import DS from 'ember-data';
import { classify } from '@ember/string';

/* eslint no-unused-vars: 0 */

// Assumes compact JSON-LD representation without server triples.

// Required properties:
//   contextURI: Location of external context for JSON-LD.
//   dataURI: URI used for JSON-LD properties.
//   dataPrefix: Default prefix used when referencing dataURI.

export default DS.Serializer.extend({
  // Return prefix used for contextURI in given context or undefined if not found.
  _find_prefix(context, uri) {
    return Object.keys(context).find(key => context[key] === uri);
  },

  // TODO Add mechanism to specify id <-> fedora uri mapping
  // Make default prettier. Perhaps just remove base uri, maybe base64 encode?
  convertFedoraURIToId(baseFedoraURI, uri) {
    return uri;
  },

  convertIdToFedoraURI(baseFedoraURI, id) {
    return id;
  },

  convertModelNametoRdf(prefix, modelName) {
      return prefix + ':' + classify(modelName);
  },

  convertModelAttributeToRdf(modelName, attrName) {
    return attrName;
  },

  /**
    The `normalizeResponse` method is used to normalize a payload from the
    server to a JSON-API Document.

    http://jsonapi.org/format/#document-structure

    @since 1.13.0
    @method normalizeResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeResponse(store, primaryModelClass, payload, id, requestType) {
    //console.log('normalizeResponse for ' + requestType);
    //console.log(payload);

    if ('@graph' in payload) {
      // List of objects in graph, return all nodes of the expected type

      // TODO Do not need this if context setup to define types?
      let prefix = this._find_prefix(payload['@context'], this.get('dataURI'));

      if (!prefix) {
        // TODO
        // throw 'Cannot find prefix for ' + this.get('dataURI');
      }

      let rdftype = this.convertModelNametoRdf(prefix, primaryModelClass.modelName);

      return {
        data: payload['@graph'].filter(n => '@type' in n && n['@type'].includes(rdftype)).map(n =>
          this.normalize(primaryModelClass, n)
        )
      };
    } else if ('@id' in payload) {
      // Assume single object

      return {
        data: this.normalize(primaryModelClass, payload)
      };
    } else {
      // Assume empty

      return {
        data: []
      };
    }
  },

  // TODO Allow custom transforms?

  _convert_attr_to_json_ld(value, attr_type) {
    let value_type = typeof value;

    switch (attr_type) {
      case 'string':
        if (value_type != 'string') {
            throw 'Value type' + value_type + ' not compatible with attribute type ' + attr_type;
        }

        return value;
      case 'number':
        if (value_type != 'number') {
            throw 'Value type' + value_type + ' not compatible with attribute type ' + attr_type;
        }

        return value;
      case 'boolean':
        if (value_type != 'boolean') {
            throw 'Value type' + value_type + ' not compatible with attribute type ' + attr_type;
        }

        return value;
      case 'date':
        if (!(value instanceof Date)) {
            throw 'Value not compatible with attribute type ' + attr_type;
        }

        return value.toISOString();
      case 'object':
        throw 'Object attributes are not supported.';
      default:
        throw 'Attribute type unsupported: ' + attr_type;
    }
  },

  // TODO Handle JSON-LD typed values? Does compaction remove need?

  _convert_json_ld_to_attr(value, attr_type) {
    let value_type = typeof value;

    switch (attr_type) {
      case 'string':
        if (value_type != 'string') {
            throw 'Value type' + value_type + ' not compatible with attribute type ' + attr_type;
        }

        return value;
      case 'number':
        if (value_type != 'number') {
            throw 'Value type' + value_type + ' not compatible with attribute type ' + attr_type;
        }

        return value;
      case 'boolean':
        if (value_type != 'boolean') {
            throw 'Value type' + value_type + ' not compatible with attribute type ' + attr_type;
        }

        return value;
      case 'date':
        // TODO Older browsers may not handle ISOString format.
        return Date.parse(value);
      case 'object':
        throw 'Object attributes are not supported.';
      default:
        throw 'Attribute type unsupported: ' + attr_type;
    }
  },

  /**
    The `serialize` method is used when a record is saved in order to convert
    the record into the form that your external data source expects.

    `serialize` takes an optional `options` hash with a single option:

    - `includeId`: If this is `true`, `serialize` should include the ID
      in the serialized object it builds.

    @method serialize
    @param {DS.Snapshot} snapshot
    @param {Object} [options]
    @return {Object}
  */
  serialize(snapshot, options) {
    //console.log('serialize');

    let jsonld = {};
    jsonld['@context'] = this.get('contextURI');

    if (snapshot.id) {
      jsonld['@id'] = snapshot.id;
    } else {
      jsonld['@id'] = '';
    }

    // TODO Can we require the type to be defined in the context thus getting rid of prefix?

    jsonld['@type'] = this.convertModelNametoRdf(this.get('dataPrefix'), snapshot.type.modelName);

    snapshot.eachAttribute((key, attribute) => {
      let value = snapshot.attr(key);

      if (value != undefined && value != null) {
        jsonld[key] = this._convert_attr_to_json_ld(value, attribute.type);
      }
    });

    // TODO handle ids and id arrays

    snapshot.eachRelationship((key, relationship) => {
      if (relationship.kind === 'belongsTo') {
        jsonld[key] = snapshot.belongsTo(key, { id: true });
      } else if (relationship.kind === 'hasMany') {
        jsonld[key] = snapshot.hasMany(key, { ids: true });
      }
     });

     //console.log(jsonld);

     return jsonld;
  },
 /**
    The `normalize` method is used to convert a payload received from your
    external data source into the normalized form `store.push()` expects. You
    should override this method, munge the hash and return the normalized
    payload.

    Assume that JSON-LD has been compacted and only statments in the ember data
    context are being returned.

    @method normalize
    @param {DS.Model} typeClass
    @param {Object} hash
    @return {Object}
  */
  normalize(typeClass, hash) {
    //console.log('normalize')
    //console.log(hash);

    let id = hash['@id'];
    let type = typeClass.modelName;
    let attrs = {};

    // TODO Handle type conversion
    // TODO Support mapping ember attribute <-> fedora property
    // TODO Ensure each key is from dataURI property.

    // Gather model attributes from the JSON-LD.

    typeClass.eachAttribute((key, attribute) => {
      if (key in hash) {
        attrs[key] = this._convert_json_ld_to_attr(hash[key], attribute.type);
      }
    });

    return {
        id:         id,
        type:       type,
        attributes: attrs
    };
  }
});
