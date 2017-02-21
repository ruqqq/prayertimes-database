// Data acquired from: https://raw.githubusercontent.com/MalaysiaPrayerTimes/provider-muis/master/src/Mpt/Providers/Muis/Resources/2017.csv
var fs = require('fs');
var parse = require('csv-parse/lib/sync');

function parseTime(day, month, year, time, prayer_id) {
  var timeSplit = time.split(' ');
  var timeH = parseInt(timeSplit[0].trim());
  var timeM = parseInt(timeSplit[1].trim());
  if (prayer_id > 1) {
    if (timeH < 12) {
      timeH += 12;
    }
  }
  var iso8601 = year + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day) + 'T' + (timeH < 10 ? '0' + timeH : timeH) + ':' + (timeM < 10 ? '0' + timeM : timeM) + ':00' + '+08:00';

  return new Date(iso8601);
}

var contents = fs.readFileSync('../sources/mpt_muis_provider_2017.csv', 'utf8');
var parsed = parse(contents, {delimiter: ','});
var output = {};

// Iterate the parsed CSV and construct our JSON data
for (var item of parsed) {
  var date = item[0].split('/');
  var year = parseInt(date[2]);
  var month = parseInt(date[1]);
  var day = parseInt(date[0]);
  
  if (!output[year]) {
    output[year] = {};
  }
  if (!output[year][month]) {
    output[year][month] = {};
  }

  var times = [];
  for (var i = 0; i < 6; i++) {
    times.push(parseTime(day, month, year, item[i + 2], i).toISOString());
  }

  output[year][month][day] = {
    date: day,
    month: month,
    year: year,
    localityCode: 'SG-1',
    source_id: 0,
    times: times,
    updated: new Date().toISOString()
  };
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

// Save our datas (in months folder)
if (!fs.existsSync('../data/SG')) {
    fs.mkdirSync('../data/SG');
}
for (var year of Object.keys(output)) {
  var yearItem = output[year];

  if (!fs.existsSync('../data/SG/1')) {
    fs.mkdirSync('../data/SG/1');
  }

  if (!fs.existsSync('../data/SG/1/' + year)) {
    fs.mkdirSync('../data/SG/1/' + year);
  }
  for (var month of Object.keys(yearItem)) {
    var monthItem = output[year][month];
    fs.writeFile('../data/SG/1/' + year + '/' + (month+1) + '.json', JSON.stringify(monthItem, null, 4));
  }
}