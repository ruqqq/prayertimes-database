// Seeds hijri/umm-al-qura.json: the Gregorian date each Umm al-Qura Hijri month
// begins, which PrayerTime Pro uses for its Makkah and Madinah zones (their
// Hijri date, and the 120-minute Isha of Ramadan).
//
// The seed is Saudi Arabia's tabular Umm al-Qura calendar (ICU's
// islamic-umalqura). The start of Ramadan, Shawwal and Dhul Hijjah is then
// announced by the Saudi Supreme Court on moon sighting and can differ by a
// day: when it does, edit that month's date in hijri/umm-al-qura.json by hand
// (the validator checks every month stays 29 or 30 days). This script will not
// overwrite the file unless given --force, so those edits are not lost.
//
// Usage (from tools/): node generate_umm_al_qura_months.js [--force]
var fs = require('fs');

var FILE = '../hijri/umm-al-qura.json';
var FIRST_YEAR = 1445;
var LAST_YEAR = 1465;

if (fs.existsSync(FILE) && process.argv.indexOf('--force') === -1) {
  console.error(FILE + ' exists and may hold announced corrections; pass --force to regenerate it.');
  process.exit(1);
}

var format = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function hijri(date) {
  var parts = {};
  format.formatToParts(date).forEach(function (p) { parts[p.type] = parseInt(p.value, 10); });
  return parts;
}

var monthStarts = [];
for (var t = Date.UTC(2023, 5, 1); ; t += 86400000) {
  var date = new Date(t);
  var h = hijri(date);
  if (h.year > LAST_YEAR) break;
  if (h.year >= FIRST_YEAR && h.day === 1) {
    monthStarts.push([h.year, h.month, date.toISOString().slice(0, 10)]);
  }
}

// One month per line, so an announced correction is a one-line edit.
var rows = monthStarts.map(function (m) { return '    ' + JSON.stringify(m).replace(/,/g, ', '); });
fs.writeFileSync(FILE, '{\n' +
  '  "calendar": "umm-al-qura",\n' +
  '  "note": "Gregorian date each Hijri month begins. Seeded from the tabular Umm al-Qura calendar; ' +
  'edit a month when the Saudi Supreme Court announces a different start.",\n' +
  '  "monthStarts": [\n' + rows.join(',\n') + '\n  ]\n}\n');
console.log('Wrote ' + monthStarts.length + ' month starts (' + FIRST_YEAR + '-' + LAST_YEAR + ' AH)');
