var _ = require('lodash');

/** 
 * Parse boolean value
 */
var convertToBoolean = function (str) {
	return (["true", "t", "yes", "y"].indexOf(str.toLowerCase()) !== -1)
};

var convertToDate = function (str) {
	var unix = parseInt(str, 10);
	if (isNaN(unix)) {
		return new Date(str);
	} else {
		return new Date(unix);
	}
};

module.exports = exports = function apiQueryPlugin (schema) {

	schema.statics.apiQuery = function (rawParams, opts, cb) {
		var model = this,
			params = model.apiQueryParams(rawParams),
			options = {},
			combine,
			callback = null,
			query;
		
		//function parameter 
		if (typeof opts === 'object') {
			options = opts;
			if (typeof cb === 'function') callback = cb;
		} else if (typeof opts === 'function') {
			callback = opts;
		}
		combine = options.combine || 'overwrite';

		// Create the Mongoose Query object.
		if (options.query) {
			query = options.query;
		} else if (options.findCond && typeof options.findCond === 'object') {
			if (combine === 'merge') {
				options.findCond = _.extend(params.searchParams, options.findCond)
			}
			query = model.find(options.findCond);
		} else {
			query = model.find(params.searchParams);
		}

		// limit & skip take priority over per_page & page
		if (params.limit || params.skip) {
			if (params.limit) query.limit(params.limit);
			if (params.skip) query.skip(params.skip);
		} else if (params.per_page || params.page) {
			params.per_page = params.per_page || 10;
			params.page = params.page || 1;
			query.limit(params.per_page)
				.skip((params.page - 1) * params.per_page);
		}

		// sort
		if (params.sort) {
			query.sort(params.sort);
		}
		// select
		if (params.select) query.select(params.select);

		if (callback) {
			query.exec(callback);
		} else {
			return query;
		}
	};

	/**
	 * Parse query string to params for Mongoose Query
	 */
	schema.statics.apiQueryParams = function(rawParams) {
		var model = this,
			query,
			// Query condition
			searchParams = {}, 
			// Paging
			page = null,
			per_page = null,
			limit = null,
			skip = null,
			// Options
			sort = false,
			select = null;

		/**
		 * Parse for mongoose schema
		 * @params: schema    {Schema},  Mongoose Schema
		 * @params: keyPrefix {String},  subschema parent key, ex: "foods".name
		 * @params: lcKey     {String},  the key, ex: monster_id
		 * @params: val       {String},  the val of key, ex: 30
		 * @params: operator  {String},  the mongoose condition operator, ex: all, gte, lt... 
		 */
		var parseSchemaForKey = function (schema, keyPrefix, lcKey, val, operator) {
			var paramType = false,
				matches = lcKey.match(/(.+)\.(.+)/),
				addSearchParam = function (val) {
					var key = keyPrefix + lcKey;

					if (typeof searchParams[key] !== 'undefined') {
						for (i in val) {
							searchParams[key][i] = val[i];
						}
					} else {
						searchParams[key] = val;
					}
				};

			//Check param type (DocumentArray, Mixed, String, Near, Boolean, String, ObjectId)
			if (matches) {
				// parse subschema
				var pathKey = schema.paths[matches[1]];
				var constructorName = pathKey.constructor.name;

				if (["DocumentArray", "Mixed"].indexOf(constructorName) !== -1) {
					parseSchemaForKey(pathKey.schema, matches[1] + ".", matches[2], val, operator)
				}
			} else if (typeof schema === "undefined") {
				paramType = "String";
			} else if (typeof schema.paths[lcKey] === "undefined"){
				// nada, not found
			} else if (operator === "near") {
				paramType = "Near";
			} else {
				var constructorName = schema.paths[lcKey].constructor.name;
				var nameMatch = {
					'SchemaBoolean': 'Boolean',
					'SchemaString': 'String',
					'SchemaArray': 'String',
					'ObjectId': 'ObjectId',
					'SchemaNumber': 'Number',
					'SchemaDate': 'Date'
				};
				paramType = nameMatch[constructorName] || false;
			}

			//Add search param by different param type
			if (paramType === "Boolean") {
				addSearchParam(convertToBoolean(val));
			} else if (paramType === "Number") {
				if (val.match(/([0-9]+,?)/) && val.match(',')) {
					if (operator === "all") {
						addSearchParam({$all: val.split(',')});
					} else if (operator === "nin") {
						addSearchParam({$nin: val.split(',')});
					} else if (operator === "mod") {
						addSearchParam({$mod: [val.split(',')[0], val.split(',')[1]]});
					} else {
						addSearchParam({$in: val.split(',')});
					}
				} else if (val.match(/([0-9]+)/)) {
					if (["gt", "gte", "lt", "lte", "ne"].indexOf(operator) !== -1) {
						var newParam = {};
						newParam["$" + operator] = val;
						addSearchParam(newParam);
					} else {
						addSearchParam(parseInt(val));
					}
				}
			} else if (paramType === "Date") {
				val = convertToDate(val);
				if (operator === "gt" ||
					operator === "gte" ||
					operator === "lt" ||
					operator === "lte") {
					var newParam = {};
					newParam["$" + operator] = val;
					addSearchParam(newParam);
				} else {
					addSearchParam(val);
				}
			} else if (paramType === "String") {
				if (val.match(',')) {
					var options = val.split(',').map(function(str){
						return new RegExp(str, 'i');
					});

					if (operator === "all") {
						addSearchParam({$all: options});
					} else if (operator === "nin") {
						addSearchParam({$nin: options});
					} else {
						addSearchParam({$in: options});
					}
				} else if (val.match(/^[0-9]+$/)) {
					if (operator === "gt" ||
						operator === "gte" ||
						operator === "lt" ||
						operator === "lte") {
						var newParam = {};
						newParam["$" + operator] = val;
						addSearchParam(newParam);
					} else {
						addSearchParam(val);
					}
				} else if (operator === "ne" || operator === "not") {
					var neregex = new RegExp(val,"i");
					addSearchParam({'$not': neregex});
				} else if (operator === "exact") {
					addSearchParam(val);
				} else {
					addSearchParam({$regex: val, $options: "-i"});
				}
			} else if (paramType === "Near") {
				// divide by 69 to convert miles to degrees
				var latlng = val.split(',');
				var distObj = {$near: [parseFloat(latlng[0]), parseFloat(latlng[1])]};
				if (typeof latlng[2] !== 'undefined') {
					distObj.$maxDistance = parseFloat(latlng[2]) / 69;
				}
				addSearchParam(distObj);
			} else if (paramType === "ObjectId") {
				addSearchParam(val);
			}
		};

		/** 
		 * Parse single pair of key & val
		 */
		var parseParam = function (key, val) {
			var lcKey = key,
				operator,
				parts;

			if (lcKey !== '$or' && lcKey !== '$and') {
				operator = val.match(/\{(.*)\}/);
				val = val.replace(/\{(.*)\}/, '');
			} else {
				try {
					val = JSON.parse(val);
				} catch (e) {
					val = null;
				} 
			}

			if (operator) operator = operator[1];

			if (!val) {
				return;
			} else if (lcKey === '$or' || lcKey === '$and') {
				searchParams[lcKey] = val;
			} else if (lcKey === 'page') {
				page = val;
			} else if (lcKey === 'per_page') {
				per_page = val;
			} else if (lcKey === 'limit') {
				limit = val;
			} else if (lcKey === 'skip') {
				skip = val;
			} else if (lcKey === 'sort_by') {
				parts = val.split(',').join(' ');
				sort = parts;
			} else if (lcKey === 'select') {
				select = val.split(',').join(' ');
			} else {
				parseSchemaForKey(model.schema, '', lcKey, val, operator);
			}
		};

		// Construct searchParams
		for (var key in rawParams) {
			var separatedParams,
				i = 0,
				len;

			try {
				separatedParams = rawParams[key].match(/\{\w+\}(.[^\{\}]*)/g);
			} catch (e) {
				if (Array.isArray(rawParams[key]) && rawParams[key].length) {
					rawParams[key] = rawParams[key].join(',');
					separatedParams = null;
				} else {
					continue;
				}
			}
			
			if (separatedParams === null) {
				parseParam(key, rawParams[key]);
			} else {
				len = separatedParams.length;
				for (i; i < len; ++i) {
					parseParam(key, separatedParams[i]);
				}
			}
		}

		return {
			searchParams: searchParams,
			page: page,
			per_page: per_page,
			limit: limit,
			skip: skip,
			sort: sort,
			select: select
		};
	};

};