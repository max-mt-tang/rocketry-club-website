/**
 * ================================================================================
 * SWIM TRACKER - MAIN APPLICATION MODULE
 * ================================================================================
 * 
 * Main application logic that coordinates all other modules.
 * This file should be loaded last after all dependencies.
 */

// ================================================================================
// SEARCH FUNCTIONALITY
// ================================================================================

let _inputElem = null;

// Initialize input element when DOM is ready
function initializeInput() {
    _inputElem = document.getElementById("input");
    console.log("initializeInput: _inputElem found:", !!_inputElem);

    // Handle text input keypress
    if (_inputElem) {
        _inputElem.addEventListener("keypress", (event) => {
            if (event.key == "Enter") {
                onSearch();
            }
        });
    } else {
        console.warn("Input element with id 'input' not found in DOM");
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeInput);
} else {
    // DOM already loaded
    initializeInput();
}

async function onSearch() {
    console.log("onSearch called");

    // Try to get input element (check both desktop and mobile inputs)
    let inputValue = null;
    const desktopInput = document.getElementById("input");
    const mobileInput = document.getElementById("mobile-input");
    
    if (desktopInput && desktopInput.value) {
        inputValue = desktopInput.value;
    } else if (mobileInput && mobileInput.value) {
        inputValue = mobileInput.value;
    } else if (desktopInput) {
        inputValue = desktopInput.value;
    } else if (mobileInput) {
        inputValue = mobileInput.value;
    }

    if (inputValue !== null) {
        console.log("Input value:", inputValue);
        go("search", inputValue);
    } else {
        console.error("Input element not found - checking DOM structure");
        const allInputs = document.querySelectorAll('input');
        console.log("All inputs found:", allInputs.length, Array.from(allInputs).map(inp => inp.id || inp.className));
    }
}

async function onSearchAll() {
    // Try to get input element (check both desktop and mobile inputs)
    let inputValue = null;
    const desktopInput = document.getElementById("input");
    const mobileInput = document.getElementById("mobile-input");
    
    if (desktopInput && desktopInput.value) {
        inputValue = desktopInput.value;
    } else if (mobileInput && mobileInput.value) {
        inputValue = mobileInput.value;
    } else if (desktopInput) {
        inputValue = desktopInput.value;
    } else if (mobileInput) {
        inputValue = mobileInput.value;
    }

    if (inputValue !== null) {
        go("searchAll", inputValue);
    } else {
        console.error("Input element not found for searchAll");
    }
}

function searchRay() {
    console.log("searchRay called");
    go("swimmer", "500281");
}

function searchMax() {
    console.log("searchMax called");
    go("swimmer", "1320806");
}

// ================================================================================
// GLOBAL FUNCTION EXPORTS
// ================================================================================

// Make functions globally accessible for HTML onclick handlers
window.searchRay = searchRay;
window.searchMax = searchMax;
window.onSearch = onSearch;
window.onSearchAll = onSearchAll;

// Debug: log to console that functions are loaded
console.log("Main application module loaded successfully");
console.log("Functions exposed:", {
    searchRay: window.searchRay,
    searchMax: window.searchMax,
});

// ================================================================================
// SETTINGS PAGE
// ================================================================================

async function settings(params) {
    let tabView = new TabView("settingsTabView");

    tabView.addTab(
        "<p>General</p>",
        '<div class="row"><input id="cache-key" /><button onclick="clearCache()">Clear App Cache</button><button onclick="clearCache(this)">Show Cache</button></div><div id="cache-info"></div>',
    );
    tabView.addTab("<p>Advanced</p>", buildAdvancedSettings());
    tabView.addTab("<p>About</p>", "--about--");

    window.updateContent(tabView.render());
}

function buildAdvancedSettings() {
    let dropDown = new Dropdown(
        "testid",
        '<div style="background-color:blue;">hello</div>',
        '<div style="background-color:red;">world</div>',
    );

    let select = new Select(
        "my-select",
        [
            ["", null],
            ["one", 1],
            ["group1"],
            ["two", 2],
            ["four", 4],
            ["five", 5],
            ["group2"],
            ["eight", 8],
        ],
        4,
        (value) => {
            console.log(value);
        },
    );

    return (
        '<div style="padding:100px;background-color:red">' +
        dropDown.render() +
        select.render() +
        "</div>"
    );
}

// ================================================================================
// RANKING PAGE FUNCTIONALITY
// ================================================================================

async function rank(key) {
    // Check if force refresh is requested (via URL parameter or hash)
    const forceRefresh = window.location.hash.includes('refresh=true') || 
                        new URLSearchParams(window.location.search).get('refresh') === 'true';
    let data = await loadRank(key, forceRefresh);
    await showRank(data, key);
}

function createAgeGenderSelect(key, custom) {
    let [genderStr, ageKey, event, zone, lsc, club] = decodeRankMapKey(key);
    let values = [];
    for (let g of ["Female", "Male"]) {
        values.push([g]);
        for (let ag of ["10U", "11-12", "13-14", "15-16", "17-18", "19O"]) {
            let value = getRankDataKey(g, event, ag, zone, lsc, club);
            values.push([ag + " " + g, value]);
        }
    }
    let select = new Select("age-gender-select", values, key, (v) =>
        go("rank", v),
    );
    select.class = custom ? "" : "big";
    return select.render(custom);
}

function createCourseSelect(key, custom) {
    let [genderStr, ageKey, event, zone, lsc, club] = decodeRankMapKey(key);
    let values = [];
    let [dist, style, course] = _eventList[event].split(" ");
    for (let newCourse of _courseOrder) {
        let newEvent = fixDistance([dist, style, newCourse].join(" "));
        let newEventCode = _eventIndexMap.get(newEvent);
        values.push([
            newCourse,
            getRankDataKey(genderStr, newEventCode, ageKey, zone, lsc, club),
        ]);
    }
    let select = new Select("course-select", values, key, (v) => go("rank", v));
    select.class = custom ? "" : "big";
    return select.render(custom);
}

async function buildClubSelect(key, custom) {
    let [genderStr, ageKey, event, zone, lsc, club] = decodeRankMapKey(key);
    let values = [];
    values.push(["USA", getRankDataKey(genderStr, event, ageKey)]);
    values.push(["Zone"]);
    for (let zoneCode of ["Central", "Eastern", "Southern", "Western"]) {
        values.push([
            zoneCode,
            getRankDataKey(genderStr, event, ageKey, zoneCode),
        ]);
    }
    if (zone) {
        values.push([zone + " Zone"]);
        for (let [lscCode, [lscName, zoneCode]] of lscMap) {
            if (zoneCode == zone) {
                values.push([
                    lscName + " (" + lscCode + ")",
                    getRankDataKey(genderStr, event, ageKey, zone, lscCode),
                ]);
            }
        }
    }
    if (lsc) {
        let clubDict = await _clubDictinary.loadClubMap(lsc);
        values.push([getLSCName(lsc) + " (" + lsc + ")"]);

        if (clubDict && typeof clubDict.entries === 'function') {
            for (let [clubCode, clubName] of clubDict) {
                values.push([
                    clubName + " (" + clubCode + ")",
                    getRankDataKey(genderStr, event, ageKey, zone, lsc, clubCode),
                ]);
            }
        }
    }
    let select = new Select("club-select", values, key, (v) => go("rank", v));
    select.class = custom ? "" : "big";
    select.valueEqualtoSelection = (val, ops) => {
        let [genderStrVal, ageKeyVal, eventVal, zoneVal, lscVal, clubVal] =
            decodeRankMapKey(val);
        let [genderStrOps, ageKeyOps, eventOps, zoneOps, lscOps, clubOps] =
            decodeRankMapKey(ops);
        return clubOps
            ? clubVal == clubOps
            : lscOps
              ? lscVal == lscOps
              : zoneOps
                ? zoneVal == zoneOps
                : !zoneOps;
    };
    return select.render(custom);
}

function fixDistance(eventStr) {
    let map = {
        "400 FR SCY": "500 FR SCY",
        "500 FR SCM": "400 FR SCM",
        "500 FR LCM": "400 FR LCM",
        "800 FR SCY": "1000 FR SCY",
        "1000 FR SCM": "800 FR SCM",
        "1000 FR LCM": "800 FR LCM",
        "1500 FR SCY": "1650 FR SCY",
        "1650 FR SCM": "1500 FR SCM",
        "1650 FR LCM": "1500 FR LCM",
    };
    return map[eventStr] || eventStr;
}

function showEventButtons(key) {
    let [genderStr, ageKey, event, zone, lsc, club] = decodeRankMapKey(key);
    let course = getEventCourse(event);
    let hide25 = localStorage.getItem("hide25");
    let eventOptions = [];

    // Build event options for dropdown
    for (let i = 1; i < _eventList.length; ++i) {
        let [d, s, c] = _eventList[i].split(" ");
        if (c == course && d != "_" && (d != "25" || !hide25)) {
            let eventKey = getRankDataKey(genderStr, i, ageKey, zone, lsc, club);
            let eventLabel = `${d} ${s}`;
            eventOptions.push([eventLabel, eventKey]);
        }
    }

    let eventSelect = new Select(
        "event-select",
        eventOptions,
        key,
        (value) => go("rank", value)
    );
    eventSelect.class = "";

    return eventSelect.render();
}

async function showRankTableTitle(values, key) {
    let [genderStr, ageKey, event, zone, lsc, club] = decodeRankMapKey(key);
    let html = [];

    // Modern header with gradient background and better typography
    html.push('<div class="ranking-header">');
    html.push('<div class="ranking-title-container">');

    // Main title with icon
    html.push('<h1 class="ranking-main-title">');
    html.push('<span class="trophy-icon">🏆</span>');

    if (club) {
        html.push(await _clubDictinary.loadClubName(lsc, club));
    } else if (lsc) {
        html.push(getLSCName(lsc));
    } else if (zone) {
        html.push(zone, " Zone");
    } else {
        html.push("USA Swimming");
    }
    html.push('</h1>');

    // Event details with modern badge styling
    html.push('<div class="event-details">');
    html.push('<span class="event-badge">', _eventList[event], '</span>');
    html.push('<span class="age-badge">', ageKey, '</span>');
    html.push('<span class="gender-badge">', genderStr, '</span>');
    html.push('</div>');

    // Add swimmer count if available
    if (values && values.length > 0) {
        html.push('<div class="swimmer-count">');
        html.push('<span class="count-text">', values.length, ' swimmers ranked</span>');
        html.push('</div>');
    }

    html.push('</div>');
    html.push('</div>');

    // Add CSS styles for the new header
    html.push(`
        <style>
        .ranking-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 24px;
            margin: 20px 0;
            color: white;
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
        }

        .ranking-title-container {
            text-align: center;
        }

        .ranking-main-title {
            margin: 0 0 16px 0;
            font-size: 2.2em;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }

        .trophy-icon {
            font-size: 1.2em;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }

        .event-details {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }

        .event-badge, .age-badge, .gender-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .event-badge {
            background: rgba(255,255,255,0.25);
            border: 2px solid rgba(255,255,255,0.3);
        }

        .age-badge {
            background: rgba(255,255,255,0.2);
            border: 2px solid rgba(255,255,255,0.25);
        }

        .gender-badge {
            background: rgba(255,255,255,0.15);
            border: 2px solid rgba(255,255,255,0.2);
        }

        .swimmer-count {
            font-size: 0.95em;
            opacity: 0.9;
            font-weight: 500;
        }

        .count-text {
            padding: 6px 12px;
            background: rgba(255,255,255,0.15);
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.2);
        }

        @media (max-width: 768px) {
            .ranking-header {
                padding: 16px;
                margin: 16px 0;
            }

            .ranking-main-title {
                font-size: 1.8em;
                flex-direction: column;
                gap: 8px;
            }

            .event-details {
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
        }
        </style>
    `);

    return html.join("");
}

async function showRankTable(data, key) {
    if (!data || !data.values || data.values.length === 0) {
        return `
            <div class="no-data-container">
                <div class="no-data-icon">📊</div>
                <h3>No Ranking Data Available</h3>
                <p>No swimmers found for the selected criteria. Try adjusting the filters.</p>
            </div>
        `;
    }

    let idx = data.values.idx;
    let html = [];
    
    // Extract event from key to fetch Personal Best times
    let [genderStr, ageKey, eventCode, zone, lsc, club] = decodeRankMapKey(key);
    
    // Get event name for display
    let eventName = eventCode;
    if (typeof _eventList !== 'undefined' && _eventList[eventCode]) {
        eventName = _eventList[eventCode];
    } else if (window.getEventName) {
        eventName = window.getEventName(eventCode) || eventCode;
    }
    
    // Format age group display
    let ageDisplay = ageKey.replace('_', '-').replace('O', '+');
    
    // Get team name
    let teamDisplay = club || 'All Teams';
    if (club && window._clubDictinary && window._clubDictinary.loadClubName) {
        // Club name might be a code, try to get full name
        teamDisplay = club;
    }

    // Modern table container with enhanced styling
    html.push('<div class="ranking-table-container">');

    // Add table controls with event/age/team info
    html.push(`
        <div class="table-controls">
            <div class="results-info">
                <span class="results-count">
                    <strong>${eventName}</strong> · ${genderStr} ${ageDisplay} · ${teamDisplay} · 
                    Showing ${Math.min(data.values.length, 100)} of ${data.values.length} swimmers
                </span>
            </div>
            <div class="table-actions">
                <button class="btn-secondary" onclick="exportRankings()">
                    <span class="export-icon">📊</span> Export
                </button>
            </div>
        </div>
    `);

    // Modern table with enhanced styling
    html.push('<div class="table-wrapper">');
    html.push('<table class="ranking-table" id="ranking-detail-table">');
    html.push('<thead>');
    html.push('<tr>');
    html.push('<th class="rank-col">Rank</th>');
    html.push('<th class="name-col">Swimmer</th>');
    html.push('<th class="time-col">Time</th>');
    html.push('<th class="date-col">Date</th>');
    html.push('<th class="club-col">Club</th>');
    html.push('<th class="meet-col">Meet</th>');
    html.push('</tr>');
    html.push('</thead>');
    html.push('<tbody>');

    // Fetch Personal Best times directly from API for all swimmers
    // IMPORTANT: We do NOT filter by event code in the API call because that returns unreliable/outdated data.
    // Instead, we fetch ALL events for each swimmer and find the best time for the specific event locally.
    console.log(`[showRankTable] Fetching Personal Best times for ${data.values.length} swimmers for event ${eventCode}...`);
    
    // Collect all pkeys
    let pkeys = [];
    for (let i = 0; i < Math.min(data.values.length, 100); i++) {
        let row = data.values[i];
        if (row && row[idx.pkey]) {
            pkeys.push(row[idx.pkey]);
        }
    }
    
    // Fetch Personal Best times for all swimmers in batches
    let personalBestMap = new Map(); // Map<pkey, {time, date, timeInt}>
    
    // Fetch in batches of 10 to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < pkeys.length; i += batchSize) {
        let batch = pkeys.slice(i, i + batchSize);
        let promises = batch.map(async (pkey) => {
            try {
                // Fetch ALL events for this swimmer (no event filter)
                // This is more reliable than filtering by event code in the API
                let bodyObj = {
                    metadata: [
                        {
                            title: "time",
                            dim: "[UsasSwimTime.SwimTimeFormatted]",
                            datatype: "text",
                        },
                        {
                            title: "date",
                            dim: "[SeasonCalendar.CalendarDate (Calendar)]",
                            datatype: "datetime",
                            level: "days",
                        },
                        {
                            title: "event",
                            dim: "[UsasSwimTime.SwimEventKey]",
                            datatype: "numeric",
                        },
                        {
                            title: "meet",
                            dim: "[UsasSwimTime.MeetKey]",
                            datatype: "numeric",
                        },
                        {
                            dim: "[UsasSwimTime.PersonKey]",
                            datatype: "numeric",
                            filter: {
                                equals: pkey,
                            },
                            panel: "scope",
                        },
                        // NO event filter here - fetch ALL events
                    ],
                    count: 5000,
                };
                
                let events = await fetchSwimValues(bodyObj, "event");
                if (events && events.length > 0 && events.idx) {
                    let eventsIdx = events.idx;
                    let bestTime = null;
                    let bestDate = null;
                    let bestTimeInt = Infinity;
                    let bestMeet = null;
                    
                    // Find best time for the specific event locally
                    for (let event of events) {
                        if (event[eventsIdx.event] == eventCode) {
                            let eventTimeInt = window.timeToInt(event[eventsIdx.time]);
                            if (eventTimeInt < bestTimeInt) {
                                bestTimeInt = eventTimeInt;
                                bestTime = event[eventsIdx.time];
                                bestDate = event[eventsIdx.date] ? event[eventsIdx.date].substring(0, 10) : null;
                                bestMeet = event[eventsIdx.meet];
                            }
                        }
                    }
                    
                    if (bestTime) {
                        personalBestMap.set(pkey, {
                            time: bestTime,
                            date: bestDate,
                            timeInt: bestTimeInt,
                            meet: bestMeet
                        });
                    }
                }
            } catch (e) {
                console.log(`Error fetching Personal Best for pkey ${pkey}:`, e);
            }
        });
        
        await Promise.all(promises);
    }
    
    console.log(`[showRankTable] Fetched Personal Best times for ${personalBestMap.size} swimmers`);
    
    // Collect new meet IDs from Personal Best and load them into meetDict
    let newMeetIds = new Set();
    for (let [pkey, pb] of personalBestMap) {
        if (pb.meet && (!data.meetDict || !data.meetDict.has(pb.meet))) {
            newMeetIds.add(pb.meet);
        }
    }
    
    if (newMeetIds.size > 0 && window._meetDictinary) {
        console.log(`[showRankTable] Loading ${newMeetIds.size} new meet names for Personal Best meets`);
        let newMeetDict = await window._meetDictinary.loadMeets(newMeetIds);
        // Merge into existing meetDict
        if (!data.meetDict) {
            data.meetDict = newMeetDict;
        } else {
            for (let [meetId, meetData] of newMeetDict) {
                if (!data.meetDict.has(meetId)) {
                    data.meetDict.set(meetId, meetData);
                }
            }
        }
    }
    
    // Build array of swimmer data using Personal Best times
    let swimmerData = [];
    for (let i = 0; i < Math.min(data.values.length, 100); i++) {
        let row = data.values[i];
        if (!row) continue;
        
        let pkey = row[idx.pkey];
        let rankingTime = row[idx.time] || '';
        let rankingDate = row[idx.date] || '';
        let rankingTimeInt = window.timeToInt ? window.timeToInt(rankingTime) : 0;
        
        // Use Personal Best time if available, otherwise use ranking time
        let personalBest = personalBestMap.get(pkey);
        let personalBestTime = personalBest ? personalBest.time : rankingTime;
        let personalBestDate = personalBest ? personalBest.date : rankingDate;
        let personalBestTimeInt = personalBest ? personalBest.timeInt : rankingTimeInt;
        let personalBestMeet = (personalBest && personalBest.meet) ? personalBest.meet : row[idx.meet];
        
        // Fix duplicate name issue (e.g., "Ray Tang Tang" -> "Ray Tang")
        let swimmerName = row[idx.name] || 'Unknown';
        if (swimmerName && swimmerName !== 'Unknown') {
            // Remove duplicate consecutive words
            const words = swimmerName.split(/\s+/);
            const dedupedWords = [];
            for (let w of words) {
                if (dedupedWords.length === 0 || w.toLowerCase() !== dedupedWords[dedupedWords.length - 1].toLowerCase()) {
                    dedupedWords.push(w);
                }
            }
            swimmerName = dedupedWords.join(' ');
        }
        
        swimmerData.push({
            row: row,
            rank: i + 1,
            pkey: pkey,
            name: swimmerName,
            time: personalBestTime,
            date: personalBestDate,
            timeInt: personalBestTimeInt,
            club: row[idx.club] || '',
            meet: personalBestMeet,
            isUpdated: (personalBest && personalBestTimeInt < rankingTimeInt)
        });
    }
    
    // Sort by Personal Best time (fastest first)
    swimmerData.sort((a, b) => a.timeInt - b.timeInt);
    
    // Get current swimmer's pkey to highlight their row
    let currentSwimmerPkey = null;
    if (window.refreshInsights && window.refreshInsights._data && window.refreshInsights._data.swimmer) {
        currentSwimmerPkey = String(window.refreshInsights._data.swimmer.pkey);
    }
    
    // Render table rows
    for (let i = 0; i < swimmerData.length; i++) {
        let swimmer = swimmerData[i];
        let rank = i + 1;
        
        // Check if this is the current swimmer
        let isCurrentSwimmer = currentSwimmerPkey && String(swimmer.pkey) === currentSwimmerPkey;
        let rowClass = isCurrentSwimmer ? 'ranking-row current-swimmer' : 'ranking-row';

        html.push(`<tr class="${rowClass}" onclick="selectRankingRow(this)">`);

        // Rank with simple numbers
        html.push('<td class="rank-cell">');
        html.push(`<span class="rank-number">${rank}</span>`);
        html.push('</td>');

        // Swimmer name with clickable link
        html.push('<td class="name-cell">');
        if (swimmer.pkey) {
            let nameDisplay = isCurrentSwimmer ? `<strong>${swimmer.name}</strong>` : swimmer.name;
            html.push(`<a href="#swimmer/${swimmer.pkey}" class="swimmer-link">${nameDisplay}</a>`);
        } else {
            html.push(`<span class="swimmer-name">${swimmer.name}</span>`);
        }
        html.push('</td>');

        // Time with enhanced formatting - use Personal Best if available
        let timeDisplay = swimmer.time || '';
        let timeClass = swimmer.isUpdated ? 'time-value updated-time' : 'time-value';
        html.push(`<td class="time-cell"><span class="${timeClass}" title="${swimmer.isUpdated ? 'Updated with Personal Best time' : ''}">${timeDisplay}</span></td>`);

        // Date with better formatting - use Personal Best date if available
        let dateDisplay = swimmer.date || '';
        if (dateDisplay) {
            let formattedDate = window.formatDate ? window.formatDate(dateDisplay) : dateDisplay;
            html.push(`<td class="date-cell">${formattedDate}</td>`);
        } else {
            html.push('<td class="date-cell">-</td>');
        }

        // Club with hover tooltip
        html.push(`<td class="club-cell"><span class="club-name" title="${swimmer.club}">${swimmer.club}</span></td>`);

        // Meet with enhanced styling
        // meetDict stores [date, meetName] arrays
        let meetName = 'Unknown';
        if (data.meetDict && data.meetDict.get && swimmer.meet) {
            let meetData = data.meetDict.get(swimmer.meet);
            if (meetData) {
                // meetData is an array: [date, meetName]
                if (Array.isArray(meetData) && meetData.length > 1) {
                    meetName = meetData[1] || 'Unknown';
                } else if (typeof meetData === 'string') {
                    meetName = meetData;
                } else if (meetData.name) {
                    meetName = meetData.name;
                }
            }
        }
        html.push(`<td class="meet-cell"><span class="meet-name" title="${meetName}">${meetName}</span></td>`);

        html.push('</tr>');
    }

    html.push('</tbody>');
    html.push('</table>');
    html.push('</div>'); // table-wrapper
    html.push('</div>'); // ranking-table-container

    // Add comprehensive CSS for the ranking table
    html.push(`
        <style>
        .ranking-table-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
            margin: 5px 0;
        }

        .table-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }

        .results-info {
            display: flex;
            align-items: center;
        }

        .results-count {
            color: #6c757d;
            font-size: 1.1em;
            font-weight: 500;
        }

        .table-actions {
            display: flex;
            gap: 10px;
        }

        .btn-secondary {
            padding: 8px 16px;
            border: 1px solid #6c757d;
            background: white;
            color: #6c757d;
            border-radius: 6px;
            font-size: 0.85em;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }

        .btn-secondary:hover {
            background: #6c757d;
            color: white;
        }

        .export-icon {
            font-size: 0.9em;
        }

        .table-wrapper {
            overflow-x: auto;
        }

        .ranking-table {
            border-collapse: collapse;
            font-size: 0.95em;
            table-layout: auto;
            width: auto;
        }

        .ranking-table thead th {
            background: #f8f9fa;
            color: #495057;
            padding: 8px 12px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            font-size: 1.05em;
            position: sticky;
            top: 0;
            z-index: 10;
            white-space: nowrap;
            border-bottom: 2px solid #dee2e6;
        }

        .ranking-table tbody tr {
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .ranking-table tbody tr:nth-child(even) {
            background: #f8f9fa;
        }

        .ranking-table tbody tr:hover {
            background: #e3f2fd !important;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .ranking-table tbody tr.current-swimmer {
            background: #fff3cd !important;
            border-left: 4px solid #ffc107;
        }

        .ranking-table tbody tr.current-swimmer:hover {
            background: #ffe69c !important;
        }

        .ranking-table tbody tr.selected {
            background: #2196f3 !important;
            color: white;
        }

        .ranking-table td {
            padding: 6px 10px;
            border-bottom: 1px solid #e9ecef;
            vertical-align: middle;
            text-align: left;
            white-space: nowrap;
        }

        .rank-cell {
            text-align: left;
            font-weight: 600;
            padding-right: 20px;
        }

        .rank-number {
            font-weight: 700;
            color: #495057;
            font-size: 1.2em;
        }

        .name-cell {
            padding-right: 30px;
        }

        .swimmer-link {
            color: #2196f3;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.2s ease;
        }

        .swimmer-link:hover {
            color: #1976d2;
            text-decoration: underline;
        }

        .swimmer-name {
            font-weight: 600;
            color: #495057;
        }

        .time-cell {
            padding-right: 25px;
        }

        .time-value {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-weight: 700;
            font-size: 1.2em;
            color: #2c3e50;
            padding: 4px 8px;
            background: #f1f3f4;
            border-radius: 4px;
            display: inline-block;
        }
        
        .time-value.updated-time {
            color: #0d6efd;
            background: #e7f3ff;
            font-weight: 800;
        }
        
        .time-value.updated-time::after {
            content: " ★";
            font-size: 0.8em;
            color: #ffc107;
        }

        .date-cell {
            color: #6c757d;
            font-size: 1em;
            padding-right: 25px;
        }

        .club-cell {
            padding-right: 25px;
        }

        .meet-cell {
        }

        .club-name, .meet-name {
            font-size: 1em;
            color: #6c757d;
        }

        .no-data-container {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .no-data-icon {
            font-size: 3em;
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .no-data-container h3 {
            margin: 16px 0 8px 0;
            color: #495057;
        }

        .no-data-container p {
            margin: 0;
            font-size: 0.9em;
        }

        @media (max-width: 768px) {
            .table-controls {
                flex-direction: column;
                gap: 12px;
                align-items: stretch;
            }

            .table-actions {
                justify-content: center;
            }

            .ranking-table {
                font-size: 1em;
            }

            .ranking-table thead th {
                padding: 6px 8px;
                font-size: 1.0em;
            }

            .ranking-table td {
                padding: 5px 8px;
            }

            .rank-cell {
                padding-right: 15px;
            }

            .name-cell {
                padding-right: 20px;
            }

            .time-cell {
                padding-right: 15px;
            }

            .date-cell {
                padding-right: 15px;
            }

            .club-cell {
                padding-right: 15px;
            }

            .time-value {
                font-size: 1.1em;
                padding: 3px 6px;
            }

            .rank-number {
                font-size: 1.1em;
            }
        }
        </style>
    `);

    return html.join("");
}

function buildStandardSelects(key, custom) {
    return '<div>Standards selection not implemented yet</div>';
}

async function showRank(data, key) {
    let html = [];

    let oldBrowser = !(navigator.userAgent.indexOf("Chrome/120.") < 0);

    // Control panel with dropdowns - compact inline layout
    html.push(`
        <div class="ranking-controls-compact">
            <span class="control-item"><label>Age:</label>${createAgeGenderSelect(key, oldBrowser)}</span>
            <span class="control-item"><label>Course:</label>${createCourseSelect(key, oldBrowser)}</span>
            <span class="control-item"><label>Event:</label>${showEventButtons(key)}</span>
            <span class="control-item"><label>Team:</label>${await buildClubSelect(key, oldBrowser)}</span>
        </div>
    `);

    // Removed ranking-header div

    html.push(
        '<div id="rank-table">',
        await showRankTable(data, key),
        "</div>",
    );

    // Enhanced hide 25 button and refresh button
    html.push('<div class="page-controls">');
    html.push('<button onclick="refreshRankings()" style="margin-right: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">🔄 Refresh Rankings</button>');
    html.push(addHide25Botton());
    html.push('</div>');

    // Add comprehensive CSS for the enhanced controls
    html.push(`
        <style>
        .ranking-controls-compact {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
            padding: 5px 0;
            margin-bottom: 5px;
            width: 100%;
        }

        .ranking-controls-compact .control-item {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .ranking-controls-compact .control-item label {
            font-weight: 600;
            color: #495057;
            font-size: 0.85em;
            white-space: nowrap;
        }

        .ranking-controls-compact select,
        .ranking-controls-compact .drop-layout {
            padding: 6px 10px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 0.9em;
            background: white;
            color: #495057;
            cursor: pointer;
            min-width: 80px;
        }

        .ranking-controls-compact select:hover,
        .ranking-controls-compact .drop-layout:hover {
            border-color: #667eea;
        }

        .ranking-controls-compact select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15);
        }

        .event-selection-panel {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            margin: 20px 0;
            padding: 24px;
        }

        .event-title {
            margin: 0 0 20px 0;
            color: #495057;
            font-size: 1.3em;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .event-dropdown-container {
            display: flex;
            align-items: center;
            margin-top: 10px;
        }

        .event-dropdown-container select {
            flex: 1;
            max-width: 300px;
            padding: 12px 16px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 1em;
            background: white;
            color: #495057;
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .event-dropdown-container select:hover {
            border-color: #667eea;
        }

        .event-dropdown-container select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .page-controls {
            display: flex;
            justify-content: center;
            padding: 20px 0;
        }

        .page-controls button {
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .page-controls button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        @media (max-width: 1200px) {
            .controls-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 18px;
            }
        }

        @media (max-width: 768px) {
            .controls-grid {
                grid-template-columns: 1fr;
                gap: 16px;
                padding: 16px;
            }

            .controls-header {
                padding: 16px 20px;
            }

            .controls-title {
                font-size: 1.1em;
                flex-direction: column;
                gap: 6px;
                text-align: center;
            }
        }
        </style>
    `);

    updateContent(html.join(""));
}

// Helper functions for the enhanced ranking table
function selectRankingRow(row) {
    // Remove selection from all rows
    document.querySelectorAll('.ranking-row.selected').forEach(r => {
        r.classList.remove('selected');
    });

    // Add selection to clicked row
    row.classList.add('selected');
}

function exportRankings() {
    // Simple CSV export functionality
    const table = document.querySelector('.ranking-table');
    if (!table) return;

    let csv = [];

    // Get headers
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    csv.push(headers.join(','));

    // Get data rows
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cols = Array.from(row.querySelectorAll('td')).map(td => {
            // Clean up the text content (remove emojis, extra spaces)
            let text = td.textContent.trim();
            // Remove medal emojis
            text = text.replace(/[🥇🥈🥉]/g, '').trim();
            // Handle commas in text
            if (text.includes(',')) {
                text = `"${text}"`;
            }
            return text;
        });
        csv.push(cols.join(','));
    });

    // Create and download the file
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'swim_rankings.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Export functions to global scope
window.selectRankingRow = selectRankingRow;
window.exportRankings = exportRankings;

// Ensure search functions are available
if (!window.search) {
    console.log("window.search not found, defining fallback");
    window.search = async function(name, all) {
        console.log("Fallback search called with:", name, all);
        if (!name) {
            window.location.replace("");
            return;
        }

        // Simple redirect to the search results
        go("swimmer", name);
    };
}

if (!window.searchAll) {
    window.searchAll = async function(params) {
        return await window.search(params, true);
    };
}

// Ensure graph functions are available
if (!window.showGraph) {
    console.log("window.showGraph not found, checking for renderSwimmingProgressGraph...");
    if (window.renderSwimmingProgressGraph) {
        window.showGraph = window.renderSwimmingProgressGraph;
        console.log("Mapped showGraph to renderSwimmingProgressGraph");
    } else {
        console.error("Neither showGraph nor renderSwimmingProgressGraph found!");
        window.showGraph = function() {
            console.error("Graph functionality not available");
        };
    }
}

window.settings = settings;
window.rank = rank;

// Function to refresh rankings by clearing cache and reloading
async function refreshRankings() {
    const currentHash = window.location.hash;
    const key = currentHash.replace('#rank/', '');
    
    // Show loading indicator
    const refreshButton = document.querySelector('button[onclick="refreshRankings()"]');
    const originalText = refreshButton ? refreshButton.textContent : '';
    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = '🔄 Refreshing...';
    }
    
    try {
        // Clear the cache for this ranking
        localStorage.removeItem("rank/" + key);
        
        // Also clear related club caches
        let [genderStr, ageKey, event, zone, lsc, club] = decodeRankMapKey(key);
        if (club) {
            let clubName = club;
            if (club && club.length <= 4 && window._clubDictinary) {
                clubName = await window._clubDictinary.loadClubName(lsc, club);
            }
            if (clubName) {
                let clubCacheKey = "club/" + lsc + "_" + clubName + "_" + ageKey;
                localStorage.removeItem(clubCacheKey);
            }
        }
        
        // Clear all rank/ caches to be thorough (they'll reload fresh)
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const cacheKey = localStorage.key(i);
            if (cacheKey && cacheKey.startsWith('rank/')) {
                localStorage.removeItem(cacheKey);
            }
        }
        
        // Reload the ranking page with force refresh
        let data = await loadRank(key, true);
        await showRank(data, key);
    } catch (error) {
        console.error('Error refreshing rankings:', error);
        alert('Error refreshing rankings. Please try again.');
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = originalText;
        }
    }
}

window.refreshRankings = refreshRankings;
