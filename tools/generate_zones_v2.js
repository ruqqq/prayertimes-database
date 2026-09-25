// Builds data/zones-v2.json: every zone in data/zones.json with an explicit
// `country`, plus the zones of countries that app versions reading zones.json
// must never see (Brunei so far, from sources/zones_bn.json).
//
// zones.json stays as it is for installed apps, which assume every state
// other than "Singapore" is Malaysian; zones-v2.json is what newer apps read.
// Edit zones.json (SG/MY) or the sources/zones_<country>.json files, then run
// this from tools/: node generate_zones_v2.js
var fs = require('fs');

var EXTRA = [{ country: 'BN', file: '../sources/zones_bn.json' }];

function read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

var legacy = read('../data/zones.json');
var output = {};

// The same rule installed apps apply to zones.json.
for (var state of Object.keys(legacy)) {
  output[state] = legacy[state].map(function (zone) {
    return Object.assign({}, zone, { country: state === 'Singapore' ? 'SG' : 'MY' });
  });
}

for (var extra of EXTRA) {
  var states = read(extra.file);
  for (var s of Object.keys(states)) {
    if (output[s]) throw new Error('State "' + s + '" from ' + extra.file + ' already exists');
    output[s] = states[s].map(function (zone) {
      return Object.assign({}, zone, { country: extra.country });
    });
  }
}

fs.writeFileSync('../data/zones-v2.json', JSON.stringify(output, null, 4));
console.log('Wrote data/zones-v2.json with ' + Object.keys(output).length + ' states');
