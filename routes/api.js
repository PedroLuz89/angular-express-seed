/*
 * Serve JSON to our AngularJS client
 */

var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database("E:\\eve\\staticData\\universeDataDx.db");
var _ = require("lodash");
var request = require("request");
var parseString = require('xml2js').parseString;

exports.findPvp = function (req, res) {
    var from = req.query.from.split(',');
    var maxJumps = req.query.maxJumps;

    if (!maxJumps)
    {
        maxJumps = 10;
    }

    getJson("https://api.eveonline.com/map/Kills.xml.aspx", function(kills){
        getJson("https://api.eveonline.com/map/Jumps.xml.aspx", function(jumps){
            var results = {};
            _.forEach(from, function(f){
                db.serialize(function() {
                    db.get("SELECT solarSystemId FROM mapSolarSystems WHERE solarSystemName = ?", f, function(err, row)
                    {
                        getStatisticsForSolarSystem(row.solarSystemID, kills, jumps, maxJumps, function(result){
                            res.json(result);
                        })
                    });
                });
            });
        });
    });
};


function getStatisticsForSolarSystem(solarSystemID, kills, jumps, maxJumps, cb) {
    for (var i = 0; i < maxJumps; i++) {
        db.all("SELECT toSolarSystemID FROM mapSolarSystemJumps WHERE fromSolarSystemID = ?", solarSystemID , function(err, jumpsOut)
        {
            var result = _.map(jumpsOut, function(j)
            {
                console.log(j);
                return _.filter(kills, function(k){
                    return k.solarSystemID == j.toSolarSystemID;
                });

            });
        });
    }
}


function getJson(url, cb){
    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            parseString(response.body, function(err, ks)
            {
                cb(_.map(ks.eveapi.result[0].rowset[0].row, function(k){
                    return k.$;
                }));
            });
        }
    });
}