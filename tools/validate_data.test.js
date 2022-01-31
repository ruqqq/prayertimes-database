const fs = require("fs");

describe('Validate data', () => {
    const states = JSON.parse(fs.readFileSync("../data/zones.json").toString());
    for (let k of Object.keys(states)) {
        const state = states[k];
        state.forEach(zone => {
            describe(`${k} ${zone.code}`, () => {
                let data;
                let localityCode;

                if (k === "Singapore") {
                    data = getPrayerTimes("SG", "1", 2022);
                    localityCode = "SG-1";
                } else if (k === "Denpasar") {
                    // continue
                    return;
                } else {
                    data = getPrayerTimes("MY", zone.code, 2022);
                    localityCode = `MY-${zone.code}`;
                }

                it("has 12 months", () => assertHas12MonthsOfData(data));
                it("has valid 12 months", () => assertHasValid12Months(data));
                it("has valid days in months", () => assertHasValidDaysInMonth(data));
                it("has valid data in days", () => assertHasValidDataInDays(data, 2022, localityCode));
            });
        });
    }
});

function getPrayerTimes(countryCode, zone, year) {
    return JSON.parse(fs.readFileSync(`../data/${countryCode}/${zone}/${year}.json`).toString());
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
