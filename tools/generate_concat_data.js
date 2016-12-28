var fs = require('fs'),
    path = require('path');

function getDirectories(srcpath) {
  return fs.readdirSync(srcpath).filter(function(file) {
    return fs.statSync(path.join(srcpath, file)).isDirectory();
  });
}

function getFiles(srcpath) {
  return fs.readdirSync(srcpath).filter(function(file) {
    return !fs.statSync(path.join(srcpath, file)).isDirectory() && file.indexOf('.json') > -1;
  });
}

var output = {};

var countries = getDirectories('../data');
for (var country of countries) {
  var codes = getDirectories('../data/' + country);
  for (var code of codes) {
    var years = getDirectories('../data/' + country + '/' + code);
    for (var year of years) {
      if (!output[year]) {
        output[year] = {};
      }

      var files = getFiles('../data/' + country + '/' + code + '/' + year);
      for (var file of files) {
        var json = JSON.parse(fs.readFileSync('../data/' + country + '/' + code + '/' + year + '/' + file, 'utf8'));

        month = parseInt(file.replace('.json', ''));
        output[year][month] = json;
      }
    }
  }
}

// Convert objects to array except for years
for (var year of Object.keys(output)) {
  var yearItem = output[year];

  for (var month of Object.keys(yearItem)) {
    var monthItem = output[year][month];

    for (var day of Object.keys(monthItem)) {
      var dayItem = output[year][month][day];
      var timesArr = Object.keys(dayItem['times']).map(function (key) { return dayItem['times'][key]; });
      dayItem['times'] = timesArr;
    }

    var dayArr = Object.keys(monthItem).map(function (key) { return monthItem[key]; });
    output[year][month] = dayArr;
  }

  var monthArr = Object.keys(yearItem).map(function (key) { return yearItem[key]; });
  output[year] = monthArr;
}

// Save our datas
if (!fs.existsSync('../data/SG')) {
    fs.mkdirSync('../data/SG');
}
fs.writeFile('../data/SG/1.json', JSON.stringify(output, null, 4));
for (var year of Object.keys(output)) {
  var yearItem = output[year];

  if (!fs.existsSync('../data/SG/1')) {
    fs.mkdirSync('../data/SG/1');
  }
  fs.writeFile('../data/SG/1/' + year + '.json', JSON.stringify(yearItem, null, 4));
}