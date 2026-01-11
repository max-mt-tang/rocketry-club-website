/**
 * ================================================================================
 * SWIM TRACKER - GRAPHS MODULE
 * ================================================================================
 * 
 * Interactive progress graph functionality with canvas rendering.
 * Handles graph creation, drawing, tooltips, and user interactions.
 */

console.log("graphs.js: Script loading...");

// ================================================================================
// GRAPH CREATION AND SETUP
// ================================================================================

/**
 * Creates the HTML structure for the progress graph tab
 * @param {number} pkey - Swimmer's unique identifier
 * @param {Array} events - Swimmer's event data
 * @returns {string} HTML string for the progress graph interface
 */
function createProgressGraph(pkey, events) {
    console.log("createProgressGraph called with:", { pkey, events: !!events, eventsLength: events?.length });

    try {
        let html = [];
        let hide25 = localStorage.getItem("hide25");

        html.push('<div class="content">');

        console.log("About to process event buttons, _eventList length:", window._eventList?.length || _eventList?.length);
        const eventList = window._eventList || _eventList;
        if (!eventList || !eventList.length) {
            console.error("_eventList not available!");
            return '<div class="content"><p>Progress graph not available - event list not loaded</p></div>';
        }
        
        // Group events by stroke type
        const strokeGroups = {
            'FR': [],
            'BR': [],
            'BK': [],
            'FL': [],
            'IM': []
        };
        
        // Collect events by stroke (exclude 25-yard events)
        for (let i = 1; i < eventList.length; ++i) {
            let [d, s, c] = eventList[i].split(" ");
            if (c == "SCY" && d != "_" && d != "25" && strokeGroups[s]) {
                strokeGroups[s].push({ index: i, distance: d, stroke: s });
            }
        }
        
        // Color scheme for each stroke type
        const strokeColors = {
            'FR': { bg: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)', text: '#ffffff', border: '#0056b3' },
            'BR': { bg: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)', text: '#ffffff', border: '#1e7e34' },
            'BK': { bg: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)', text: '#212529', border: '#e0a800' },
            'FL': { bg: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', text: '#ffffff', border: '#c82333' },
            'IM': { bg: 'linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)', text: '#ffffff', border: '#5a32a3' }
        };
        
        // Render grouped buttons without labels - styled with colors by stroke type
        html.push('<div class="match-size top-margin" style="display: flex; flex-wrap: wrap; gap: 4px; align-items: flex-start;">');
        for (const [stroke, events] of Object.entries(strokeGroups)) {
            if (events.length > 0) {
                const colors = strokeColors[stroke] || { bg: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', text: '#495057', border: '#dee2e6' };
                // Add buttons directly without nav-group wrapper to minimize spacing
                for (const evt of events) {
                    html.push(
                        `<button class="d${evt.distance} ${evt.stroke}" style="border: 1px solid ${colors.border}; border-radius: 6px; width: 50px; height: 50px; margin: 0; padding: 4px; background: ${colors.bg}; color: ${colors.text}; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.15);"`,
                        ` onclick="showGraph(null,{pkey:${pkey},event:${evt.index}})">${evt.stroke}<br>${evt.distance}</button>`,
                    );
                }
            }
        }
        html.push("</div>");

    html.push('<h2 id="graph-title"></h2>');

    // Add time range buttons
    // Add CSS styles for the time range buttons
    html.push(`
        <style>
            .graph-time-range-buttons {
                margin: 15px 0;
                text-align: left;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            .time-range-btn {
                padding: 6px 12px;
                margin: 0 3px;
                border: 1px solid #ccc;
                background: #fff;
                color: #333;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            .time-range-btn:hover {
                background: #e9ecef;
                border-color: #007bff;
            }
            .time-range-btn.active {
                background: #007bff !important;
                color: #fff !important;
                border-color: #007bff !important;
            }
            .time-range-btn:active {
                transform: scale(0.95);
            }
        </style>
    `);

    html.push('<div class="graph-time-range-buttons">');

    const timeRanges = [
        { label: '3M', months: 3 },
        { label: '6M', months: 6 },
        { label: '9M', months: 9 },
        { label: '1Y', months: 12 },
        { label: '2Y', months: 24 },
        { label: '3Y', months: 36 },
        { label: 'Max', months: 0 }
    ];

    timeRanges.forEach((range, index) => {
        const isDefault = range.label === 'Max';
        html.push(
            `<button class="time-range-btn${isDefault ? ' active' : ''}" `,
            `data-months="${range.months}" `,
            `onclick="setGraphTimeRange(${pkey}, ${range.months}, this)">`,
            `${range.label}</button>`
        );
    });

    // Add course toggle buttons to the same row
    html.push('<span style="margin-left: 30px;"></span>');
    for (let c of _courseOrder) {
        let checkbox = createCheckbox(
            "show-" + c.toLocaleLowerCase(),
            c,
            true,
            `showGraph(null,{${c}:this.checked})`,
        );
        // Add vertical-align to the checkbox wrapper
        checkbox = checkbox.replace('style="display:inline-block"', 'style="display:inline-block; vertical-align: middle; margin-top: 2px;"');
        html.push(checkbox);
    }

    html.push('</div>');

    // Add Compare section on a new row with matching top row styling
    html.push(`
        <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center;">
            <span style="margin-right: 10px; font-weight: 600; color: #495057;">Compare:</span>
            <input
                id="add-input"
                placeholder="Swimmer"
                onkeypress="addKeypress(this, event)"
                style="
                    padding: 8px 12px;
                    border: 1px solid #d0d0d0;
                    border-radius: 6px;
                    font-size: 14px;
                    width: 200px;
                    margin-right: 10px;
                    outline: none;
                    transition: border-color 0.2s;
                "
                onfocus="this.style.borderColor='#007bff'"
                onblur="this.style.borderColor='#d0d0d0'"
            >
            <button
                onclick="addSearchAll()"
                style="
                    padding: 8px 20px;
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(0,123,255,0.2);
                "
                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,123,255,0.3)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,123,255,0.2)'"
            >
                Search
            </button>
        </div>
    `);

    // Add the dropdown list for search results
    html.push('<div id="adding-list" style="display: none; position: absolute; background: white; border: 1px solid #ccc; border-radius: 4px; margin-top: 5px; max-height: 300px; overflow-y: auto; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 10px; min-width: 400px;"></div>');

    html.push("</div>");

    html.push('<div style="margin-top: 5px;">');
    html.push(
        '<span style="display:inline-block"><span id="swimmer-list" class="center-row"></span></span></div>',
    );

    html.push(
        '<canvas id="canvas" class="hide" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin: 10px 0;" onmousemove="onCanvasMouseMove(this, event)" onwheel="wheelGraph(this, event)"></canvas>',
    );

    html.push(
        '<div style="position:relative;margin:0 50px"class="resize-panel">',
        '<button class="resize hide" style="left:40px;top:-190px" onclick="resizeY(-1)">⇧</button>',
        '<button class="resize hide" style="left:15px;top:-140px;transform:rotate(-90deg)" onclick="resizeX(-1)">⇧</button>',
        '<button class="resize hide" style="left:65px;top:-140px;transform:rotate(90deg)" onclick="resizeX(1)">⇧</button>',
        '<button class="resize hide" style="left:40px;top:-90px;transform:rotate(180deg)" onclick="resizeY(1)">⇧</button></div>',
        '<div class="tip"><span style="width:70px;display:inline-block;text-align:right;margin:0 8px">Mouse:</span>Ctrl⌘ + wheel to resize the date axis.  Shift + wheel to resize the time axis.<br>',
        '<span style="width:70px;display:inline-block;text-align:right;margin:0 8px">TouchPad:</span>Shift + two-finger up/down or left/right scroll to resize the date & time axis.</div>',
    );

    html.push(
        '<div class="top-margin">',
        createCheckbox(
            "show-resize",
            "show graph resize controls",
            false,
            `for(let e of document.getElementsByClassName('resize'))e.classList.toggle('hide')`,
        ),
        "</div>",
    );

        const result = html.join("");
        console.log("createProgressGraph returning HTML length:", result.length);
        console.log("createProgressGraph first 200 chars:", result.substring(0, 200));
        return result;
    } catch (error) {
        console.error("Error in createProgressGraph:", error);
        return '<div class="content"><p>Error loading progress graph</p></div>';
    }
}

// ================================================================================
// GRAPH INTERACTION HANDLERS
// ================================================================================

async function onCanvasMouseMove(canvas, e) {
    e = e || window.event;
    e.preventDefault();
    e.stopPropagation();

    let offset = canvas.getBoundingClientRect();
    // Adjust mouse coordinates for canvas margins and coordinate system
    let mouseX = e.clientX - offset.left - (canvas.config?.marginL || 0);
    let mouseY = e.clientY - offset.top - (canvas.config?.marginT || 0);

    await renderSwimmingProgressGraph(canvas, {
        mouseX: mouseX,
        mouseY: mouseY,
    });
}

async function wheelGraph(canvas, e) {
    e = e || window.event;

    if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            await resizeGraphX(e.deltaX > 0 ? -1 : 1, canvas);
        } else {
            resizeGraphY(e.deltaY > 0 ? -1 : 1, canvas);
        }
    } else if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        await resizeGraphX(e.deltaY > 0 ? -1 : 1, canvas);
    }
}

/**
 * Resizes graph horizontally (X-axis zoom)
 * @param {number} delta - Zoom direction (-1 to zoom out, 1 to zoom in)
 * @param {HTMLCanvasElement} canvas - Canvas element to resize
 */
async function resizeGraphX(delta, canvas) {
    canvas = canvas || document.getElementById("canvas");

    let factor = canvas.config.xZoomFactor;
    factor += delta / 10;
    factor = Math.max(0.3, Math.min(20, factor));
    localStorage.setItem("xZoomFactor", factor.toFixed(2));
    await renderSwimmingProgressGraph(canvas, { xZoomFactor: factor });
}

/**
 * Resizes graph vertically (Y-axis zoom)
 * @param {number} delta - Zoom direction (-1 to zoom out, 1 to zoom in)
 * @param {HTMLCanvasElement} canvas - Canvas element to resize
 */
async function resizeGraphY(delta, canvas) {
    canvas = canvas || document.getElementById("canvas");

    let factor = canvas.config.yZoomFactor;
    factor += delta / 10;
    factor = Math.max(0.3, Math.min(10, factor));
    localStorage.setItem("yZoomFactor", factor.toFixed(2));
    await renderSwimmingProgressGraph(canvas, { yZoomFactor: factor });
}

// ================================================================================
// GRAPH COLOR PALETTE
// ================================================================================

/**
 * Graph Color Palette - Colors for different swimmers/curves in progress graphs
 * Each swimmer gets assigned a color from this array in order
 * Colors chosen for good contrast and visual distinction
 */
const graphColors = [
    "#0AF", // Light blue
    "#D85", // Brown
    "#0C4", // Light green
    "#88C", // Purple-blue
    "#EBA", // Light red
    "#8CD", // Cyan
    "#c9E", // Light purple
    "#F9C", // Pink
    "#DD7", // Light yellow
    "#FC5", // Orange
];

// ================================================================================
// SWIMMER COMPARISON FUNCTIONS
// ================================================================================

async function addKeypress(input, e) {
    if (e.key === "Enter") {
        await addSearch(input.value);
    }
}

// New function that searches all ages
async function addSearchAll() {
    const value = document.getElementById("add-input").value;
    if (!value) {
        // If no value, search for 19&Over
        addSearch(null, true);
    } else {
        // If value exists, search all ages
        addSearch(value, true);
    }
}

async function addSearch(value, all) {
    const addingList = document.getElementById("adding-list");
    if (!addingList) {
        console.error("adding-list element not found");
        return;
    }

    addingList.innerHTML = '<div class=""><div class="loader"></div></div>';
    addingList.style.display = 'block';

    try {
        value = value || document.getElementById("add-input").value;
        let html = [];

        if (value || all) {
            // Use window.loadSearch to call the exported function from swimmer.js
            console.log("Calling loadSearch with:", value, all);
            let list = await window.loadSearch(value, all);
            console.log("loadSearch returned:", list);

            if (list && list.length > 0) {
                // Check if it's the simple array format [name, age, club, lsc, pkey]
                if (Array.isArray(list[0]) && !list.idx) {
                    // Simple array format like showSearch expects
                    html.push(
                        '<table style="cursor:pointer;border-collapse:collapse; width: 100%;" class="left"><tbody>',
                        '<tr style="background: #f0f0f0; font-weight: bold;"><td>Name</td><td>Age</td><td>Club</td><td>LSC</td></tr>'
                    );
                    for (let row of list) {
                        if (row && row.length >= 5) {
                            const [name, age, club, lsc, pkey] = row;
                            html.push(
                                `<tr onclick="addSwimmer(${pkey})" style="cursor: pointer; border-bottom: 1px solid #eee;">`,
                                `<td style="padding: 5px;">${name || 'Unknown'}</td>`,
                                `<td style="padding: 5px;">${age || '-'}</td>`,
                                `<td style="padding: 5px;">${club || '-'}</td>`,
                                `<td style="padding: 5px;">${lsc || '-'}</td>`,
                                `</tr>`
                            );
                        }
                    }
                    html.push("</tbody></table>");
                } else if (list.idx) {
                    // Format with idx property
                    let idx = list.idx;
                    html.push(
                        '<table style="cursor:pointer;border-collapse:collapse; width: 100%;" class="left"><tbody>',
                        '<tr style="background: #f0f0f0; font-weight: bold;"><td>Name</td><td>Age</td><td>LSC</td><td>Club</td></tr>'
                    );
                    for (let row of list) {
                        if (row && row[idx.pkey]) {
                            const name = row[idx.name] || 'Unknown';
                            const age = row[idx.age] || '-';
                            const lsc = row[idx.lsc] || '-';
                            const clubName = row[idx.clubName] || '-';
                            html.push(
                                `<tr onclick="addSwimmer(${row[idx.pkey]})" style="cursor: pointer; border-bottom: 1px solid #eee;">`,
                                `<td style="padding: 5px;">${name}</td>`,
                                `<td style="padding: 5px;">${age}</td>`,
                                `<td style="padding: 5px;">${lsc}</td>`,
                                `<td style="padding: 5px;">${clubName}</td>`,
                                `</tr>`
                            );
                        }
                    }
                    html.push("</tbody></table>");
                } else {
                    console.error("Unknown search result format:", list);
                    html.push('<p style="color: red;">Error: Unknown search results format</p>');
                }
            } else {
                html.push('<p>No swimmers found</p>');
            }
        } else {
            html.push('<p>Please enter a swimmer name or click to see 19&Over swimmers</p>');
        }

        html.push('<p class="tip" style="margin-top: 10px; font-size: 12px; color: #666;">Click on a row to add the swimmer to the graph.</p>');
        html.push('<button onclick="closeSearchResults()" style="margin-top: 10px; padding: 4px 8px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 3px; cursor: pointer;">Close</button>');

        addingList.innerHTML = html.join("");
    } catch (error) {
        console.error("Error in addSearch:", error);
        addingList.innerHTML = `<p style="color: red;">Error searching: ${error.message}</p>
            <button onclick="closeSearchResults()" style="margin-top: 10px; padding: 4px 8px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 3px; cursor: pointer;">Close</button>`;
    }
}

function closeSearchResults() {
    const addingList = document.getElementById("adding-list");
    if (addingList) {
        addingList.style.display = 'none';
        addingList.innerHTML = '';
    }
}

async function addSwimmer(pkey) {
    const addingList = document.getElementById("adding-list");
    if (addingList) {
        addingList.innerHTML = '<div class="loading"><div class="loader"></div></div>';
    }

    let canvas = document.getElementById("canvas");
    let swimmerList = canvas.config.swimmerList;

    let skip = false;
    for (let swimmer of swimmerList) {
        if (swimmer.swimmer.pkey == pkey) {
            skip = true;
            break;
        }
    }

    if (!skip) {
        let swimmer = await window.loadSwimmerDetails(pkey);
        swimmerList.push(swimmer);
        await updateSwimmerList(canvas.config);
    }

    // Close the search results after adding
    closeSearchResults();
}

async function removeSwimmer(pkey) {
    let canvas = document.getElementById("canvas");
    let swimmerList = canvas.config.swimmerList;

    for (let [i, s] of swimmerList.entries()) {
        if (s.swimmer.pkey == pkey) {
            swimmerList.splice(i, 1);
            break;
        }
    }

    await updateSwimmerList(canvas.config);
}

async function checkSwimmer(elem, pkey) {
    let canvas = document.getElementById("canvas");
    let swimmerList = canvas.config.swimmerList;

    for (let s of swimmerList) {
        if (s.swimmer.pkey == pkey) {
            s.hide = !elem.checked;
            break;
        }
    }

    await renderSwimmingProgressGraph(canvas);
}

async function updateSwimmerList(config) {
    let html = [];

    if (config.swimmerList.length > 1) {
        html.push(
            createPopup(
                createCheckbox(
                    "age-align",
                    "Align by Age",
                    config.ageAlign,
                    "showGraph(null,{ageAlign:this.checked})",
                ),
                `Compare swimmers' times at the same age.`,
            ),
        );
    }

    for (let swimmer of config.swimmerList) {
        let id = "s_" + swimmer.swimmer.pkey;
        // Use proper name display logic
        let name = getSwimmerDisplayName(swimmer.swimmer);
        
        // Get birthday for display - try to load from birthday dictionary
        let displayName = name;
        try {
            let birthday = null;
            if (swimmer.swimmer.birthday) {
                birthday = swimmer.swimmer.birthday;
            } else if (window._birthdayDictionary && swimmer.swimmer.pkey) {
                birthday = await window._birthdayDictionary.load(swimmer.swimmer.pkey);
            }
            
            if (birthday && Array.isArray(birthday) && birthday.length >= 2) {
                const [left, right] = birthday;
                const leftDate = left instanceof Date ? left : new Date(left);
                const year = leftDate.getFullYear();
                const month = leftDate.toLocaleString('default', { month: 'long' });
                displayName = `${name} (born ~${month} ${year})`;
            } else if (swimmer.swimmer.age) {
                // Fallback to age-based estimate
                const currentYear = new Date().getFullYear();
                const birthYear = currentYear - swimmer.swimmer.age;
                displayName = `${name} (born ~${birthYear})`;
            }
        } catch (e) {
            console.log('Error loading birthday for toggle:', e);
            // If error, just use name without birthday
        }
        
        html.push(
            createCheckbox(
                id,
                displayName,
                !swimmer.hide,
                `checkSwimmer(this,${swimmer.swimmer.pkey})`,
            ),
            `<button class="xbutton" onclick="removeSwimmer(${swimmer.swimmer.pkey})" style="font-size: 12px; padding: 2px 4px; line-height: 1; min-width: auto; width: auto; height: auto;">❌</button>`,
        );
    }

    document.getElementById("swimmer-list").innerHTML = html.join("");
    await renderSwimmingProgressGraph();
}

function getSwimmerDisplayName(swimmer) {
    if (swimmer.firstName && swimmer.lastName) {
        let firstName = swimmer.firstName.trim();
        let lastName = swimmer.lastName.trim();

        // Remove duplicate consecutive words from firstName (e.g., "Jacob Jacob" -> "Jacob")
        let words = firstName.split(" ");
        let cleanedWords = [];
        for (let i = 0; i < words.length; i++) {
            if (i === 0 || words[i] !== words[i - 1]) {
                cleanedWords.push(words[i]);
            }
        }
        firstName = cleanedWords.join(" ");

        // If firstName already contains lastName anywhere in it, just use firstName
        if (
            firstName.toLowerCase().includes(lastName.toLowerCase()) &&
            firstName.toLowerCase() !== lastName.toLowerCase()
        ) {
            // Check for pattern like "Ray Ray Tang" where the first name is duplicated
            let firstNameWords = firstName.split(" ");
            if (
                firstNameWords.length >= 3 &&
                firstNameWords[0] === firstNameWords[1] &&
                firstNameWords[firstNameWords.length - 1].toLowerCase() === lastName.toLowerCase()
            ) {
                // Pattern: "Ray Ray Tang" -> "Ray Tang"
                return firstNameWords[0] + " " + lastName;
            } else {
                // Just use the firstName as-is since it already contains the full name
                return firstName;
            }
        } else {
            // Normal case: combine cleaned firstName + lastName
            return firstName + " " + lastName;
        }
    } else {
        let firstName = (swimmer.firstName || "").trim();
        // Remove duplicate consecutive words even if no lastName
        if (firstName) {
            let words = firstName.split(" ");
            let cleanedWords = [];
            for (let i = 0; i < words.length; i++) {
                if (i === 0 || words[i] !== words[i - 1]) {
                    cleanedWords.push(words[i]);
                }
            }
            firstName = cleanedWords.join(" ");
        }
        return firstName + " " + (swimmer.lastName || "");
    }
}

// ================================================================================
// GLOBAL EXPORTS
// ================================================================================

// ================================================================================
// CANVAS DRAWING FUNCTIONS
// ================================================================================

function drawXYscale(ctx, config) {
    let birthday = null;
    if (
        config.ageAlign &&
        config.values &&
        config.values.length > 0 &&
        config.values[0] &&
        config.values[0].birthday
    ) {
        birthday = config.values[0].birthday;
    }
    let width = config.width;
    let height = config.height;
    let earliest = config.earliest;
    let latest = config.latest;
    let fastest = config.fastest;
    let slowest = config.slowest;
    let delta = config.delta;
    let duration = config.duration;

    // Add subtle background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "rgba(245, 247, 250, 0.5)");
    bgGradient.addColorStop(1, "rgba(255, 255, 255, 0.8)");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw horizontal grid lines for time values
    ctx.strokeStyle = "rgba(200, 200, 200, 0.3)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([5, 5]);

    for (let i = 1; i < 10; i++) {
        let y = (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    ctx.setLineDash([]); // Reset line dash

    // draw the axis with modern styling
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#3498db";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height);
    ctx.lineTo(width, height);
    ctx.lineTo(width, 0);

    // draw the x-scale with month labels when zoomed in
    if (!birthday) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Calculate the duration in months for determining label density
        const durationInMonths = Math.ceil(duration / (30 * 24 * 60 * 60 * 1000));
        const showMonthLabels = config.timeRangeMonths && config.timeRangeMonths <= 12;
        const showEveryMonth = config.timeRangeMonths && config.timeRangeMonths <= 6;

        let lastLabelX = -100; // Track last label position to avoid overlap

        for (
            let date = new Date(earliest);
            date < latest;
            date.setUTCMonth(date.getUTCMonth() + 1)
        ) {
            let x = ((date - earliest) / duration) * width;
            ctx.moveTo(x, height);

            const isJanuary = date.getUTCMonth() === 0;
            const month = date.getUTCMonth();

            // Determine if we should show a label for this month
            let showLabel = false;
            let labelText = "";

            if (showEveryMonth) {
                // Show every month when zoomed in to 6 months or less
                showLabel = true;
                labelText = monthNames[month];
                if (isJanuary) {
                    labelText += ` '${String(date.getUTCFullYear()).slice(-2)}`;
                }
            } else if (showMonthLabels) {
                // Show every other month or quarterly for 6-12 month range
                if (month % 3 === 0) {
                    showLabel = true;
                    labelText = monthNames[month];
                    if (isJanuary) {
                        labelText += ` ${date.getUTCFullYear()}`;
                    }
                }
            } else if (isJanuary) {
                // Default: show only years
                showLabel = true;
                labelText = date.getUTCFullYear().toString();
            } else if (!config.timeRangeMonths && month % 6 === 0) {
                // When showing all data, show mid-year marks
                showLabel = true;
                labelText = monthNames[month].substring(0, 1);
            }

            // Draw tick marks
            if (isJanuary) {
                ctx.lineTo(x, height - 12);
            } else if (showMonthLabels) {
                ctx.lineTo(x, height - 8);
            } else {
                ctx.lineTo(x, height - (month % 6 === 0 ? 9 : 5));
            }

            // Draw labels with overlap prevention
            if (showLabel && x - lastLabelX > 30) {
                ctx.save();
                ctx.font = showMonthLabels ? "600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" : "600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
                ctx.fillStyle = "#2c3e50";

                // Center align the text
                ctx.textAlign = "center";
                ctx.fillText(labelText, x, height + 18);

                lastLabelX = x;
                ctx.restore();
            }
        }
    }
    ctx.stroke();

    // draw the y-scale with modern styling
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#95a5a6";
    ctx.fillStyle = "#2c3e50";
    ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    let lineHeight = 50;
    let fontHeight = 20;
    let interval = Math.ceil(delta / 100 / (height / fontHeight)) * 100;
    for (let t = fastest; t <= slowest; t += interval) {
        let y = height - ((t - fastest) / delta) * height;
        if (t > fastest) {
            ctx.strokeStyle = "lightgray";
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        let time = window.formatTime ? window.formatTime(t).slice(0, -3) : `${(t/100).toFixed(2)}`;
        ctx.fillStyle = "blue";
        ctx.fillText(time, -5 - ctx.measureText(time).width, y + 3);
        ctx.fillText(time, width + 5, y + 3);
    }
}

function drawAgeDots(ctx, config) {
    if (config.swimmerList.length > 1 && !config.ageAlign) {
        return;
    }
    if (
        !config.values ||
        config.values.length === 0 ||
        !config.values[0] ||
        !config.values[0].birthday
    ) {
        return;
    }
    let birthday = config.values[0].birthday;

    for (
        let d = new Date(birthday);
        d < config.latest;
        d.setUTCFullYear(d.getUTCFullYear() + 1)
    ) {
        let x = ((d - config.earliest) / config.duration) * config.width;
        if (x < 1) continue;

        ctx.beginPath();
        ctx.strokeStyle = ctx.fillStyle = "#89F";
        ctx.setLineDash([5, 5]);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, config.height);
        ctx.stroke();
        ctx.fillText(d.getUTCFullYear() - birthday.getUTCFullYear(), x + 5, 10);
    }
}

function drawCurve(ctx, config) {
    let idx = config.idx;
    ctx.font = "600 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.setLineDash([]);
    let tipRow;
    let topTextOffset = 20;

    // Modern color palette with better contrast
    const modernColors = [
        '#3498db',  // Bright blue
        '#e74c3c',  // Red
        '#2ecc71',  // Green
        '#f39c12',  // Orange
        '#9b59b6',  // Purple
        '#1abc9c',  // Turquoise
        '#34495e',  // Dark gray
        '#e67e22'   // Dark orange
    ];

    for (let [index, value] of config.values.entries()) {
        const color = modernColors[index % modernColors.length];
        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        if (value.length > 0) {
            ctx.fillText(config.eventStrs[index], topTextOffset, -10);
            let offset = ctx.measureText(config.eventStrs[index]).width;
            if (config.drawName) {
                ctx.fillText(value.name, topTextOffset, -30);
                offset = Math.max(offset, ctx.measureText(value.name).width);
            }
            topTextOffset += offset + 30;
        }

        let pre;
        for (let row of value) {
            if (!row || row[idx.time] === undefined || row[idx.date] === undefined) {
                continue;
            }
            let t = window.timeToInt(row[idx.time]);
            // Subtract bdayOffset to shift younger swimmers left (earlier) to align by age
            const originalDate = new Date(row[idx.date]);
            const offsetMs = (value.bdayOffset || 0);
            let d = new Date(originalDate.getTime() - offsetMs);

            // Debug logging for first point of each swimmer
            if (!value._debugged) {
                console.log(`Drawing ${value.name}: Original date: ${originalDate.toISOString()}, Offset: ${offsetMs}ms (${offsetMs/1000/60/60/24} days), New date: ${d.toISOString()}`);
                value._debugged = true;
            }

            let x = ((d - config.earliest) / config.duration) * config.width;
            let y = config.height - ((t - config.fastest) / config.delta) * config.height;

            if (pre) {
                // Draw line with increased thickness and smoothness
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Add subtle shadow for depth
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetY = 2;

                ctx.beginPath();
                ctx.moveTo(pre[0], pre[1]);
                ctx.lineTo(x, y);
                ctx.stroke();

                ctx.restore();
            }

            // Draw data points with better styling
            ctx.save();

            // Outer glow effect
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;

            // White background circle
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fill();

            // Colored ring
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.stroke();

            // Inner colored dot
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();

            ctx.restore();

            // Check for tooltip hit detection
            if (!tipRow && config.mouseX && config.mouseY) {
                let dx = config.mouseX - x;
                let dy = config.mouseY - y;
                if (Math.sqrt(dx * dx + dy * dy) <= 15) {
                    tipRow = [row, x, y, value.name];
                }
            }

            pre = [x, y];
        }
    }

    return tipRow;
}

function drawTip(ctx, tipRow, config) {
    if (!tipRow) {
        return;
    }
    let idx = config.idx;
    let [row, x, y, name] = tipRow;
    ctx.beginPath();
    ctx.strokeStyle = "blue";
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.stroke();

    let meetName = "Unknown Meet";
    if (config.meetDict && config.meetDict.get && config.meetDict.idx) {
        let meetData = config.meetDict.get(row[idx.meet]);
        if (meetData && meetData[config.meetDict.idx.name]) {
            meetName = meetData[config.meetDict.idx.name];
        }
    }

    let dateAge =
        (window.formatDate ? window.formatDate(row[idx.date]) : row[idx.date]) +
        "   " +
        (window._eventList ? window._eventList[row[idx.event]].split(" ").pop() : "SCY") +
        "   Age:" +
        (row[idx.age] || "?");

    let timeStd =
        row[idx.time] +
        "     " +
        (window.formatStandard ? window.formatStandard(row[idx.std]) : "") +
        (config.drawName ? "  (" + name + ")" : "");

    // Create modern tooltip with gradient background and shadow
    let padding = 6;
    let lineHeight = 16;

    // Measure text with correct fonts for accurate width calculation
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    let timeWidth = ctx.measureText(timeStd).width;
    ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    let dateWidth = ctx.measureText(dateAge).width;
    let meetWidth = ctx.measureText(meetName).width;

    let tooltipWidth = Math.max(timeWidth, Math.max(meetWidth, dateWidth)) + padding * 2;
    let tooltipHeight = 3 * lineHeight + padding * 2;

    // Store tooltip dimensions in config for hit detection
    config.tooltipBounds = {
        x: x + 5,
        y: y - tooltipHeight,
        width: tooltipWidth,
        height: tooltipHeight,
    };

    // Draw shadow
    ctx.beginPath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    if (ctx.roundRect) {
        ctx.roundRect(x + 7, y - tooltipHeight + 2, tooltipWidth, tooltipHeight, 8);
    } else {
        ctx.fillRect(x + 7, y - tooltipHeight + 2, tooltipWidth, tooltipHeight);
    }
    ctx.fill();

    // Draw main tooltip background with gradient
    let gradient = ctx.createLinearGradient(x + 5, y - tooltipHeight, x + 5, y);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, "#f8f9fa");
    ctx.beginPath();
    ctx.fillStyle = gradient;
    if (ctx.roundRect) {
        ctx.roundRect(x + 5, y - tooltipHeight, tooltipWidth, tooltipHeight, 8);
    } else {
        ctx.fillRect(x + 5, y - tooltipHeight, tooltipWidth, tooltipHeight);
    }
    ctx.fill();

    // Draw border
    ctx.beginPath();
    ctx.strokeStyle = "#e9ecef";
    ctx.lineWidth = 1;
    if (ctx.roundRect) {
        ctx.roundRect(x + 5, y - tooltipHeight, tooltipWidth, tooltipHeight, 8);
    } else {
        ctx.strokeRect(x + 5, y - tooltipHeight, tooltipWidth, tooltipHeight);
    }
    ctx.stroke();

    // Draw text with better styling
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#0C2340";
    ctx.fillText(
        timeStd,
        x + padding + 2,
        y - tooltipHeight + padding + lineHeight,
    );

    ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#495057";
    ctx.fillText(
        dateAge,
        x + padding + 2,
        y - tooltipHeight + padding + 2 * lineHeight,
    );

    // Meet name in orange
    ctx.fillStyle = "#ff7f00";
    ctx.fillText(
        meetName,
        x + padding + 2,
        y - tooltipHeight + padding + 3 * lineHeight,
    );
}

// ================================================================================
// CANVAS GRAPH RENDERING (MERGED FROM scripts.js)
// ================================================================================

/**
 * Main function to render swimming progress graphs on canvas
 * @param {HTMLCanvasElement} canvas - Canvas element to draw on
 * @param {Object} config - Graph configuration (pkey, event, mouse coords, etc.)
 */
async function renderSwimmingProgressGraph(canvas, config) {
    console.log("renderSwimmingProgressGraph called with:", { canvas, config });

    try {
        // Progress Graph is now the 4th tab (index 3)
        TabView.tab("swimmerTabView", 3);

        canvas = canvas || document.getElementById("canvas");
        console.log("Canvas element:", canvas);

        if (!canvas) {
            console.error("Canvas element not found!");
            return;
        }

        config = canvas.config = mergeConfig(
            canvas.config || (await createDefaultGraphConfig(config.pkey)),
            config,
        );

        console.log("Graph config:", config);
    } catch (error) {
        console.error("Error in renderSwimmingProgressGraph:", error);
    }

    if (config.swimmerList.length == 0) {
        config.swimmerList.push(await window.loadSwimmerDetails(config.pkey));
    }

    // Ensure we have a valid event - default to freestyle 100 if none provided
    if (!config.event) {
        config.event = 2; // 100 FR SCY
        console.log("showGraph: No event specified, defaulting to 100 FR SCY");
    }

    await prepareGraphData(config);

    // Clear any previous tooltip only when event actually changes
    if (config.lastEvent !== config.event) {
        config.currentTipRow = null;
        config.tooltipBounds = null;
        config.lastEvent = config.event;
        console.log("Graph event changed, clearing tooltips");
    }

    // prepare the canvas with high-DPI support for crisp text
    let dpr = window.devicePixelRatio || 1;
    config.dpr = dpr; // Store DPR in config for consistent use
    let displayWidth = config.width + config.marginL + config.marginR;
    let displayHeight = config.height + config.marginT + config.marginB;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = displayWidth + "px";
    canvas.style.height = displayHeight + "px";

    let ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.translate(config.marginL, config.marginT);

    // Improve text rendering
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.font =
        "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    // Enable text antialiasing and subpixel rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    canvas.classList.remove("hide");

    drawXYscale(ctx, config);
    drawAgeDots(ctx, config);
    let tipRow = drawCurve(ctx, config);

    // Store the current tooltip for sticky behavior
    if (tipRow) {
        config.currentTipRow = tipRow;
    } else if (!tipRow && config.currentTipRow && config.tooltipBounds) {
        // Check if mouse is still over the tooltip area before clearing
        let bounds = config.tooltipBounds;
        let mouseOverTooltip =
            config.mouseX >= bounds.x &&
            config.mouseX <= bounds.x + bounds.width &&
            config.mouseY >= bounds.y &&
            config.mouseY <= bounds.y + bounds.height;

        if (!mouseOverTooltip) {
            // Only clear tooltip if mouse is not over tooltip area
            config.currentTipRow = null;
            config.tooltipBounds = null;
        }
    }

    // Draw the tooltip (either new or sticky)
    let tooltipToShow = tipRow || config.currentTipRow;
    if (tooltipToShow) {
        drawTip(ctx, tooltipToShow, config);
    }
}

function mergeConfig(config, newConfig) {
    config = config || {};
    for (let key in newConfig) {
        config[key] = newConfig[key];
    }
    return config;
}

/**
 * Creates default graph configuration with swimmer data
 * @param {number} pkey - Swimmer's unique identifier
 * @returns {Object} Default graph configuration object
 */
async function createDefaultGraphConfig(pkey) {
    let swimmer = await window.loadSwimmerDetails(pkey);
    console.log("defaultConfig - swimmer loaded:", !!swimmer);
    if (!swimmer) {
        console.log(
            "defaultConfig - swimmer is undefined, returning minimal config",
        );
        return {
            pkey: pkey,
            swimmerList: [],
            mouseX: 0,
            mouseY: 0,
            ageAlign: false,
            SCY: true,
            SCM: true,
            LCM: true,
            xZoomFactor: 1,
            yZoomFactor: 1,
            meetDict: null,
            event: null,
            idx: null,
        };
    }
    return {
        pkey: pkey,
        swimmerList: [swimmer],
        mouseX: 0,
        mouseY: 0,
        ageAlign: false,
        SCY: true,
        SCM: true,
        LCM: true,
        xZoomFactor: parseFloat(localStorage.getItem("xZoomFactor")) || 1,
        yZoomFactor: parseFloat(localStorage.getItem("yZoomFactor")) || 1,
        meetDict: swimmer.meetDict,
        event:
            swimmer.events && swimmer.events.idx && swimmer.events.length > 0
                ? swimmer.events[swimmer.events.length - 1][
                      swimmer.events.idx.event
                  ]
                : null,
        idx: swimmer.events ? swimmer.events.idx : null,
    };
}

async function prepareGraphData(config) {
    // Initialize config.values as empty array to prevent undefined errors
    config.values = [];

    if (!config.event || !_eventList[config.event]) {
        console.log("prepareGraphData: invalid event", config.event);
        return;
    }

    let [dist, stroke, course] = _eventList[config.event].split(" ");
    let idx = config.idx;

    if (!idx || !idx.event) {
        console.log(
            "prepareGraphData: invalid idx mapping",
            idx,
            "using fallback",
        );
        // Create fallback idx mapping based on known structure
        idx = {
            time: 0,
            age: 1,
            std: 2,
            lsc: 3,
            club: 4,
            date: 5,
            event: 6,
            meet: 7,
            gender: 8,
        };
        // Update config.idx so other functions can use the fallback
        config.idx = idx;
    }

    // Ensure meetDict is loaded and has proper idx mapping
    if (!config.meetDict) {
        console.log(
            "prepareGraphData: meetDict is null, loading real meet data",
        );
        if (config.swimmerList && config.swimmerList.length > 0) {
            let swimmer = config.swimmerList[0];
            if (swimmer.events && swimmer.events.length > 0 && idx) {
                // Extract unique meet IDs from events
                let meets = new Set(swimmer.events.map((e) => e[idx.meet]));

                // Load meetDict synchronously using the global dictionary
                try {
                    // Try to load from cache first, then make async call
                    config.meetDict = _meetDictinary;

                    // Load the meets asynchronously and update the graph when done
                    _meetDictinary
                        .loadMeets(meets)
                        .then((loadedMeetDict) => {
                            console.log(
                                "prepareGraphData: meet data loaded, updating graph",
                            );
                            config.meetDict = loadedMeetDict;

                            // Force a redraw of the graph with the new meet data
                            if (document.getElementById("canvas")) {
                                renderSwimmingProgressGraph(
                                    document.getElementById("canvas"),
                                    {},
                                );
                            }
                        })
                        .catch((error) => {
                            console.log(
                                "prepareGraphData: failed to load meet data:",
                                error,
                            );
                        });
                } catch (error) {
                    console.log(
                        "prepareGraphData: error loading meets:",
                        error,
                    );
                }
            }
        }

        // If still no meetDict, create fallback
        if (!config.meetDict) {
            console.log("prepareGraphData: creating fallback meetDict");
            config.meetDict = new Map();
            config.meetDict.get = function (meetId) {
                return [
                    new Date().toISOString().split("T")[0],
                    `Meet ${meetId}`,
                ];
            };
        }
    }

    if (config.meetDict && !config.meetDict.idx) {
        console.log("prepareGraphData: meetDict missing idx, adding fallback");
        config.meetDict.idx = { date: 0, name: 1 };
    }

    let eventStrs = [];
    let values = [];
    let slowest = 0;
    let fastest = Infinity;
    let earliest = new Date();
    let latest = new Date(0);

    let baseBirthday;
    for (let swimmer of config.swimmerList) {
        if (swimmer.hide) {
            continue;
        }

        // Use the birthday dictionary like the swimmer page does
        let birthday = await window._birthdayDictionary.load(swimmer.swimmer.pkey);
        console.log(`Birthday data for ${swimmer.swimmer.firstName} ${swimmer.swimmer.lastName} from dictionary:`, birthday, "Age:", swimmer.swimmer.age);

        let bday;
        if (birthday && Array.isArray(birthday) && birthday.length >= 2) {
            // Birthday is a range [left, right] from the dictionary
            let [left, right] = birthday;
            // Take the midpoint of the range
            bday = new Date(
                (new Date(right).getTime() + new Date(left).getTime()) / 2,
            );
            console.log(`Using birthday from dictionary: ${left} to ${right}, midpoint: ${bday}`);
        } else {
            console.log(
                "No birthday in dictionary, using fallback for swimmer",
                swimmer.swimmer.pkey,
                "based on age",
                swimmer.swimmer.age,
            );
            // Provide a fallback birthday based on age
            let currentYear = new Date().getFullYear();
            let estimatedBirthYear = currentYear - (swimmer.swimmer.age || 15);
            bday = new Date(`${estimatedBirthYear}-07-01`); // Use July 1 as midpoint
        }
        if (!baseBirthday) {
            baseBirthday = bday;
        }
        let bdayOffset = config.ageAlign ? bday - baseBirthday : 0;
        console.log(`Swimmer: ${swimmer.swimmer.firstName}, Birthday: ${bday}, Base: ${baseBirthday}, Offset: ${bdayOffset}, AgeAlign: ${config.ageAlign}`);

        for (let c of _courseOrder) {
            if (!config[c]) {
                continue;
            }
            let eventStr = fixDistance(`${dist} ${stroke} ${c}`);
            let evt = _eventIndexMap.get(eventStr);
            let value = swimmer.events.filter((e) => e[idx.event] == evt);

            // Use proper name display logic
            let displayName = getSwimmerDisplayName ? getSwimmerDisplayName(swimmer.swimmer) :
                             (swimmer.swimmer.firstName || "") + " " + (swimmer.swimmer.lastName || "");

            value.name = displayName;
            value.birthday = bday;
            value.bdayOffset = bdayOffset;

            for (let row of value) {
                let t = window.timeToInt(row[idx.time]);
                slowest = Math.max(slowest, t);
                fastest = Math.min(fastest, t);
            }
            eventStrs.push(eventStr);
            values.push(value);
        }

        for (let row of swimmer.events) {
            // Subtract bdayOffset to shift younger swimmers left (earlier) to align by age
            let d = new Date(new Date(row[idx.date]).getTime() - bdayOffset);
            earliest = min(earliest, d);
            latest = max(latest, d);
        }
    }

    // Store the full data range for graph sizing
    let fullEarliest = new Date(earliest);
    let fullLatest = new Date(latest);
    fullLatest.setUTCMonth(fullLatest.getUTCMonth() + 2);
    fullEarliest.setUTCMonth(fullEarliest.getUTCMonth() - 1);
    fullEarliest.setUTCDate(1);
    fullEarliest.setUTCHours(0);
    if (config.ageAlign) {
        fullEarliest.setUTCDate(baseBirthday.getUTCDate());
    }

    // Apply time range filter if set
    if (config.minDate && config.maxDate) {
        // Set the visible range for the zoomed view
        earliest = new Date(config.minDate);
        latest = new Date(config.maxDate);

        // Don't filter the values - keep all data but adjust the visible range
        // This allows smooth panning/zooming while maintaining all data points

        // Add some padding to the time range for better visualization
        latest.setDate(latest.getDate() + 15);  // Add 15 days padding
        earliest.setDate(earliest.getDate() - 15);  // Subtract 15 days padding
    } else {
        // Default behavior when no time range is set (Max)
        earliest = new Date(fullEarliest);
        latest = new Date(fullLatest);
    }
    let delta = (slowest - fastest) * 0.1;
    slowest += delta;
    fastest = Math.floor((fastest - delta) / 100) * 100;

    config.drawName = config.swimmerList.length > 1;
    config.eventStrs = eventStrs;
    config.values = values;
    config.slowest = slowest;
    config.fastest = fastest;
    config.earliest = earliest;
    config.latest = latest;

    // Store full data range for reference
    config.fullEarliest = fullEarliest;
    config.fullLatest = fullLatest;

    config.duration = latest - earliest;
    config.delta = slowest - fastest;

    // Keep the graph width constant regardless of time range
    // This creates a zoom effect where the same width shows different time periods
    config.width = 398 * config.xZoomFactor;
    config.height = 400 * config.yZoomFactor;
    config.marginL = 50;
    config.marginR = 100;
    config.marginT = 50;
    config.marginB = 30;
}

// ================================================================================
// GLOBAL EXPORTS
// ================================================================================

// Ensure exports happen even if there were errors earlier
try {
    if (typeof createProgressGraph === 'function') {
        window.createProgressGraph = createProgressGraph;
        console.log("graphs.js: createProgressGraph exported successfully");
    } else {
        console.error("graphs.js: createProgressGraph function not defined!");
    }
} catch (e) {
    console.error("graphs.js: Error exporting createProgressGraph:", e);
}
window.onCanvasMouseMove = onCanvasMouseMove;
window.wheelGraph = wheelGraph;
window.resizeGraphX = resizeGraphX;
window.resizeGraphY = resizeGraphY;
window.addKeypress = addKeypress;
window.addSearch = addSearch;
window.addSearchAll = addSearchAll;
window.addSwimmer = addSwimmer;
window.removeSwimmer = removeSwimmer;
window.closeSearchResults = closeSearchResults;
window.checkSwimmer = checkSwimmer;
window.drawXYscale = drawXYscale;
window.drawAgeDots = drawAgeDots;
window.drawCurve = drawCurve;
window.drawTip = drawTip;

// Time range functionality
window.setGraphTimeRange = async function(pkey, months, button) {
    console.log(`Setting graph time range to ${months} months`);

    // Update button states
    const buttons = document.querySelectorAll('.time-range-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');

    // Get the canvas and current config
    const canvas = document.getElementById('canvas');
    if (!canvas || !canvas.config) {
        console.error('Canvas or config not found');
        return;
    }

    // Store the selected time range
    canvas.config.timeRangeMonths = months;

    // If months is 0, show all data (Max)
    if (months === 0) {
        canvas.config.minDate = null;
        canvas.config.maxDate = null;
    } else {
        // Calculate the date range
        const now = new Date();
        const endDate = now;
        const startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - months);

        canvas.config.minDate = startDate;
        canvas.config.maxDate = endDate;

        console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    }

    // Redraw the graph with the new range
    await renderSwimmingProgressGraph(canvas, canvas.config);
};

// Merged exports from scripts.js
window.showGraph = renderSwimmingProgressGraph; // Keep old name for HTML onclick handlers
window.renderSwimmingProgressGraph = renderSwimmingProgressGraph;
window.createDefaultGraphConfig = createDefaultGraphConfig;
window.prepareGraphData = prepareGraphData;
