const request = require('request-promise-native');
const cheerio = require('cheerio');
const moment = require('moment');
const fs = require('fs');

async function fetchZones() {
  const body = await request('https://www.e-solat.gov.my/index.php?siteId=24&pageId=24');
  const $ = cheerio.load(body);

  const states = [];
  const zones = {};

  $('#inputZone optgroup').each((i, el) => {
    const state = $(el).attr('label').trim();
    states.push(state);

    zones[state] = [];

    $(el).find('.hs').each((i, el) => {
      const z = $(el);
      const code = z.attr('value');
      const cities = z.text()
          .replace(`${code} - `, '')
          .replace(' dan ', ', ');

      const citiesSplit = cities.split(', ');
      citiesSplit.forEach((city) => {
        // Manual fix
        if (city === 'Johor Bharu') {
          city = 'Johor Bahru';
        }

        zones[state].push({
          code: code.trim(),
          state: state.trim(),
          city: city.trim(),
        });
      });
    });
  });

  fs.writeFile('../sources/jakim_esolat_states.json', JSON.stringify(states, null, 4), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('states saved!');
  });

  console.log(zones);

  fs.writeFile('../sources/jakim_esolat_zones.json', JSON.stringify(zones, null, 4), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('zones saved!');
  });
}

function getPrayertimes(year) {
  year = parseInt(year);

  fs.readFile('../sources/jakim_esolat_zones.json', async (err, data) => {
    const zonesJSON = JSON.parse(data);

    let fetchedCodes = [];

    for (let state in zonesJSON) {
      for (let cityData of zonesJSON[state]) {
        if (fetchedCodes.indexOf(cityData.code) > -1) {
          continue;
        }

        const prayertimesCityJSONPath = `../sources/jakim_esolat_prayertimes_${cityData.code}.json`;
        if (fs.existsSync(prayertimesCityJSONPath)) {
          continue;
        }

        let prayertimesMonths = [];

        try {
          const body = await request.post({
            url: `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=duration&zone=${cityData.code}`,
            form: {
              datestart: `${year}-01-01`,
              dateend: `${year}-12-31`,
            },
            json: true,
          });

          let prayertimesDays = [];

          for (let item of body.prayerTime) {
            const dateSplit = item.date.split('-');
            const momentDate = moment().set({
              date: dateSplit[0],
              month: dateSplit[1],
              year: dateSplit[2],
            });

            const date = momentDate.get('date');
            const month = momentDate.get('month') + 1;

            prayertimesDays.push({
              date: date,
              month: month,
              year: year,
              localityCode: `MY-${cityData.code}`,
              source_id: 1,
              times: [
                timeStrToMoment(date, month, year, item.fajr),
                timeStrToMoment(date, month, year, item.syuruk),
                timeStrToMoment(date, month, year, item.dhuhr),
                timeStrToMoment(date, month, year, item.asr),
                timeStrToMoment(date, month, year, item.maghrib),
                timeStrToMoment(date, month, year, item.isha),
              ],
              updated: new Date(),
            });
          }

          prayertimesMonths.push(prayertimesDays);
        } catch (err) {
          console.error(err);
          return;
        }

        fs.writeFile(prayertimesCityJSONPath, JSON.stringify(prayertimesMonths, null, 4), (err) => {
          // throws an error, you could also catch it here
          if (err) throw err;

          // success case, the file was saved
          console.log(`prayertimes ${cityData.code} saved!`);
        });

        fetchedCodes.push(cityData.code);

        await new Promise((resolve) => setTimeout(resolve, Math.random() * 5000));
      }
    }
  });
}


function publishToData() {
  fs.readFile('../sources/jakim_esolat_zones.json', async (err, data) => {
    const zonesJSON = JSON.parse(data);

    let fetchedCodes = [];

    for (let state in zonesJSON) {
      for (let cityData of zonesJSON[state]) {
        if (fetchedCodes.indexOf(cityData.code) > -1) {
          continue;
        }

        fs.readFile(`../sources/jakim_esolat_prayertimes_${cityData.code}.json`, (err, data) => {
          if (err) throw err;

          let parsedJSON = JSON.parse(data);
          const year = parsedJSON[0][0].year;
          const dirname = `../data/MY/${cityData.code}/${year}`;

          for (let month in parsedJSON) {
            const filename = `${dirname}/${parseInt(month)+1}.json`;

            if (!fs.existsSync(dirname)) {
                mkdirSyncRecursive(dirname);
            }

            fs.writeFile(filename, JSON.stringify(parsedJSON[month], null, 4), (err) => {  
              // throws an error, you could also catch it here
              if (err) throw err;

              // success case, the file was saved
              console.log(filename + ' saved!');
            });
          }

          let filename = `${dirname}.json`;
          fs.writeFile(filename, JSON.stringify(parsedJSON, null, 4), (err) => {  
            // throws an error, you could also catch it here
            if (err) throw err;

            // success case, the file was saved
            console.log(filename + ' saved!');
          });

          filename = `../data/MY/${cityData.code}.json`;
          fs.writeFile(filename, JSON.stringify({[year]: parsedJSON}, null, 4), (err) => {  
            // throws an error, you could also catch it here
            if (err) throw err;

            // success case, the file was saved
            console.log(filename + ' saved!');
          });
        });

        fetchedCodes.push(cityData.code);
      }
    }
  });
}

function timeStrToMoment(date, month, year, time) {
  const m = moment().set({
    date: date,
    month: month - 1,
    year: year,
  });

  const timeSplit = time.split(':');
  m.set({
    hour: parseInt(timeSplit[0]),
    minute: parseInt(timeSplit[1]),
    second: 0,
    millisecond: 0,
  });

  return m;
}

function mkdirSyncRecursive(directory) {
    var path = directory.replace(/\/$/, '').split('/');

    for (var i = 1; i <= path.length; i++) {
        var segment = path.slice(0, i).join('/');
        !fs.existsSync(segment) ? fs.mkdirSync(segment) : null ;
    }
}

// fetchZones();
// getPrayertimes(2019);
publishToData();