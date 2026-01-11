/**
 * ================================================================================
 * SWIM TRACKER - API MODULE
 * ================================================================================
 * 
 * USA Swimming API interface and data dictionaries.
 * Handles all external data fetching and caching.
 */

// ================================================================================
// USA SWIMMING API DATA FETCHING
// ================================================================================

async function fetchSwimValues(bodyObj, type) {
    console.log("fetchSwimValues called with type:", type, "bodyObj:", bodyObj);
    let map = {
        swimmer:
            "https://usaswimming.sisense.com/api/datasources/Public Person Search/jaql",
        event: "https://usaswimming.sisense.com/api/datasources/USA Swimming Times Elasticube/jaql",
        meet: "https://usaswimming.sisense.com/api/datasources/Meets/jaql",
    };

    let url = map[type || "swimmer"];
    console.log("Making API call to:", url);

    let response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization:
                "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiNjY0YmE2NmE5M2ZiYTUwMDM4NWIyMWQwIiwiYXBpU2VjcmV0IjoiNDQ0YTE3NWQtM2I1OC03NDhhLTVlMGEtYTVhZDE2MmRmODJlIiwiYWxsb3dlZFRlbmFudHMiOlsiNjRhYzE5ZTEwZTkxNzgwMDFiYzM5YmVhIl0sInRlbmFudElkIjoiNjRhYzE5ZTEwZTkxNzgwMDFiYzM5YmVhIn0.izSIvaD2udKTs3QRngla1Aw23kZVyoq7Xh23AbPUw1M",
        },
        body: JSON.stringify(bodyObj),
    });

    if (!response.ok) {
        console.log(
            "API response not ok:",
            response.status,
            response.statusText,
        );
        return;
    }

    let data = await response.json();
    console.log("API response data structure:", {
        hasError: !!data.error,
        hasValues: !!data.values,
        hasHeaders: !!data.headers,
        valuesLength: data.values?.length || 0,
        headersLength: data.headers?.length || 0,
        headers: data.headers
    });

    if (data.error || !data.values) {
        console.log(
            "API returned error or no values:",
            data.error,
            !!data.values,
        );
        return;
    }

    if (!data.headers) {
        console.error("API response missing headers:", data);
        return;
    }

    let idx = {};
    for (let i = 0; i < data.headers.length; ++i) {
        idx[data.headers[i]] = i;
    }
    data.values.idx = idx;

    console.log("Created idx mapping:", idx);

    return data.values;
}

// ================================================================================
// DATA DICTIONARIES
// ================================================================================
// Note: ClubDictionary has been moved to club-dictionary.js

class MeetDictionary {
    #dict;
    constructor() {
        this.#dict = new Map();
        this.#dict.idx = { date: 0, name: 1 };
    }

    static async #load(meets) {
        let bodyObj = {
            metadata: [
                {
                    title: "meet",
                    dim: "[UsasSwimTime.MeetKey]",
                    datatype: "numeric",
                    filter: {
                        members: [...meets],
                    },
                },
                {
                    title: "date",
                    dim: "[SeasonCalendar.CalendarDate (Calendar)]",
                    datatype: "datetime",
                    level: "days",
                    sort: "asc",
                },
                {
                    title: "meetName",
                    dim: "[Meet.MeetName]",
                    datatype: "text",
                },
            ],
            count: meets.size * 5,
        };

        let data = await fetchSwimValues(bodyObj, "event");
        if (!data) {
            return;
        }
        let idx = data.idx;

        // only keep the first meet date as meet start date
        let result = [];
        for (let row of data) {
            let meet = row[idx.meet];
            if (meets.has(meet)) {
                meets.delete(meet);

                row[idx.date] = row[idx.date].substring(0, 10);
                result.push(row);
            }
        }
        result.idx = idx;

        return result;
    }

    static async #loadCached(meets) {
        let result = [];
        for (let meet of meets) {
            let key = "meet/" + meet;
            let data = await LocalCache.get(key, _10YearsInSec || (10 * 365 * 24 * 60 * 60));
            if (data) {
                let [date, meetName] = data;
                result.push([meet, date, meetName]);
                meets.delete(meet);
            }
        }

        if (meets.size == 0) {
            return result;
        }

        let data = await MeetDictionary.#load(meets);
        if (data) {
            let idx = data.idx;
            for (let row of data) {
                let meet = row[idx.meet];
                let date = row[idx.date];
                let meetName = row[idx.meetName];
                result.push([meet, date, meetName]);
                LocalCache.set("meet/" + meet, [date, meetName]);
            }
        }

        return result;
    }

    async loadMeets(meets) {
        let meetsToLoad = new Set();
        for (let meet of meets) {
            if (!this.#dict.has(meet)) {
                meetsToLoad.add(meet);
            }
        }

        let data = await MeetDictionary.#loadCached(meetsToLoad);
        if (data) {
            for (let [meet, date, meetName] of data) {
                this.#dict.set(meet, [date, meetName]);
            }
        }

        return this.#dict;
    }
}

class BirthdayDictionary {
    #dict;
    constructor() {
        this.#dict = new Map();
    }

    async load(pkey) {
        let data = this.#dict.get(pkey);
        if (data) {
            return data;
        }

        data = await LocalCache.get("bday/" + pkey, _10YearsInSec);
        if (data) {
            this.#dict.set(pkey, data);
            return data;
        }
    }

    calculate(pkey, events, meetDict, age) {
        // time, age, std, lsc, club, date, event, meet, gender
        // 0     1    2    3    4     5     6      7     8

        if (!events || !events.idx) {
            console.log(
                "BirthdayDictionary.calculate: events missing idx property",
            );
            return null;
        }

        let now = new Date();
        let nowYear = now.getUTCFullYear();
        let nowMonth = now.getUTCMonth();
        let nowDate = now.getUTCDate();
        let left = new Date(Date.UTC(1900, 0, 1));
        let right = new Date(Date.UTC(nowYear, nowMonth, nowDate));
        if (age) {
            right.setUTCFullYear(nowYear - age, nowMonth, nowDate);
            left.setUTCFullYear(nowYear - age - 1, nowMonth, nowDate + 1);
        }

        for (let row of events) {
            let meet = row[events.idx.meet];
            let meetDate = meetDict.get(meet)[meetDict.idx.date];
            let meetAge = row[events.idx.age];
            let d = new Date(meetDate);
            d.setUTCFullYear(
                d.getUTCFullYear() - meetAge,
                d.getUTCMonth(),
                d.getUTCDate(),
            );
            right = min(d, right);
            d = new Date(meetDate);
            d.setUTCFullYear(
                d.getUTCFullYear() - meetAge - 1,
                d.getUTCMonth(),
                d.getUTCDate() + 1,
            );
            left = max(d, left);
        }

        left = left.toJSON().substring(0, 10);
        right = right.toJSON().substring(0, 10);

        if (left > right) {
            console.error(
                "Invalid birthday:" + pkey + "  [" + left + " - " + right + "]",
            );
            right = left;
        }

        let range = [left, right];
        LocalCache.set("bday/" + pkey, range);
        this.#dict.set(pkey, range);

        return range;
    }

    static format(range) {
        if (!range) {
            return "";
        }

        let html = [];

        let [left, right] = range;
        left = left.replace(/-0/g, "-").replace(/-/g, "/");
        right = right.replace(/-0/g, "-").replace(/-/g, "/");

        html.push(left);
        if (left != right) {
            html.push(" - ");
            if (left.substring(0, 4) == right.substring(0, 4)) {
                right = right.substring(5);
            }
            html.push(right);
        }
        return html.join("");
    }
}

// ================================================================================
// GLOBAL INSTANCES
// ================================================================================

// ClubDictionary class is defined in club-dictionary.js (loaded before this file)
let _clubDictinary = new ClubDictinary();
let _meetDictinary = new MeetDictionary();
let _birthdayDictionary = new BirthdayDictionary();

// Export for global access
window._clubDictinary = _clubDictinary;
window._meetDictinary = _meetDictinary;
window._birthdayDictionary = _birthdayDictionary;
window.BirthdayDictionary = BirthdayDictionary;
window.fetchSwimValues = fetchSwimValues;
