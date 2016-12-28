﷽

# Prayer Times Database
Flat file + JSON database to make prayer times data (location and timings) readily available/accessible on GitHub and open-source.

IMPORTANT: Refer to [LICENSE](https://raw.githubusercontent.com/ruqqq/prayertimes-database/master/LICENSE) for terms of use.

# Changelogs
**29/12/2016**
Fixed and regenerated 2017 data for 24h timings issue.
**28/12/2016**
Initial framework/tools/data commit using data from PrayerTime.sg (sourced out from MUIS PDFs). 2017 data parsed from existing work done by [MPT](https://github.com/MalaysiaPrayerTimes/provider-muis).

# How to Use
Minimally, the data set can be used by directly linking  [data.json](https://raw.githubusercontent.com/ruqqq/prayertimes-database/master/data.json) file in your web/app and do local parsing.

Otherwise, you can download the data onto your (web/mobile/desktop) app and do client-side processing and storing. (Hint: You are free to create syncing tool if you decide to keep a version of the data locally). Please refer to LICENSE for more info on restrictions on the usage of the data.

## Querying By ISO 3166-2 Codes
(TODO: Show examples)

### Date Format
Dates fields (and prayer timings) in the JSON file are in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format.

# How to Contribute

## Pull Request
Send pull requests to submit patches/updates/new data for prayer times. No programming needed, just basic text editing, file management and minimal Git skills. (TODO: Add manual for non-geeks)