var express = require('express');
var request = require('request');
var router = express.Router();
var funct = require('../handlers/functions.js');
var globs = require('../handlers/global.js');
/* Initial endpoint for starting the switch process
*  Generates a token and fetches the postcode data-template
*
*
* */
router.get('/', function(req, res, next) {

  funct.sendGET(globs.initurl, function(err, uri_result) {
      let uri_link = funct.getRelUriValue(uri_result.links, "/rels/domestic/switches /rels/bookmark");

      funct.sendGET(uri_link, function(err, template_result) {
          if (err) console.log("init error:" + err);
        res.send(JSON.stringify(template_result));
      });
  });

});

module.exports = router;
