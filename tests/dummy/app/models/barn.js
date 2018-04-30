import DS from 'ember-data';

export default DS.Model.extend({
  name: DS.attr('string'),
  colors: DS.attr('set'),
  cows: DS.hasMany('cow')
});
