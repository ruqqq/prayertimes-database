var fs = require('fs');
var parse = require('csv-parse/lib/sync');

var contents = fs.readFileSync('../sources/tabula_calendar_2026.csv', 'utf8');
var parsed = parse(contents, {delimiter: ','});
var output = [];

var hijriYear = 1447;
var hijriMonths = ["Muharram", "Safar", "Rabiulawal", "Rabiulakhir", "Jamadilawal", "Jamadilakhir", "Rejab", "Syaaban", "Ramadan", "Syawal", "Zulkaedah", "Zulhijjah"];
var gregorianyear = 2026;
var gregorianMonthIndex = -1;
var currentMonthArray = null;

var i=0;

// Ensure CSV is already cleaned. Refer to tabula_calendar_2026 as example.
// Remove all empty rows. Remove all Islamic events rows. Only 3 rows per month block should remain: Gregorian dates, Hijri dates, Hijri months.
// Months are auto detected upon encountering Gregorian date "1".

while(i < parsed.length) {

  var calendarRow = parsed[i];
  var indexIncrement = 3;

  for (var j=0; j<calendarRow.length; j++) {

    var calendarItem = calendarRow[j];
    var gregDate = parseInt(calendarItem);

    if (isNaN(gregDate)) { // Skip Columns without Gregorian Date
      continue;
    }

    if (gregDate === 1) {
      gregorianMonthIndex += 1;
      if (currentMonthArray !== null) {
        output.push(currentMonthArray);
      }
      currentMonthArray = [];
    }

    var hijriDateText = parsed[i+1][j];
    var hijriDate = parseInt(hijriDateText);
    var hijriMonthText = parsed[i+2][j].trim();

    var hijriMonth = hijriMonths.indexOf(hijriMonthText) + 1;
    // console.log(hijriMonthText, hijriMonth);

    if (hijriMonth === 1 && hijriDate === 1) {
      hijriYear += 1;
    }

    console.log(gregDate, gregorianMonthIndex+1, hijriDate, hijriMonthText, hijriYear);

    currentMonthArray.push({
      "hijriDate": hijriDate,
      "hijriMonth": hijriMonth,
      "hijriYear": hijriYear,
      "date": gregDate,
      "month": gregorianMonthIndex+1,
      "year": gregorianyear,
      "localityCode": "SG-1",
      "source_id": 1
    });
  }

  i+=indexIncrement;
}

if (currentMonthArray !== null) {
  output.push(currentMonthArray);
}

// console.log(JSON.stringify(output, null, 2));
console.log("Total Months:", output.length);

const filename = `../hijri/${gregorianyear}/SG-1.json`;

mkdirSyncRecursive(`../hijri/${gregorianyear}`);

fs.writeFile(filename, JSON.stringify(output, null, 4), (err) => {
  // throws an error, you could also catch it here
  if (err) throw err;

  // success case, the file was saved
  console.log(filename + ' saved!');
});

function mkdirSyncRecursive(directory) {
  var path = directory.replace(/\/$/, '').split('/');

  for (var i = 1; i <= path.length; i++) {
    var segment = path.slice(0, i).join('/');
    !fs.existsSync(segment) ? fs.mkdirSync(segment) : null ;
  }
}