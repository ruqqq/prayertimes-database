var fs = require('fs');

var calendarData = fs.readFileSync('../sources/Islamic Calendar 2017.txt', 'utf8');
var reg = /[0-9]+\n([a-zA-z])+/g;
var matches = calendarData.match(reg);

// console.log(matches);
var calendar = [];
var month = [];
var curMonth = 0;
var hijriYear = 1438;

var firstDate = new Date('1 January 2017');

var counter = 2;
var totalDays = 0;
for (match of matches) {
  var matchSplit = match.split('\n');
  var date = parseInt(matchSplit[0]);

  if (date == 1) counter = 1;
  else if (date - counter != 0) continue;

  if (firstDate.getMonth() != curMonth) {
    curMonth = firstDate.getMonth();
    calendar.push(month);
    month = [];
    // console.log('---');
  }

  if (matchSplit[1] == 'Muharram' && hijriYear != 1439) {
    hijriYear++;
  }

  // console.log(firstDate.getMonth(), curMonth, date, matchSplit[1]);
  month.push({hijriDate: date, hijriMonth: matchSplit[1], hijriYear: hijriYear, date: firstDate.getDate(), month: firstDate.getMonth() + 1, year: firstDate.getFullYear(), localityCode: 'SG-1', source_id: 0});

  firstDate.setDate(firstDate.getDate() + 1);
  counter++;
  totalDays++;

  if (totalDays == 365) {
    calendar.push(month);
  }
}

// console.log(calendar);
console.log(totalDays);

// Save our datas (in months folder)
if (!fs.existsSync('../hijri/2017')) {
    fs.mkdirSync('../hijri/2017');
}
fs.writeFile('../hijri/2017/SG-1.json', JSON.stringify(calendar, null, 4));
