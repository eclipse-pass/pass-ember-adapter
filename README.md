# ember-fedora-adapter

## Introduction

This addon provides an adapter for interacting with the Fedora repository, [http://fedorarepository.org/].

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
