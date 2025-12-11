/**
 * ================================================================================
 * SWIM TRACKER - GRAPHS MODULE
 * ================================================================================
 * 
 * Interactive progress graph functionality with canvas rendering.
 * Handles graph creation, drawing, tooltips, and user interactions.
 */

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

        console.log("About to process event buttons, _eventList length:", _eventList?.length);
        html.push('<div class="match-size top-margin">');
        for (let i = 1; i < _eventList.length; ++i) {
        let [d, s, c] = _eventList[i].split(" ");
        if (c == "SCY" && d != "_" && (d != "25" || !hide25)) {
            html.push(
                `<button class="d${d} ${s}" style="border:1px solid;width:45px;"`,
                ` onclick="showGraph(null,{pkey:${pkey},event:${i}})">${s}<br>${d}</button>`,
            );
        }
    }
    html.push("</div>");

    html.push('<h2 id="graph-title"></h2>');

    let searchDropdown = new Dropdown(
        "add-search",
        '<div class="center-row" onclick="event.stopPropagation()"><input id="add-input" onkeypress="addKeypress(this, event)"><button onclick="addSearch()">Search</button><button onclick="addSearch(null, true)">19&Over</button></div>',
        '<div id="adding-list" onclick="event.stopPropagation()"></div>',
    );

    html.push(
        '<div class="add-search"><div>Compare progress with other swimmers:</div>',
        searchDropdown.render(),
        "</div>",
    );

    html.push("</div>");

    html.push('<div class="top-margin">');
    for (let c of _courseOrder) {
        html.push(
            createCheckbox(
                "show-" + c.toLocaleLowerCase(),
                c,
                true,
                `showGraph(null,{${c}:this.checked})`,
            ),
        );
    }
    html.push(
        '<span style="display:inline-block"><span id="swimmer-list" class="center-row"></span></span></div>',
    );

    html.push(
        '<canvas id="canvas" class="hide" onmousemove="onCanvasMouseMove(this, event)" onwheel="wheelGraph(this, event)"></canvas>',
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

async function addSearch(value, all) {
    document.getElementById("adding-list").innerHTML =
        '<div class=""><div class="loader"></div></div>';
    let dropdown = Dropdown.get("add-search");
    dropdown.open();

    value = value || document.getElementById("add-input").value;
    let html = [];
    if (value) {
        let list = await loadSearch(value, all);
        let idx = list.idx;
        html.push(
            '<table style="cursor:pointer;border-collapse:collapse;" class="left"><tbody>',
        );
        for (let row of list) {
            html.push(
                `<tr onclick="addSwimmer(${row[idx.pkey]})"><td>${row[idx.name]}</td><td>${row[idx.age]}</td><td>${row[idx.lsc]}</td><td>${row[idx.clubName]}</td></tr>`,
            );
        }
        html.push("</tbody></table>");
    }
    html.push('<p class="tip">Click on the row to add the swimmer.</p>');

    document.getElementById("adding-list").innerHTML = html.join("");
}

async function addSwimmer(pkey) {
    document.getElementById("adding-list").innerHTML =
        '<div class="loading"><div class="loader"></div></div>';

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
        let swimmer = await loadSwimmerDetails(pkey);
        swimmerList.push(swimmer);
        await updateSwimmerList(canvas.config);
    }

    let dropdown = Dropdown.get("add-search");
    dropdown.close();
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
        
        html.push(
            createCheckbox(
                id,
                name,
                !swimmer.hide,
                `checkSwimmer(this,${swimmer.swimmer.pkey})`,
            ),
            `<button class="xbutton" onclick="removeSwimmer(${swimmer.swimmer.pkey})">❌</button>`,
        );
    }

    document.getElementById("swimmer-list").innerHTML = html.join("");
    await renderSwimmingProgressGraph();
}

function getSwimmerDisplayName(swimmer) {
    if (swimmer.firstName && swimmer.lastName) {
        let firstName = swimmer.firstName.trim();
        let lastName = swimmer.lastName.trim();

        // If firstName already contains lastName anywhere in it, just use firstName
        if (
            firstName.toLowerCase().includes(lastName.toLowerCase()) &&
            firstName.toLowerCase() !== lastName.toLowerCase()
        ) {
            // Check for pattern like "Ray Ray Tang" where the first name is duplicated
            let words = firstName.split(" ");
            if (
                words.length >= 3 &&
                words[0] === words[1] &&
                words[words.length - 1].toLowerCase() === lastName.toLowerCase()
            ) {
                // Pattern: "Ray Ray Tang" -> "Ray Tang"
                return words[0] + " " + lastName;
            } else {
                // Just use the firstName as-is since it already contains the full name
                return firstName;
            }
        } else {
            // Normal case: combine firstName + lastName
            return firstName + " " + lastName;
        }
    } else {
        return (swimmer.firstName || "") + " " + (swimmer.lastName || "");
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

    // draw the axis
    ctx.strokeStyle = "black";
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height);
    ctx.lineTo(width, height);
    ctx.lineTo(width, 0);

    // draw the x-scale
    if (!birthday) {
        for (
            let date = new Date(earliest);
            date < latest;
            date.setUTCMonth(date.getUTCMonth() + 1)
        ) {
            let x = ((date - earliest) / duration) * width;
            ctx.moveTo(x, height);
            if (date.getUTCMonth() === 0) {
                ctx.lineTo(x, height - 12);
                ctx.fillText(date.getUTCFullYear(), x - 10, height + 15);
            } else {
                ctx.lineTo(x, height - (date.getUTCMonth() % 6 === 0 ? 9 : 5));
            }
        }
    }
    ctx.stroke();

    // draw the y-scale
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
    ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.setLineDash([]);
    let tipRow;
    let topTextOffset = 20;

    for (let [index, value] of config.values.entries()) {
        let colors = ['#0066cc', '#cc6600', '#00cc66', '#cc0066', '#6600cc', '#66cc00'];
        ctx.strokeStyle = ctx.fillStyle = colors[index % colors.length];

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
            let d = new Date(new Date(row[idx.date]) - (value.bdayOffset || 0));
            let x = ((d - config.earliest) / config.duration) * config.width;
            let y = config.height - ((t - config.fastest) / config.delta) * config.height;

            if (pre) {
                ctx.beginPath();
                ctx.moveTo(pre[0], pre[1]);
                ctx.lineTo(x, y);
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();

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
        TabView.tab("swimmerTabView", 1);

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
        config.swimmerList.push(await loadSwimmerDetails(config.pkey));
    }

    // Ensure we have a valid event - default to freestyle 100 if none provided
    if (!config.event) {
        config.event = 2; // 100 FR SCY
        console.log("showGraph: No event specified, defaulting to 100 FR SCY");
    }

    prepareGraphData(config);

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
    let swimmer = await loadSwimmerDetails(pkey);
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

function prepareGraphData(config) {
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

        if (
            !swimmer.swimmer.birthday ||
            !Array.isArray(swimmer.swimmer.birthday) ||
            swimmer.swimmer.birthday.length < 2
        ) {
            console.log(
                "prepareGraphData: invalid birthday data for swimmer",
                swimmer.swimmer.pkey,
                swimmer.swimmer.birthday,
                "using fallback",
            );
            // Provide a fallback birthday instead of skipping the swimmer
            let currentYear = new Date().getFullYear();
            let estimatedBirthYear = currentYear - (swimmer.swimmer.age || 15);
            swimmer.swimmer.birthday = [
                `${estimatedBirthYear}-01-01`,
                `${estimatedBirthYear}-12-31`,
            ];
        }

        let [left, right] = swimmer.swimmer.birthday;
        let bday = new Date(
            (new Date(right).getTime() + new Date(left).getTime()) / 2,
        );
        if (!baseBirthday) {
            baseBirthday = bday;
        }
        let bdayOffset = config.ageAlign ? bday - baseBirthday : 0;

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
            let d = new Date(new Date(row[idx.date]) - bdayOffset);
            earliest = min(earliest, d);
            latest = max(latest, d);
        }
    }

    latest.setUTCMonth(latest.getUTCMonth() + 2);
    earliest.setUTCMonth(earliest.getUTCMonth() - 1);
    earliest.setUTCDate(1);
    earliest.setUTCHours(0);
    if (config.ageAlign) {
        earliest.setUTCDate(baseBirthday.getUTCDate());
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

    config.duration = latest - earliest;
    config.delta = slowest - fastest;
    config.width =
        (config.duration / _1DayInMilliSeconds / 3) * config.xZoomFactor;
    config.height = 400 * config.yZoomFactor;
    config.marginL = 50;
    config.marginR = 500;
    config.marginT = 50;
    config.marginB = 30;
}

// ================================================================================
// GLOBAL EXPORTS
// ================================================================================

window.createProgressGraph = createProgressGraph;
window.onCanvasMouseMove = onCanvasMouseMove;
window.wheelGraph = wheelGraph;
window.resizeGraphX = resizeGraphX;
window.resizeGraphY = resizeGraphY;
window.addKeypress = addKeypress;
window.addSearch = addSearch;
window.addSwimmer = addSwimmer;
window.removeSwimmer = removeSwimmer;
window.checkSwimmer = checkSwimmer;
window.drawXYscale = drawXYscale;
window.drawAgeDots = drawAgeDots;
window.drawCurve = drawCurve;
window.drawTip = drawTip;

// Merged exports from scripts.js
window.showGraph = renderSwimmingProgressGraph; // Keep old name for HTML onclick handlers
window.renderSwimmingProgressGraph = renderSwimmingProgressGraph;
window.createDefaultGraphConfig = createDefaultGraphConfig;
window.prepareGraphData = prepareGraphData;
