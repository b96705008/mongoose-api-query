var mongoose = require('mongoose');
var mongooseApiQuery = require('../lib/mongoose-api-query');

var monsterSchema = new mongoose.Schema({
  name: String,
  monster_identification_no: Number,
  monster_object_id: mongoose.Schema.ObjectId,
  eats_humans: Boolean,
  foods: [ new mongoose.Schema({
    name: String,
    vegetarian: Boolean,
    calories: Number
  })],
  loc: Array,
  data: {}
});

monsterSchema.index({'loc':'2d'});
monsterSchema.plugin(mongooseApiQuery);

module.exports = DB.model('Monster', monsterSchema);