import FedoraJsonLdSerializer from './fedora-jsonld';
import ENV from 'dummy/config/environment';

// Configure to use provided farm context.
export default FedoraJsonLdSerializer.extend({
  init() {
    this.set('contextURI',  ENV.test.override ? ENV.test.override.context : ENV.test.context);
  }
});
