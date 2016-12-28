var fs = require('fs');
var parse = require('csv-parse/lib/sync');

var contents = fs.readFileSync('../sources/prayertime_sg_hijri_29-12-16_7-27 AM.csv', 'utf8');
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
      hijriDate: parseInt(item['hijrah_day']),
      hijriMonth: parseInt(item['hijrah_month']),
      hijriYear: parseInt(item['hijrah_year']),
      date: parseInt(item['day']),
      month: parseInt(item['month']),
      year: parseInt(item['year']),
      localityCode: 'SG-1',
      source_id: 0
    };
  }
}

// Convert objects to array except for years
for (var year of Object.keys(output)) {
  var yearItem = output[year];

  for (var month of Object.keys(yearItem)) {
    var monthItem = output[year][month];

    var dayArr = Object.keys(monthItem).map(function (key) { return monthItem[key]; });
    output[year][month] = dayArr;
  }

  var monthArr = Object.keys(yearItem).map(function (key) { return yearItem[key]; });
  output[year] = monthArr;
}

// Save our datas (in months folder)
if (!fs.existsSync('../hijri/SG')) {
    fs.mkdirSync('../hijri/SG');
}
for (var year of Object.keys(output)) {
  var yearItem = output[year];

  if (!fs.existsSync('../hijri/' + year)) {
    fs.mkdirSync('../hijri/' + year);
  }
  fs.writeFile('../hijri/' + year + '/SG-1.json', JSON.stringify(yearItem, null, 4));
}