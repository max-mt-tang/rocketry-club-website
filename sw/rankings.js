/**
 * ================================================================================
 * SWIM TRACKER - RANKINGS MODULE
 * ================================================================================
 * 
 * Ranking system for swimmer performance comparison.
 * Handles club, LSC, zone, and national rankings.
 */

// ================================================================================
// RANKING DATA LOADING
// ================================================================================

async function peekRank(key) {
    return await LocalCache.get("rank/" + key);
}

async function loadRank(key) {
    let values = await LocalCache.func("rank/" + key, async () => {
        let [genderStr, ageKey, event, zone, lsc, club] = decodeRankMapKey(key);

        let values;
        if (club) {
            values = await loadRankDataByClub(key);
        } else {
            values = await LoadRankDataAll(key);
            values = await filterByAge(values, ageKey);
        }

        // Check if values is valid before proceeding
        if (!values) {
                return null;
        }

        if (!Array.isArray(values)) {
            return null;
        }


        let idx = values.idx;

        // Check if idx is valid before processing
        if (!idx || idx.sortkey === undefined) {
            return null;
        }

        // remove sortkey from values and idx
        for (let row of values) {
            // shorten the date
            if (row && row[idx.date]) {
                row[idx.date] = row[idx.date].substring(0, 10);
            }

            if (row && idx.sortkey !== undefined) {
                row.splice(idx.sortkey, 1);
            }
        }
        for (let key in idx) {
            if (idx[key] > idx.sortkey) {
                idx[key] -= 1;
            }
        }
        delete idx.sortkey;

        // Ensure idx is attached to values array
        values.idx = idx;
        
        return values;
    });

    if (values) {
        // If values exist but missing idx, try to reconstruct it
        if (Array.isArray(values) && !values.idx && values.length > 0) {
            // Reconstruct idx based on expected ranking data structure
            values.idx = {
                name: 0,
                date: 1, 
                time: 2,
                eventcode: 3,
                club: 4,
                lsccode: 5,
                meet: 6,
                eventkey: 7,
                pkey: 8,
                age: 9
            };
        }
        
        return await postLoadRank(values);
    }
    
    return null;
}

async function postLoadRank(values) {
    if (!values || !Array.isArray(values)) {
        return {
            values: [],
            meetDict: new Map()
        };
    }

    if (!values.idx) {
        return {
            values: values,
            meetDict: new Map()
        };
    }

    if (!values.idx.meet) {
        return {
            values: values,
            meetDict: new Map()
        };
    }

    let idx = values.idx;

    // Check if timeToInt is available, if not skip deduplication for now
    if (!window.timeToInt) {
        values.idx = idx;
        let meets = new Set(
            values
                .filter(row => row && row[idx.meet])
                .map((row) => row[idx.meet])
        );

        // Wait for _meetDictinary to be available
        while (!window._meetDictinary) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return {
            values: values,
            meetDict: await _meetDictinary.loadMeets(meets),
        };
    }

    // Deduplicate swimmers - keep only the fastest time per swimmer (pkey)
    let seenSwimmers = new Map();
    let uniqueSwimmers = [];


    // Track specific swimmers for debugging
    const maxPkey = '1320806'; // Max Tang's pkey
    const rayPkey = '500281';  // Ray Tang's pkey

    for (let row of values) {
        if (!row || !row[idx.pkey] || !row[idx.time]) {
            continue;
        }

        let pkey = row[idx.pkey];
        let currentTime = window.timeToInt(row[idx.time]);
        let swimmerName = row[idx.name];

        // Debug specific swimmers
        if (pkey === maxPkey || pkey === rayPkey) {
        }

        // Skip if timeToInt returned invalid result
        if (isNaN(currentTime) || currentTime <= 0) {
            continue;
        }

        if (!seenSwimmers.has(pkey)) {
            // First time seeing this swimmer
            seenSwimmers.set(pkey, currentTime);
            uniqueSwimmers.push(row);

            if (pkey === maxPkey || pkey === rayPkey) {
            }
        } else {
            // We've seen this swimmer before, check if this time is faster
            let previousTime = seenSwimmers.get(pkey);

            if (pkey === maxPkey || pkey === rayPkey) {
            }

            if (currentTime < previousTime) {
                // This time is faster, replace the previous entry
                seenSwimmers.set(pkey, currentTime);
                // Find and replace the previous entry
                for (let i = 0; i < uniqueSwimmers.length; i++) {
                    if (uniqueSwimmers[i][idx.pkey] === pkey) {
                        uniqueSwimmers[i] = row;
                        if (pkey === maxPkey || pkey === rayPkey) {
                        }
                        break;
                    }
                }
            } else if (pkey === maxPkey || pkey === rayPkey) {
            }
        }
    }


    // Check if Max and Ray made it through deduplication
    const finalMax = uniqueSwimmers.find(row => row[idx.pkey] === maxPkey);
    const finalRay = uniqueSwimmers.find(row => row[idx.pkey] === rayPkey);

    // Sort by time (fastest first) and preserve idx
    uniqueSwimmers.sort((a, b) => {
        let timeA = window.timeToInt(a[idx.time]);
        let timeB = window.timeToInt(b[idx.time]);
        return timeA - timeB;
    });

    // Attach idx to the deduplicated array
    uniqueSwimmers.idx = idx;

    let meets = new Set(
        uniqueSwimmers
            .filter(row => row && row[idx.meet])
            .map((row) => row[idx.meet])
    );

    // Wait for _meetDictinary to be available
    while (!window._meetDictinary) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
        values: uniqueSwimmers,
        meetDict: await _meetDictinary.loadMeets(meets),
    };
}

async function getRank(params) {
    let [mapKey, timeInt, pkey, id] = params;

    let data = await loadRank(mapKey);

    const element = document.getElementById(id);
    if (!element) {
        return;
    }

    if (!data || !data.values) {
        element.innerHTML = createClickableDiv("", `go('rank', '${mapKey}')`);
        return;
    }

    let rank = calculateRank(data.values, pkey, timeInt);

    element.innerHTML = createClickableDiv(rank, `go('rank', '${mapKey}')`);

    // Check if this was a BC ranking and if all BC rankings are now loaded
    if (mapKey.includes('_BC') || mapKey.includes('_Bellevue Club Swim Team')) {
        setTimeout(() => checkBCRankingsComplete(), 100);
    }
}

function calculateRank(values, pkey, timeInt) {
    if (!values || !values.idx || values.length === 0) {
        return "";
    }

    let rank = "";
    for (let i = 0; i < values.length; ++i) {
        // Add safety check for row data
        if (!values[i] || values[i][values.idx.pkey] === undefined || values[i][values.idx.time] === undefined) {
            continue;
        }

        let rowPkey = values[i][values.idx.pkey];
        let rowTimeInt = window.timeToInt(values[i][values.idx.time]);

        if (pkey == rowPkey || timeInt < rowTimeInt) {
            rank = i + 1;
            break;
        }
    }

    return rank || "";
}

// ================================================================================
// RANKING CELL BUILDING
// ================================================================================

async function buildRankingCell(
    pkey,
    timeInt,
    genderStr,
    event,
    ageKey,
    zone,
    lsc,
    club,
) {
    let html = [];

    let rankDataKey = getRankDataKey(genderStr, event, ageKey, zone, lsc, club);

    // Check cache first for faster loading
    let values = await peekRank(rankDataKey);
    if (values && values.idx && values.length > 0) {
        let rank = calculateRank(values, pkey, timeInt);
        // Only show rank if it's valid (not empty)
        if (rank && rank !== "") {
            html.push(
                '<td class="full rk">',
                createClickableDiv(rank, `go('rank','${rankDataKey}')`),
                "</td>",
            );
        } else {
            // If rank is empty, treat as if no cache and show loading
            let id = rankDataKey + "_" + pkey;
            html.push(
                `<td class="full rk" id="${id}">`,
                createClickableDiv(
                    '<div class="loader"></div>',
                    `go('rank','${rankDataKey}')`,
                ),
                "</td>",
            );
            _backgroundActions.push([getRank, [rankDataKey, timeInt, pkey, id]]);
        }
    } else {
        let id = rankDataKey + "_" + pkey;
        
        html.push(
            `<td class="full rk" id="${id}">`,
            createClickableDiv(
                '<div class="loader"></div>',
                `go('rank','${rankDataKey}')`,
            ),
            "</td>",
        );

        _backgroundActions.push([getRank, [rankDataKey, timeInt, pkey, id]]);
    }

    return html.join("");
}

function getRankDataKey(genderStr, event, ageKey, zone, lsc, club) {
    return (
        genderStr +
        "_" +
        ageKey +
        "_" +
        event +
        "_" +
        (zone || "") +
        "_" +
        (lsc || "") +
        "_" +
        (club || "")
    );
}

// ================================================================================
// BC RANKING COMPLETION DETECTION
// ================================================================================

/**
 * Checks if all BC rankings are loaded and enables the "show top 3" toggle
 */
function checkBCRankingsComplete() {
    // Check if all BC ranking cells have loaded (no more loading spinners)
    const bcCells = [];

    // Look for BC ranking cells across all tables
    document.querySelectorAll('table.fill').forEach((table) => {
        const rankingHeaders = table.querySelectorAll('th.rk');

        rankingHeaders.forEach((header) => {
            const headerText = header.textContent.trim();
            const bsElement = header.querySelector('.bs');
            const bsText = bsElement ? bsElement.textContent.trim() : '';

            if (headerText === 'BC' || bsText === 'BC' || headerText.includes('BC')) {
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach((row) => {
                    const rankingCells = row.querySelectorAll('td.rk');
                    // BC is the first ranking column
                    if (rankingCells[0]) {
                        bcCells.push(rankingCells[0]);
                    }
                });
            }
        });
    });

    // Check if any BC cells still have loading spinners
    const stillLoading = bcCells.some(cell => cell.querySelector('.loader'));

    if (!stillLoading && bcCells.length > 0) {
        // All BC rankings are loaded, enable the toggle
        const toggle = document.getElementById('show-top3');
        const label = document.querySelector('label[for="show-top3"]');

        if (toggle && toggle.disabled) {
            toggle.disabled = false;

            if (label) {
                label.style.color = '#0C2340';
                label.textContent = 'show top 3';
            }
        }
    }
}

// ================================================================================
// ADDITIONAL RANKING FUNCTIONS (moved from scripts.js)
// ================================================================================

async function loadClubAgeSwimmerList(lsc, clubName, ageKey) {
    let cacheKey = "club/" + lsc + "_" + clubName + "_" + ageKey;

    return await LocalCache.func(cacheKey, async () => {
        // Wait for fetchSwimValues to be available
        while (!window.fetchSwimValues) {
                await new Promise(resolve => setTimeout(resolve, 100));
        }

        let [from, to] = decodeAgeKey(ageKey);

        let bodyObj = {
            metadata: [
                {
                    title: "pkey",
                    dim: "[Persons.PersonKey]",
                    datatype: "numeric",
                },
                {
                    title: "age",
                    dim: "[Persons.Age]",
                    datatype: "numeric",
                    filter: {
                        from: from,
                        to: to,
                    },
                },
                {
                    dim: "[Persons.ClubName]",
                    datatype: "text",
                    filter: {
                        contains: clubName,
                    },
                    panel: "scope",
                },
                {
                    dim: "[Persons.LscCode]",
                    datatype: "text",
                    filter: {
                        equals: lsc,
                    },
                    panel: "scope",
                },
            ],
            count: 500,
        };

        return await fetchSwimValues(bodyObj);
    });
}

async function loadRankDataByClub(key) {
    let [genderStr, ageKey, event, zone, lsc, club] = decodeRankMapKey(key);


    let year = getSessionYear();
    let clubName;

    // Check if 'club' is actually a club code or the full club name
    if (club && club.length <= 4) {

        // Wait for _clubDictinary to be available
        while (!window._clubDictinary) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        clubName = await _clubDictinary.loadClubName(lsc, club);
        if (clubName) {
        } else {
        }
    } else {
        clubName = club;
    }

    if (!clubName) {
        console.error(`🏊 ERROR: Cannot resolve club="${club}" in lsc="${lsc}"`);
        return [];
    }

    let swimmerList = await loadClubAgeSwimmerList(lsc, clubName, ageKey);

    // Check if swimmerList is valid
    if (!swimmerList || swimmerList.length === 0) {
        return [];
    }

    // Check if swimmerList has idx, if not it came from corrupted cache
    if (!swimmerList.idx) {
        // Clear the corrupted cache entry
        let cacheKey = "club/" + lsc + "_" + clubName + "_" + ageKey;
        localStorage.removeItem(cacheKey);
        // Try loading again (this will bypass cache)
        swimmerList = await loadClubAgeSwimmerList(lsc, clubName, ageKey);
        if (!swimmerList || !swimmerList.idx) {
            return [];
        }
    }


    let bodyObj = {
        metadata: [
            {
                title: "name",
                dim: "[Person.FullName]",
                datatype: "text",
            },
            {
                title: "date",
                dim: "[SeasonCalendar.CalendarDate (Calendar)]",
                datatype: "datetime",
                level: "days",
            },
            {
                title: "time",
                dim: "[UsasSwimTime.SwimTimeFormatted]",
                datatype: "text",
            },
            {
                title: "clubName",
                dim: "[OrgUnit.Level4Name]",
                datatype: "text",
            },
            {
                title: "club",
                dim: "[OrgUnit.Level4Code]",
                datatype: "text",
            },
            {
                title: "lsc",
                dim: "[OrgUnit.Level3Code]",
                datatype: "text",
            },
            {
                title: "meet",
                dim: "[UsasSwimTime.MeetKey]",
                datatype: "numeric",
            },
            {
                title: "pkey",
                dim: "[UsasSwimTime.PersonKey]",
                datatype: "numeric",
                filter: {
                    members: swimmerList
                        .filter(row => row && row[swimmerList.idx.pkey])
                        .map((row) => row[swimmerList.idx.pkey]),
                },
            },
            {
                title: "sortkey",
                dim: "[UsasSwimTime.SortKey]",
                datatype: "text",
                sort: "asc",
            },
            {
                title: "event",
                dim: "[UsasSwimTime.SwimEventKey]",
                datatype: "numeric",
                filter: {
                    equals: Number(event),
                },
                panel: "scope",
            },
            {
                dim: "[UsasSwimTime.EventCompetitionCategoryKey]",
                datatype: "numeric",
                filter: {
                    equals: convertToGenderCode(genderStr),
                },
                panel: "scope",
            },
            {
                dim: "[SeasonCalendar.SeasonYearDesc]",
                datatype: "text",
                filter: {
                    members: [
                        year + " (9/1/" + (year - 1) + " - 8/31/" + year + ")",
                        year - 1 + " (9/1/" + (year - 2) + " - 8/31/" + (year - 1) + ")",
                        year - 2 + " (9/1/" + (year - 3) + " - 8/31/" + (year - 2) + ")",
                    ],
                },
                panel: "scope",
            },
        ],
        count: 3000,
    };

    if (zone) {
        bodyObj.metadata.push({
            dim: "[OrgUnit.Level2Code]",
            datatype: "text",
            filter: {
                equals: zone,
            },
            panel: "scope",
        });
    }

    if (lsc) {
        bodyObj.metadata.push({
            dim: "[OrgUnit.Level3Code]",
            datatype: "text",
            filter: {
                equals: lsc,
            },
            panel: "scope",
        });
    }

    if (club) {
        bodyObj.metadata.push({
            dim: "[OrgUnit.Level4Code]",
            datatype: "text",
            filter: {
                equals: club,
            },
            panel: "scope",
        });
    }

    // Wait for fetchSwimValues to be available
    while (!window.fetchSwimValues) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    let result = await fetchSwimValues(bodyObj, "event");
    return result;
}

async function LoadRankDataAll(mapKey) {
    let [genderStr, ageKey, eventKey, zone, lsc, club] = decodeRankMapKey(mapKey);

    let year = getSessionYear();
    let [from, to] = decodeAgeKey(ageKey);
    from = from > 0 ? from - 2 : 0;

    let bodyObj = {
        metadata: [
            {
                title: "name",
                dim: "[UsasSwimTime.FullName]",
                datatype: "text",
            },
            {
                title: "date",
                dim: "[SeasonCalendar.CalendarDate (Calendar)]",
                datatype: "datetime",
                level: "days",
            },
            {
                title: "time",
                dim: "[UsasSwimTime.SwimTimeFormatted]",
                datatype: "text",
            },
            {
                title: "clubName",
                dim: "[OrgUnit.Level4Name]",
                datatype: "text",
            },
            {
                title: "club",
                dim: "[OrgUnit.Level4Code]",
                datatype: "text",
            },
            {
                title: "lsc",
                dim: "[OrgUnit.Level3Code]",
                datatype: "text",
            },
            {
                title: "meet",
                dim: "[UsasSwimTime.MeetKey]",
                datatype: "numeric",
            },
            {
                title: "pkey",
                dim: "[UsasSwimTime.PersonKey]",
                datatype: "numeric",
            },
            {
                title: "sortkey",
                dim: "[UsasSwimTime.SortKey]",
                datatype: "text",
                sort: "asc",
            },
            {
                title: "event",
                dim: "[UsasSwimTime.SwimEventKey]",
                datatype: "numeric",
                filter: {
                    equals: Number(eventKey),
                },
                panel: "scope",
            },
            {
                dim: "[UsasSwimTime.AgeAtMeetKey]",
                datatype: "numeric",
                filter: {
                    from: from,
                    to: to,
                },
                panel: "scope",
            },
            {
                dim: "[EventCompetitionCategory.EventCompetitionCategoryKey]",
                datatype: "numeric",
                filter: {
                    equals: convertToGenderCode(genderStr),
                },
                panel: "scope",
            },
            {
                dim: "[SeasonCalendar.SeasonYearDesc]",
                datatype: "text",
                filter: {
                    members: [
                        year + " (9/1/" + (year - 1) + " - 8/31/" + year + ")",
                        year - 1 + " (9/1/" + (year - 2) + " - 8/31/" + (year - 1) + ")",
                        year - 2 + " (9/1/" + (year - 3) + " - 8/31/" + (year - 2) + ")",
                    ],
                },
                panel: "scope",
            },
        ],
        count: 5000,
    };

    if (zone) {
        bodyObj.metadata.push({
            dim: "[OrgUnit.Level2Code]",
            datatype: "text",
            filter: {
                equals: zone,
            },
            panel: "scope",
        });
    }

    if (lsc) {
        bodyObj.metadata.push({
            dim: "[OrgUnit.Level3Code]",
            datatype: "text",
            filter: {
                equals: lsc,
            },
            panel: "scope",
        });
    }

    if (club) {
        bodyObj.metadata.push({
            dim: "[OrgUnit.Level4Code]",
            datatype: "text",
            filter: {
                equals: club,
            },
            panel: "scope",
        });
    }

    // Wait for fetchSwimValues to be available
    while (!window.fetchSwimValues) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return await fetchSwimValues(bodyObj, "event");
}

async function filterByAge(values, ageKey) {
    if (!values || values.length == 0) {
        return values;
    }

    // dedup the pkey
    let pkeys = new Set(values.map((row) => row[values.idx.pkey]));

    let [from, to] = decodeAgeKey(ageKey);

    let bodyObj = {
        metadata: [
            {
                title: "pkey",
                dim: "[Persons.PersonKey]",
                datatype: "numeric",
                filter: {
                    members: [...pkeys],
                },
            },
            {
                title: "age",
                dim: "[Persons.Age]",
                datatype: "numeric",
                filter: {
                    from: from,
                    to: to,
                },
            },
        ],
        count: pkeys.length,
    };

    // Wait for fetchSwimValues to be available
    while (!window.fetchSwimValues) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    let pkeyToAgeList = await fetchSwimValues(bodyObj);
    if (!pkeyToAgeList) {
        return values;
    }

    // create new pkey set by age response.
    let pkeyAge = new Map(pkeyToAgeList);

    // append age to the end of each row
    values.idx.age = values[0].length;
    let result = [];
    for (let row of values) {
        let pkey = row[values.idx.pkey];
        let realAge = pkeyAge.get(pkey);
        if (realAge) {
            row.push(realAge);
            result.push(row);
            pkeyAge.delete(pkey);
        }
    }
    result.idx = values.idx;
    return result;
}

function getSessionYear() {
    let now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() + 1;
    return month < 9 ? year : year + 1;
}

function decodeRankMapKey(mapKey) {
    return mapKey.split("_");
}

function decodeAgeKey(ageKey) {
    let from = 0;
    let to = 99;
    if (ageKey == "10U") {
        to = 10;
    } else if (ageKey == "19O") {
        from = 19;
    } else {
        let parts = ageKey.split("-");
        from = Number(parts[0]);
        to = Number(parts[1]);
    }
    return [from, to];
}

// ================================================================================
// GLOBAL EXPORTS
// ================================================================================

window.peekRank = peekRank;
window.loadRank = loadRank;
window.postLoadRank = postLoadRank;
window.getRank = getRank;
window.calculateRank = calculateRank;
window.buildRankingCell = buildRankingCell;
window.getRankDataKey = getRankDataKey;
window.decodeRankMapKey = decodeRankMapKey;
window.decodeAgeKey = decodeAgeKey;
window.getSessionYear = getSessionYear;
window.checkBCRankingsComplete = checkBCRankingsComplete;

// ================================================================================
// DEBUG FUNCTIONS
// ================================================================================

async function debugBCRankings() {

    // Clear all BC-related cache
    for (let key in localStorage) {
        if (key.includes('BC') || key.includes('Bellevue')) {
            localStorage.removeItem(key);
        }
    }

    // Check Ray's current swimmer info
    const rayInfo = await loadSwimerInfo('500281');

    // Check Max's current swimmer info
    const maxInfo = await loadSwimerInfo('1320806');

    // Test BC club searches for different age groups
    const ageGroups = ['17-18', '19O', '15-16', '13-14'];
    for (let ageKey of ageGroups) {
        try {
            const clubSwimmers = await loadClubAgeSwimmerList('PN', 'Bellevue Club', ageKey);

            if (clubSwimmers?.length > 0 && clubSwimmers.idx) {
                const rayFound = clubSwimmers.find(s => s[clubSwimmers.idx.pkey] === '500281');
                const maxFound = clubSwimmers.find(s => s[clubSwimmers.idx.pkey] === '1320806');

            }
        } catch (e) {
            console.error(`Error loading BC swimmers for ${ageKey}:`, e);
        }
    }
}

// Helper function to clear all BC ranking caches
function clearBCRankingCaches() {
    let clearedCount = 0;

    // Clear all localStorage keys that contain BC ranking data
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('rank/') || key.includes('club/') || key.includes('_BC'))) {
            localStorage.removeItem(key);
            clearedCount++;
        }
    }

    alert(`Cleared ${clearedCount} BC ranking cache entries. Refresh the page to reload data.`);
}

window.clearBCRankingCaches = clearBCRankingCaches;
window.debugBCRankings = debugBCRankings;
