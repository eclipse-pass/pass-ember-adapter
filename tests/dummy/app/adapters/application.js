import FedoraJsonLdAdapter from './fedora-jsonld';
import ENV from 'dummy/config/environment';

export default FedoraJsonLdAdapter.extend({
  init() {
    this.set('baseURI', ENV.test.override ? ENV.test.override.base : ENV.test.base);
    this.set('username', ENV.test.override ? ENV.test.override.username : ENV.test.username);
    this.set('password', ENV.test.override ? ENV.test.override.password : ENV.test.password);
  }
});
