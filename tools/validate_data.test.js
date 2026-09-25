const fs = require("fs");

const currentYear = new Date().getFullYear();

// Countries whose data starts later than the previous year; earlier years are
// not expected to exist for them.
const FIRST_YEAR = { BN: 2026 };

// Local-time window (minutes after midnight, UTC+8) each of the six times must
// fall in, across Singapore, Malaysia (Perlis to Sabah) and Brunei.
const WINDOWS = [
    [4 * 60, 6 * 60 + 45],        // Subuh
    [5 * 60 + 30, 7 * 60 + 45],   // Syuruk
    [11 * 60 + 45, 13 * 60 + 45], // Zohor
    [14 * 60 + 30, 17 * 60],      // Asar
    [17 * 60 + 45, 19 * 60 + 50], // Maghrib
    [19 * 60, 21 * 60],           // Isyak
];

// Largest change of any one time from one day to the next. Real timetables move
// a minute or two; a bigger step is a typo or a row filed under the wrong date.
const MAX_DAILY_STEP_MINUTES = 3;

// Published data that fails the value checks, found when they were added
// (2026-09-25). Listed so the checks guard everything else; remove an entry
// once its data is re-fetched and passes.
const KNOWN_BAD = {
    "MY-NGS01-2025": "Asar, Maghrib and Isyak 12 hours early, 8 Oct to 27 Nov",
    "MY-NGS02-2025": "Asar, Maghrib and Isyak 12 hours early, 12 Oct to 23 Nov",
    "MY-PLS01-2025": "Subuh 12 hours late on 1 Mar",
    "MY-KDH07-2025": "Maghrib jumps 6 min on 27 Jun and 26 Jul; unverified against JAKIM",
    "MY-SBH06-2026": "Maghrib jumps 8 min on 1 Dec; unverified against JAKIM",
};

const zonesV2 = JSON.parse(fs.readFileSync("./data/zones-v2.json").toString());
const legacyZones = JSON.parse(fs.readFileSync("./data/zones.json").toString());

describe("zones", () => {
    it("zones-v2 gives every zone a country", () => {
        for (const state of Object.keys(zonesV2)) {
            zonesV2[state].forEach(zone => expect(["SG", "MY", "BN"]).toContain(zone.country));
        }
    });

    // Installed apps read zones.json and treat every state other than
    // "Singapore" as Malaysian, so it must hold exactly the SG/MY zones.
    it("zones.json is zones-v2 without the newer countries", () => {
        const expected = {};
        for (const state of Object.keys(zonesV2)) {
            const zones = zonesV2[state].filter(zone => zone.country === "SG" || zone.country === "MY");
            if (zones.length) {
                expected[state] = zones.map(zone => {
                    const copy = Object.assign({}, zone);
                    delete copy.country;
                    return copy;
                });
            }
        }
        expect(legacyZones).toEqual(expected);
    });
});

describe.each([
  [currentYear],
  [currentYear-1],
])('Validate data', (year) => {
    for (let k of Object.keys(zonesV2)) {
        const state = zonesV2[k];
        state.forEach(zone => {
            if (k === "Denpasar") return;
            if (FIRST_YEAR[zone.country] && year < FIRST_YEAR[zone.country]) return;

            describe(`${k} ${zone.code}`, () => {
                const data = getPrayerTimes(zone.country, zone.code, year);
                const localityCode = `${zone.country}-${zone.code}`;

                it("has 12 months", () => assertHas12MonthsOfData(data));
                it("has valid 12 months", () => assertHasValid12Months(data));
                it("has valid days in months", () => assertHasValidDaysInMonth(data));
                it("has valid data in days", () => assertHasValidDataInDays(data, year, localityCode));
                const knownBad = KNOWN_BAD[`${localityCode}-${year}`];
                const valueCheck = knownBad ? it.skip : it;
                const suffix = knownBad ? ` (known bad: ${knownBad})` : "";
                valueCheck("has times in order and in range" + suffix, () => assertTimesInOrderAndRange(data));
                valueCheck("moves by a few minutes a day" + suffix, () => assertSmallDailySteps(data));
            });
        });
    }
});

function getPrayerTimes(countryCode, zone, year) {
    return JSON.parse(fs.readFileSync(`./data/${countryCode}/${zone}/${year}.json`).toString());
}

function assertHas12MonthsOfData(data) {
    expect(data.length).toBe(12);
}

function assertHasValid12Months(data) {
    data.forEach((monthData, i) => {
        monthData.forEach(dayData => {
           expect(dayData.month).toBe(i + 1);
       });
    });
}

function assertHasValidDaysInMonth(data) {
    data.forEach(monthData => {
        const daysInMonth = new Date(monthData[0].year, monthData[0].month, 0).getDate();
        expect(monthData.length).toEqual(daysInMonth);

        monthData.forEach((dayData, i) => {
            expect(dayData.date).toBe(i + 1);
        });
    });
}

function assertHasValidDataInDays(data, year, localityCode) {
    data.forEach(monthData => {
        monthData.forEach((dayData, i) => {
            expect(dayData.year).toBe(year);
            expect(dayData.localityCode).toBe(localityCode);
            expect(dayData.times.length).toBe(6);
            expect(dayData.date).toBe(i + 1);
        });
    });
}

// Minutes after local (UTC+8) midnight of the day the time belongs to.
function localMinutes(dayData, iso) {
    const midnightUtc = Date.UTC(dayData.year, dayData.month - 1, dayData.date) - 8 * 3600 * 1000;
    return (new Date(iso).getTime() - midnightUtc) / 60000;
}

function label(dayData) {
    return `${dayData.year}-${dayData.month}-${dayData.date}`;
}

function assertTimesInOrderAndRange(data) {
    const problems = [];
    data.forEach(monthData => monthData.forEach(dayData => {
        const minutes = dayData.times.map(t => localMinutes(dayData, t));
        minutes.forEach((m, i) => {
            if (Number.isNaN(m)) problems.push(`${label(dayData)} time ${i} unreadable`);
            else if (m < WINDOWS[i][0] || m > WINDOWS[i][1]) problems.push(`${label(dayData)} time ${i} out of range`);
            if (i > 0 && !(m > minutes[i - 1])) problems.push(`${label(dayData)} time ${i} not after time ${i - 1}`);
        });
    }));
    expect(problems).toEqual([]);
}

function assertSmallDailySteps(data) {
    const problems = [];
    const days = [].concat(...data);
    for (let d = 1; d < days.length; d++) {
        const before = days[d - 1].times.map(t => localMinutes(days[d - 1], t));
        const after = days[d].times.map(t => localMinutes(days[d], t));
        after.forEach((m, i) => {
            const step = Math.abs(m - before[i]);
            if (step > MAX_DAILY_STEP_MINUTES) problems.push(`${label(days[d])} time ${i} moved ${step} min`);
        });
    }
    expect(problems).toEqual([]);
}
