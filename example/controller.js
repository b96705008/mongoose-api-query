var Monster = require('./model');

module.exports = function(req, res){
	Monster.apiQuery(req.query).exec(function (err, monsters) {
	 	res.send(monsters);
	});	

	// Monster.apiQuery(req.query, {
	// 	findCond: {name: 'Big Purple People Eater'}
	// 	,combine: 'merge'
	// }).exec(function (err, monsters) {
	//  	res.send(monsters);
	// });
};