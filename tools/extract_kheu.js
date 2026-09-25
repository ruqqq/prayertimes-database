// Brunei prayer times from the Ministry of Religious Affairs (KHEU/MORA),
// written to data/BN/<code>/<year>/<month>.json.
//
// Two official sources, because neither is complete on its own:
//   1. The printed Taqwim PDF (e.g. "TAQWIM 2026 ©PDI2025.pdf", linked from
//      https://www.mora.gov.bn/SitePages/WaktuSembahyang.aspx). This is the
//      authority. pdftotext (poppler) reads almost every day; a handful of rows
//      next to the month labels break across lines and are not recovered.
//   2. The "Waktu Sembahyang" SharePoint list behind the same page. It is typed
//      in by hand: in 2026 it had malformed times ("741", "7..52"), times in the
//      wrong half of the day, and dates entered twice with different values.
//      It only fills the days the PDF does not yield, and only when it holds a
//      single readable row for that day.
// Every disagreement and every day taken from the list is printed; the
// validator then checks the result (order, ranges, day-to-day steps).
//
// KHEU's note: Belait adds 3 minutes and Tutong 1 minute; Brunei-Muara and
// Temburong use the table as printed. Imsak and Doha are dropped: the app
// carries six times.
//
// Usage (from tools/): node extract_kheu.js <year> <path-to-taqwim.pdf>
// then: node generate_concat_data.js
var fs = require('fs');
var execFileSync = require('child_process').execFileSync;

var LIST_URL = "https://www.mora.gov.bn/_api/web/lists/getbytitle('Waktu%20Sembahyang')/items";
var LIST_FIELDS = ['Suboh', 'Syuruk', 'Zohor', 'Asar', 'Maghrib', 'Isyak'];
var SOURCE_ID = 3;

var ZONES = [
  { code: 'BRN01', offsetMinutes: 0 }, // Brunei-Muara, Temburong
  { code: 'BRN02', offsetMinutes: 1 }, // Tutong
  { code: 'BRN03', offsetMinutes: 3 }, // Belait
];

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function key(year, month, date) {
  return year + '-' + month + '-' + date;
}

// "4.52", "12.13", "3.22" (12-hour, no am/pm) to minutes after local midnight,
// or null if it cannot be read.
function toMinutes(text, prayerIndex) {
  var match = /^\s*(\d{1,2})[.:](\d{2})\s*$/.exec(text || '');
  if (!match) return null;
  var hour = parseInt(match[1], 10);
  var minute = parseInt(match[2], 10);
  if (hour > 12 || minute > 59) return null;
  // Subuh and Syuruk are mornings; Zohor sits around noon (11.xx or 12.xx);
  // Asar, Maghrib and Isyak are afternoons and evenings.
  if (prayerIndex === 2) {
    if (hour < 10) hour += 12;
  } else if (prayerIndex > 2 && hour < 12) {
    hour += 12;
  }
  return hour * 60 + minute;
}

function readTimes(texts) {
  var minutes = texts.map(toMinutes);
  return minutes.indexOf(null) === -1 ? minutes : null;
}

function clock(minutes) {
  return Math.floor(minutes / 60) + ':' + String(minutes % 60).padStart(2, '0');
}

// The PDF: one timetable block per month, each introduced by "Waktu Sembahyang
// dan Imsak". A row is "<day> <weekday> [hijri day] Imsak Suboh Syuruk Doha
// Zohor Asar Maghrib Isyak"; two columns share each line.
function readPdf(year, pdfPath) {
  var text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  // Hijri digits are set in a symbol font that comes out as private-use characters.
  text = text.replace(/[-]/g, ' ');
  var blocks = text.split('Waktu Sembahyang dan Imsak').slice(1, 13);
  if (blocks.length !== 12) throw new Error('Expected 12 month blocks in the PDF, found ' + blocks.length);

  var row = /(?<![\d.])(\d{1,2})\s+(?:Isnin|Selasa|Rabu|Khamis|Jumaat|Sabtu|Ahad)\s+(?:\d{1,2}\s+)?((?:\d{1,2}\.\d{2}\s+){7}\d{1,2}\.\d{2})/g;
  var days = {};
  blocks.forEach(function (block, i) {
    var month = i + 1;
    var match;
    while ((match = row.exec(block))) {
      var date = parseInt(match[1], 10);
      if (date > daysInMonth(year, month)) continue;
      var all = match[2].trim().split(/\s+/);
      // Drop Imsak (0) and Doha (3).
      var minutes = readTimes([all[1], all[2], all[4], all[5], all[6], all[7]]);
      if (minutes) days[key(year, month, date)] = minutes;
    }
  });
  return days;
}

async function readList(year) {
  var query = {
    $filter: "(Date ge datetime'" + (year - 1) + "-12-31T16:00:00Z') and (Date lt datetime'" + year + "-12-31T16:00:00Z')",
    $select: 'Date,' + LIST_FIELDS.join(','),
    $orderby: 'Date',
    $top: '500',
  };
  var url = LIST_URL + '?' + Object.keys(query).map(function (k) {
    return k + '=' + encodeURIComponent(query[k]);
  }).join('&');

  var rows = [];
  while (url) {
    var response = await fetch(url, { headers: { Accept: 'application/json;odata=nometadata' } });
    if (!response.ok) throw new Error('KHEU answered ' + response.status);
    var body = await response.json();
    rows = rows.concat(body.value);
    url = body['odata.nextLink'] || null; // already encoded
  }

  // Dates are stored as UTC 16:00 of the day before: local (UTC+8) midnight.
  var days = {};
  for (var r of rows) {
    var local = new Date(new Date(r.Date).getTime() + 8 * 3600 * 1000);
    var k = key(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate());
    days[k] = days[k] || [];
    days[k].push({ raw: LIST_FIELDS.map(function (f) { return r[f]; }), minutes: readTimes(LIST_FIELDS.map(function (f) { return r[f]; })) });
  }
  return days;
}

function toInstant(year, month, date, minutes) {
  var midnightUtc = Date.UTC(year, month - 1, date) - 8 * 3600 * 1000;
  return new Date(midnightUtc + minutes * 60 * 1000).toISOString();
}

async function main() {
  var year = parseInt(process.argv[2], 10);
  var pdfPath = process.argv[3];
  if (!year || !pdfPath) throw new Error('Usage: node extract_kheu.js <year> <path-to-taqwim.pdf>');

  var pdf = readPdf(year, pdfPath);
  var list = await readList(year);
  var chosen = {};
  var problems = [];

  for (var month = 1; month <= 12; month++) {
    for (var date = 1; date <= daysInMonth(year, month); date++) {
      var k = key(year, month, date);
      var rows = list[k] || [];
      if (pdf[k]) {
        chosen[k] = pdf[k];
        rows.forEach(function (row) {
          if (!row.minutes || row.minutes.join() !== pdf[k].join()) {
            console.warn('List disagrees on ' + k + ': ' + row.raw.join(' ') + ' (PDF ' + pdf[k].map(clock).join(' ') + ')');
          }
        });
        continue;
      }
      var readable = rows.filter(function (row) { return row.minutes; });
      if (rows.length === 1 && readable.length === 1) {
        chosen[k] = readable[0].minutes;
        console.warn('From the list (not in the parsed PDF): ' + k + ' ' + readable[0].raw.join(' '));
      } else {
        problems.push(k + ': ' + (rows.length ? rows.map(function (row) { return row.raw.join(' '); }).join(' | ') : 'no row'));
      }
    }
  }

  if (problems.length) {
    throw new Error('Days neither source settles; read them off the PDF by hand:\n  ' + problems.join('\n  '));
  }

  var now = new Date().toISOString();
  for (var zone of ZONES) {
    var dir = '../data/BN/' + zone.code + '/' + year;
    fs.mkdirSync(dir, { recursive: true });
    for (var m = 1; m <= 12; m++) {
      var days = [];
      for (var d = 1; d <= daysInMonth(year, m); d++) {
        days.push({
          date: d,
          month: m,
          year: year,
          localityCode: 'BN-' + zone.code,
          source_id: SOURCE_ID,
          times: chosen[key(year, m, d)].map(function (min) { return toInstant(year, m, d, min + zone.offsetMinutes); }),
          updated: now,
        });
      }
      fs.writeFileSync(dir + '/' + m + '.json', JSON.stringify(days, null, 4));
    }
  }
  console.log('Wrote ' + year + ' for ' + ZONES.map(function (z) { return z.code; }).join(', ') +
    ' (' + Object.keys(pdf).length + ' days from the PDF, ' + (Object.keys(chosen).length - Object.keys(pdf).length) + ' from the list)');
}

main().catch(function (e) {
  console.error(e.message || e);
  process.exit(1);
});
