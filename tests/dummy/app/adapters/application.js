import FedoraJsonLdAdapter from './fedora-jsonld';
import ENV from 'dummy/config/environment';

export default FedoraJsonLdAdapter.extend({
  init() {
    this.set('host', ENV.test.override ? ENV.test.override.host : ENV.test.host);
    this.set('namespace', ENV.test.override ? ENV.test.override.namespace : ENV.test.namespace);
    this.set('username', ENV.test.override ? ENV.test.override.username : ENV.test.username);
    this.set('password', ENV.test.override ? ENV.test.override.password : ENV.test.password);
  }
});
