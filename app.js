
/**
 * Module dependencies
 */

var express = require('express'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  errorHandler = require('error-handler'),
  morgan = require('morgan'),
  routes = require('./routes'),
  http = require('http'),
  path = require('path');

var app = module.exports = express();


/**
 * Configuration
 */

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(bodyParser());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

var env = process.env.NODE_ENV || 'development';

// development only
if (env === 'development') {

}

// production only
if (env === 'production') {
  // TODO
}


/**
 * Routes
 */

// serve index and view partials
app.get('/', routes.index);
app.get('/partials/:name', routes.partials);

var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database("E:\\eve\\staticData\\universeDataDx.db");
var _ = require("lodash");
var request = require("request");
var parseString = require('xml2js').parseString;
var async = require("async");
var humanize = require("humanize");

var findPvp = function (req, res) {
    var from = req.query.from.split(',');
    var kills;
    var jumps;
    var maxJumps = req.query.maxJumps;
    var result = [];

    if (!maxJumps)
    {
        maxJumps = 10;
    }

    getJson("https://api.eveonline.com/map/Kills.xml.aspx", function(k)
    {
        kills = k;
        getJson("https://api.eveonline.com/map/Jumps.xml.aspx", function(j)
        {
            jumps = j;
            async.each(from, startRouteFrom, function(err)
            {

                var nResult = [];
                _.forEach(result, function (r)
                {
                    var cResult = _.find(nResult, function(cr){
                        return cr.jumpsFromYou == r.jumpsFromYou
                    });

                    if (cResult == null)
                    {

                    }
                    r.activity = _.sortBy(r.activity, function(rr)
                    {
                        return parseInt(rr.kills.factionKills);
                    });

                    r.activity = _(r.activity).reverse();

                    nResult.push(r);
                });

                console.log(nResult);
                return res.send(JSON.stringify(nResult, null, 3));
            });
        });
    });

    function startRouteFrom(solarSystemName, cb)
    {
        db.serialize(function() {
            getSystemData(solarSystemName, function(data)
            {
                getStatisticsForSolarSystem(data, kills, jumps, maxJumps, 1, function(stats)
                {
                    result.push(stats);
                    cb();
                })
            })
        });
    }
};

function getStatisticsForSolarSystem(data, kills, jumps, maxJumps, currentJumps, cb) {
    db.all("SELECT toSolarSystemID FROM mapSolarSystemJumps WHERE fromSolarSystemID = ?", data.solarSystemID , function(err, jumpsOut)
    {
        async.map(jumpsOut, gs, function(err, results)
        {
            var data = {jumpsFromYou: currentJumps, activity: results};
            cb(data);
        });
    });


    function gs(j, cbj)
    {
        var killsOnSystems = _.find(kills, function(k){
            return k.solarSystemID == j.toSolarSystemID;
        });

        getSystemData(j.toSolarSystemID, function(d)
        {
            var sdata = {
                startingFrom: data.solarSystemName,
                systemName: d.solarSystemName,
                security: humanize.numberFormat(d.security),
                kills: killsOnSystems,
                jumpsThroughHere: '?'
            };
            cbj(null, sdata);
        });
    }
}

function getSystemData(solarSystemNameOrId, cb)
{
    db.get("SELECT solarSystemId, solarSystemName, security FROM mapSolarSystems WHERE solarSystemName = ? OR solarSystemID = ? ", [solarSystemNameOrId, solarSystemNameOrId], function(err, row)
    {
        cb(row);
    });
}


function getJumpsOutFromSystem(solarSystemID, cb)
{
    db.all("SELECT toSolarSystemID FROM mapSolarSystemJumps WHERE fromSolarSystemID = ?", solarSystemID , function(err, jumpsOut)
    {
        return cb(jumpsOut);
    });
}


function getJson(url, cb){
    request(url, function (error, response, body)
    {
        if (!error && response.statusCode == 200) {
            parseString(response.body, function(err, ks)
            {
                var res = _.map(ks.eveapi.result[0].rowset[0].row, function(k){
                    return k.$;
                });
                cb(res);
            });
        }
    });
};

// JSON API
app.get('/api/findpvp', findPvp);

// redirect all others to the index (HTML5 history)
app.get('*', routes.index);


/**
 * Start Server
 */

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
