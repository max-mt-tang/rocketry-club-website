/**
 * ================================================================================
 * SWIM TRACKER - TABLES MODULE
 * ================================================================================
 * 
 * Table creation and display functionality for swimmer performance data.
 * Handles Personal Best, Age Best, and Meet tables.
 */

// ================================================================================
// TABLE CREATION FUNCTIONS
// ================================================================================

// Fallback functions in case core functions aren't loaded yet
if (!window.getLSCName) {
    window.getLSCName = function(lsc) {
        console.warn("getLSCName not available, using fallback");
        return lsc; // Just return the LSC code as fallback
    };
}

if (!window.getClubDisplayCode) {
    window.getClubDisplayCode = function(club, clubName) {
        console.warn("getClubDisplayCode not available, using fallback");
        return clubName || club;
    };
}

if (!window.getAgeKey) {
    window.getAgeKey = function(age) {
        console.warn("getAgeKey not available, using fallback");
        if (age <= 10) return "10U";
        if (age <= 12) return "11-12";
        if (age <= 14) return "13-14";
        if (age <= 16) return "15-16";
        if (age <= 18) return "17-18";
        return "19O";
    };
}

if (!window.convertGenderCodeToString) {
    window.convertGenderCodeToString = function(gender) {
        console.warn("convertGenderCodeToString not available, using fallback");
        return gender; // Just return as-is
    };
}

function createBestTimeTableHeader(data) {
    let stdName = ["B", "BB", "A", "AA", "AAA", "AAAA"];

    // Use cuts age if specified, otherwise use swimmer's current age
    let cutsAge = data.cutsAge
        ? (window.getAgeFromCutsValue ? window.getAgeFromCutsValue(data.cutsAge) : data.swimmer.age)
        : data.swimmer.age;
    let meetStds = window.getMeetStandards ? window.getMeetStandards(cutsAge) : [];

    let html = [
        '<tr class="wt"><th rowspan="2">Course</th><th rowspan="2">Stroke</th><th rowspan="2">Distance</th>',
        '<th rowspan="2">Best<br>Time</th><th rowspan="2">Event<br>Date</th><th class="event-count hide" rowspan="2" onclick="toggleEventCountCheckbox()" style="cursor: pointer;">',
        window.createPopup("Event<br>Count", "Total Event Count"),
        '</th><th class="rk" colspan="1" onclick="toggleRankingsCheckbox()" style="cursor: pointer;">Ranking</th>',
    ];

    if (data.swimmer.age < 19) {
        html.push(
            `<th colspan="${stdName.length}" class="mt hide" onclick="toggleMotivationalCheckbox()" style="cursor: pointer;">`,
            window.createPopup(
                "Motivational Standards",
                "USA Swimming 2024-2028 Motivational Standards",
            ),
            "</th>",
        );
    }

    html.push(
        `<th colspan="${meetStds.length}" class="mc" onclick="toggleMeetCheckbox()" style="cursor: pointer;">Meet Standards</th></tr>`,
        '<tr class="gy">'
    );

    // Add individual ranking column headers in second row
    // BC is always visible, PN/WZ/US are hidden by default for performance
    html.push(
        '<th class="rk">',
        window.createPopup(window.getClubDisplayCode(data.swimmer.club, data.swimmer.clubName), data.swimmer.clubName),
        '</th>',
        '<th class="rk rk-pn hide" onclick="togglePNWZUSRankingsCheckbox()" style="cursor: pointer;">',
        window.createPopup(data.swimmer.lsc, window.getLSCName(data.swimmer.lsc)),
        '</th>',
        '<th class="rk rk-wz hide" onclick="togglePNWZUSRankingsCheckbox()" style="cursor: pointer;">',
        window.createPopup(
            data.swimmer.zone ? data.swimmer.zone[0] + "Z" : "?Z",
            data.swimmer.zone ? data.swimmer.zone + " Zone" : "Unknown Zone"
        ),
        '</th>',
        '<th class="rk rk-us hide" onclick="togglePNWZUSRankingsCheckbox()" style="cursor: pointer;">',
        window.createPopup("US", "USA Swimming"),
        '</th>'
    );

    if (data.swimmer.age < 19) {
        for (let std of stdName) {
            html.push('<th class="mt hide">', std, "</th>");
        }
    }

    for (let std of meetStds) {
        let extraClass = "";
        let hideClass = "";
        if (std.short === "SILVER") {
            extraClass = " mc-silver";
            hideClass = " hide";
        } else if (std.short === "GOLD") {
            extraClass = " mc-gold";
            hideClass = " hide";
        }
        html.push(`<th class="mc${extraClass}${hideClass}">`, window.createPopup(std.short, std.meet), "</th>");
    }

    html.push("</tr>");
    return html.join("");
}

async function createBestTimeTable(data, fastRowList, rowInfo) {
    // Store swimmer data globally for dropdown updates
    storeCurrentSwimmerData(data, fastRowList, rowInfo);

    let idx = data.events.idx;
    let ageKey = window.getAgeKey(data.swimmer.age);
    console.log(
        "Swimmer gender value:",
        data.swimmer.gender,
        "type:",
        typeof data.swimmer.gender,
    );
    let genderStr = window.convertGenderCodeToString(data.swimmer.gender);
    console.log("Converted gender string:", genderStr);
    let stdName = ["B", "BB", "A", "AA", "AAA", "AAAA"];

    // Use cuts age if specified, otherwise use swimmer's current age
    let cutsAge = data.cutsAge
        ? (window.getAgeFromCutsValue ? window.getAgeFromCutsValue(data.cutsAge) : data.swimmer.age)
        : data.swimmer.age;
    let meetStds = window.getMeetStandards ? window.getMeetStandards(cutsAge) : [];

    // Toggle buttons - essential toggles visible, rest in collapsible "More" section
    let html = [
        '<div class="content" style="margin-top: 8px;">',
        '<div class="center-row" style="margin-top: -5px;">',
    ];

    // Add cuts age dropdown first - using native select to match BCST dropdowns
    let ageOptions = [
        ["10u", "10U"],
        ["11-12", "11-12"],
        ["13-14", "13-14"],
        ["15-16", "15-16"],
        ["17-18", "17-18"],
        ["19o", "19O"],
    ];

    // Determine default age - always use swimmer's current age group
    let defaultAgeValue;
    let swimmerAge = data.swimmer.age;
    if (swimmerAge <= 10) {
        defaultAgeValue = "10U";
    } else if (swimmerAge >= 11 && swimmerAge <= 12) {
        defaultAgeValue = "11-12";
    } else if (swimmerAge >= 13 && swimmerAge <= 14) {
        defaultAgeValue = "13-14";
    } else if (swimmerAge >= 15 && swimmerAge <= 16) {
        defaultAgeValue = "15-16";
    } else if (swimmerAge >= 17 && swimmerAge <= 18) {
        defaultAgeValue = "17-18";
    } else {
        defaultAgeValue = "19O";
    }

    let selectOptions = ageOptions.map(([label, value]) => {
        let selected = value === defaultAgeValue ? ' selected' : '';
        return `<option value="${value}"${selected}>${label}</option>`;
    }).join('');

    html.push(
        '<select id="cuts-age-select" onchange="updateCutsForAge(this.value)" style="margin-right: 15px; margin-top: -8px; display: inline-block; padding: 6px 10px; border: none; border-radius: 6px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1); color: #0C2340; font-weight: 600; font-size: 14px; line-height: 1.2; height: 28px; box-sizing: border-box; min-width: 70px; vertical-align: middle;">',
        selectOptions,
        '</select>',
    );

    // Top 3 BC ranking highlight toggle (always visible)
    html.push(
        '<span style="display:inline-block; margin-top: -8px; vertical-align: middle;"><span class="checkbox-wrapper">',
        '<input type="checkbox" id="show-top3" onchange="window.toggleTop3Highlight(this.checked)" disabled>',
        '<label for="show-top3" style="color: #999;">Top3 <span class="top3-spinner" style="display:inline-block;animation:spin 1s linear infinite;">⏳</span></label>',
        '</span></span>',
        '<style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>'
    );

    // Three dots menu for all other toggles
    html.push(
        '<span style="position: relative; display: inline-block; margin-top: -8px; vertical-align: middle;">',
        '<span class="more-columns-toggle" onclick="window.toggleMoreColumns(event)" title="More Options" style="cursor: pointer; margin-left: 12px; padding: 0; color: #555; font-size: 18px; font-weight: bold; user-select: none; background: transparent; border-radius: 50%; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s ease; position: relative;">',
        '⋯',
        '</span>',
        '<style>',
        '.more-columns-toggle:hover::before {',
        '    content: \'\';',
        '    position: absolute;',
        '    width: 32px;',
        '    height: 32px;',
        '    border-radius: 50%;',
        '    background: rgba(0, 0, 0, 0.08);',
        '    z-index: -1;',
        '}',
        '</style>',
        '<span class="more-columns-section" style="display: none; position: absolute; top: 100%; left: 0; z-index: 1000; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px; min-width: 150px; margin-top: 5px;">',
        '<style>.more-columns-section .checkbox-wrapper { display: block; margin: 8px 0; white-space: nowrap; }</style>',
    );

    // All toggles inside three dots menu
    html.push(
        '<style id="show-rk-style"></style>',
        window.createCheckbox(
            "show-rk",
            "Rankings",
            true,
            `window.toggleColumns('.rk', this.checked)`,
        ),
        '<style id="show-mc-style"></style>',
        window.createCheckbox(
            "show-mc",
            "Meet Cuts",
            true,
            `window.toggleColumns('.mc', this.checked)`,
        ),
        '<style id="show-event-count-style"></style>',
        window.createCheckbox(
            "show-event-count",
            "Event Count",
            false,
            `window.toggleColumns('.event-count', this.checked)`,
        ),
        '<style id="show-rk-pn-wz-us-style"></style>',
        window.createCheckbox(
            "show-rk-pn-wz-us",
            "PN/WZ/US",
            false,
            `window.togglePNWZUSRankings(this.checked)`,
        ),
    );

    if (data.swimmer.age < 19) {
        html.push(
            '<style id="show-mt-style"></style>',
            window.createCheckbox(
                "show-mt",
                "Motivation",
                false,
                `window.toggleColumns('.mt', this.checked)`,
            ),
        );
    }

    html.push(
        '<style id="show-silver-gold-style"></style>',
        window.createCheckbox(
            "show-silver-gold",
            "Silver/Gold",
            false,
            `window.toggleColumns('.mc-silver, .mc-gold', this.checked)`,
        ),
        window.createCheckbox(
            "show-shadow",
            "Shadow",
            false,
            `window.toggleShadow(this.checked)`,
        ),
        '</span>', // close more-columns-section
        '</span>', // close wrapper span
    );

    // Initialize motivation times columns visibility based on checkbox state
    if (data.swimmer.age < 19) {
        console.log('Swimmer is under 19, motivational times columns will be visible by default');
        // Don't hide .mt columns by default anymore since checkbox defaults to true
    } else {
        console.log('Swimmer is 19 or over, no motivational times needed');
    }

    html.push('</div>'); // close center-row

    // Create separate tables for each course
    for (
        let courseIndex = 0;
        courseIndex < _courseOrder.length;
        courseIndex++
    ) {
        let course = _courseOrder[courseIndex];

        // Add spacing between tables (except for the first one)
        if (courseIndex > 0) {
            html.push('<div style="margin-top: 30px;"></div>');
        }

        html.push('<table class="fill top-margin"><tbody>');

        // create the table header
        let header = createBestTimeTableHeader(data);
        html.push(header);

        // create the best time table body for this course
        let courseRowsAdded = false;
        for (let i = 0; i < fastRowList.length; ++i) {
            let row = fastRowList[i];
            let time = row[idx.time];
            let date = row[idx.date];
            let event = row[idx.event];
            let timeInt = window.timeToInt(time);
            let eventStr = _eventList[event];
            let [dist, stroke, rowCourse] = eventStr.split(" ");

            // Only process rows for the current course
            if (rowCourse !== course) {
                continue;
            }

            if (rowInfo[i].length == 2 && courseRowsAdded) {
                html.push(createBestTimeTableHeader(data));
            }

            html.push(`<tr class="d${dist} ${stroke}">`);
            if (rowInfo[i].length == 2) {
                html.push(
                    `<td class="age" rowspan="${rowInfo[i][1]}">${course}</td>`,
                );
            }
            if (rowInfo[i].length > 0) {
                html.push(
                    `<td class="bold" rowspan="${rowInfo[i][0]}">${_storkeMap[stroke]}</td>`,
                );
            }

            // count the event for the swimmer
            let count =
                data.events && data.events.idx
                    ? data.events.filter(
                          (r) => r[data.events.idx.event] == event,
                      ).length
                    : 0;

            html.push(
                '<td class="full cell-distance">',
                createClickableDiv(
                    dist,
                    `showGraph(null,{pkey:${data.swimmer.pkey},event:${event}})`,
                ),
                '</td><td class="cell-time" onclick="selectRow(this)" style="cursor: pointer;">',
                time,
                '</td><td class="cell-date">',
                formatDate(date),
                "</td><td class=\"event-count hide\">",
                count,
                "</td>",
                // BC (Club) ranking - always calculated
                await buildRankingCell(
                    data.swimmer.pkey,
                    timeInt,
                    genderStr,
                    event,
                    ageKey,
                    data.swimmer.zone,
                    data.swimmer.lsc,
                    data.swimmer.club,
                ),
                // PN (LSC) ranking - placeholder, calculate on demand for performance
                buildPNWZUSPlaceholderCell(
                    data.swimmer.pkey,
                    timeInt,
                    genderStr,
                    event,
                    ageKey,
                    data.swimmer.zone,
                    data.swimmer.lsc,
                    null,
                    "rk-pn",
                ),
                // WZ ranking - placeholder, calculate on demand for performance
                buildPNWZUSPlaceholderCell(
                    data.swimmer.pkey,
                    timeInt,
                    genderStr,
                    event,
                    ageKey,
                    data.swimmer.zone,
                    null,
                    null,
                    "rk-wz",
                ),
                // US ranking - placeholder, calculate on demand for performance
                buildPNWZUSPlaceholderCell(
                    data.swimmer.pkey,
                    timeInt,
                    genderStr,
                    event,
                    ageKey,
                    null,
                    null,
                    null,
                    "rk-us",
                ),
            );

            let stds = [];

            if (data.swimmer.age < 19) {
                console.log('Processing motivational standards for:', { genderStr, ageKey, eventStr });
                if (window.getAgeGroupMotivationTime) {
                    for (let std of stdName) {
                        let stdKey = `${genderStr} ${ageKey} ${eventStr} ${std}`;
                        let result = window.getAgeGroupMotivationTime(stdKey);
                        console.log('Motivational standard lookup:', stdKey, '→', result);
                        stds.push(result);
                    }
                    console.log('Total motivational standards found:', stds.length, stds);
                } else {
                    console.log('getAgeGroupMotivationTime function not available');
                }
            }

            let motivationTimeCount = stds.length;
            let meetStdIndex = 0;
            for (let std of meetStds) {
                if (!std || !std[genderStr]) {
                    console.log("Meet standard missing data:", {
                        std: std,
                        genderStr: genderStr,
                        hasGender: std ? !!std[genderStr] : false,
                    });
                    stds.push(["", 0, ""]);
                    meetStdIndex++;
                    continue;
                }
                let extraClass = "";
                if (std.short === "SILVER") {
                    extraClass = "mc-silver hide";
                } else if (std.short === "GOLD") {
                    extraClass = "mc-gold hide";
                }
                let stdData = std[genderStr].get(eventStr) || ["", 0];
                stds.push([stdData[0], stdData[1], extraClass]);
                meetStdIndex++;
            }

            let preTime;
            for (let [i, stdData] of stds.entries()) {
                let stdStr = stdData[0];
                let stdInt = stdData[1];
                let extraClass = "";
                if (i >= motivationTimeCount && stdData.length > 2) {
                    extraClass = stdData[2];
                }
                let css = i < motivationTimeCount ? "mt hide" : "mc";
                if (extraClass) {
                    css += " " + extraClass;
                }
                if (!stdInt) {
                    html.push(`<td class="${css}"></td>`);
                    continue;
                }
                preTime =
                    (preTime && preTime >= stdInt ? preTime : 0) ||
                    stdInt * 1.15;
                let precent = Math.min(
                    100,
                    Math.max(
                        0,
                        ((timeInt - stdInt) / (preTime - stdInt)) * 100,
                    ),
                );
                let percent =
                    100 -
                    (precent < 5 && precent > 0 ? 5 : Math.floor(precent));
                let cls = timeInt <= stdInt ? "dp" : "ad";
                html.push(
                    `<td class="${css} tc">`,
                    buildTimeCell(
                        stdStr,
                        "",
                        formatDelta(timeInt - stdInt),
                        cls,
                        percent,
                    ),
                    "</td>",
                );
                preTime = stdInt;
            }

            html.push("</tr>");
            courseRowsAdded = true;
        }

        html.push("</tbody></table>");
    }

    html.push("</div>");

    return html.join("");
}

function createAgeBestTimeTableHeader(uniqueAges) {
    let html = [
        '<tr class="wt"><th>Course</th><th>Stroke</th><th>Distance</th>',
    ];
    for (let age of uniqueAges) {
        html.push("<th>", age, "</th>");
    }
    html.push("</tr>");
    return html.join("");
}

function createAgeBestTimeTable(data, fastRowList, rowInfo) {
    if (!data.events || !data.events.idx) {
        console.log("createAgeBestTimeTable: events missing idx property");
        return '<div class="content"><p>Age best time data not available</p></div>';
    }

    let idx = data.events.idx;
    let html = [
        '<div class="content" style="margin-top: 20px;"><table class="fill"><tbody>',
    ];

    // get all age column
    let ages = new Set(data.events.map((e) => e[idx.age]));
    let uniqueAges = [...ages];
    uniqueAges.sort((a, b) => b - a);

    // create the table header
    let header = createAgeBestTimeTableHeader(uniqueAges);
    html.push(header);

    for (let i = 0; i < fastRowList.length; ++i) {
        let row = fastRowList[i];
        let event = row[idx.event];
        let [dist, stroke, course] = _eventList[event].split(" ");

        if (rowInfo[i].length == 2 && i > 0) {
            html.push(header);
        }

        html.push(`<tr class="d${dist} ${stroke}">`);
        if (rowInfo[i].length == 2) {
            html.push(
                `<td class="age" rowspan="${rowInfo[i][1]}">${course}</td>`,
            );
        }
        if (rowInfo[i].length > 0) {
            html.push(
                `<td class="bold" rowspan="${rowInfo[i][0]}">${_storkeMap[stroke]}</td>`,
            );
        }

        html.push(
            '<td class="full">',
            createClickableDiv(
                dist,
                `showGraph(null,{pkey:${data.swimmer.pkey},event:${event}})`,
            ),
            "</td>",
        );
        for (let age of uniqueAges) {
            let bestTimeEvent = findBestTimeEventByAge(data.events, event, age);
            if (bestTimeEvent) {
                let preBestTime = findPreBestTimeByAge(data.events, event, age);
                let bestTime = bestTimeEvent[idx.time];
                let std = formatStandard(bestTimeEvent[idx.std]);
                let short = formatStandard(std, true);
                let date = formatDate(bestTimeEvent[idx.date]);
                let cls = !preBestTime
                    ? ""
                    : window.timeToInt(bestTime) < window.timeToInt(preBestTime)
                      ? "dp"
                      : "ad";
                html.push(
                    '<td class="tc">',
                    buildTimeCell(bestTime, window.createPopup(short, std), date, cls),
                    "</td>",
                );
            } else {
                html.push("<td></td>");
            }
        }
        html.push("</tr>");
    }

    html.push("</tbody></table></div>");

    return html.join("");
}

function findBestTimeEventByAge(events, event, age) {
    if (!events || !events.idx) {
        console.log("findBestTimeEventByAge: events missing idx property");
        return null;
    }
    let idx = events.idx;
    let bestTimeEvent;
    for (let row of events) {
        if (row[idx.event] === event && row[idx.age] === age) {
            if (
                !bestTimeEvent ||
                window.timeToInt(row[idx.time]) < window.timeToInt(bestTimeEvent[idx.time])
            ) {
                bestTimeEvent = row;
            }
        }
    }
    return bestTimeEvent;
}

function findPreBestTimeByAge(events, event, age) {
    if (!events || !events.idx) {
        console.log("findPreBestTimeByAge: events missing idx property");
        return null;
    }
    let idx = events.idx;
    let bestTime;
    for (let row of events) {
        if (row[idx.event] === event && row[idx.age] < age) {
            if (!bestTime || window.timeToInt(row[idx.time]) < window.timeToInt(bestTime)) {
                bestTime = row[idx.time];
            }
        }
    }
    return bestTime;
}

// ================================================================================
// MEET TABLE FUNCTIONS
// ================================================================================

async function createMeetTable(data) {
    if (!data.events || !data.events.idx) {
        console.log("createMeetTable: events missing idx property");
        return '<div class="content"><p>Meet data not available</p></div>';
    }

    let idx = data.events.idx;
    // group meet by course
    let courses = {};
    for (let row of data.events) {
        let course = getEventCourse(row[idx.event]);
        if (!courses[course]) {
            courses[course] = [];
            courses[course].idx = idx;
        }
        courses[course].push(row);
    }

    let html = ['<div class="content" style="margin-top: 20px;">'];

    // create the meet tables
    for (let course of _courseOrder) {
        let evts = courses[course];
        if (evts) {
            html.push(
                await createMeetTableByCourse(
                    course,
                    evts,
                    data.swimmer.pkey,
                    data.meetDict,
                ),
            );
        }
    }

    html.push("</div>");

    return html.join("");
}

async function createMeetTableByCourse(course, events, pkey, meetDict) {
    let idx = events.idx;
    let html = [
        '<div class="match-size"><span>',
        course,
        " Event Count: ",
        events.length,
        '</span></div><table class="fill"><tbody>',
    ];

    // remove dup event in one meet
    let meetEvents = new Map();
    for (let row of events) {
        let meetEventKey = row[idx.meet] + "-" + row[idx.event];
        let evt = meetEvents.get(meetEventKey);
        if (!evt || window.timeToInt(row[idx.time]) < window.timeToInt(evt[idx.time])) {
            meetEvents.set(meetEventKey, row);
        }
    }

    // sort by meet date (oldest first)
    let eventList = [...meetEvents.values()];
    eventList.sort((a, b) => (a[idx.date] < b[idx.date] ? -1 : 1));
    eventList.idx = idx;

    // calculate event time delta and append to the event list
    idx.delta = eventList[0].length;

    let eventBestTime = new Map();
    for (let row of eventList) {
        let event = row[idx.event];
        let timeInt = window.timeToInt(row[idx.time]);

        let preBestTime = eventBestTime.get(event);
        if (!preBestTime) {
            row.push(null);
            eventBestTime.set(event, timeInt);
        } else {
            row.push(timeInt - preBestTime);
            if (timeInt < preBestTime) {
                eventBestTime.set(event, timeInt);
            }
        }
    }

    // table column info & row info
    let columnInfo = countEventTypeByStroke(eventList);
    let rowInfo = countMeetByAge(eventList, meetDict);

    // calculate the total count
    let rowCount = 0;
    for (let rows of rowInfo) {
        rowCount += rows.length - 1;
    }

    // create the table header (2 rows)
    html.push(
        '<tr><th rowspan="2"></th><th rowspan="2">Age</th><th rowspan="2">Date</th>',
    );
    for (let col of columnInfo) {
        html.push(`<th colspan="${col.length - 1}">${_storkeMap[col[0]]}</th>`);
    }
    html.push('<th rowspan="2">Meet</th><th rowspan="2">Team</th></tr><tr>');
    for (let col of columnInfo) {
        for (let i = 1; i < col.length; ++i) {
            let evt = _eventIndexMap.get(`${col[i]} ${col[0]} ${course}`);
            let action = `showGraph(null,{pkey:${pkey},event:${evt}})`;
            html.push(
                '<td class="full">',
                createClickableDiv(col[i], action),
                "</td>",
            );
        }
    }
    html.push("</tr>");

    // create the cell info map (meetKey + dist + stroke + course) -> row
    let cellInfo = new Map();
    for (let row of eventList) {
        let cellKey = row[idx.meet] + "-" + _eventList[row[idx.event]];
        cellInfo[cellKey] = row;
    }

    // create the meet table body
    let first = true;
    for (let rows of rowInfo) {
        for (let i = 0; i < rows.length; ++i) {
            html.push("<tr>");
            if (first) {
                first = false;
                html.push(
                    `<td rowspan="${rowCount}" class="age">${course}</td>`,
                );
            }

            if (i == 0) {
                html.push(
                    `<td rowspan="${rows.length - 1}" class="age">${rows[0]}</td>`,
                );
                ++i;
            }

            let meetKey = rows[i];
            html.push(
                "<td>",
                formatDate(meetDict.get(meetKey)[meetDict.idx.date]),
                "</td>",
            );

            let clubName;
            for (let cols of columnInfo) {
                let stroke = cols[0];
                for (let j = 1; j < cols.length; ++j) {
                    let dist = cols[j];
                    html.push(`<td class="d${dist} ${stroke} tc">`);

                    let cellKey =
                        meetKey + "-" + dist + " " + stroke + " " + course;
                    let cell = cellInfo[cellKey];
                    if (cell) {
                        let delta = cell[idx.delta];
                        let style = delta > 0 ? "ad" : delta < 0 ? "dp" : "";
                        let time = cell[idx.time];
                        let std = formatStandard(cell[idx.std]);
                        let short = formatStandard(std, true);

                        html.push(
                            buildTimeCell(
                                time,
                                window.createPopup(short, std),
                                formatDelta(delta),
                                style,
                            ),
                        );
                        clubName = await _clubDictinary.loadClubName(
                            cell[idx.lsc],
                            cell[idx.club],
                        );
                    }
                    html.push("</td>");
                }
            }

            html.push(
                '<td class="left">',
                meetDict.get(meetKey)[meetDict.idx.name],
                '</td><td class="left">',
                clubName,
                "</td></tr>",
            );
        }
    }

    html.push("</tbody></table>");

    return html.join("");
}

function buildTimeCell(time, std, delta, color, percent) {
    if (!time) {
        return '<div>&nbsp;</div><div class="st">&nbsp;</div>';
    }

    let html = [`<div class="${color || ""}">${time}</div>`];
    if (std) {
        html.push(
            `<div class="st">${std}</div><div class="dd ${color || ""}">${delta}</div>`,
        );
    } else {
        html.push(
            `<div class="ds ${color || ""}">${delta === "" ? "&nbsp;" : delta}</div>`,
        );
    }
    if (percent < 100) {
        html.push(`<div class="r" style="left:${percent}%"></div>`);
    }
    return html.join("");
}

// ================================================================================
// TABLE UTILITY FUNCTIONS
// ================================================================================

function countMeetByAge(eventList, meetDict) {
    if (!eventList || !eventList.idx) {
        console.log("countMeetByAge: eventList missing idx property");
        return [];
    }

    if (!meetDict || typeof meetDict.get !== "function") {
        console.log("countMeetByAge: meetDict is not a valid Map object");
        return [];
    }

    let idx = eventList.idx;
    // group meet by age
    let ages = new Map();
    for (let row of eventList) {
        let age = row[idx.age];
        let set = ages.get(age);
        if (!set) {
            set = new Set();
            ages.set(age, set);
        }
        set.add(row[idx.meet]);
    }

    // sort ages (oldest first)
    let resultArray = [];
    let ageList = [...ages.keys()];
    ageList.sort((a, b) => b - a);

    for (let age of ageList) {
        let meetArray = [...ages.get(age)];
        meetArray.sort((a, b) => {
            try {
                let meetA = meetDict.get(a);
                let meetB = meetDict.get(b);
                if (
                    !meetA ||
                    !meetB ||
                    !meetDict.idx ||
                    !meetA[meetDict.idx.date] ||
                    !meetB[meetDict.idx.date]
                ) {
                    return 0;
                }
                return meetA[meetDict.idx.date] > meetB[meetDict.idx.date]
                    ? -1
                    : 1;
            } catch (error) {
                console.log("Error sorting meets:", error);
                return 0;
            }
        });
        resultArray.push([age, ...meetArray]);
    }
    return resultArray;
}

function countEventTypeByStroke(eventList) {
    let idx = eventList.idx;
    let result = new Map();
    for (let row of eventList) {
        let [dist, stroke, course] = _eventList[row[idx.event]].split(" ");
        let set = result.get(stroke);
        if (!set) {
            set = new Set();
            result.set(stroke, set);
        }

        set.add(Number(dist));
    }

    let resultArray = [];
    for (let stroke of _strokeOrder) {
        let set = result.get(stroke);
        if (set) {
            let array = [...set];
            array.sort((a, b) => a - b);
            resultArray.push([stroke, ...array]);
        }
    }

    return resultArray;
}

// ================================================================================
// TABLE INTERACTION FUNCTIONS
// ================================================================================

function selectRow(clickedCell) {
    const row = clickedCell.closest("tr");

    // Check if this row is already selected
    if (row && row.classList.contains("selected-row")) {
        // If already selected, deselect it
        row.classList.remove("selected-row");
    } else {
        // Remove selection from all rows
        const allRows = document.querySelectorAll("tr.selected-row");
        allRows.forEach((row) => row.classList.remove("selected-row"));

        // Add selection to the clicked row
        if (row) {
            row.classList.add("selected-row");
        }
    }
}

function toggleColumns(selector, show) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
        if (show) {
            element.classList.remove("hide");
        } else {
            element.classList.add("hide");
        }
    });
    
    // Update Rankings header colspan if ranking columns were toggled
    // Check for .rk, .rk-wz, or .rk-us selectors
    if (selector.includes(".rk")) {
        requestAnimationFrame(() => {
            updateRankingsColspan();
        });
    }
}

function updateRankingsColspan() {
    // Find all tables
    const tables = document.querySelectorAll('table.fill');
    
    tables.forEach((table) => {
        // Find ranking header cells (BC, PN, WZ, US) in the second row of this table
        const rankingHeaders = table.querySelectorAll('tr.gy th.rk');
        let visibleCount = 0;
        
        rankingHeaders.forEach((header) => {
            // Check if header is visible (not hidden via .hide class)
            if (!header.classList.contains('hide')) {
                visibleCount++;
            }
        });
        
        // Ensure at least 1 column is visible (minimum for BC)
        if (visibleCount === 0) {
            visibleCount = 1;
        }
        
        // Update Rankings header (first row) in this table to use the correct colspan
        const rankingsHeaders = table.querySelectorAll('tr.wt th.rk[colspan]');
        rankingsHeaders.forEach((rankingsHeader) => {
            rankingsHeader.setAttribute('colspan', visibleCount);
        });
    });
}

function toggleShadow(show) {
    const style = document.createElement("style");
    style.id = "shadow-toggle-style";

    // Remove existing style if it exists
    const existing = document.getElementById("shadow-toggle-style");
    if (existing) {
        existing.remove();
    }

    if (!show) {
        // Hide shadows when toggle is off
        style.textContent = `
                /* Hide motivational standards shadow when toggle is off */
                td>.r { background-color: transparent !important; }
            `;
        document.head.appendChild(style);
    }
}

// Initialize shadow toggle to off by default
function initializeShadowToggle() {
    const checkbox = document.getElementById("show-shadow");
    if (checkbox && !checkbox.checked) {
        toggleShadow(false);
    }
}

function toggleRankingsCheckbox() {
    const checkbox = document.getElementById("show-rk");
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        toggleColumns(".rk", checkbox.checked);
        updateRankingsColspan();
    }
}

function toggleMotivationalCheckbox() {
    const checkbox = document.getElementById("show-mt");
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        toggleColumns(".mt", checkbox.checked);
    }
}

function toggleMeetCheckbox() {
    const checkbox = document.getElementById("show-mc");
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        toggleColumns(".mc", checkbox.checked);
    }
}

function toggleEventCountCheckbox() {
    const checkbox = document.getElementById("show-event-count");
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        toggleColumns(".event-count", checkbox.checked);
    }
}

// Toggle PN/WZ/US rankings checkbox (called when clicking column headers)
function togglePNWZUSRankingsCheckbox() {
    const checkbox = document.getElementById("show-rk-pn-wz-us");
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        togglePNWZUSRankings(checkbox.checked);
    }
}

// Legacy function for backward compatibility
function toggleWZUSRankingsCheckbox() {
    togglePNWZUSRankingsCheckbox();
}

// Toggle PN/WZ/US rankings visibility and calculate if showing
async function togglePNWZUSRankings(show) {
    toggleColumns(".rk-pn, .rk-wz, .rk-us", show);
    
    // Ensure colspan is updated
    requestAnimationFrame(() => {
        updateRankingsColspan();
    });
    
    // If showing and rankings haven't been calculated yet, calculate them now
    if (show) {
        await calculatePNWZUSRankings();
    }
}

// Legacy function for backward compatibility
async function toggleWZUSRankings(show) {
    await togglePNWZUSRankings(show);
}

// Calculate PN/WZ/US rankings for all placeholder cells
async function calculatePNWZUSRankings() {
    const placeholders = document.querySelectorAll('.pn-wz-us-placeholder');
    
    if (placeholders.length === 0) {
        console.log('[calculatePNWZUSRankings] No placeholder cells found');
        return;
    }
    
    console.log(`[calculatePNWZUSRankings] Calculating rankings for ${placeholders.length} cells...`);
    
    // Process in batches to avoid overwhelming the browser
    const batchSize = 5;
    for (let i = 0; i < placeholders.length; i += batchSize) {
        const batch = Array.from(placeholders).slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (cell) => {
            // Skip if already calculated
            if (cell.dataset.calculated === 'true') {
                return;
            }
            
            const pkey = cell.dataset.pkey;
            const timeInt = parseInt(cell.dataset.timeint);
            const genderStr = cell.dataset.gender;
            const event = cell.dataset.event;
            const ageKey = cell.dataset.agekey;
            const zone = cell.dataset.zone || null;
            const lsc = cell.dataset.lsc || null;
            const club = cell.dataset.club || null;
            const extraClass = cell.dataset.extraclass || '';
            
            // Build the ranking cell content
            const rankDataKey = window.getRankDataKey(genderStr, event, ageKey, zone, lsc, club);
            const id = rankDataKey + "_" + pkey;
            
            // Update cell with loader
            cell.innerHTML = window.createClickableDiv(
                '<div class="loader"></div>',
                `go('rank','${rankDataKey}')`
            );
            cell.id = id;
            
            // Queue background action to fetch ranking
            if (window._backgroundActions) {
                window._backgroundActions.push([window.getRank, [rankDataKey, timeInt, pkey, id]]);
            }
            
            cell.dataset.calculated = 'true';
            cell.classList.remove('pn-wz-us-placeholder');
        }));
        
        // Small delay between batches
        if (i + batchSize < placeholders.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    
    // Background actions will be processed automatically by the background runner
    console.log('[calculatePNWZUSRankings] Done queuing calculations - background runner will process them');
}

// Legacy function for backward compatibility
async function calculateWZUSRankings() {
    await calculatePNWZUSRankings();
}

// Build a placeholder cell for PN/WZ/US rankings (not calculated until shown)
function buildPNWZUSPlaceholderCell(pkey, timeInt, genderStr, event, ageKey, zone, lsc, club, extraClass = "") {
    const cellClass = "full rk hide" + (extraClass ? " " + extraClass : "") + " pn-wz-us-placeholder";
    
    // Store data attributes for later calculation
    return `<td class="${cellClass}" 
        data-pkey="${pkey}" 
        data-timeint="${timeInt}" 
        data-gender="${genderStr}" 
        data-event="${event}" 
        data-agekey="${ageKey}" 
        data-zone="${zone || ''}" 
        data-lsc="${lsc || ''}" 
        data-club="${club || ''}" 
        data-extraclass="${extraClass}"
        data-calculated="false">
        <div class="clickable">-</div>
    </td>`;
}

function toggleSilverGoldRankingsCheckbox() {
    const checkbox = document.getElementById("show-silver-gold");
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        toggleColumns(".mc-silver, .mc-gold", checkbox.checked);
    }
}

// Toggle the "More columns" popup
function toggleMoreColumns(event) {
    if (event) event.stopPropagation();
    const toggleBtn = document.querySelector('.more-columns-toggle');
    const section = document.querySelector('.more-columns-section');
    if (section && toggleBtn) {
        const isHidden = section.style.display === 'none';
        section.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            toggleBtn.style.background = '#28a745';
            toggleBtn.style.color = 'white';
            toggleBtn.style.borderRadius = '50%';
            toggleBtn.style.width = '32px';
            toggleBtn.style.height = '32px';
            toggleBtn.style.padding = '0';
            toggleBtn.style.display = 'inline-flex';
            toggleBtn.style.alignItems = 'center';
            toggleBtn.style.justifyContent = 'center';
        } else {
            toggleBtn.style.background = 'transparent';
            toggleBtn.style.color = '#555';
            toggleBtn.style.borderRadius = '50%';
            toggleBtn.style.width = '32px';
            toggleBtn.style.height = '32px';
            toggleBtn.style.padding = '0';
        }
    }
}

// Close popup when clicking outside
function closeMoreColumnsPopup() {
    const toggleBtn = document.querySelector('.more-columns-toggle');
    const section = document.querySelector('.more-columns-section');
    if (section && toggleBtn && section.style.display !== 'none') {
        section.style.display = 'none';
        toggleBtn.style.background = 'transparent';
        toggleBtn.style.color = '#555';
        toggleBtn.style.borderRadius = '50%';
        toggleBtn.style.width = '32px';
        toggleBtn.style.height = '32px';
        toggleBtn.style.padding = '0';
    }
}

// Add click listener to close popup when clicking outside
document.addEventListener('click', function(event) {
    const popup = document.querySelector('.more-columns-section');
    const toggleBtn = document.querySelector('.more-columns-toggle');
    if (popup && toggleBtn) {
        if (!popup.contains(event.target) && !toggleBtn.contains(event.target)) {
            closeMoreColumnsPopup();
        }
    }
});

function toggleTop3Highlight(checked) {
    // Remove existing highlights and flash classes
    document.querySelectorAll(".top3-highlight").forEach((row) => {
        row.classList.remove("top3-highlight");
    });
    document.querySelectorAll(".top3-flash").forEach((cell) => {
        cell.classList.remove("top3-flash");
    });

    if (checked) {
        // Find all BC ranking cells and collect their values
        const bcRankings = [];
        
        // Look for BC ranking cells - need to find the correct column index
        const allRankingHeaders = document.querySelectorAll('th.rk');
        let bcColumnIndex = -1;
        
        allRankingHeaders.forEach((header, index) => {
            console.log('Checking header', index, ':', header.textContent.trim(), header.innerHTML);
            
            // Check multiple ways to find BC column
            const headerText = header.textContent.trim();
            const bsElement = header.querySelector('.bs');
            const bsText = bsElement ? bsElement.textContent.trim() : '';
            
            console.log('Header analysis:', { headerText, bsText, hasBsElement: !!bsElement });
            
            if (headerText === 'BC' || bsText === 'BC' || headerText.includes('BC')) {
                console.log('Found BC column at header index', index);
                bcColumnIndex = index;
            }
        });
        
        if (bcColumnIndex >= 0) {
            console.log('BC column found at index', bcColumnIndex);
            
            // Scan ALL tables for BC rankings, not just one table
            document.querySelectorAll('table.fill').forEach((table, tableIndex) => {
                console.log(`Scanning table ${tableIndex} for BC rankings`);
                const rows = table.querySelectorAll('tbody tr');
                console.log(`Table ${tableIndex}: Found ${rows.length} rows`);
                
                rows.forEach((row, rowIndex) => {
                    const allRankingCells = row.querySelectorAll('td.rk');
                    console.log(`Table ${tableIndex}, Row ${rowIndex}: found ${allRankingCells.length} ranking cells`);
                    
                    // The BC column should be the first ranking cell (index 0 among .rk cells)
                    const bcCell = allRankingCells[0]; // BC is always the first ranking column
                    if (bcCell) {
                        const rankText = bcCell.textContent.trim();
                        const rankNumber = parseInt(rankText);
                        console.log(`Table ${tableIndex}, Row ${rowIndex}: BC cell text="${rankText}", parsed=${rankNumber}`);
                        
                        if (!isNaN(rankNumber) && rankNumber > 0) {
                            bcRankings.push({
                                row: row,
                                rank: rankNumber,
                                rowIndex: rowIndex,
                                tableIndex: tableIndex
                            });
                            console.log(`Added BC ranking: rank ${rankNumber} at table ${tableIndex}, row ${rowIndex}`);
                        }
                    }
                });
            });
        } else {
            console.log('BC column not found in headers');
        }

        console.log('Found BC rankings:', bcRankings.map(r => ({ rank: r.rank, rowIndex: r.rowIndex, tableIndex: r.tableIndex })));

        // Sort by ranking (lowest numbers = best rankings)
        bcRankings.sort((a, b) => a.rank - b.rank);

        console.log('Sorted BC rankings:', bcRankings.map(r => ({ rank: r.rank, rowIndex: r.rowIndex, tableIndex: r.tableIndex })));

        // Highlight the top 3 (lowest ranking numbers)
        const top3 = bcRankings.slice(0, 3);
        console.log('Top 3 BC rankings selected:', top3.map(r => ({ rank: r.rank, rowIndex: r.rowIndex, tableIndex: r.tableIndex })));
        console.log(`Total BC rankings found: ${bcRankings.length}, selecting top ${Math.min(3, bcRankings.length)} for highlighting`);

        top3.forEach((ranking) => {
            ranking.row.classList.add("top3-highlight");
            console.log(`Highlighted row ${ranking.rowIndex} with BC rank ${ranking.rank}`);
        });
        
        // JavaScript-based flash animation
        const flashCells = [];
        document.querySelectorAll('.top3-highlight').forEach(row => {
            const cells = row.querySelectorAll('.cell-distance, .cell-time, .cell-date');
            cells.forEach(cell => flashCells.push(cell));
        });
        
        if (flashCells.length > 0) {
            let flashCount = 0;
            const maxFlashes = 8;
            const flashInterval = setInterval(() => {
                const isRed = flashCount % 2 === 0;
                flashCells.forEach(cell => {
                    cell.style.backgroundColor = isRed ? '#ff4444' : '#fff3cd';
                });
                flashCount++;
                if (flashCount >= maxFlashes * 2) {
                    clearInterval(flashInterval);
                    // Reset to default highlight color
                    flashCells.forEach(cell => {
                        cell.style.backgroundColor = '#fff3cd';
                    });
                }
            }, 200);
        }

        if (top3.length > 0) {
            console.log(`Highlighted ${top3.length} rows with top BC rankings`);
        } else {
            console.log('No BC rankings found to highlight');
        }
    }
}

// ================================================================================
// CUTS AGE FUNCTIONALITY
// ================================================================================

async function updateCutsForAge(selectedAge) {
    console.log("updateCutsForAge called with:", selectedAge);
    localStorage.setItem("cutsAge", selectedAge);
    await updateMeetCutsInTable(selectedAge);
}

async function updateMeetCutsInTable(selectedAge) {
    try {
        console.log("Updating meet cuts for age:", selectedAge);

        // Get current swimmer data to regenerate the table
        let currentData = getCurrentSwimmerData();
        if (!currentData) {
            console.error("No current swimmer data available for table regeneration");
            return;
        }

        console.log("Regenerating table with cuts age:", selectedAge);

        // Update the cuts age in the data
        currentData.cutsAge = selectedAge;

        // Regenerate the entire table with new cuts age
        let newTableHtml = await createBestTimeTable(
            currentData,
            currentData.fastRowList,
            currentData.rowInfo
        );

        // Replace the current table content
        let contentElement = document.querySelector('.content');
        if (contentElement) {
            contentElement.outerHTML = newTableHtml;

            // Re-initialize any event handlers or functionality
            initializeShadowToggle();

            console.log("Table successfully regenerated with new cuts age:", selectedAge);

            // Show a brief success message
            let message = document.createElement("div");
            message.style.cssText =
                "position:fixed;top:10px;right:10px;background:#4caf50;color:white;padding:10px;border-radius:5px;z-index:9999;";
            message.textContent = `Meet cuts updated for age: ${selectedAge}`;
            document.body.appendChild(message);

            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 2000);
        } else {
            console.error("Could not find .content element to update");
        }
    } catch (error) {
        console.error("Error updating meet cuts:", error);
    }
}

// Store swimmer data globally when displaying
function storeCurrentSwimmerData(data, fastRowList, rowInfo) {
    window.currentSwimmerData = {
        ...data,
        fastRowList: fastRowList,
        rowInfo: rowInfo,
    };
    console.log("Stored swimmer data:", window.currentSwimmerData);
}

function getCurrentSwimmerData() {
    return window.currentSwimmerData || null;
}

// Convert cuts age dropdown value to numeric age for getMeetStandards
function getAgeFromCutsValue(cutsValue) {
    switch (cutsValue) {
        case "10U":
            return 10;
        case "11-12":
            return 12;
        case "13-14":
            return 14;
        case "15-16":
            return 16;
        case "17-18":
            return 18;
        case "19O":
            return 19;
        case "current":
        default:
            return window.currentSwimmerData
                ? window.currentSwimmerData.swimmer.age
                : 14;
    }
}

// ================================================================================
// GLOBAL EXPORTS
// ================================================================================

window.createBestTimeTable = createBestTimeTable;
window.createAgeBestTimeTable = createAgeBestTimeTable;
window.createMeetTable = createMeetTable;
window.buildTimeCell = buildTimeCell;
window.selectRow = selectRow;
window.toggleColumns = toggleColumns;
window.updateRankingsColspan = updateRankingsColspan;
window.toggleShadow = toggleShadow;
window.initializeShadowToggle = initializeShadowToggle;
window.toggleRankingsCheckbox = toggleRankingsCheckbox;
window.toggleMotivationalCheckbox = toggleMotivationalCheckbox;
window.toggleMeetCheckbox = toggleMeetCheckbox;
window.toggleEventCountCheckbox = toggleEventCountCheckbox;
window.toggleWZUSRankingsCheckbox = toggleWZUSRankingsCheckbox;
window.togglePNWZUSRankingsCheckbox = togglePNWZUSRankingsCheckbox;
window.toggleWZUSRankings = toggleWZUSRankings;
window.togglePNWZUSRankings = togglePNWZUSRankings;
window.calculateWZUSRankings = calculateWZUSRankings;
window.calculatePNWZUSRankings = calculatePNWZUSRankings;
window.buildPNWZUSPlaceholderCell = buildPNWZUSPlaceholderCell;
window.toggleSilverGoldRankingsCheckbox = toggleSilverGoldRankingsCheckbox;
window.toggleMoreColumns = toggleMoreColumns;
window.toggleTop3Highlight = toggleTop3Highlight;
window.updateCutsForAge = updateCutsForAge;
window.getAgeFromCutsValue = getAgeFromCutsValue;
window.storeCurrentSwimmerData = storeCurrentSwimmerData;
window.getCurrentSwimmerData = getCurrentSwimmerData;
