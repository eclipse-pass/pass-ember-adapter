import DS from 'ember-data';

export default DS.Model.extend({
  name: DS.attr('string'),
  weight: DS.attr('number'),
  healthy: DS.attr('boolean'),
  birthDate: DS.attr('date'),
  milkVolume: DS.attr('number'),
  colors: DS.attr('set'),
  barn: DS.belongsTo('barn')
});
