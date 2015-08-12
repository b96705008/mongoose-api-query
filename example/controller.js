var Monster = require('./model');

module.exports = function(req, res){
	Monster.apiQuery(req.query).exec(function (err, monsters) {
	 	res.send(monsters);
	});
};