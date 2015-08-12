exports.init = function(app){
  app.get('/monsters', require('./controller'));
};