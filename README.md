# ember-fedora-adapter

[![Build Status](https://travis-ci.org/OA-PASS/ember-fedora-adapter.png?branch=master)](https://travis-ci.org/OA-PASS/ember-fedora-adapter)

## Introduction

This addon provides an adapter for interacting with the Fedora repository, http://fedorarepository.org/, and an Elasticsearch index of that data. The interaction is done through JSON-LD and the Fedora repository must have be modified in certain ways.

## Configuration
* Ember.js v2.18 or above
* Ember CLI v2.13 or above

### Adapter

* baseURI: Absolute URI to Fedora container which will host Ember data.
* elasticsearchURI: Absolute URI to Elasticsearch search service.
* username: If set, used to generate HTTP Basic authorization header.
* password: If set, used to generate HTTP Basic authorization header.

### Serializer

* contextURI: The URI of the external JSON-LD context to load. Must be publicly accessible.

## Using the Fedora adapter

The Fedora adapter requires a JSON-LD context corresponding to the models of the Ember application.
Each model must be defined as a term in the context. By default, the context term must be the upper case camel form of the model name.
For example the 'cow' ember model would be a 'Cow' term in the context. Attributes and relationships of a model must also be declared
in the context as terms. By default an attribute or relationships name maps directly to a term and those names
must be used consistently in all models. Some terms in the context require a type set, some do not. Whether or not an optional type is specified will
oddly influence compaction, but will not affect the adapter.

If an attribute starts with an `_`, it will be ignored by the adapter and not persisted to Fedora.

The set type is an extension provided to handle arrays of simple types like strings, numbers, and booleans.
The adapter will not preserve the order of a set attribute when an object is persisted. The adapter will
not persist an empty set.

Attributes mapping:

| Ember type | JSON-LD type            | Required |
| -----------| ----------------------- | -------- |
| boolean    | xsd:boolean             | false    |
| number     | xsd:integer, xsd:double | false    |
| string     | xsd:string              | false    |
| date       | xsd:dateTime            | true     |
| set        | @container: @set        | true     |
| object     | Unsupported             |          |

Relationship mapping:

| Ember relationship | JSON-LD type           | Required |
| ------------------ | ------------           | -------- |
| belongsTo          | @id                    | true     |
| hasMany            | @container: @set, @id  | true     |


The context must be publicly available and its location should be set with the 'contextURI' property of the serializer. The actual URI used for all the
term definitions must be set with 'dataURI' property of the serializer.

Example cow model:
```javascript
export default DS.Model.extend({
  name: DS.attr('string'),
  weight: DS.attr('number'),
  healthy: DS.attr('boolean'),
  birthDate: DS.attr('date'),
  colors: DS.attr('set'),
  milkVolume: DS.attr('number'),
  barn: DS.belongsTo('barn')
});
```

Example barn model:
```javascript
export default DS.Model.extend({
  name: DS.attr('string'),
  cows: DS.hasMany('cow')
});

```

Example JSON-LD context:
```javascript
{
  "@context": {
    "farm": "http://example.com/farm/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",

    "Cow": "farm:Cow",
    "Barn": "farm:Barn",

    "healthy": {"@id": "farm:healthy"},
    "birthDate": {"@id": "farm:birthDate", "@type": "xsd:dateTime"},
    "name": {"@id": "farm:name"},
    "milkVolume": {"@id": "farm:milkVolume", "@type": "xsd:double"},
    "weight": {"@id": "farm:weight", "@type": "xsd:integer"},
    "barn": {"@id": "farm:barn", "@type": "@id"},
    "colors": {"@id": "farm:colors", "@container": "@set"}
    "cows": {"@id": "farm:cows", "@container": "@set", "@type": "@id"}
  }
}

```

Some types are set, some are not.

## Ember data structure in Fedora

The adapter uses a container for each ember model to store instances of that model.
By default, the container is baseURI/NAME where NAME is the pluralized form of the model name.
These containers must exist for the adapter to work.

## Requirements and limitations

The adapter requires does not do JSON-LD processing. It requires that the JSON-LD be compact
and only supports terms. The default Fedora behavior does not do this.

The ember attribute type object (basic Javasript object) is not supported. The Fedora single
subject restriction would make support a bit awkward. Note that JSON arrays of simple types
are suppoted with set.

Ember attribute transforms are not supported.

Fedora must support JSON Merge Patch.

## Searching

Store.query is implemented on top of Elasticsearch. Fedora must have been set up such
that compacted Fedora objects are indexed in Elasticsearch. See https://github.com/OA-PASS/pass-indexer
for an example.

The query must be a clause in the Elasticsearch query syntax or an object containing that clause.
See https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html. The clause
is the subject of a must and then combined with a filter for the given type.
The query argument can be the form: clause or
    ```
    {
      query: clause,
      from: number,
      size: number,
      sort: sort_request,
      info: object_ref
    }
    ```

If the query argument has a 'query' key, the clause is taken
to be the value of that key. If 'from', 'size', or 'sort' keys are present in the
query argument, they are used to modify what results are returned. If the
'info' key is present, its value is an object reference upon which the 'total'
key is set to the total number of matching results. Note that if the query
argument is the clause, these optional keys can still be used.

Each property of a model object is available as an Elasticsearch field. The type of
field influences how it can be searched. Check the index configuration to find the types.

Example of searching green barns and return 10 matches starting from 10.
The info object has total set to the total number of matches.

```
store.query('barn', {term: {colors : 'green'}, from: 10, size: 10, info: info});
```

This is equivalent to the following query using the expanded syntax:

```
store.query('barn', {query: {term: {colors : 'green'}}, from: 10, size: 10, info: info});
```

## Building

## Installation

* `git clone <repository-url>` this repository
* `cd ember-fedora-adapter`
* `npm install`


## Running Tests

* `npm test` (Runs `ember try:each` to test your addon against multiple Ember versions)
* `ember test`
* `ember test --server`

### Integration testing

By default integration is turned on. It can be turned off by setting the enviroment variable FEDORA_ADAPTER_INTEGRATION_TEST to 0.

Docker containers which run Fedora, pass-indexer, and Elasticsearch must be configured in .env in order to run the integration tests.

By default the tests/dummy/public/farm.jsonld is configured to be used as the context for Fedora objects.
The file .esindex.config is used to create an Elasticsearch index for those objects.
The Fedora repository will be available on http://localhost:8080/fcrepo/rest with a username of admin and a password of moo.
The Elasticsearch index will be available at http://localhost:9200/farm.

## Building

* `ember build`

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).
