## Overview
This repository is fork from ajb/mongoose-api-query (https://github.com/ajb/mongoose-api-query)

If you use Mongoose to help serve results for API calls, you might be used to handling calls like:

    /monsters?color=purple&eats_humans=true

mongoose-api-query handles some of that busywork for you. Pass in a vanilla object (e.g. req.query) and query conditions will be cast to their appropriate types according to your Mongoose schema. For example, if you have a boolean defined in your schema, we'll convert the `eats_humans=true` to a boolean for searching.

It also adds a ton of additional search operators, like `less than`, `greater than`, `not equal`, `near` (for geosearch), `in`, and `all`. You can find a full list below.

When searching strings, by default it does a partial, case-insensitive match. (Which is not the default in MongoDB.)

## Usage

Require module

```
var mongooseApiQuery = require('mongoose-api-query');
```

Apply the plugin to any schema in the usual Mongoose fashion:

```
monsterSchema.plugin(mongooseApiQuery);
```

Then call it like you would using `Model.find`. This returns a Mongoose.Query:

```
Monster.apiQuery(req.query).exec(...
```

Or pass a callback in and it will run `.exec` for you:

```
Monster.apiQuery(req.query, function(err, monsters){...
```

You can replace the find condtions by your own defined one or mongoose query object

```
Monster.apiQuery(req.query, {findCond: {...}, combine: 'overwrite' or 'merge'}).... // combine default is overwrite 
Monster.apiQuery(req.query, {query: your_query})....
```

## Examples

`t`, `y`, and `1` are all aliases for `true`:

```
/monsters?eats_humans=y&scary=1
```

Match on a nested property:

```
/monsters?foods.name=kale
```

Use exact matching:

```
/monsters?foods.name={exact}KALE
```

Matches either `kale` or `beets`:

```
/monsters?foods.name=kale,beets
```

Matches only where `kale` and `beets` are both present:

```
/monsters?foods.name={all}kale,beets
```

Numeric operators:

```
/monsters?monster_id={gte}30&age={lt}50
```

Date support

```
/monsters?start_time={gte}1441195596284 //unix timestamp
/monsters?start_time={gte}Thu Sep 03 2015 06:06:36 GMT+0800 (CST) //date string
```

Combine operators:

```
/monsters?monster_id={gte}30{lt}50
```

geo near, with (optional) radius in miles:

```
/monsters?latlon={near}38.8977,-77.0366
/monsters?latlon={near}38.8977,-77.0366,10
```

##### $or & $and query (val should be processed by JSON stringify)
```
/monsters?$or=[{"name":"Big Purple People Eater"},{"monster_object_id": "530088897c979cdb49475d9b"}]
```

##### Pagination (new method)

```
/monsters?page=2
/monsters?page=4&per_page=25 		// per_page defaults to 10
```

##### Pagination (traditional, take priority over per_page & page)

```
/monsters?limit=10&skip=5 
```

##### Sorting results

```
/monsters?sort_by=name
/monsters?sort_by=name,desc
```

##### Select props
```
/monsters?select=name
/monsters?select=monster_id,name
/monsters?select=monster_id,-name
```

##### Schemaless search

Do you have a property defined in your schema like `data: {}`, that can have anything inside it? You can search that, too, and it will be treated as a string.

## Search Operators

This is a list of the optional search operators you can use for each SchemaType.

#### Number

- `number={all}123,456` - Both 123 and 456 must be present
- `number={nin}123,456` - Neither 123 nor 456
- `number={in}123,456` - Either 123 or 456
- `number={gt}123` - > 123
- `number={gte}123` - >= 123
- `number={lt}123` - < 123
- `number={lte}123` - <=123
- `number={ne}123` - Not 123
- `number={mod}10,2` - Where (number / 10) has remainder 2

#### String

- `string={all}match,batch` - Both match *and* batch must be present
- `string={nin}match,batch` - Neither match nor batch
- `string={in}match,batch` - Either match or batch
- `string={not}coffee` - Not coffee
- `string={exact}CoFeEe` - Case-sensitive exact match of "CoFeEe"

#### Latlon

- `latlon={near}37,-122,5` Near 37,-122, with a 5 mile max radius
- `latlon={near}37,-122` Near 37,-122, no radius limit. Automatically sorts by distance



## To run tests (example folder)

```shell
node load_fixtures.js
node app.js
mocha
```

## License

MIT http://mit-license.org/
