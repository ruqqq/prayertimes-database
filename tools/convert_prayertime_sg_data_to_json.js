var fs = require('fs');
var parse = require('csv-parse/lib/sync');

var contents = fs.readFileSync('../sources/prayertime_sg_28-12-16_2-44 PM.csv', 'utf8');
var parsed = parse(contents, {delimiter: ',', columns: true});
var output = {};

// Iterate the parsed CSV and construct our JSON data
for (var item of parsed) {
  var iso8601 = item['year'] + '-' + (item['month'] < 10 ? '0' + item['month'] : item['month']) + '-' + (item['day'] < 10 ? '0' + item['day'] : item['day']) + 'T' + item['time'] + '+08:00';
  var time = new Date(iso8601);
  
  if (!output[parseInt(item['year'])]) {
    output[parseInt(item['year'])] = {};
  }
  if (!output[parseInt(item['year'])][parseInt(item['month'])]) {
    output[parseInt(item['year'])][parseInt(item['month'])] = {};
  }
  if (!output[parseInt(item['year'])][parseInt(item['month'])][parseInt(item['day'])]) {
    output[parseInt(item['year'])][parseInt(item['month'])][parseInt(item['day'])] = {
      date: parseInt(item['day']),
      month: parseInt(item['month']),
      year: parseInt(item['year']),
      localityCode: 'SG-1',
      source_id: 0,
      times: {},
      updated: new Date(item['updated']).toISOString()
    };
  } else {
    var dayMeta = output[parseInt(item['year'])][parseInt(item['month'])][parseInt(item['day'])];
    if (new Date(dayMeta['updated']).getTime() < new Date(item['updated']).getTime()) {
      dayMeta['updated'] = new Date(item['updated']).toISOString();
    }
  }

  output[parseInt(item['year'])][parseInt(item['month'])][parseInt(item['day'])]['times'][parseInt(item['prayer_id'])] = time.toISOString();
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

  if (!fs.existsSync('../data/SG/1/' + year)) {
    fs.mkdirSync('../data/SG/1/' + year);
  }
  for (var month of Object.keys(yearItem)) {
    var monthItem = output[year][month];
    fs.writeFile('../data/SG/1/' + year + '/' + (month < 10 ? '0' + month : month) + '.json', JSON.stringify(monthItem, null, 4));
  }
}