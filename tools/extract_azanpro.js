var request = require('request-promise-native');
var fs = require('fs');

function fetchZones() {
  request('http://api.azanpro.com/zone/zones.json', function (error, response, body) {
    if (error) {
      console.error('error:', error); // Print the error if one occurred
      return;
    }

    //console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    //console.log('body:', body); // Print the HTML for the Google homepage.
    let parsedJSON = JSON.parse(body);
    console.log(parsedJSON.states);

    fs.writeFile('../sources/azanpro_states.json', JSON.stringify(parsedJSON.states, null, 4), (err) => {  
      // throws an error, you could also catch it here
      if (err) throw err;

      // success case, the file was saved
      console.log('states saved!');
    });

    let zones = {};
    for (let z of parsedJSON.results) {
      if (!zones[z.negeri]) {
        zones[z.negeri] = [];
      }

      zones[z.negeri].push({
        code: z.zone,
        state: z.negeri,
        city: z.lokasi,
        lat: parseFloat(z.lat),
        lng: parseFloat(z.lng),
      });
    }

    console.log(zones);

    fs.writeFile('../sources/azanpro_zones.json', JSON.stringify(zones, null, 4), (err) => {  
      // throws an error, you could also catch it here
      if (err) throw err;

      // success case, the file was saved
      console.log('zones saved!');
    });
  });
}

function getPrayertimes(year) {
  fs.readFile('../sources/azanpro_zones.json', async (err, data) => {
    const zonesJSON = JSON.parse(data);

    let fetchedCodes = [];

    for (let state in zonesJSON) {
      for (let cityData of zonesJSON[state]) {
        if (fetchedCodes.indexOf(cityData.code) > -1) {
          continue;
        }

        let prayertimesMonths = [];

        for (let month = 1; month <= 12; month++) {
          try {
            const body = await request(`http://api.azanpro.com/times/month.json?zone=${cityData.code}&month=${month}&year=${year}`);
            
            let parsedJSON = JSON.parse(body);
            let prayertimesDays = [];

            for (let item of parsedJSON.prayer_times) {
              const dateSplit = item.date.split("-");
              const date = parseInt(dateSplit[0]);
              const month = parseInt(dateSplit[1]);
              const year = parseInt(dateSplit[2]);

              prayertimesDays.push({
                date: date,
                month: month,
                year: year,
                localityCode: `MY-${cityData.code}`,
                source_id: 1,
                times: [
                  new Date(item.subuh * 1000),
                  new Date(item.syuruk * 1000),
                  new Date(item.zohor * 1000),
                  new Date(item.asar * 1000),
                  new Date(item.maghrib * 1000),
                  new Date(item.isyak * 1000),
                ],
                updated: new Date(),
              });
            }

            prayertimesMonths.push(prayertimesDays);
          } catch (err) {
            console.error(err);
            return;
          }
        }

        fs.writeFile(`../sources/azanpro_prayertimes_${cityData.code}.json`, JSON.stringify(prayertimesMonths, null, 4), (err) => {  
          // throws an error, you could also catch it here
          if (err) throw err;

          // success case, the file was saved
          console.log('prayertimes saved!');
        });

        fetchedCodes.push(cityData.code);
      }
    }
  });
}


function publishToData() {
  fs.readFile('../sources/azanpro_zones.json', async (err, data) => {
    const zonesJSON = JSON.parse(data);

    let fetchedCodes = [];

    for (let state in zonesJSON) {
      for (let cityData of zonesJSON[state]) {
        if (fetchedCodes.indexOf(cityData.code) > -1) {
          continue;
        }

        fs.readFile(`../sources/azanpro_prayertimes_${cityData.code}.json`, (err, data) => {
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

function mkdirSyncRecursive(directory) {
    var path = directory.replace(/\/$/, '').split('/');

    for (var i = 1; i <= path.length; i++) {
        var segment = path.slice(0, i).join('/');
        !fs.existsSync(segment) ? fs.mkdirSync(segment) : null ;
    }
}

// fetchZones();
// getPrayertimes(2018);
publishToData();