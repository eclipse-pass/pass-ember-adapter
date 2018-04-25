import DS from 'ember-data';
import { classify } from '@ember/string';


// Assumes compact JSON-LD representation without server triples.
// Required properties:
//   contextURI: Location of external context for JSON-LD.
//   dataURI: URI used for JSON-LD properties.

export default DS.Serializer.extend({

  // TODO Add mechanism to specify id <-> fedora uri mapping
  // Make default prettier. Perhaps just remove base uri, maybe base64 encode?
  convertFedoraURIToId(baseFedoraURI, uri) {
    return uri;
  },

  convertIdToFedoraURI(baseFedoraURI, id) {
    return id;
  },

  // Return the JSON-LD type to be used for a model
  serializeModelName(modelName) {
      return classify(modelName);
  },

  // Return the JSON-LD property name to be used for the given attribute of a model.
  // The context must set the type of this property to be consistent with the model.
  serializeKey(modelName, attr) {
    return attr;
  },

  // Return the model attribute name of a JSON-LD property.
  normalizeKey(modelName, prop) {
    return prop;
  },

  /**
    Normalize JSON-LD returned in compact form from Fedora into the internal
    JSON-API based representation used by Ember Data.

    Must handle single responses as well as a @graph.

    @since 1.13.0
    @method normalizeResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  // eslint-disable-next-line no-unused-vars
  normalizeResponse(store, primaryModelClass, payload, id, requestType) {
    //console.log('normalizeResponse for ' + requestType);
    //console.log(payload);

    // Extract dataURI prefix if available
    let context = payload['@context'];
    let data_prefix = null;

    if (context) {
      data_prefix = Object.keys(context).find(key => context[key] === this.get('dataURI'));
    }

    if ('@graph' in payload) {
      // One root node without type. Others should be of expected type.

      return {
        data: payload['@graph'].filter(n => '@type' in n).map(n =>
          this.normalize(primaryModelClass, n, data_prefix)
        )
      };
    } else if ('@id' in payload) {
      // Assume single object

      return {
        data: this.normalize(primaryModelClass, payload, data_prefix)
      };
    } else {
      // Assume empty

      return {
        data: []
      };
    }
  },

  // Convert a model attribute value to a JSON-LD value
  _serialize_attr(value, attr_type) {
    let value_type = typeof value;

    switch (attr_type) {
      case 'string':
        if (value_type != 'string') {
          throw 'Value type ' + value_type + ' not compatible with attribute type ' + attr_type + ' for value ' + value;
        }

        return value;
      case 'number':
        if (value_type != 'number') {
            throw 'Value type ' + value_type + ' not compatible with attribute type ' + attr_type + ' for value ' + value;
        }

        return value;
      case 'boolean':
        if (value_type != 'boolean') {
            throw 'Value type ' + value_type + ' not compatible with attribute type ' + attr_type + ' for value ' + value;
        }

        return value;
      case 'date':
        if (!(value instanceof Date)) {
            throw 'Value not compatible with attribute type ' + attr_type;
        }

        return value.toISOString();
      case 'string_array':
        if (!Array.isArray(value)) {
            throw 'Value type ' + value_type + ' not compatible with attribute type ' + attr_type
                  + ' which must be array of strings for value ' + value;
        }

        value.forEach(el => {
          let el_type = typeof el;

          if (el_type != 'string') {
            throw 'Array element type ' + el_type + ' not compatible with attribute type '
                  + attr_type + ' which must be array of strings for value ' + value;
          }
        });

        return value;
      default:
        throw 'Attribute type unsupported: ' + attr_type;
    }
  },

  // Convert a JSON-LD property to a model attribute value
  _normalize_attr(value, attr_type) {
    let value_type = typeof value;

    switch (attr_type) {
      case 'string':
        if (value_type != 'string') {
            throw 'Value type ' + value_type + ' not compatible with attribute type ' + attr_type + ' for value ' + value;
        }

        return value;
      case 'number':
        if (value_type != 'number') {
            throw 'Value type ' + value_type + ' not compatible with attribute type ' + attr_type + ' for value ' + value;
        }

        return value;
      case 'boolean':
        if (value_type != 'boolean') {
            throw 'Value type' + value_type + ' not compatible with attribute type ' + attr_type + ' for value ' + value;
        }

        return value;
      case 'date':
        // TODO Older browsers may not handle ISOString format.
        return new Date(Date.parse(value));
      case 'string_array':
        if (!Array.isArray(value)) {
            throw 'Value type ' + value_type + ' not compatible with attribute type ' + attr_type
                  + ' which must be array of strings for value ' + value;
        }

        value.forEach(el => {
          let el_type = typeof el;

          if (el_type != 'string') {
            throw 'Array element type ' + el_type + ' not compatible with attribute type '
                  + attr_type + ' which must be array of strings for value ' + value;
          }
        });

        return value;
      default:
        throw 'Attribute type unsupported: ' + attr_type;
    }
  },

  /**
    Convert the JSON representation of a model to JSON-LD suitable for Fedora.
    Custom transforms are not supported.

    @method serialize
    @param {DS.Snapshot} snapshot
    @param {Object} [options]
    @return {Object}
  */
  // eslint-disable-next-line no-unused-vars
  serialize(snapshot, options) {
    //console.log('serialize');

    let jsonld = {};
    jsonld['@context'] = this.get('contextURI');

    if (snapshot.id) {
      jsonld['@id'] = snapshot.id;
    } else {
      jsonld['@id'] = '';
    }

    let type = snapshot.type.modelName;
    jsonld['@type'] = this.serializeModelName(type);

    snapshot.eachAttribute((key, attribute) => {
      let value = snapshot.attr(key);

      if (value != undefined && value != null) {
        let name = this.serializeKey(type, key);

        jsonld[name] = this._serialize_attr(value, attribute.type);
      }
    });

    snapshot.eachRelationship((key, relationship) => {
      let name = this.serializeKey(type, key);

      if (relationship.kind === 'belongsTo') {
        let id = snapshot.belongsTo(key, { id: true });

        if (id) {
          jsonld[name] = {"@id": id};
        }
      } else if (relationship.kind === 'hasMany') {
        let ids = snapshot.hasMany(key, { ids: true });

        if (ids) {
          jsonld[name] = ids.map(id => ({"@id": id}));
        }
      }
     });

     //console.log(jsonld);

     return jsonld;
  },

 /**
    Normalize JSON-LD to internal representation. Assume that JSON-LD has been
    compacted and terms are in the dataURI namespace. Compact IRIs are checked
    to see if they are in the dataURI namespace. Full IRIs are not supported.

    Context must either be passed in or present as hash['@context'].

    @method normalize
    @param {DS.Model} typeClass
    @param {Object} hash
    @return {Object}
  */
  normalize(typeClass, hash, data_prefix = null) {
    //console.log('normalize')
    //console.log(hash);

    let id = hash['@id'];
    let type = typeClass.modelName;
    let attrs = {};
    let rels = {};

    if (data_prefix) {
      // Compact IRIs of dataURI are turned into terms.

      // eslint-disable-next-line no-unused-vars
      for (const [key, value] of Object.entries(hash)) {
        let i = key.indexOf(':');

        if (i != -1) {
          let prefix = key.substring(0, i);
          let newkey = key.substring(i + 1);

          if (prefix === data_prefix) {
            hash[newkey] = hash[key];
          }
        }
      }
    }

    // Ensure that the expected @type is expected term or compact IRI.
    let jsonld_type = this.serializeModelName(type);

    if (!hash['@type'].includes(jsonld_type) &&
        (!data_prefix || !hash['@type'].includes(data_prefix + ':' + jsonld_type))) {
      throw 'Could not find expected JSON-LD type ' + jsonld_type + ' in: ' + hash['@type'];
    }

    // Get attributes of the model found in the hash

    typeClass.eachAttribute((key, attribute) => {
      let hashkey = this.serializeKey(type, key);

      if (hashkey in hash) {
        attrs[key] = this._normalize_attr(hash[hashkey], attribute.type);
      }
    });

    // Get relationships found in the hash

    typeClass.eachRelationship((key, relationship) => {
      let hashkey = this.serializeKey(type, key);

      if (hashkey in hash) {
        let rel_target = hash[hashkey];
        let rel_type = relationship.type;

        if (relationship.kind === 'belongsTo') {
          rels[key] = {data: {id: rel_target, type: rel_type}};
        } else if (relationship.kind === 'hasMany') {
          if (Array.isArray(rel_target)) {
            rels[key] = {data: rel_target.map(t => ({id: t, type: rel_type}))}
          } else {
            rels[key] = {data: [{id: rel_target, type: rel_type}]};
          }
        }
      }
    });

    //console.log(attrs);
    //console.log(rels);

    return {
        id:            id,
        type:          type,
        attributes:    attrs,
        relationships: rels
    };
  }
});
