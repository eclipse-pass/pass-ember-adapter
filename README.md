# ember-fedora-adapter

## Introduction

This addon provides an adapter for interacting with the Fedora repository, http://fedorarepository.org/.

## Using the Fedora adapter

The Fedora adapter requires a JSON-LD context corresponding to the models of the Ember application.
Each model must be defined as a term in the context. By default, the context term must be the upper case camel form of the model name.
For example the 'cow' ember model would be a 'Cow' term in the context. Properties of a model must also be declared in the context along with a type.
The context must be consistent with the models.


| Ember type    | JSON-LD type             |
| ------------- | -------------            |
| boolean       | xsd:boolean              |
| number        | xsd:integer, xsd:double  |
| string        | xsd:string               |
| date          | xsd:dateTime             |
| object        | Unsupported              |
| belongsTo     | @id                      |
| hasMany       | @container: @set         |



The context must be publicly available and its location should be set with the 'contextURI' property of the serializer. The actual URI used for all the
term definitions must be set with 'dataURI' property of the serializer.


Example cow model:
```javascript
export default DS.Model.extend({
  name: DS.attr('string'),
  weight: DS.attr('number'),
  healthy: DS.attr('boolean'),
  birthDate: DS.attr('date'),
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

    "healthy": {"@id": "farm:healthy", "@type": "xsd:boolean"},
    "birthDate": {"@id": "farm:birthDate", "@type": "xsd:dateTime"},
    "name": {"@id": "farm:name", "@type": "xsd:string"},
    "milkVolume": {"@id": "farm:milkVolume", "@type": "xsd:double"},    
    "weight": {"@id": "farm:weight", "@type": "xsd:integer"},
    "barn": {"@id": "farm:barn", "@type": "@id"},    
    "cows": {"@id": "farm:cows", "@container": "@set"}    
  }
}

```


## Installation

* `git clone <repository-url>` this repository
* `cd ember-fedora-adapter`
* `npm install`


## Running Tests

* `npm test` (Runs `ember try:each` to test your addon against multiple Ember versions)
* `ember test`
* `ember test --server`

### Integration testing

By default integration is turned on. It can be turned off by setting the enviroment variable FEDORA_ADAPTER_INTEGRATION_TEST to false.

The following envirment variables configure integration testing:
* FEDORA_ADAPTER_HOST       (http://localhost:8080)
* FEDORA_ADAPTER_NAMESPACE  (rest/farm)
* FEDORA_ADAPTER_CONTEXT    (Location of http://localhost:4200/farm.jsonld)
* FEDORA_ADAPTER_USER_NAME  (Username to connect to Fedora)
* FEDORA_ADAPTER_PASSWORD   (Password to connect to Fedora)
* FEDORA_ADAPTER_INTEGRATION_TEST (Whether or not to run integration test: 1 by default, set to 0 to turn off)

The file /tests/dummy/public/farm.jsonld must be publically available at FEDORA_ADAPTER_CONTEXT.

## Building

* `ember build`

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).
