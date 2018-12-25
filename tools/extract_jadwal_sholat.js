const request = require('request-promise-native');
const moment = require('moment');
const cheerio = require('cheerio');
const fs = require('fs');

let baseUrl = "https://jadwalsholat.org/adzan/monthly.php";

async function getPrayertimes(cityId, year) {
    const prayertimesMonths = [];

    for (var month = 1; month < 13; month++) {
        const body = await request(`${baseUrl}?id=${cityId}&m=${month}&y=${year}`);
        const $ = cheerio.load(body);

        const prayertimesDays = [];

        $('tr.table_dark, tr.table_light, tr.table_highlight').each((i, el) => {
            const tds = $(el).find('td');
            const date = parseInt($(tds.get(0)).text());

            prayertimesDays.push({
                date: date,
                month: month,
                year: year,
                localityCode: `ID-${cityId}`,
                source_id: 2,
                times: [
                    timeStrToMoment(date, month, year, $(tds.get(2)).text()),
                    timeStrToMoment(date, month, year, $(tds.get(3)).text()),
                    timeStrToMoment(date, month, year, $(tds.get(5)).text()),
                    timeStrToMoment(date, month, year, $(tds.get(6)).text()),
                    timeStrToMoment(date, month, year, $(tds.get(7)).text()),
                    timeStrToMoment(date, month, year, $(tds.get(8)).text()),
                ],
                updated: new Date(),
            });
        });

        prayertimesMonths.push(prayertimesDays);
    }

    fs.writeFile(`../sources/jadwal_sholat_prayertimes_${cityId}.json`, JSON.stringify(prayertimesMonths, null, 4), (err) => {
        // throws an error, you could also catch it here
        if (err) throw err;

        // success case, the file was saved
        console.log('prayertimes saved!');
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

function publishToData(stateId, cityId) {
    fs.readFile(`../sources/jadwal_sholat_prayertimes_${cityId}.json`, (err, data) => {
        if (err) throw err;

        let parsedJSON = JSON.parse(data);
        const year = parsedJSON[0][0].year;
        const dirname = `../data/ID/${stateId}${cityId}/${year}`;

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

        filename = `../data/ID/${stateId}${cityId}.json`;
        fs.writeFile(filename, JSON.stringify({[year]: parsedJSON}, null, 4), (err) => {
            // throws an error, you could also catch it here
            if (err) throw err;

            // success case, the file was saved
            console.log(filename + ' saved!');
        });
    });
}

function mkdirSyncRecursive(directory) {
    var path = directory.replace(/\/$/, '').split('/');

    for (var i = 1; i <= path.length; i++) {
        var segment = path.slice(0, i).join('/');
        !fs.existsSync(segment) ? fs.mkdirSync(segment) : null ;
    }
}


const countries = JSON.parse(fs.readFileSync('../data/countries.json'));
countries[2].states.forEach(async (state) => {
    if (state.code !== '51') {
        return;
    }
    console.log(state);

    const stateCode = parseInt(state.code);

    await getPrayertimes(66, 2019);
    publishToData(stateCode, 66);
});
