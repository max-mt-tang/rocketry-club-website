/**
 * ================================================================================
 * SWIM TRACKER - COMPARE MODULE
 * ================================================================================
 * 
 * Compare up to 4 swimmers side by side for each event.
 */

// Store comparison state
window.compareState = {
    swimmers: [], // Array of {pkey, name, data} objects
    maxSwimmers: 4
};

/**
 * Create the Compare tab content with swimmer selectors
 */
function createCompareTab(currentSwimmerData) {
    let html = [];
    
    html.push('<div class="compare-container" style="padding: 15px;">');
    
    // Header
    html.push('<div class="compare-header" style="margin-bottom: 20px;">');
    html.push('<h3 style="margin: 0 0 10px 0; color: #333;">Compare Swimmers</h3>');
    html.push('<p style="margin: 0; color: #666; font-size: 13px;">Select up to 4 swimmers to compare their best times side by side.</p>');
    html.push('</div>');
    
    // Swimmer selectors
    html.push('<div class="compare-selectors" style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">');
    
    for (let i = 0; i < 4; i++) {
        const isFirst = i === 0;
        let defaultName = '';
        if (isFirst && currentSwimmerData && currentSwimmerData.swimmer) {
            const firstName = currentSwimmerData.swimmer.firstName || '';
            const lastName = currentSwimmerData.swimmer.lastName || '';
            // Check if firstName already contains lastName to avoid duplication
            if (firstName.toLowerCase().includes(lastName.toLowerCase()) && lastName.length > 0) {
                defaultName = firstName;
            } else {
                defaultName = (firstName + ' ' + lastName).trim();
            }
            // Remove any duplicate consecutive words (e.g., "Ray Tang Tang" -> "Ray Tang")
            defaultName = defaultName.split(' ').filter((word, idx, arr) => 
                idx === 0 || word.toLowerCase() !== arr[idx - 1].toLowerCase()
            ).join(' ');
        }
        const defaultPkey = isFirst && currentSwimmerData ? currentSwimmerData.swimmer.pkey : '';
        
        html.push(`
            <div class="compare-selector" style="flex: 1; min-width: 200px; padding: 12px; background: ${isFirst ? '#e3f2fd' : '#f5f5f5'}; border-radius: 8px; border: 2px solid ${isFirst ? '#2196f3' : '#ddd'};">
                <div style="font-weight: 600; margin-bottom: 8px; color: #333;">Swimmer ${i + 1}${isFirst ? ' (Current)' : ''}</div>
                <input type="text" 
                    id="compare-search-${i}" 
                    placeholder="Search swimmer name..." 
                    value="${defaultName}"
                    data-pkey="${defaultPkey}"
                    style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;"
                    onkeyup="searchCompareSwimmer(${i}, this.value)"
                    onfocus="showCompareDropdown(${i})"
                >
                <div id="compare-dropdown-${i}" class="compare-dropdown" style="display: none; position: absolute; background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: calc(100% - 24px);"></div>
                ${isFirst && defaultPkey ? `<div style="margin-top: 5px; font-size: 12px; color: #666;">ID: ${defaultPkey}</div>` : ''}
            </div>
        `);
    }
    
    html.push('</div>');
    
    // Compare button
    html.push(`
        <div style="margin-bottom: 20px;">
            <button onclick="runComparison()" style="padding: 12px 24px; background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); color: white; border: none; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(33,150,243,0.3);">
                🔄 Compare Swimmers
            </button>
            <button onclick="clearComparison()" style="padding: 12px 24px; background: #f5f5f5; color: #666; border: 1px solid #ddd; border-radius: 6px; font-size: 15px; cursor: pointer; margin-left: 10px;">
                Clear All
            </button>
        </div>
    `);
    
    // Results table placeholder
    html.push('<div id="compare-results"></div>');
    
    html.push('</div>');
    
    // Auto-load comparison if current swimmer exists
    if (currentSwimmerData && currentSwimmerData.swimmer) {
        // Build deduplicated name for script
        const firstName = currentSwimmerData.swimmer.firstName || '';
        const lastName = currentSwimmerData.swimmer.lastName || '';
        let scriptName = '';
        if (firstName.toLowerCase().includes(lastName.toLowerCase()) && lastName.length > 0) {
            scriptName = firstName;
        } else {
            scriptName = (firstName + ' ' + lastName).trim();
        }
        // Remove duplicate consecutive words
        scriptName = scriptName.split(' ').filter((word, idx, arr) => 
            idx === 0 || word.toLowerCase() !== arr[idx - 1].toLowerCase()
        ).join(' ');
        
        html.push(`
            <script>
                // Auto-initialize comparison with current swimmer
                setTimeout(() => {
                    window.compareState.swimmers[0] = {
                        pkey: '${currentSwimmerData.swimmer.pkey}',
                        name: '${scriptName.replace(/'/g, "\\'")}',
                        data: null
                    };
                }, 100);
            </script>
        `);
    }
    
    return html.join('');
}

/**
 * Search for swimmers by name
 */
let searchTimeout = null;
async function searchCompareSwimmer(index, query) {
    if (searchTimeout) clearTimeout(searchTimeout);
    
    const dropdown = document.getElementById(`compare-dropdown-${index}`);
    if (!dropdown) return;
    
    if (query.length < 2) {
        dropdown.style.display = 'none';
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        try {
            // Search using existing search function
            dropdown.innerHTML = '<div style="padding: 10px; color: #666;">Searching...</div>';
            dropdown.style.display = 'block';
            
            // Parse query - check if it has multiple words (first + last name)
            const queryParts = query.trim().split(/\s+/);
            let firstName = '';
            let lastName = '';
            
            if (queryParts.length >= 2) {
                // "Derek Wu" -> first="Derek", last="Wu"
                firstName = queryParts[0];
                lastName = queryParts.slice(1).join(' ');
            } else {
                // Single word - could be first or last name
                lastName = query;
            }
            
            // Build search query
            const bodyObj = {
                metadata: [
                    { title: "pkey", dim: "[Persons.PersonKey]", datatype: "numeric" },
                    { title: "firstName", dim: "[Persons.FirstAndPreferredName]", datatype: "text" },
                    { title: "lastName", dim: "[Persons.LastName]", datatype: "text" },
                    { title: "age", dim: "[Persons.Age]", datatype: "numeric" },
                    { title: "clubName", dim: "[Persons.ClubName]", datatype: "text" },
                ],
                count: 20,
            };
            
            // If we have both first and last name, search for both
            if (firstName && lastName) {
                bodyObj.metadata[1].filter = { contains: firstName };
                bodyObj.metadata[2].filter = { contains: lastName };
            } else {
                // Single word - search in last name first
                bodyObj.metadata[2].filter = { contains: query };
            }
            
            let values = await window.fetchSwimValues(bodyObj);
            
            // If no results and we only searched last name, try first name
            if ((!values || values.length === 0) && !firstName) {
                delete bodyObj.metadata[2].filter;
                bodyObj.metadata[1].filter = { contains: query };
                values = await window.fetchSwimValues(bodyObj);
            }
            
            if (!values || values.length === 0) {
                dropdown.innerHTML = '<div style="padding: 10px; color: #666;">No swimmers found</div>';
                return;
            }
            
            renderSearchResults(dropdown, values, index);
        } catch (e) {
            console.error('Search error:', e);
            dropdown.innerHTML = '<div style="padding: 10px; color: #c00;">Search failed</div>';
        }
    }, 300);
}

function renderSearchResults(dropdown, values, index) {
    const idx = values.idx;
    let html = [];
    
    for (let row of values) {
        const pkey = row[idx.pkey];
        const firstName = row[idx.firstName] || '';
        const lastName = row[idx.lastName] || '';
        const age = row[idx.age] || '';
        const club = row[idx.clubName] || '';
        
        // Deduplicate name - check if firstName already contains lastName
        let fullName = '';
        if (firstName.toLowerCase().includes(lastName.toLowerCase()) && lastName.length > 0) {
            fullName = firstName;
        } else {
            fullName = `${firstName} ${lastName}`.trim();
        }
        // Remove duplicate consecutive words (e.g., "Jacob Jacob Yeung" -> "Jacob Yeung")
        fullName = fullName.split(' ').filter((word, i, arr) => 
            i === 0 || word.toLowerCase() !== arr[i - 1].toLowerCase()
        ).join(' ');
        
        html.push(`
            <div class="compare-result-item" 
                style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #eee; transition: background 0.2s;"
                onmouseover="this.style.background='#f0f7ff'"
                onmouseout="this.style.background='white'"
                onclick="selectCompareSwimmer(${index}, '${pkey}', '${fullName.replace(/'/g, "\\'")}')">
                <div style="font-weight: 600; color: #333;">${fullName}</div>
                <div style="font-size: 12px; color: #666;">Age ${age} · ${club}</div>
            </div>
        `);
    }
    
    dropdown.innerHTML = html.join('');
}

function showCompareDropdown(index) {
    // Hide all other dropdowns
    for (let i = 0; i < 4; i++) {
        if (i !== index) {
            const d = document.getElementById(`compare-dropdown-${i}`);
            if (d) d.style.display = 'none';
        }
    }
}

function selectCompareSwimmer(index, pkey, name) {
    const input = document.getElementById(`compare-search-${index}`);
    const dropdown = document.getElementById(`compare-dropdown-${index}`);
    
    if (input) {
        input.value = name;
        input.dataset.pkey = pkey;
    }
    if (dropdown) {
        dropdown.style.display = 'none';
    }
    
    // Store in state
    window.compareState.swimmers[index] = { pkey, name, data: null };
}

function clearComparison() {
    // Clear all inputs
    for (let i = 0; i < 4; i++) {
        const input = document.getElementById(`compare-search-${i}`);
        if (input) {
            input.value = '';
            input.dataset.pkey = '';
        }
    }
    window.compareState.swimmers = [];
    document.getElementById('compare-results').innerHTML = '';
}

/**
 * Run the comparison - fetch data for all selected swimmers and display
 */
async function runComparison() {
    const resultsDiv = document.getElementById('compare-results');
    if (!resultsDiv) return;
    
    // Collect selected swimmers
    let swimmers = [];
    for (let i = 0; i < 4; i++) {
        const input = document.getElementById(`compare-search-${i}`);
        if (input && input.dataset.pkey) {
            swimmers.push({
                pkey: input.dataset.pkey,
                name: input.value,
                index: i
            });
        }
    }
    
    if (swimmers.length < 2) {
        resultsDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Please select at least 2 swimmers to compare.</div>';
        return;
    }
    
    resultsDiv.innerHTML = '<div style="padding: 20px; text-align: center;"><div class="loading-spinner"></div><div style="margin-top: 10px; color: #666;">Loading swimmer data...</div></div>';
    
    try {
        // Fetch data for each swimmer
        for (let swimmer of swimmers) {
            const data = await loadSwimmerDataForCompare(swimmer.pkey);
            swimmer.data = data;
        }
        
        // Build comparison table
        const tableHtml = buildComparisonTable(swimmers);
        resultsDiv.innerHTML = tableHtml;
        
    } catch (e) {
        console.error('Comparison error:', e);
        resultsDiv.innerHTML = `<div style="padding: 20px; color: #c00;">Error loading data: ${e.message}</div>`;
    }
}

/**
 * Load swimmer data for comparison
 */
async function loadSwimmerDataForCompare(pkey) {
    // Wait for loadEvents to be available
    while (!window.loadEvents) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Also load swimmer info
    const events = await window.loadEvents(pkey);
    let swimmerInfo = null;
    
    if (window.loadSwimerInfo) {
        swimmerInfo = await window.loadSwimerInfo(pkey);
    }
    
    return { events, swimmer: swimmerInfo };
}

/**
 * Build the comparison table - matches Personal Best table style
 */
function buildComparisonTable(swimmers) {
    // Collect all events across all swimmers
    let allEvents = new Map(); // eventKey -> { course, stroke, distance }
    
    // Stroke code mapping
    const strokeMap = {
        'FR': 'Free',
        'BK': 'Back', 
        'BR': 'Breast',
        'FL': 'Fly',
        'IM': 'IM'
    };
    
    for (let swimmer of swimmers) {
        if (!swimmer.data || !swimmer.data.events) {
            console.log('No events for swimmer:', swimmer.name);
            continue;
        }
        
        const events = swimmer.data.events;
        const idx = events.idx;
        
        if (!idx) {
            console.log('No idx for swimmer:', swimmer.name);
            continue;
        }
        
        console.log('Processing swimmer:', swimmer.name, 'events:', events.length, 'idx:', idx);
        
        // Group by event and find best time
        let bestTimes = new Map();
        for (let event of events) {
            const eventCode = event[idx.event];
            const time = event[idx.time];
            const date = event[idx.date] || '';
            
            // Decode event code to get course, stroke, distance
            const eventStr = window._eventList ? window._eventList[eventCode] : null;
            if (!eventStr || eventStr.includes('_')) continue;
            
            const [distStr, strokeCode, course] = eventStr.split(' ');
            const distance = parseInt(distStr) || 0;
            const stroke = strokeMap[strokeCode] || strokeCode;
            const eventKey = `${course}_${stroke}_${distance}`;
            
            const timeInt = window.timeToInt ? window.timeToInt(time) : 0;
            if (timeInt <= 0) continue;
            
            const existingTime = bestTimes.get(eventKey);
            
            if (!existingTime || timeInt < existingTime.timeInt) {
                bestTimes.set(eventKey, { course, stroke, distance, time, date, timeInt });
            }
            
            if (!allEvents.has(eventKey)) {
                allEvents.set(eventKey, { course, stroke, distance });
            }
        }
        
        swimmer.bestTimes = bestTimes;
        console.log('Swimmer', swimmer.name, 'best times:', bestTimes.size);
    }
    
    // Sort events by course, then distance, then stroke
    const courseOrder = { SCY: 1, SCM: 2, LCM: 3 };
    const strokeOrder = { Free: 1, Back: 2, Breast: 3, Fly: 4, IM: 5 };
    
    let sortedEvents = Array.from(allEvents.entries()).sort((a, b) => {
        const [keyA, evtA] = a;
        const [keyB, evtB] = b;
        
        const courseA = courseOrder[evtA.course] || 99;
        const courseB = courseOrder[evtB.course] || 99;
        if (courseA !== courseB) return courseA - courseB;
        
        if (evtA.distance !== evtB.distance) return evtA.distance - evtB.distance;
        
        const strokeA = strokeOrder[evtA.stroke] || 99;
        const strokeB = strokeOrder[evtB.stroke] || 99;
        return strokeA - strokeB;
    });
    
    // Build HTML - matching Personal Best table style
    let html = [];
    
    // Color palette for swimmers
    const colors = ['#2196f3', '#4caf50', '#ff9800', '#9c27b0'];
    
    html.push('<div class="compare-table-wrapper" style="overflow-x: auto; margin-top: 10px;">');
    html.push('<table class="compare-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">');
    
    // Header Row 1 - Main categories
    html.push('<tr class="wt" style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);">');
    html.push('<th rowspan="2" style="padding: 12px 10px; color: white; font-weight: 600; text-align: center; border: 1px solid rgba(255,255,255,0.2);">Course</th>');
    html.push('<th rowspan="2" style="padding: 12px 10px; color: white; font-weight: 600; text-align: center; border: 1px solid rgba(255,255,255,0.2);">Stroke</th>');
    html.push('<th rowspan="2" style="padding: 12px 10px; color: white; font-weight: 600; text-align: center; border: 1px solid rgba(255,255,255,0.2);">Dist</th>');
    
    // Add swimmer columns
    for (let i = 0; i < swimmers.length; i++) {
        const swimmer = swimmers[i];
        const colspan = i === 0 ? 2 : 3; // First swimmer: Time, Date; Others: Time, Date, Gap
        const swimmerAge = swimmer.data?.swimmer?.age || '?';
        html.push(`<th colspan="${colspan}" style="padding: 12px 10px; color: white; font-weight: 600; text-align: center; border: 1px solid rgba(255,255,255,0.2); background: ${colors[i]};">
            ${swimmer.name}<br><span style="font-size: 11px; opacity: 0.9;">Age ${swimmerAge}</span>
        </th>`);
    }
    html.push('</tr>');
    
    // Header Row 2 - Sub columns
    html.push('<tr class="gy" style="background: #f8f9fa;">');
    for (let i = 0; i < swimmers.length; i++) {
        html.push(`<th style="padding: 8px 6px; font-weight: 600; font-size: 12px; text-align: center; border: 1px solid #dee2e6;">Time</th>`);
        html.push(`<th style="padding: 8px 6px; font-weight: 600; font-size: 12px; text-align: center; border: 1px solid #dee2e6;">Date</th>`);
        if (i > 0) {
            html.push(`<th style="padding: 8px 6px; font-weight: 600; font-size: 12px; text-align: center; border: 1px solid #dee2e6;">Gap</th>`);
        }
    }
    html.push('</tr>');
    
    // Body rows
    let currentCourse = '';
    let rowNum = 0;
    
    for (let [eventKey, eventInfo] of sortedEvents) {
        rowNum++;
        const rowBg = rowNum % 2 === 0 ? '#f8f9fa' : 'white';
        
        // Find fastest time for this event
        let fastestTimeInt = Infinity;
        let swimmer1Time = null;
        
        for (let i = 0; i < swimmers.length; i++) {
            const bt = swimmers[i].bestTimes?.get(eventKey);
            if (bt && bt.timeInt < fastestTimeInt) {
                fastestTimeInt = bt.timeInt;
            }
            if (i === 0 && bt) {
                swimmer1Time = bt.timeInt;
            }
        }
        
        html.push(`<tr style="background: ${rowBg};">`);
        
        // Course
        html.push(`<td style="padding: 10px 8px; text-align: center; border: 1px solid #dee2e6; font-weight: 500;">${eventInfo.course}</td>`);
        
        // Stroke
        html.push(`<td style="padding: 10px 8px; text-align: center; border: 1px solid #dee2e6;">${eventInfo.stroke}</td>`);
        
        // Distance
        html.push(`<td style="padding: 10px 8px; text-align: center; border: 1px solid #dee2e6;">${eventInfo.distance}</td>`);
        
        // Swimmer columns
        for (let i = 0; i < swimmers.length; i++) {
            const swimmer = swimmers[i];
            const bt = swimmer.bestTimes?.get(eventKey);
            const time = bt ? bt.time : '-';
            const date = bt ? (bt.date ? bt.date.substring(0, 10) : '') : '-';
            const timeInt = bt ? bt.timeInt : Infinity;
            const isFastest = timeInt === fastestTimeInt && timeInt !== Infinity;
            
            // Time cell
            const timeBg = isFastest ? 'background: #d4edda;' : '';
            const timeColor = isFastest ? 'color: #155724; font-weight: 700;' : '';
            html.push(`<td style="padding: 10px 8px; text-align: right; border: 1px solid #dee2e6; ${timeBg} ${timeColor}">`);
            if (isFastest && swimmers.length > 1) {
                html.push(`<span style="color: #28a745;">🏆</span> `);
            }
            html.push(`${time}</td>`);
            
            // Date cell
            html.push(`<td style="padding: 10px 8px; text-align: center; border: 1px solid #dee2e6; font-size: 12px; color: #666;">${date}</td>`);
            
            // Gap cell (for swimmers 2+)
            if (i > 0) {
                let gapText = '-';
                let gapStyle = 'color: #666;';
                
                if (bt && swimmer1Time && swimmer1Time !== Infinity) {
                    const gapMs = timeInt - swimmer1Time;
                    if (gapMs < 0) {
                        // This swimmer is faster
                        gapText = formatTimeDiff(gapMs);
                        gapStyle = 'color: #28a745; font-weight: 600;';
                    } else if (gapMs > 0) {
                        // This swimmer is slower
                        gapText = '+' + formatTimeDiff(gapMs);
                        gapStyle = 'color: #dc3545;';
                    } else {
                        gapText = '0.00';
                        gapStyle = 'color: #6c757d;';
                    }
                } else if (!bt && swimmer1Time && swimmer1Time !== Infinity) {
                    gapText = 'N/A';
                }
                
                html.push(`<td style="padding: 10px 8px; text-align: center; border: 1px solid #dee2e6; font-size: 12px; ${gapStyle}">${gapText}</td>`);
            }
        }
        
        html.push('</tr>');
    }
    
    html.push('</table>');
    html.push('</div>');
    
    // Summary stats
    html.push('<div class="compare-summary" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">');
    html.push('<h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">📊 Comparison Summary</h4>');
    html.push('<div style="display: flex; flex-wrap: wrap; gap: 15px;">');
    
    // Count wins for each swimmer
    let wins = new Array(swimmers.length).fill(0);
    let totalEvents = sortedEvents.length;
    
    for (let [eventKey, eventInfo] of sortedEvents) {
        let times = swimmers.map(s => {
            const bt = s.bestTimes?.get(eventKey);
            return bt ? bt.timeInt : Infinity;
        });
        const fastestTimeInt = Math.min(...times);
        if (fastestTimeInt !== Infinity) {
            for (let i = 0; i < times.length; i++) {
                if (times[i] === fastestTimeInt) {
                    wins[i]++;
                    break;
                }
            }
        }
    }
    
    for (let i = 0; i < swimmers.length; i++) {
        const pct = totalEvents > 0 ? Math.round((wins[i] / totalEvents) * 100) : 0;
        html.push(`
            <div style="flex: 1; min-width: 180px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid ${colors[i]}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-weight: 600; color: #333; margin-bottom: 5px;">${swimmers[i].name}</div>
                <div style="display: flex; align-items: baseline; gap: 8px;">
                    <span style="font-size: 28px; color: ${colors[i]}; font-weight: 700;">${wins[i]}</span>
                    <span style="font-size: 14px; color: #666;">wins (${pct}%)</span>
                </div>
                <div style="margin-top: 8px; height: 6px; background: #e9ecef; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${pct}%; height: 100%; background: ${colors[i]};"></div>
                </div>
            </div>
        `);
    }
    
    html.push('</div>');
    html.push('</div>');
    
    return html.join('');
}

/**
 * Format time difference in seconds to a readable string
 */
function formatTimeDiff(diffMs) {
    // diffMs is in hundredths (e.g., 100 = 1 second)
    const totalSeconds = Math.abs(diffMs) / 100;
    if (totalSeconds < 60) {
        return totalSeconds.toFixed(2);
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = (totalSeconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
}

// Export functions
window.createCompareTab = createCompareTab;
window.searchCompareSwimmer = searchCompareSwimmer;
window.showCompareDropdown = showCompareDropdown;
window.selectCompareSwimmer = selectCompareSwimmer;
window.clearComparison = clearComparison;
window.runComparison = runComparison;

