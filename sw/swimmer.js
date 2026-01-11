/**
 * ================================================================================
 * SWIM TRACKER - SWIMMER MODULE
 * ================================================================================
 * 
 * Swimmer data loading, processing, and display functionality.
 * Handles swimmer profiles, best times tables, and meet history.
 */

// ================================================================================
// LOADING MESSAGE MANAGER WITH HOURGLASS INDICATOR
// ================================================================================

let loadingMessageTimers = new Map(); // Track timers for loading messages
let currentLoadingMessageId = null; // Track current loading message

/**
 * Update content with automatic hourglass indicator for loading messages > 3 seconds
 * @param {string} html - HTML content to display
 * @param {boolean} isLoadingMessage - Whether this is a loading message that should get hourglass
 */
function updateContentWithLoadingIndicator(html, isLoadingMessage = false) {
    // Clear previous loading message timer if moving to a new message
    if (currentLoadingMessageId && isLoadingMessage) {
        const prevTimer = loadingMessageTimers.get(currentLoadingMessageId);
        if (prevTimer) {
            clearTimeout(prevTimer);
            loadingMessageTimers.delete(currentLoadingMessageId);
        }
        // Remove hourglass from previous message if it exists
        removeHourglassFromPreviousMessage();
    }
    
    if (isLoadingMessage) {
        // Generate unique ID for this loading message
        currentLoadingMessageId = 'loading_' + Date.now() + '_' + Math.random();
        
        // Set timer to add hourglass after 3 seconds
        const timer = setTimeout(() => {
            addHourglassToCurrentMessage();
        }, 3000);
        
        loadingMessageTimers.set(currentLoadingMessageId, timer);
    } else {
        // Not a loading message - clear current tracking
        if (currentLoadingMessageId) {
            const prevTimer = loadingMessageTimers.get(currentLoadingMessageId);
            if (prevTimer) {
                clearTimeout(prevTimer);
                loadingMessageTimers.delete(currentLoadingMessageId);
            }
            removeHourglassFromPreviousMessage();
        }
        currentLoadingMessageId = null;
    }
    
    // Update content
    window.updateContent(html);
}

/**
 * Add hourglass to the current loading message
 */
function addHourglassToCurrentMessage() {
    const contentEl = document.getElementById('content');
    if (!contentEl) return;
    
    // Find the last <p> tag that doesn't already have an hourglass
    const paragraphs = contentEl.querySelectorAll('p');
    for (let i = paragraphs.length - 1; i >= 0; i--) {
        const p = paragraphs[i];
        if (!p.querySelector('.loading-hourglass')) {
            // Check if this looks like a loading message
            const text = p.textContent.toLowerCase();
            if (text.includes('loading') || text.includes('preparing') || text.includes('fetching') || text.includes('searching')) {
                // Add hourglass at the beginning
                const hourglass = document.createElement('span');
                hourglass.className = 'loading-hourglass';
                hourglass.innerHTML = '<span style="animation: spin 1s linear infinite; font-size: 18px; margin-right: 4px;">⏳</span>';
                hourglass.style.display = 'inline-flex';
                hourglass.style.alignItems = 'center';
                p.insertBefore(hourglass, p.firstChild);
                break;
            }
        }
    }
}

/**
 * Remove hourglass from previous loading message
 */
function removeHourglassFromPreviousMessage() {
    const contentEl = document.getElementById('content');
    if (!contentEl) return;
    
    const hourglasses = contentEl.querySelectorAll('.loading-hourglass');
    hourglasses.forEach(hg => {
        hg.remove();
    });
}

// ================================================================================
// SWIMMER DATA LOADING AND DISPLAY
// ================================================================================

/**
 * Main function to display swimmer details and performance data
 * @param {number|string} pkey - Swimmer's unique identifier (person key)
 */
async function swimmer(pkey) {
    console.log("swimmer function called with pkey:", pkey);
    if (!pkey || pkey === "undefined") {
        console.log("Invalid pkey, redirecting");
        window.location.replace("");
        return;
    }
    console.log("Loading details for pkey:", pkey);
    try {
        let data = await loadSwimmerDetails(Number(pkey));
        console.log("loadDetails returned:", data);
        if (!data) {
            console.error("loadSwimmerDetails returned null/undefined for pkey:", pkey);
            window.updateContent(`Error loading swimmer data for pkey: ${pkey}. Please check the browser console for details.`);
            return;
        }
        await displaySwimmerDetails(data);
        updateButtonStates(pkey);
    } catch (error) {
        console.error("Error in swimmer function:", error);
        window.updateContent(`Error loading swimmer data: ${error.message}. Please check the browser console for details.`);
    }
}

/**
 * Loads comprehensive swimmer data including events, meets, and calculated fields
 * @param {number} pkey - Swimmer's unique identifier
 * @returns {Object} Complete swimmer data with events, meets, birthday, etc.
 */
async function loadSwimmerDetails(pkey) {
    console.log("loadDetails called with pkey:", pkey);
    let data = await LocalCache.func("swimmer/" + pkey, async () => {
        console.log("Cache miss, loading fresh data for pkey:", pkey);
        let swimmerCall = loadSwimerInfo(pkey);
        let eventsCall = loadEvents(pkey);

        let [swimmerInfo, events] = await Promise.all([
            swimmerCall,
            eventsCall,
        ]);
        console.log("swimmerInfo:", swimmerInfo);
        console.log("events:", events);
        console.log(
            "events structure:",
            events
                ? {
                      length: events.length,
                      hasIdx: !!events.idx,
                      firstRow: events[0],
                      keys: events.idx ? Object.keys(events.idx) : "no idx",
                  }
                : "no events",
        );
        if (!swimmerInfo || !events) {
            console.error(
                "Missing data for pkey:",
                pkey,
                "- swimmerInfo:",
                !!swimmerInfo,
                "events:",
                !!events,
            );
            if (!swimmerInfo) {
                console.error("Swimmer info lookup failed - swimmer may not exist in database");
            }
            if (!events) {
                console.error("Events lookup failed - swimmer may have no recorded events");
            }
            // Return null to let caller handle error display
            return null;
        }

        return {
            events: events,
            swimmer: swimmerInfo,
        };
    });

    if (data) {
        console.log("loadDetails: calling postLoadDetails");
        try {
            const processedData = await processSwimmerData(data);
            if (!processedData) {
                console.error("processSwimmerData returned null/undefined");
            }
            return processedData;
        } catch (error) {
            console.error("Error in processSwimmerData:", error);
            throw error;
        }
    } else {
        console.error("loadDetails: no data returned from cache/API for pkey:", pkey);
        console.error("This could indicate:");
        console.error("1. API call failed");
        console.error("2. Invalid pkey");
        console.error("3. Swimmer data not found in database");
        return null;
    }
}

/**
 * Processes raw swimmer data by adding calculated fields and validating structure
 * @param {Object} data - Raw swimmer data from API
 * @returns {Object} Processed swimmer data with birthday, gender, meet dictionary, etc.
 */
async function processSwimmerData(data) {
    try {
    if (!data.events || !data.events.idx) {
        return data;
    }
    let idx = data.events.idx;
    let meets = new Set(data.events.map((e) => e[idx.meet]));

    // Wait for _meetDictinary to be available
    let waitCount = 0;
    while (!window._meetDictinary) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (waitCount++ > 50) {
            return data;
        }
    }

    data.meetDict = await _meetDictinary.loadMeets(meets);
    data.swimmer.birthday = _birthdayDictionary.calculate(
        data.swimmer.pkey,
        data.events,
        data.meetDict,
        data.swimmer.age,
    );
    if (
        !data.swimmer.birthday ||
        !Array.isArray(data.swimmer.birthday) ||
        data.swimmer.birthday.length < 2
    ) {
        console.log(
            "Failed to calculate birthday for swimmer",
            data.swimmer.pkey,
            "using fallback. Original result:",
            data.swimmer.birthday,
        );
        // Provide a fallback birthday range if calculation fails
        let currentYear = new Date().getFullYear();
        let estimatedBirthYear = currentYear - (data.swimmer.age || 15);
        data.swimmer.birthday = [
            `${estimatedBirthYear}-01-01`,
            `${estimatedBirthYear}-12-31`,
        ];
        console.log("Fallback birthday set to:", data.swimmer.birthday);
    }
    data.swimmer.alias = getAlias(
        data.swimmer.firstName,
        data.swimmer.lastName,
    );
    if (data.events.length > 0 && data.events.idx) {
        let genderValue = data.events[0][data.events.idx.gender];
        console.log(
            "Setting gender from events[0]:",
            genderValue,
            "at index:",
            data.events.idx.gender,
        );
        data.swimmer.gender = genderValue;
    } else {
        console.log("No events data available for gender, setting empty");
        data.swimmer.gender = "";
    }

    return data;
    } catch (err) {
        console.error("==== processSwimmerData ERROR ====", err);
    return data;
    }
}

async function loadEvents(pkey) {
    let bodyObj = {
        metadata: [
            {
                title: "time",
                dim: "[UsasSwimTime.SwimTimeFormatted]",
                datatype: "text",
            },
            {
                title: "age",
                dim: "[UsasSwimTime.AgeAtMeetKey]",
                datatype: "numeric",
            },
            {
                title: "std",
                dim: "[TimeStandard.TimeStandardName]",
                datatype: "text",
            },
            {
                title: "lsc",
                dim: "[OrgUnit.Level3Code]",
                datatype: "text",
            },
            {
                title: "club",
                dim: "[OrgUnit.Level4Code]",
                datatype: "text",
            },
            {
                title: "date",
                dim: "[SeasonCalendar.CalendarDate (Calendar)]",
                datatype: "datetime",
                level: "days",
                sort: "asc",
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
                title: "gender",
                dim: "[UsasSwimTime.EventCompetitionCategoryKey]",
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
        ],
        count: 5000,
    };

    let events = await fetchSwimValues(bodyObj, "event");

    if (!events) {
        return;
    }

    let idx = events.idx;
    for (let row of events) {
        row[idx.date] = row[idx.date].substring(0, 10);
    }

    // Wait for timeToInt function to be available
    while (!window.timeToInt) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    events.sort((a, b) =>
        a[idx.date] == b[idx.date]
            ? window.timeToInt(b[idx.time]) - window.timeToInt(a[idx.time])
            : a[idx.date] < b[idx.date]
              ? -1
              : 1,
    );

    return events;
}

async function loadSwimerInfo(pkey) {
    let bodyObj = {
        metadata: [
            {
                title: "firstName",
                dim: "[Persons.FirstAndPreferredName]",
                datatype: "text",
            },
            {
                title: "lastName",
                dim: "[Persons.LastName]",
                datatype: "text",
            },
            {
                title: "age",
                dim: "[Persons.Age]",
                datatype: "numeric",
            },
            {
                title: "clubName",
                dim: "[Persons.ClubName]",
                datatype: "text",
            },
            {
                title: "lsc",
                dim: "[Persons.LscCode]",
                datatype: "text",
            },
            {
                title: "pkey",
                dim: "[Persons.PersonKey]",
                datatype: "numeric",
                filter: {
                    equals: pkey,
                },
            },
        ],
        count: 1,
    };

    let values = await fetchSwimValues(bodyObj);
    if (!values) {
        return;
    }

    let row = values[0];
    let swimmer = {
        firstName: row[values.idx.firstName],
        lastName: row[values.idx.lastName],
        age: row[values.idx.age],
        clubName: row[values.idx.clubName],
        lsc: row[values.idx.lsc],
        pkey: row[values.idx.pkey],
    };

    let club = await _clubDictinary.loadClubCode(swimmer.lsc, swimmer.clubName);
    console.log(
        "Club lookup result for",
        swimmer.lsc,
        swimmer.clubName,
        ":",
        club,
    );
    if (!club) {
        console.log("Club not found, using clubName as fallback");
        club = swimmer.clubName; // Use clubName as fallback
    }
    let zone = window.getLSCZone ? window.getLSCZone(swimmer.lsc) : null;

    // Debug club data specifically for Ray and Max
    if (swimmer.pkey === 500281 || swimmer.pkey === 1320806) {
        console.log(`=== CLUB DEBUG for ${swimmer.firstName} ${swimmer.lastName} (${swimmer.pkey}) ===`);
        console.log('Original club data:', {
            lsc: swimmer.lsc,
            clubName: swimmer.clubName,
            resolvedClub: club,
            zone: zone
        });
        console.log('Is BC related?', {
            clubNameIncludesBC: swimmer.clubName?.includes('BC') || swimmer.clubName?.includes('Bellevue'),
            resolvedClubIncludesBC: club?.includes('BC') || club?.includes('Bellevue'),
            exactClubName: swimmer.clubName,
            exactResolvedClub: club
        });
    }

    swimmer.club = club;
    swimmer.zone = zone;

    return swimmer;
}

// ================================================================================
// SWIMMER DISPLAY FUNCTIONS
// ================================================================================

/**
 * Minimal fallback progress graph when graphs.js is not available
 * @param {number} pkey - Swimmer's unique identifier
 * @param {Array} events - Swimmer's event data
 * @returns {string} HTML string for minimal progress graph interface
 */
function createMinimalProgressGraph(pkey, events) {
    return `
        <div class="content">
            <div style="padding: 40px; text-align: center;">
                <h2>Progress Graph</h2>
                <p style="color: #666; margin: 20px 0;">
                    The progress graph feature requires graphs.js to be loaded.
                </p>
                <p style="color: #999; font-size: 14px;">
                    Please refresh the page or check the browser console for errors.
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 20px;">
                    Swimmer ID: ${pkey}<br>
                    Events: ${events?.length || 0}
                </p>
            </div>
        </div>
    `;
}

/**
 * Displays swimmer details in the UI including personal info, best times, and tables
 * @param {Object} data - Complete swimmer data object
 */
async function displaySwimmerDetails(data) {
    if (!data) {
        window.updateContent("No swimmer found");
        return;
    }

    console.log("showDetails called with data:", {
        hasSwimmer: !!data.swimmer,
        hasEvents: !!data.events,
        eventsLength: data.events ? data.events.length : 0,
        eventsHasIdx: data.events ? !!data.events.idx : false,
    });

    let html = [];

    // build title
    html.push(await createDetailsPageTitle(data));
    if (data.events.length == 0) {
        console.log("No events found, events length:", data.events.length);
        html.push("<div>No events found</div>");
        window.updateContent(html.join(""));
        return;
    }

    // Try to work with events data even if idx is missing
    let idx = data.events.idx;
    if (!idx) {
        console.log(
            "Events idx missing, creating idx mapping from known structure",
        );
        console.log("EVENTS DATA SAMPLE - First event:", data.events[0]);

        // Create the missing idx mapping based on the known structure
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

        // Attach the idx to the events data so other functions can use it
        data.events.idx = idx;
        console.log("Created idx mapping:", idx);
    }
    let hide25 = localStorage.getItem("hide25");
    if (hide25) {
        data.events = data.events.filter((e) => e[idx.event] < 80);
        data.events.idx = idx;
    }

    let fastRowList = await getFastRowByEvent(data.events);

    // build the row info for first two tables
    let rowInfo = new Array(fastRowList.length);
    let courseCounter = 0;
    let strokeCounter = 0;
    for (let i = fastRowList.length - 1; i >= 0; --i) {
        let info = [];
        rowInfo[i] = info;
        ++courseCounter;
        ++strokeCounter;

        let [d, s, c] =
            i == 0
                ? ["", "", ""]
                : _eventList[fastRowList[i - 1][idx.event]].split(" ");
        let [_, stroke, course] =
            _eventList[fastRowList[i][idx.event]].split(" ");

        if (course != c) {
            info.push(strokeCounter, courseCounter);
            courseCounter = strokeCounter = 0;
        } else if (stroke != s) {
            info.push(strokeCounter);
            strokeCounter = 0;
        }
    }

    let tabView = new TabView("swimmerTabView");

    console.log("Creating tabs...");
    let personalBestTable = await createBestTimeTable(
        data,
        fastRowList,
        rowInfo,
    );
    console.log(
        "Personal Best table created, length:",
        personalBestTable.length,
    );

    let ageBestTable = createAgeBestTimeTable(data, fastRowList, rowInfo);
    console.log("Age Best table created, length:", ageBestTable.length);

    let meetTable = await createMeetTable(data);
    console.log("Meet table created, length:", meetTable.length);

    // Wait for createProgressGraph to be available
    let waitCount = 0;
    while (!window.createProgressGraph && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 10));
        waitCount++;
    }

    // Create progress graph - wait for graphs.js to load if needed
    let progressGraph;
    
    // Check if graphs.js loaded by checking for the function
    if (typeof window.createProgressGraph === 'function') {
        try {
            progressGraph = window.createProgressGraph(data.swimmer.pkey, data.events);
        } catch (error) {
            console.error("Error calling createProgressGraph:", error);
            progressGraph = '<div class="content"><p>Error loading progress graph: ' + error.message + '</p></div>';
        }
    } else {
        // graphs.js not loaded - wait a bit and retry
        let attempts = 0;
        const maxAttempts = 20; // Increased to 1 second total wait
        
        while (attempts < maxAttempts && typeof window.createProgressGraph !== 'function') {
            await new Promise(resolve => setTimeout(resolve, 50));
            attempts++;
        }
        
        if (typeof window.createProgressGraph === 'function') {
            try {
                progressGraph = window.createProgressGraph(data.swimmer.pkey, data.events);
            } catch (error) {
                console.error("Error calling createProgressGraph after wait:", error);
                progressGraph = '<div class="content"><p>Error loading progress graph: ' + error.message + '</p></div>';
            }
        } else {
            // Still not available - create a minimal fallback
            console.warn("graphs.js not loaded, creating minimal progress graph fallback");
            progressGraph = createMinimalProgressGraph(data.swimmer.pkey, data.events);
        }
    }

    // Tab 1: Personal Best (stays first)
    tabView.addTab("<p>Personal Best</p>", personalBestTable);

    // Tab 2: AI Insights (moved from 6th)
    if (window.generateInsights && window.renderInsights) {
        // Show loading indicator immediately
        const loadingHtml = `<div class="ai-insights-loading" style="padding: 40px; text-align: center;">
            <div class="loader" style="width: 40px; height: 40px; border-width: 4px; margin: 0 auto 20px;"></div>
            <div style="font-size: 16px; color: #666; font-weight: 500; margin-bottom: 8px;">Generating AI Insights...</div>
            <div style="font-size: 13px; color: #999;" id="ai-insights-status">Analyzing swim data...</div>
        </div>`;
        tabView.addTab("<p>AI Insights</p>", loadingHtml);
        
        // Generate initial insights (may not have rankings yet) - do this asynchronously
        (async () => {
            try {
                // Update status message
                const statusEl = document.getElementById('ai-insights-status');
                if (statusEl) statusEl.textContent = 'Preparing data for AI analysis...';
                
                // Retrieve height and weight from localStorage if available
                let athleteStats = {};
                if (data.swimmer && data.swimmer.pkey) {
                    const swimmerPkey = String(data.swimmer.pkey);
                    const storageKey = `swimmer_stats_${swimmerPkey}`;
                    const savedStats = localStorage.getItem(storageKey);
                    if (savedStats) {
                        try {
                            const stats = JSON.parse(savedStats);
                            if (stats.height) athleteStats.height = stats.height;
                            if (stats.weight) athleteStats.weight = stats.weight;
                        } catch (e) {
                            console.log('Error parsing saved stats:', e);
                        }
                    }
                }
                
                const insightsData = await window.generateInsights(data, athleteStats);
                
                // Update status message
                if (statusEl) statusEl.textContent = 'Formatting insights...';
                
                const insightsHtml = window.renderInsights(insightsData, false, data);
                
                // Find and update the insights view
                const views = document.querySelectorAll('.view');
                const tabs = document.querySelectorAll('.tab');
                const insightsTabIndex = Array.from(tabs).findIndex(tab => 
                    tab.textContent.includes('💡') || tab.textContent.includes('Insights')
                );
                
                if (insightsTabIndex >= 0 && views[insightsTabIndex]) {
                    views[insightsTabIndex].innerHTML = insightsHtml;
                }
            } catch (error) {
                console.error("Error generating initial insights:", error);
                const views = document.querySelectorAll('.view');
                const tabs = document.querySelectorAll('.tab');
                const insightsTabIndex = Array.from(tabs).findIndex(tab => 
                    tab.textContent.includes('💡') || tab.textContent.includes('Insights')
                );
                
                if (insightsTabIndex >= 0 && views[insightsTabIndex]) {
                    views[insightsTabIndex].innerHTML = '<div class="ai-insights-empty">Error loading insights. Please try refreshing the page.</div>';
                }
            }
        })();
        
        // Refresh insights after rankings load (store refresh function globally)
        let _refreshInProgress = false;
        window.refreshInsights = async function() {
            // Prevent multiple simultaneous refreshes
            if (_refreshInProgress) {
                console.log('refreshInsights: Already in progress, skipping duplicate call');
                return;
            }
            
            _refreshInProgress = true;
            // Save existing content before starting - needs to be accessible in catch block
            const views = document.querySelectorAll('.view');
            const tabs = document.querySelectorAll('.tab');
            const insightsTabIndex = Array.from(tabs).findIndex(tab => 
                tab.textContent.includes('💡') || tab.textContent.includes('Insights')
            );
            const insightsView = insightsTabIndex >= 0 ? views[insightsTabIndex] : null;
            const existingContent = insightsView ? insightsView.innerHTML : null;
            
            try {
                
                // Show loading indicator in header if there's an AI analysis section, otherwise show overlay
                if (insightsView && existingContent) {
                    const analysisHeader = insightsView.querySelector('.ai-analysis-header');
                    if (analysisHeader) {
                        // Update header to show updating indicator
                        let headerRight = analysisHeader.querySelector('.ai-analysis-header-right');
                        if (headerRight) {
                            headerRight.innerHTML = '<div id="ai-updating-indicator" style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(102, 126, 234, 0.1); border-radius: 6px; color: #667eea; font-size: 14px; font-weight: 500;"><span style="animation: spin 1s linear infinite;">⏳</span> <span>Updating...</span></div>';
                        }
                    } else {
                        // No header found - add a subtle overlay at the top instead of replacing content
                        const loadingOverlay = document.createElement('div');
                        loadingOverlay.id = 'ai-insights-updating-overlay';
                        loadingOverlay.style.cssText = 'position: sticky; top: 0; z-index: 100; background: rgba(255, 255, 255, 0.95); border-bottom: 2px solid #667eea; padding: 12px 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
                        loadingOverlay.innerHTML = '<div style="display: inline-flex; align-items: center; gap: 10px; color: #667eea; font-size: 14px; font-weight: 500;"><span style="animation: spin 1s linear infinite;">⏳</span> <span>Updating AI Insights...</span></div>';
                        insightsView.insertBefore(loadingOverlay, insightsView.firstChild);
                    }
                } else if (insightsView && (!existingContent || existingContent.trim() === '')) {
                    // Only show full loading screen if there's no existing content
                    insightsView.innerHTML = `<div class="ai-insights-loading" style="padding: 40px; text-align: center;">
                        <div class="loader" style="width: 40px; height: 40px; border-width: 4px; margin: 0 auto 20px;"></div>
                        <div style="font-size: 16px; color: #666; font-weight: 500; margin-bottom: 8px;">Loading AI Insights...</div>
                        <div style="font-size: 13px; color: #999;" id="ai-insights-status">Analyzing swim data...</div>
                    </div>`;
                }
                
                // Retrieve height and weight from localStorage if available
                let athleteStats = {};
                if (data.swimmer && data.swimmer.pkey) {
                    const swimmerPkey = String(data.swimmer.pkey);
                    const storageKey = `swimmer_stats_${swimmerPkey}`;
                    const savedStats = localStorage.getItem(storageKey);
                    if (savedStats) {
                        try {
                            const stats = JSON.parse(savedStats);
                            if (stats.height) athleteStats.height = stats.height;
                            if (stats.weight) athleteStats.weight = stats.weight;
                        } catch (e) {
                            console.log('Error parsing saved stats:', e);
                        }
                    }
                }
                
                const insightsData = await window.generateInsights(data, athleteStats);
                const insightsHtml = window.renderInsights(insightsData, false, data);
                
                // Replace content with new insights only after they're ready
                if (insightsTabIndex >= 0 && views[insightsTabIndex]) {
                    views[insightsTabIndex].innerHTML = insightsHtml;
                }
            } catch (error) {
                console.error("Error refreshing insights:", error);
                console.error("Error stack:", error.stack);
                // Use the same insightsView we already have from the try block
                
                if (insightsView) {
                    // Remove loading overlay if present
                    const overlay = insightsView.querySelector('#ai-insights-updating-overlay');
                    if (overlay) overlay.remove();
                    
                    // Restore header button if we have existing content
                    const analysisHeader = insightsView.querySelector('.ai-analysis-header');
                    if (analysisHeader && existingContent) {
                        let headerRight = analysisHeader.querySelector('.ai-analysis-header-right');
                        if (headerRight) {
                            headerRight.innerHTML = '<button id="regenerate-ai-btn" onclick="regenerateAIAnalysis()" class="regenerate-ai-btn-header">🔄 Regenerate</button>';
                        }
                    }
                    
                    // If we have existing content, show error message above it; otherwise replace
                    if (existingContent && insightsView.innerHTML.includes('ai-analysis-main-card')) {
                        // Show error banner at top, keep existing content
                        const errorBanner = document.createElement('div');
                        errorBanner.style.cssText = 'background: rgba(220, 53, 69, 0.1); border-left: 4px solid #dc3545; padding: 12px 15px; margin-bottom: 15px; border-radius: 5px;';
                        errorBanner.innerHTML = `<div style="font-size: 14px; color: #dc3545; font-weight: 600; margin-bottom: 5px;">⚠️ Error refreshing insights: ${error.message || 'Unknown error'}</div><button onclick="window.refreshInsights && window.refreshInsights()" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">Try Again</button>`;
                        insightsView.insertBefore(errorBanner, insightsView.firstChild);
                    } else {
                        // No existing content - show full error message
                        const errorDetails = error.message || 'Unknown error';
                        insightsView.innerHTML = `<div class="ai-insights-empty" style="padding: 20px; background: rgba(220, 53, 69, 0.1); border-left: 4px solid #dc3545; border-radius: 5px;">
                            <div style="font-size: 16px; font-weight: 600; color: #dc3545; margin-bottom: 10px;">⚠️ Error refreshing insights</div>
                            <div style="font-size: 14px; color: #666; margin-bottom: 15px;">${errorDetails}</div>
                            <button onclick="window.refreshInsights && window.refreshInsights()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Try Again</button>
                        </div>`;
                    }
                }
            } finally {
                _refreshInProgress = false;
            }
        };
        
        // Store swimmer data in refresh function for regenerate button
        window.refreshInsights._data = data;
        
        // Set up callback to refresh insights when BC rankings complete
        // Use a debounce to prevent multiple rapid calls
        let bcRefreshTimeout = null;
        const originalCheckBC = window.checkBCRankingsComplete;
        window.checkBCRankingsComplete = function() {
            if (originalCheckBC) originalCheckBC();
            // Clear any pending refresh
            if (bcRefreshTimeout) {
                clearTimeout(bcRefreshTimeout);
            }
            // Debounce: only refresh once after rankings are stable
            bcRefreshTimeout = setTimeout(() => {
                if (window.refreshInsights && !_refreshInProgress) {
                    console.log('BC rankings complete, refreshing insights...');
                    window.refreshInsights();
                }
            }, 1000); // Wait 1 second for rankings to stabilize
        };
    }

    // Tab 3: Compare (moved from 5th)
    if (window.createCompareTab) {
        const compareTabContent = window.createCompareTab(data);
        tabView.addTab("<p>Compare</p>", compareTabContent);
    }

    // Tab 4: Progress Graph (moved from 2nd)
    // Wait for createClickableDiv if needed
    if (!window.createClickableDiv) {
        let waitCount2 = 0;
        while (!window.createClickableDiv && waitCount2 < 50) {
            await new Promise(resolve => setTimeout(resolve, 10));
            waitCount2++;
        }
    }

    tabView.addTab(
        window.createClickableDiv ?
            window.createClickableDiv(
                "Progress Graph",
                `showGraph(null,{pkey:${data.swimmer.pkey}})`,
            ) :
            "<p>Progress Graph</p>",
        progressGraph,
    );

    // Tab 5: Age Best
    tabView.addTab("<p>Age Best</p>", ageBestTable);

    // Tab 6: Meets
    tabView.addTab("<p>Meets</p>", meetTable);
    
    html.push(tabView.render());

    html.push(addHide25Botton());
    
    // Specialty chart is now generated within the AI analysis section, not here

    window.updateContent(html.join(""));

    // Initialize shadow toggle after content is loaded
    setTimeout(initializeShadowToggle, 100);
}

function getAlias(firstName, lastName) {
    let alias = firstName;
    if (alias[alias.length - 1] != " ") {
        if (alias.toLowerCase().endsWith(lastName.toLowerCase())) {
            alias = alias.substring(0, alias.length - lastName.length);
        }

        parts = alias.trim().split(" ");
        alias = parts.pop();
    } else {
        alias = alias.substring(0, alias.length - 1);
    }

    return alias;
}

/**
 * Get the highest achieved meet cut for a swimmer
 * Returns a string like "Futures: 100 BR" or "PNS 14U: 50 BR" or null if no cuts achieved
 */
function getHighestAchievedCut(data) {
    try {
        if (!data.events || !window.getMeetStandards || !window._eventList) {
            return null;
        }
        
        // Try to get idx, or use default positions
        const idx = data.events.idx || { time: 0, event: 6 }; // Default positions based on API structure
        
        const swimmerAge = data.swimmer.age || 13;
        const genderStr = window.convertGenderCodeToString(data.swimmer.gender);
        const meetStandards = window.getMeetStandards(swimmerAge);
        
        if (!meetStandards || meetStandards.length === 0 || !genderStr) {
            return null;
        }
        
        // Cut hierarchy from highest to lowest
        const cutHierarchy = ["Futures", "SprSec", "SumSec", "WZone", "PNS_sc", "PNS_14u", "NWReg"];
        const cutDisplayNames = {
            "Futures": "Futures",
            "SprSec": "Sectionals",
            "SumSec": "Sectionals",
            "WZone": "Zones",
            "PNS_sc": "PNS Senior",
            "PNS_14u": "PNS 14U",
            "NWReg": "NW Regionals"
        };
        
        // Get best times per event
        const bestTimes = {};
        for (const event of data.events) {
            const eventCode = event[idx.event];
            const timeStr = event[idx.time];
            const timeInt = window.timeToInt ? window.timeToInt(timeStr) : 0;
            const eventStr = window._eventList[eventCode];
            
            if (eventStr && timeInt > 0) {
                if (!bestTimes[eventStr] || timeInt < bestTimes[eventStr].time) {
                    bestTimes[eventStr] = { time: timeInt, timeStr: timeStr };
                }
            }
        }
        
        // Check each cut level from highest to lowest
        for (const cutShort of cutHierarchy) {
            const std = meetStandards.find(s => s.short === cutShort);
            if (!std) continue;
            
            const genderMap = std[genderStr];
            if (!genderMap) continue;
            
            for (const [eventStr, bestTime] of Object.entries(bestTimes)) {
                let stdData;
                if (typeof genderMap.get === 'function') {
                    stdData = genderMap.get(eventStr);
                } else if (genderMap[eventStr]) {
                    stdData = genderMap[eventStr];
                }
                
                if (!stdData) continue;
                
                const stdTimeInt = Array.isArray(stdData) ? stdData[1] : stdData;
                if (!stdTimeInt || stdTimeInt <= 0) continue;
                
                if (bestTime.time <= stdTimeInt) {
                    const shortEvent = eventStr.replace(" SCY", "").replace(" LCM", "").replace(" SCM", "");
                    const displayName = cutDisplayNames[cutShort] || cutShort;
                    return `${displayName}: ${shortEvent}`;
                }
            }
        }
        
        return null;
    } catch (e) {
        console.error("getHighestAchievedCut error:", e);
        return null;
    }
}

async function createDetailsPageTitle(data) {
    let html = [];

    /**
     * Handle swimmer name display - simplified approach
     * Take first word from firstName + last word from lastName
     */
    let displayName;

    if (data.swimmer.firstName && data.swimmer.lastName) {
        let firstName = data.swimmer.firstName.trim();
        let lastName = data.swimmer.lastName.trim();

        // Take first word from firstName and last word from lastName
        let firstWords = firstName.split(" ");
        let lastWords = lastName.split(" ");

        let firstNamePart = firstWords[0];
        let lastNamePart = lastWords[lastWords.length - 1];

        displayName = firstNamePart + " " + lastNamePart;
    } else {
        displayName =
            (data.swimmer.firstName || "") +
            " " +
            (data.swimmer.lastName || "");
    }

    let genderStr = window.convertGenderCodeToString(data.swimmer.gender);
    
    // Get birthday from cache
    let birthdayStr = "";
    let birthday = await window._birthdayDictionary.load(data.swimmer.pkey);
    
    if (birthday && Array.isArray(birthday) && birthday.length >= 2) {
        let [left, right] = birthday;
        
        // Convert to YYYY-MM-DD string
        if (typeof left === 'string') left = left.substring(0, 10);
        if (typeof right === 'string') right = right.substring(0, 10);
        
        // Format as readable (YYYY/M/D)
        let leftDisplay = left.replace(/-0/g, "-").replace(/-/g, "/");
        let rightDisplay = right.replace(/-0/g, "-").replace(/-/g, "/");
        
        if (leftDisplay === rightDisplay) {
            birthdayStr = leftDisplay;
        } else if (left.substring(0, 4) === right.substring(0, 4)) {
            // Same year - show month range like "2012/3/15 - 9/28"
            birthdayStr = leftDisplay + " - " + rightDisplay.substring(5);
        } else {
            birthdayStr = leftDisplay + " - " + rightDisplay;
        }
    }
    
    // Fallback to year estimate
    if (!birthdayStr && data.swimmer.age) {
        birthdayStr = (new Date().getFullYear() - data.swimmer.age) + "";
    }
    
    // Format birthday more naturally (e.g., "Mar 2012" instead of "2012/3/4 - 3/29")
    let birthDisplay = "";
    if (birthdayStr) {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        // Extract year and approximate month from birthdayStr
        const parts = birthdayStr.split("/");
        if (parts.length >= 2) {
            const year = parts[0];
            const month = parseInt(parts[1]) - 1;
            if (month >= 0 && month < 12) {
                birthDisplay = months[month] + " " + year;
            } else {
                birthDisplay = year;
            }
        } else {
            birthDisplay = birthdayStr;
        }
    }
    
    // Shorten club name
    let clubShort = data.swimmer.clubName;
    if (clubShort && clubShort.includes("Bellevue Club")) {
        clubShort = "BC Swim Team";
    }
    
    // Get highest achieved cut
    let highestCut = getHighestAchievedCut(data);
    
    let infoHtml = '<div class="match-size header swimmer-info-bar">' +
        '<span class="swimmer-name">' + displayName + '</span>' +
        '<span class="separator">·</span>' +
        '<span class="swimmer-gender">' + genderStr + '</span>' +
        '<span class="separator">·</span>' +
        '<span class="swimmer-age">Age ' + data.swimmer.age + '</span>' +
        (birthDisplay ? '<span class="separator">·</span><span class="swimmer-birthday">Born ~' + birthDisplay + '</span>' : '') +
        (highestCut ? '<span class="separator">·</span><span class="swimmer-cut">' + highestCut + '</span>' : '') +
        '<span class="separator">·</span>' +
        '<span class="swimmer-events">' + data.events.length + ' events</span>' +
        '<span class="separator">·</span>' +
        '<span class="swimmer-club">' + clubShort + '</span>' +
        '</div>';
    
    html.push(infoHtml);

    return html.join("");
}

function addHide25Botton() {
    let hide25 = localStorage.getItem("hide25");
    return [
        '<div style="height:20px;margin:5px"><button onclick="toggle25()" style="position:absolute;right:0">',
        hide25 ? "Show 25 Events" : "Hide 25 Events",
        "</button></div>",
    ].join("");
}

function toggle25() {
    let hide25 = localStorage.getItem("hide25");
    if (hide25) {
        localStorage.removeItem("hide25");
    } else {
        localStorage.setItem("hide25", "1");
    }
    loadContent();
}

async function getFastRowByEvent(events) {
    if (!events || !events.idx) {
        console.log("getFastRowByEvent: events missing idx property");
        return new Map();
    }

    // Wait for timeToInt function to be available
    while (!window.timeToInt) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // find the fast time for each event
    let fastRowMap = new Map();
    for (let row of events) {
        let eventKey = row[events.idx.event];
        let fastRow = fastRowMap.get(eventKey);
        if (
            !fastRow ||
            window.timeToInt(row[events.idx.time]) <=
                window.timeToInt(fastRow[events.idx.time])
        ) {
            fastRowMap.set(eventKey, row);
        }
    }

    // get unique event keys
    let uniqueEventKeys = [...fastRowMap.keys()];

    uniqueEventKeys.sort((a, b) => getEventSortKey(a) - getEventSortKey(b));

    // convert fastRow to a list ordered by the key of fastRow map
    let fastRowList = [];
    for (let key of uniqueEventKeys) {
        fastRowList.push(fastRowMap.get(key));
    }

    return fastRowList;
}

// ================================================================================
// SEARCH FUNCTIONALITY
// ================================================================================

async function search(name, all) {
    if (!name) {
        window.location.replace("");
        return;
    }

    let values = await loadSearch(name, all);
    showSearch(values, name);
}

async function searchAll(params) {
    return await search(params, true);
}

async function loadSearch(name, all) {
    let key = "search/" + name + (all ? "<ALL>" : "");
    // Use 10 minute cache timeout for search results to avoid stale data
    const searchCacheTimeout = 10 * 60 * 1000;
    return await LocalCache.func(key, async () => {
        let values = await loadSwimmerSearch(name, all);
        if (!values || values.length == 0) {
            values = await loadClubSearch(name, all);
        }

        if (!values || values.length == 0) {
            return values;
        }

        // Always filter swimmers to only include those with swim times
        // This ensures consistent results across devices
        values = await filterSwimmers(values);
        if (values && values.length > 0) {
            values.sort((a, b) => a[values.idx.age] - b[values.idx.age]);
        }
        return values || [];
    }, searchCacheTimeout);
}

async function filterSwimmers(values) {
    if (!values || values.length === 0) {
        return values;
    }
    
    let pkeys = new Set(values.map((v) => v[values.idx.pkey]));

    let bodyObj = {
        metadata: [
            {
                title: "pkey",
                dim: "[UsasSwimTime.PersonKey]",
                datatype: "numeric",
                filter: {
                    members: [...pkeys],
                },
            },
        ],
        count: pkeys.size,
    };

    try {
    let list = await fetchSwimValues(bodyObj, "event");
        if (!list || !list.length) {
            // If filtering fails, return original values to avoid losing results
            return values;
    }

    pkeys = new Set(list.map((v) => v[list.idx.pkey]));
    let result = [];
    let idx = values.idx;
    result.idx = idx;
    for (let row of values) {
        if (pkeys.has(row[idx.pkey])) {
            result.push(row);
        }
    }

    return result;
    } catch (error) {
        console.error("Error filtering swimmers:", error);
        // If filtering fails, return original values to avoid losing results
        return values;
    }
}

async function fetchGendersForSwimmers(pkeys) {
    // Fetch gender from events for multiple swimmers at once
    if (!pkeys || pkeys.length === 0) return new Map();
    
    const genderMap = new Map();
    
    // Fetch in batches to avoid overwhelming the API
    const batchSize = 20;
    for (let i = 0; i < pkeys.length; i += batchSize) {
        const batch = pkeys.slice(i, i + batchSize);
        
        try {
            const bodyObj = {
                metadata: [
                    {
                        title: "pkey",
                        dim: "[UsasSwimTime.PersonKey]",
                        datatype: "numeric",
                    },
                    {
                        title: "gender",
                        dim: "[UsasSwimTime.EventCompetitionCategoryKey]",
                        datatype: "numeric",
                    },
                    {
                        dim: "[UsasSwimTime.PersonKey]",
                        datatype: "numeric",
                        filter: {
                            members: batch,
                        },
                        panel: "scope",
                    },
                ],
                count: batch.length * 10, // Get multiple events per swimmer
            };
            
            const events = await fetchSwimValues(bodyObj, "event");
            if (events && events.length > 0 && events.idx) {
                const idx = events.idx;
                for (const event of events) {
                    const pkey = event[idx.pkey];
                    const genderCode = event[idx.gender];
                    
                    // Only set if not already set (use first event found)
                    if (!genderMap.has(pkey) && genderCode !== undefined && genderCode !== null) {
                        // Gender codes: 1 = Female (F), 2 = Male (M)
                        let genderStr = '';
                        if (genderCode === 1 || genderCode === '1') {
                            genderStr = 'F';
                        } else if (genderCode === 2 || genderCode === '2') {
                            genderStr = 'M';
                        }
                        if (genderStr) {
                            genderMap.set(pkey, genderStr);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching genders for batch:', error);
        }
    }
    
    return genderMap;
}

async function showSearch(values, searchQuery = '') {
    if (!values || values.length == 0) {
        window.updateContent("No result found");
        return;
    }

    // Sort results: exact name matches first, then by age
    const idx = values.idx || { name: 0, age: 1, clubName: 2, lsc: 3, pkey: 4, gender: 5 };
    if (searchQuery) {
        const queryLower = searchQuery.toLowerCase().trim();
        values.sort((a, b) => {
            // Safely convert to string before calling toLowerCase
            const nameA = String(a[idx.name] || '').toLowerCase();
            const nameB = String(b[idx.name] || '').toLowerCase();
            
            // Check for exact match
            const exactA = nameA === queryLower;
            const exactB = nameB === queryLower;
            
            if (exactA && !exactB) return -1;
            if (!exactA && exactB) return 1;
            
            // If both or neither are exact matches, sort by age
            return a[idx.age] - b[idx.age];
        });
    }

    // Filter out swimmers older than 18 (exclude 19O)
    const filteredValues = values.filter(row => {
        const age = row[idx.age];
        return age !== undefined && age !== null && age <= 18;
    });
    
    if (filteredValues.length === 0) {
        window.updateContent('<div class="content"><p>No swimmers found (excluding swimmers older than 18).</p></div>');
        return;
    }
    
    // Calculate age group counts by gender (excluding 19O)
    const ageGroupCounts = {
        '10U': { total: 0, M: 0, F: 0 },
        '11-12': { total: 0, M: 0, F: 0 },
        '13-14': { total: 0, M: 0, F: 0 },
        '15-16': { total: 0, M: 0, F: 0 },
        '17-18': { total: 0, M: 0, F: 0 }
    };
    
    // Collect all pkeys to fetch genders first (only for filtered values)
    const pkeys = [];
    for (const row of filteredValues) {
        const pkey = row[idx.pkey];
        if (pkey) pkeys.push(pkey);
    }
    
    // Fetch genders from events
    const genderMap = await fetchGendersForSwimmers(pkeys);
    
    // Calculate counts (only for age groups <= 18)
    for (const row of filteredValues) {
        const age = row[idx.age];
        const pkey = row[idx.pkey];
        
        // Get gender from map or row
        let gender = genderMap.get(pkey) || '';
        if (!gender && idx.gender !== undefined && idx.gender !== null && row[idx.gender] !== undefined && row[idx.gender] !== null && row[idx.gender] !== '') {
            const genderCode = row[idx.gender];
            if (genderCode === 1 || genderCode === '1') {
                gender = 'F';
            } else if (genderCode === 2 || genderCode === '2') {
                gender = 'M';
            } else if (genderCode === 'F' || genderCode === 'f' || genderCode === 'Female') {
                gender = 'F';
            } else if (genderCode === 'M' || genderCode === 'm' || genderCode === 'Male') {
                gender = 'M';
            }
        }
        
        if (age !== undefined && age !== null && age <= 18) {
            let ageGroup = null;
            if (age <= 10) {
                ageGroup = '10U';
            } else if (age >= 11 && age <= 12) {
                ageGroup = '11-12';
            } else if (age >= 13 && age <= 14) {
                ageGroup = '13-14';
            } else if (age >= 15 && age <= 16) {
                ageGroup = '15-16';
            } else if (age >= 17 && age <= 18) {
                ageGroup = '17-18';
            }
            
            if (ageGroup) {
                ageGroupCounts[ageGroup].total++;
                if (gender === 'M' || gender === 'm' || gender === 'Male') {
                    ageGroupCounts[ageGroup].M++;
                } else if (gender === 'F' || gender === 'f' || gender === 'Female') {
                    ageGroupCounts[ageGroup].F++;
                }
            }
        }
    }

    // Always show search results table (don't auto-navigate even for 1 result)
    let html = [];
    
    // Add age group counts summary above the table
    const ageGroupSummary = [];
    for (const [group, counts] of Object.entries(ageGroupCounts)) {
        if (counts.total > 0) {
            const genderBreakdown = [];
            if (counts.M > 0) genderBreakdown.push(`M: ${counts.M}`);
            if (counts.F > 0) genderBreakdown.push(`F: ${counts.F}`);
            const breakdown = genderBreakdown.length > 0 ? ` (${genderBreakdown.join(', ')})` : '';
            ageGroupSummary.push(`${group}: ${counts.total}${breakdown}`);
        }
    }
    
    // Calculate total by gender
    let totalM = 0, totalF = 0;
    for (const counts of Object.values(ageGroupCounts)) {
        totalM += counts.M;
        totalF += counts.F;
    }
    
    if (ageGroupSummary.length > 0) {
        // Find max count for scaling the chart
        const maxCount = Math.max(...Object.values(ageGroupCounts).map(c => c.total), filteredValues.length);
        
        html.push('<div style="margin-bottom: 15px;">');
        html.push('<div style="font-weight: 700; color: #333; margin-bottom: 8px; font-size: 15px; padding: 0 2px;">Age Groups Breakdown</div>');
        
        // Add bar chart
        html.push('<div style="margin-bottom: 15px; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); border: 1px solid rgba(0, 0, 0, 0.06);">');
        html.push('<div style="font-weight: 600; color: #495057; margin-bottom: 15px; font-size: 14px;">Distribution by Age Group</div>');
        html.push('<div style="display: flex; align-items: flex-end; justify-content: space-around; min-height: 250px; gap: 8px; padding: 0 0 10px 0; border-bottom: 2px solid #e9ecef;">');
        
        // Calculate the actual max bar height needed (use 98% of available space for tallest bar)
        const chartMaxHeight = 250; // Shorter container
        const barMaxHeight = chartMaxHeight * 0.98; // Use 98% of chart height for tallest bar (taller bars)
        // Find max of male or female counts for scaling
        const maxGenderCount = Math.max(
            ...Object.values(ageGroupCounts).map(c => Math.max(c.M || 0, c.F || 0)),
            totalM,
            totalF
        );
        
        for (const [group, counts] of Object.entries(ageGroupCounts)) {
            if (counts.total > 0) {
                html.push('<div style="flex: 1; display: flex; flex-direction: column; align-items: center; max-width: 120px;">');
                html.push(`<div style="width: 100%; height: ${chartMaxHeight}px; display: flex; flex-direction: row; align-items: flex-end; justify-content: center; gap: 4px; position: relative; border-left: 1px solid #e9ecef; padding-left: 4px;">`);
                
                // Side-by-side bars: Male (blue) and Female (red)
                // Calculate heights based on max gender count, not total
                const maleHeight = counts.M > 0 ? (counts.M / maxGenderCount) * barMaxHeight : 0;
                const femaleHeight = counts.F > 0 ? (counts.F / maxGenderCount) * barMaxHeight : 0;
                
                // Male bar (blue) - left side
                if (counts.M > 0 && maleHeight > 0) {
                    html.push(`<div style="flex: 1; position: relative; min-width: 20px;">`);
                    // Label on top of bar
                    html.push(`<div style="position: absolute; bottom: ${maleHeight + 4}px; left: 50%; transform: translateX(-50%); font-size: 11px; font-weight: 700; color: #007bff; white-space: nowrap; text-shadow: 0 1px 2px rgba(255,255,255,0.9); z-index: 10; pointer-events: none;">${counts.M}</div>`);
                    html.push(`<div style="height: ${maleHeight}px; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); border-radius: 4px 4px 0 0; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" title="Male: ${counts.M}"></div>`);
                    html.push('</div>');
                } else {
                    html.push('<div style="flex: 1; min-width: 20px;"></div>');
                }
                
                // Female bar (red) - right side
                if (counts.F > 0 && femaleHeight > 0) {
                    html.push(`<div style="flex: 1; position: relative; min-width: 20px;">`);
                    // Label on top of bar
                    html.push(`<div style="position: absolute; bottom: ${femaleHeight + 4}px; left: 50%; transform: translateX(-50%); font-size: 11px; font-weight: 700; color: #dc3545; white-space: nowrap; text-shadow: 0 1px 2px rgba(255,255,255,0.9); z-index: 10; pointer-events: none;">${counts.F}</div>`);
                    html.push(`<div style="height: ${femaleHeight}px; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 4px 4px 0 0; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" title="Female: ${counts.F}"></div>`);
                    html.push('</div>');
                } else {
                    html.push('<div style="flex: 1; min-width: 20px;"></div>');
                }
                
                html.push('</div>');
                html.push(`<div style="margin-top: 8px; font-size: 12px; font-weight: 600; color: #495057; text-align: center;">${group}</div>`);
                html.push(`<div style="margin-top: 4px; font-size: 11px; color: #6c757d; text-align: center;">${counts.total}</div>`);
                html.push('</div>');
            }
        }
        
        html.push('</div>');
        html.push('<div style="display: flex; justify-content: center; gap: 20px; margin-top: 10px; font-size: 12px;">');
        html.push('<div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); border-radius: 3px;"></div><span style="color: #495057;">Male</span></div>');
        html.push('<div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 3px;"></div><span style="color: #495057;">Female</span></div>');
        html.push('</div>');
        html.push('</div>');
        
        html.push('<table class="fill top-margin" id="age-groups-table" style="border-collapse: collapse; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">');
        html.push('<thead><tr class="th">');
        html.push('<th style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important; color: #ffffff !important; font-weight: 700 !important; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important; border: 1px solid rgba(0, 86, 179, 0.3) !important; padding: 12px 10px; text-align: left; font-size: 13px; letter-spacing: 0.3px;">Age Group</th>');
        html.push('<th style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important; color: #ffffff !important; font-weight: 700 !important; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important; border: 1px solid rgba(0, 86, 179, 0.3) !important; padding: 12px 10px; text-align: right; font-size: 13px; letter-spacing: 0.3px;">Total</th>');
        html.push('<th style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important; color: #ffffff !important; font-weight: 700 !important; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important; border: 1px solid rgba(0, 86, 179, 0.3) !important; padding: 12px 10px; text-align: left; font-size: 13px; letter-spacing: 0.3px;">Gender</th>');
        html.push('</tr></thead><tbody>');
        
        // Display each age group in a table row with 3 columns
        let rowIndex = 0;
        for (const [group, counts] of Object.entries(ageGroupCounts)) {
            if (counts.total > 0) {
                const genderBreakdown = [];
                if (counts.M > 0) genderBreakdown.push(`<span style="color: #007bff; font-weight: 600;">M: ${counts.M}</span>`);
                if (counts.F > 0) genderBreakdown.push(`<span style="color: #dc3545; font-weight: 600;">F: ${counts.F}</span>`);
                const breakdown = genderBreakdown.length > 0 ? genderBreakdown.join(', ') : '-';
                
                const bgColor = rowIndex % 2 === 0 ? 'rgba(255, 255, 255, 1)' : 'rgba(248, 249, 250, 0.8)';
                html.push(`<tr style="transition: all 0.2s ease; background-color: ${bgColor};">`);
                html.push(`<td style="padding: 10px 8px; border: 1px solid rgba(0, 0, 0, 0.06); font-size: 14px; text-align: left; font-weight: 600; color: #495057;">${group}</td>`);
                html.push(`<td style="padding: 10px 8px; border: 1px solid rgba(0, 0, 0, 0.06); font-size: 14px; text-align: right; font-weight: 600; color: #333;">${counts.total}</td>`);
                html.push(`<td style="padding: 10px 8px; border: 1px solid rgba(0, 0, 0, 0.06); font-size: 14px; text-align: left; color: #333;">${breakdown}</td>`);
                html.push('</tr>');
                rowIndex++;
            }
        }
        
        // Display total row
        const totalBreakdown = [];
        if (totalM > 0) totalBreakdown.push(`<span style="color: #007bff; font-weight: 600;">M: ${totalM}</span>`);
        if (totalF > 0) totalBreakdown.push(`<span style="color: #dc3545; font-weight: 600;">F: ${totalF}</span>`);
        html.push(`<tr style="background-color: rgba(227, 242, 253, 0.3) !important; border-top: 2px solid rgba(0, 123, 255, 0.2);">`);
        html.push(`<td style="padding: 12px 8px; border: 1px solid rgba(0, 0, 0, 0.06); font-size: 15px; font-weight: 700; color: #333;">Total</td>`);
        html.push(`<td style="padding: 12px 8px; border: 1px solid rgba(0, 0, 0, 0.06); font-size: 15px; font-weight: 700; color: #333; text-align: right;">${filteredValues.length}</td>`);
        html.push(`<td style="padding: 12px 8px; border: 1px solid rgba(0, 0, 0, 0.06); font-size: 15px; font-weight: 700; color: #333;">${totalBreakdown.length > 0 ? totalBreakdown.join(', ') : '-'}</td>`);
        html.push('</tr>');
        
        html.push('</tbody>');
        html.push('</table>');
        html.push('</div>');
    }

    html.push(
        '<table class="fill top-margin" id="search-table"><thead><tr class="th">',
        '<th style="cursor: pointer;" onclick="sortSearchTable(0)">#</th>',
        '<th style="cursor: pointer;" onclick="sortSearchTable(1)">Name ↕</th>',
        '<th style="cursor: pointer;" onclick="sortSearchTable(2)">Age ↕</th>',
        '<th style="cursor: pointer;" onclick="sortSearchTable(3)">Gender ↕</th>',
        '<th style="cursor: pointer;" onclick="sortSearchTable(4)">Club ↕</th>',
        '<th style="cursor: pointer;" onclick="sortSearchTable(5)">LSC ↕</th>',
        '</tr></thead><tbody id="search-table-body">',
    );
    
    // Gender map already fetched above for age group counts
    console.log('Fetched genders for', genderMap.size, 'swimmers');
    
    let index = 0;
    for (let row of filteredValues) {
        const name = row[idx.name] || '';
        const age = row[idx.age] || '';
        const pkey = row[idx.pkey];
        
        // Get gender from map (fetched from events)
        let gender = genderMap.get(pkey) || '';
        
        // Fallback: try to get from row if available
        if (!gender && idx.gender !== undefined && idx.gender !== null && row[idx.gender] !== undefined && row[idx.gender] !== null && row[idx.gender] !== '') {
            const genderCode = row[idx.gender];
            if (genderCode === 1 || genderCode === '1') {
                gender = 'F';
            } else if (genderCode === 2 || genderCode === '2') {
                gender = 'M';
            } else if (genderCode === 'F' || genderCode === 'f' || genderCode === 'Female') {
                gender = 'F';
            } else if (genderCode === 'M' || genderCode === 'm' || genderCode === 'Male') {
                gender = 'M';
            }
        }
        
        const club = row[idx.clubName] || '';
        const lsc = row[idx.lsc] || '';
        
        html.push(
            `<tr onclick="go('swimmer', ${pkey})" data-index="${index}" data-name="${String(name || '').toLowerCase()}" data-age="${age || 0}" data-gender="${String(gender || '').toLowerCase()}" data-club="${String(club || '').toLowerCase()}" data-lsc="${String(lsc || '').toLowerCase()}">`,
            '<td>',
            ++index,
            '</td><td class="left">',
            name,
            "</td><td>",
            age,
            "</td><td>",
            gender || '-',
            '</td><td class="left">',
            club,
            "</td><td>",
            lsc,
            "</td></tr>",
        );
    }
    html.push("</tbody></table>");
    
    // Store original values for sorting
    window._searchTableData = values;
    window._searchTableIdx = idx;

    window.updateContent(html.join(""));
}

// Sort function for search table
function sortSearchTable(columnIndex) {
    const table = document.getElementById("search-table");
    const tbody = document.getElementById("search-table-body");
    if (!table || !tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const currentSort = table.dataset.sortColumn;
    const currentOrder = table.dataset.sortOrder || 'asc';
    
    // Determine new sort order
    let newOrder = 'asc';
    if (currentSort == columnIndex && currentOrder == 'asc') {
        newOrder = 'desc';
    }
    
    // Update table sort state
    table.dataset.sortColumn = columnIndex;
    table.dataset.sortOrder = newOrder;
    
    // Sort rows
    rows.sort((a, b) => {
        let aVal, bVal;
        
        switch(columnIndex) {
            case 0: // Index
                aVal = parseInt(a.dataset.index) || 0;
                bVal = parseInt(b.dataset.index) || 0;
                break;
            case 1: // Name
                aVal = a.dataset.name || '';
                bVal = b.dataset.name || '';
                break;
            case 2: // Age
                aVal = parseInt(a.dataset.age) || 0;
                bVal = parseInt(b.dataset.age) || 0;
                break;
            case 3: // Gender
                aVal = a.dataset.gender || '';
                bVal = b.dataset.gender || '';
                break;
            case 4: // Club
                aVal = a.dataset.club || '';
                bVal = b.dataset.club || '';
                break;
            case 5: // LSC
                aVal = a.dataset.lsc || '';
                bVal = b.dataset.lsc || '';
                break;
            default:
                return 0;
        }
        
        if (typeof aVal === 'string') {
            return newOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
            return newOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
    });
    
    // Clear and re-append sorted rows
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
    
    // Update header arrows
    const headers = table.querySelectorAll('th');
    headers.forEach((th, i) => {
        if (i === columnIndex) {
            th.textContent = th.textContent.replace(/ ↕| ↑| ↓/g, '') + (newOrder === 'asc' ? ' ↑' : ' ↓');
        } else {
            th.textContent = th.textContent.replace(/ ↕| ↑| ↓/g, '') + ' ↕';
        }
    });
}

// Efficient team search using the same approach as rankings
// This uses the proven loadClubAgeSwimmerList pattern from rankings.js
async function searchTeamByClubName(teamName) {
    const searchTerm = teamName.toLowerCase().trim();
    
    // Strategy 1: Direct search with name variations
    const nameVariations = [
        teamName, // Original search term
        teamName.replace(/ swim team/i, '').trim(),
        teamName.replace(/ club/i, '').trim(),
        teamName.replace(/ aquatic/i, '').trim(),
    ].filter(v => v);
    
    // Try LSCs in order of likelihood (PN = Pacific Northwest, then try all)
    const lscsToTry = ['PN', null, 'WA', 'CA', 'OR']; // null = try without LSC filter
    
    const [from, to] = [0, 100]; // Age range 0-100 for all ages
    
    // Try direct search first
    for (const nameVariation of nameVariations) {
        for (const lsc of lscsToTry) {
            try {
                const description = lsc ? `LSC ${lsc}` : 'all LSCs';
                console.log(`[Strategy 1] Trying to find team "${nameVariation}" in ${description}...`);
                
                // Use the EXACT same structure as loadClubAgeSwimmerList (proven to work)
                const bodyObj = {
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
                            title: "name",
                            dim: "[Persons.FullName]",
                            datatype: "text",
                        },
                        {
                            title: "clubName",
                            dim: "[Persons.ClubName]",
                            datatype: "text",
                        },
                        {
                            title: "lsc",
                            dim: "[Persons.LscCode]",
                            datatype: "text",
                        },
                        {
                            title: "gender",
                            dim: "[Persons.Gender]",
                            datatype: "text",
                        },
                        {
                            dim: "[Persons.ClubName]",
                            datatype: "text",
                            filter: {
                                contains: nameVariation,
                            },
                            panel: "scope",
                        },
                    ],
                    count: 5000,
                };
                
                // Add LSC filter only if specified (same as loadClubAgeSwimmerList)
                if (lsc) {
                    bodyObj.metadata.push({
                        dim: "[Persons.LscCode]",
                        datatype: "text",
                        filter: {
                            equals: lsc,
                        },
                        panel: "scope",
                    });
                }
                
                const swimmerList = await fetchSwimValues(bodyObj);
                
                if (swimmerList && swimmerList.length > 0 && swimmerList.idx) {
                    console.log(`✅ Found ${swimmerList.length} swimmers for team "${nameVariation}" in ${description}`);
                    
                    // Log sample club names to verify we got the right team
                    if (swimmerList.length > 0) {
                        const sampleClubs = new Set();
                        const sampleLSCs = new Set();
                        for (let i = 0; i < Math.min(10, swimmerList.length); i++) {
                            const club = swimmerList[i][swimmerList.idx.clubName];
                            const lscCode = swimmerList[i][swimmerList.idx.lsc];
                            if (club) sampleClubs.add(club);
                            if (lscCode) sampleLSCs.add(lscCode);
                        }
                        console.log('Sample club names found:', Array.from(sampleClubs));
                        console.log('Sample LSC codes found:', Array.from(sampleLSCs));
                    }
                    
                    return swimmerList;
                }
            } catch (error) {
                console.error(`Error searching ${description} with "${nameVariation}":`, error);
                continue;
            }
        }
    }
    
    // Strategy 2: Search through club dictionary to find matching club names
    console.log(`[Strategy 2] Searching club dictionary for teams matching "${searchTerm}"...`);
    const lscsForDictionary = ['PN', 'WA', 'CA', 'OR', 'AZ', 'CO', 'UT', 'NV'];
    const matchingClubNames = [];
    
    for (const lsc of lscsForDictionary) {
        try {
            // Wait for club dictionary to be available
            while (!window._clubDictinary) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const clubMap = await window._clubDictinary.loadClubMap(lsc);
            if (clubMap && clubMap.size > 0) {
                for (const [code, name] of clubMap) {
                    if (name && name.toLowerCase().includes(searchTerm)) {
                        matchingClubNames.push({ name, code, lsc });
                        console.log(`Found matching club: "${name}" (${code}) in LSC ${lsc}`);
                    }
                }
            }
        } catch (error) {
            console.error(`Error loading club dictionary for LSC ${lsc}:`, error);
        }
    }
    
    // If we found matching clubs, search for swimmers using those exact club names
    if (matchingClubNames.length > 0) {
        console.log(`[Strategy 2] Found ${matchingClubNames.length} matching clubs, searching for swimmers...`);
        
        // Group by LSC to search efficiently
        const clubsByLSC = {};
        for (const club of matchingClubNames) {
            if (!clubsByLSC[club.lsc]) {
                clubsByLSC[club.lsc] = [];
            }
            clubsByLSC[club.lsc].push(club.name);
        }
        
        // Search for each LSC
        for (const [lsc, clubNames] of Object.entries(clubsByLSC)) {
            try {
                console.log(`Searching for ${clubNames.length} clubs in LSC ${lsc}...`);
                
                const bodyObj = {
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
                            filter: { from: from, to: to },
                        },
                        {
                            title: "name",
                            dim: "[Persons.FullName]",
                            datatype: "text",
                        },
                        {
                            title: "clubName",
                            dim: "[Persons.ClubName]",
                            datatype: "text",
                        },
                        {
                            title: "lsc",
                            dim: "[Persons.LscCode]",
                            datatype: "text",
                        },
                        {
                            title: "gender",
                            dim: "[Persons.Gender]",
                            datatype: "text",
                        },
                        {
                            dim: "[Persons.ClubName]",
                            datatype: "text",
                            filter: {
                                members: clubNames, // Use "members" for exact match
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
                    count: 5000,
                };
                
                const swimmerList = await fetchSwimValues(bodyObj);
                
                if (swimmerList && swimmerList.length > 0 && swimmerList.idx) {
                    console.log(`✅ Found ${swimmerList.length} swimmers using club dictionary search`);
                    
                    // Log sample club names
                    const sampleClubs = new Set();
                    for (let i = 0; i < Math.min(10, swimmerList.length); i++) {
                        const club = swimmerList[i][swimmerList.idx.clubName];
                        if (club) sampleClubs.add(club);
                    }
                    console.log('Sample club names found:', Array.from(sampleClubs));
                    
                    return swimmerList;
                }
            } catch (error) {
                console.error(`Error searching LSC ${lsc} with club dictionary:`, error);
                continue;
            }
        }
    }
    
    console.log('❌ All search strategies failed');
    return null;
}

// Fetch full person details for a list of pkeys
async function fetchPersonDetailsForPkeys(pkeys) {
    if (!pkeys || pkeys.length === 0) return null;
    
    const batchSize = 50;
    const allSwimmers = [];
    let idx = null;
    
    for (let i = 0; i < pkeys.length; i += batchSize) {
        const batch = pkeys.slice(i, i + batchSize);
        try {
            const bodyObj = {
                metadata: [
            {
                title: "name",
                dim: "[Persons.FullName]",
                datatype: "text",
            },
            {
                title: "age",
                dim: "[Persons.Age]",
                datatype: "numeric",
                sort: "asc",
            },
            {
                title: "clubName",
                dim: "[Persons.ClubName]",
                datatype: "text",
                    },
                    {
                        title: "lsc",
                        dim: "[Persons.LscCode]",
                        datatype: "text",
                    },
                    {
                        title: "pkey",
                        dim: "[Persons.PersonKey]",
                        datatype: "numeric",
                    },
                    {
                        title: "gender",
                        dim: "[Persons.Gender]",
                        datatype: "text",
                    },
                    {
                        dim: "[Persons.PersonKey]",
                        datatype: "numeric",
                filter: {
                            members: batch,
                        },
                        panel: "scope",
                    },
                ],
                count: batch.length,
            };
            
            const persons = await fetchSwimValues(bodyObj);
            if (persons && persons.length > 0) {
                if (!idx && persons.idx) {
                    idx = persons.idx;
                }
                allSwimmers.push(...persons);
            }
        } catch (error) {
            console.error('Error fetching person details for batch:', error);
        }
    }
    
    if (allSwimmers.length > 0) {
        allSwimmers.idx = idx || {};
        return allSwimmers;
    }
    
    return null;
}

// Search for team by looking through events data (fallback method)
async function searchTeamByEvents(teamName) {
    const searchVariations = [
        teamName,
        teamName.toLowerCase(),
        teamName.toUpperCase(),
    ];
    
    // Add Bellevue variations
    if (teamName.toLowerCase().includes('bc') || teamName.toLowerCase().includes('bellevue')) {
        searchVariations.push('Bellevue Club Swim Team');
        searchVariations.push('Bellevue Club');
        searchVariations.push('Bellevue');
    }
    
    let allPkeys = new Set();
    let idx = null;
    
    for (const variation of searchVariations) {
        try {
            console.log('Trying events search with variation:', variation);
            const bodyObj = {
                metadata: [
                    {
                        title: "pkey",
                        dim: "[UsasSwimTime.PersonKey]",
                        datatype: "numeric",
                    },
                    {
                        title: "clubName",
                        dim: "[OrgUnit.Level4Name]",
                        datatype: "text",
                    },
                    {
                        dim: "[OrgUnit.Level4Name]",
                        datatype: "text",
                        filter: {
                            contains: variation,
                        },
                        panel: "scope",
                    },
                ],
                count: 5000,
            };
            
            console.log('Events search API call:', JSON.stringify(bodyObj, null, 2));
            const events = await fetchSwimValues(bodyObj, "event");
            console.log('Events search returned:', events ? events.length : 0, 'events');
            
            if (events && events.length > 0) {
                if (!idx && events.idx) {
                    idx = events.idx;
                }
                // Log sample club names to see what we're getting
                if (events[0] && events.idx && events.idx.clubName !== undefined) {
                    const sampleClubNames = new Set();
                    for (let i = 0; i < Math.min(10, events.length); i++) {
                        const clubName = events[i][events.idx.clubName];
                        if (clubName) sampleClubNames.add(clubName);
                    }
                    console.log('Sample club names found:', Array.from(sampleClubNames));
                }
                
                for (const event of events) {
                    if (event[events.idx.pkey]) {
                        allPkeys.add(event[events.idx.pkey]);
                    }
                }
                console.log('Events search with "' + variation + '" found', events.length, 'events for', allPkeys.size, 'unique swimmers');
                if (allPkeys.size > 0) break; // Found results, stop trying variations
            } else {
                console.log('No events found for variation:', variation);
            }
        } catch (error) {
            console.error('Error searching events with variation', variation, ':', error);
            continue;
        }
    }
    
    if (allPkeys.size === 0) {
        return null;
    }
    
    // Now fetch person details for these pkeys
    const pkeyArray = Array.from(allPkeys);
    const batchSize = 50;
    const allSwimmers = [];
    
    for (let i = 0; i < pkeyArray.length; i += batchSize) {
        const batch = pkeyArray.slice(i, i + batchSize);
        try {
            const bodyObj = {
                metadata: [
                    {
                        title: "name",
                        dim: "[Persons.FullName]",
                        datatype: "text",
                    },
                    {
                        title: "age",
                        dim: "[Persons.Age]",
                        datatype: "numeric",
                        sort: "asc",
                    },
                    {
                        title: "clubName",
                        dim: "[Persons.ClubName]",
                        datatype: "text",
            },
            {
                title: "lsc",
                dim: "[Persons.LscCode]",
                datatype: "text",
            },
            {
                title: "pkey",
                dim: "[Persons.PersonKey]",
                datatype: "numeric",
                    },
                    {
                        title: "gender",
                        dim: "[Persons.Gender]",
                        datatype: "text",
                    },
                    {
                        dim: "[Persons.PersonKey]",
                        datatype: "numeric",
                        filter: {
                            members: batch,
                        },
                        panel: "scope",
                    },
                ],
                count: batch.length,
            };
            
            const persons = await fetchSwimValues(bodyObj);
            if (persons && persons.length > 0) {
                if (!idx && persons.idx) {
                    idx = persons.idx;
                }
                allSwimmers.push(...persons);
            }
        } catch (error) {
            console.error('Error fetching person details for batch:', error);
        }
    }
    
    if (allSwimmers.length > 0) {
        allSwimmers.idx = idx || {};
        return allSwimmers;
    }
    
    return null;
}

async function loadClubSearch(value, all) {
    // Try both Persons.ClubName and a more flexible approach
    let bodyObj = {
        metadata: [
            {
                title: "name",
                dim: "[Persons.FullName]",
                datatype: "text",
            },
            {
                title: "age",
                dim: "[Persons.Age]",
                datatype: "numeric",
                sort: "asc",
            },
            {
                title: "clubName",
                dim: "[Persons.ClubName]",
                datatype: "text",
            },
            {
                title: "lsc",
                dim: "[Persons.LscCode]",
                datatype: "text",
            },
            {
                title: "pkey",
                dim: "[Persons.PersonKey]",
                datatype: "numeric",
            },
            {
                title: "gender",
                dim: "[Persons.Gender]",
                datatype: "text",
            },
            {
                dim: "[Persons.ClubName]",
                datatype: "text",
                filter: {
                    contains: value,
                },
                panel: "scope",
            },
        ],
        count: 5000,
    };

    if (!all) {
        // Limit to 18 and under when not searching all
        bodyObj.metadata[1].filter = {
            to: 18,
        };
    }
    // When all=true, no age filter is applied - search all ages

    console.log('loadClubSearch API call:', JSON.stringify(bodyObj, null, 2));
    const result = await fetchSwimValues(bodyObj);
    console.log('loadClubSearch returned:', result ? result.length : 0, 'results');
    if (result && result.length > 0 && result.idx) {
        console.log('Sample result:', {
            name: result[0][result.idx.name],
            clubName: result[0][result.idx.clubName],
            age: result[0][result.idx.age]
        });
    }
    return result;
}

async function loadSwimmerSearch(value, all) {
    let names = splitNameBySpaces(value);
    let calls = [];
    for (let [firstName, lastName] of names) {
        calls.push(
            loadSwimmerSearchByFirstAndLastName(firstName, lastName, all),
        );
    }

    let values = [];
    let data = await Promise.all(calls);
    let set = new Set();
    let idx = null;

    for (let vs of data) {
        if (!vs || vs.length === 0) continue;

        // Set idx from the first valid result
        if (!idx && vs.idx) {
            idx = vs.idx;
        }

        for (let v of vs) {
            if (!v || !vs.idx) continue;
            let pkey = v[vs.idx.pkey];
            if (!set.has(pkey)) {
                values.push(v);
                set.add(pkey);
            }
        }
    }

    // Ensure we have a valid idx mapping
    if (idx) {
        values.idx = idx;
        // Ensure gender is in the idx mapping (might be missing if API doesn't return it)
        if (idx.gender === undefined && idx.Gender === undefined) {
            console.log("loadSwimmerSearch: Gender field not found in API response idx");
            // Try to find gender field by checking field names
            // The API might return it with a different key
        }
    } else {
        console.log("loadSwimmerSearch: No valid idx found, creating fallback");
        // Create fallback idx mapping based on expected search result structure
        values.idx = {
            name: 0,
            age: 1,
            clubName: 2,
            lsc: 3,
            pkey: 4,
            gender: undefined // Will be undefined if not in API response
        };
    }

    return values;
}

function splitNameBySpaces(input) {
    const result = [];
    const words = input.split(" ");

    for (let i = 0; i <= words.length; i++) {
        const firstPart = words.slice(0, i).join(" ");
        const secondPart = words.slice(i).join(" ");
        result.push([firstPart, secondPart]);
    }

    return result;
}

async function loadSwimmerSearchByFirstAndLastName(firstName, lastName, all) {
    let bodyObj = {
        metadata: [
            {
                title: "name",
                dim: "[Persons.FullName]",
                datatype: "text",
            },
            {
                title: "age",
                dim: "[Persons.Age]",
                datatype: "numeric",
                sort: "asc",
            },
            {
                title: "clubName",
                dim: "[Persons.ClubName]",
                datatype: "text",
            },
            {
                title: "lsc",
                dim: "[Persons.LscCode]",
                datatype: "text",
            },
            {
                title: "pkey",
                dim: "[Persons.PersonKey]",
                datatype: "numeric",
            },
            {
                dim: "[Persons.LastName]",
                filter: {
                    startsWith: lastName,
                },
                panel: "scope",
            },
            {
                dim: "[Persons.FirstAndPreferredName]",
                filter: {
                    contains: firstName,
                },
                panel: "scope",
            },
        ],
        count: 5000,
    };

    if (!all) {
        // Limit to 18 and under when not searching all
        bodyObj.metadata[1].filter = {
            to: 18,
        };
    }
    // When all=true, no age filter is applied - search all ages

    return await fetchSwimValues(bodyObj);
}

// ================================================================================
// GLOBAL EXPORTS
// ================================================================================

// Toggle swimmer search menu
function toggleSwimmerSearchMenu(event) {
    if (event) event.stopPropagation();
    const toggleBtn = document.querySelector('.swimmer-search-toggle');
    const menu = document.querySelector('.swimmer-search-menu');
    
    // Close team search menu if open
    const teamMenu = document.querySelector('.team-search-menu');
    const teamToggleBtn = document.querySelector('.team-search-toggle');
    if (teamMenu && teamToggleBtn && teamMenu.style.display !== 'none') {
        teamMenu.style.display = 'none';
        teamToggleBtn.style.background = 'transparent';
        teamToggleBtn.style.color = '#555';
        teamToggleBtn.style.borderRadius = '50%';
        teamToggleBtn.style.width = '32px';
        teamToggleBtn.style.height = '32px';
        teamToggleBtn.style.padding = '0';
    }
    
    if (menu && toggleBtn) {
        const isHidden = menu.style.display === 'none';
        menu.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            toggleBtn.style.background = '#28a745';
            toggleBtn.style.color = 'white';
            // Don't change dimensions or display - keep them consistent
            // Focus on input when menu opens
            setTimeout(() => {
                const input = document.getElementById('input');
                if (input) input.focus();
            }, 100);
        } else {
            toggleBtn.style.background = 'transparent';
            toggleBtn.style.color = '#555';
            // Don't change dimensions or display - keep them consistent
        }
    }
}

// Toggle team search menu
function toggleTeamSearchMenu(event) {
    if (event) event.stopPropagation();
    const toggleBtn = document.querySelector('.team-search-toggle');
    const menu = document.querySelector('.team-search-menu');
    
    // Close swimmer search menu if open
    const swimmerMenu = document.querySelector('.swimmer-search-menu');
    const swimmerToggleBtn = document.querySelector('.swimmer-search-toggle');
    if (swimmerMenu && swimmerToggleBtn && swimmerMenu.style.display !== 'none') {
        swimmerMenu.style.display = 'none';
        swimmerToggleBtn.style.background = 'transparent';
        swimmerToggleBtn.style.color = '#555';
    }
    
    if (menu && toggleBtn) {
        const isHidden = menu.style.display === 'none';
        menu.style.display = isHidden ? 'block' : 'none';
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
            // Focus on input when menu opens
            setTimeout(() => {
                const input = document.getElementById('team-search-input');
                if (input) input.focus();
            }, 100);
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

// Close swimmer search menu when clicking outside
document.addEventListener('click', function(event) {
    const swimmerMenu = document.querySelector('.swimmer-search-menu');
    const swimmerToggleBtn = document.querySelector('.swimmer-search-toggle');
    if (swimmerMenu && swimmerToggleBtn && !swimmerMenu.contains(event.target) && !swimmerToggleBtn.contains(event.target)) {
        swimmerMenu.style.display = 'none';
        swimmerToggleBtn.style.background = 'transparent';
        swimmerToggleBtn.style.color = '#555';
        swimmerToggleBtn.style.borderRadius = '50%';
        swimmerToggleBtn.style.width = '32px';
        swimmerToggleBtn.style.height = '32px';
        swimmerToggleBtn.style.padding = '0';
    }
    
    const teamMenu = document.querySelector('.team-search-menu');
    const teamToggleBtn = document.querySelector('.team-search-toggle');
    if (teamMenu && teamToggleBtn && !teamMenu.contains(event.target) && !teamToggleBtn.contains(event.target)) {
        teamMenu.style.display = 'none';
        teamToggleBtn.style.background = 'transparent';
        teamToggleBtn.style.color = '#555';
        teamToggleBtn.style.borderRadius = '50%';
        teamToggleBtn.style.width = '32px';
        teamToggleBtn.style.height = '32px';
        teamToggleBtn.style.padding = '0';
    }
});

// Search by team name
// Search for teams matching a keyword (returns list of teams, not swimmers)
async function searchTeams(teamKeyword) {
    const searchTerm = teamKeyword.toLowerCase().trim();
    const matchingTeams = [];
    const seenTeams = new Set(); // Track unique teams by "lsc:clubName"
    
    // Strategy: Search through club dictionary for matching club names
    const lscsForDictionary = ['PN', 'WA', 'CA', 'OR', 'AZ', 'CO', 'UT', 'NV', 'TX', 'FL', 'NY', 'IL'];
    
    for (const lsc of lscsForDictionary) {
        try {
            // Wait for club dictionary to be available
            while (!window._clubDictinary) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const clubMap = await window._clubDictinary.loadClubMap(lsc);
            if (clubMap && clubMap.size > 0) {
                for (const [code, name] of clubMap) {
                    if (name && name.toLowerCase().includes(searchTerm)) {
                        const teamKey = `${lsc}:${name}`;
                        if (!seenTeams.has(teamKey)) {
                            matchingTeams.push({ name, code, lsc });
                            seenTeams.add(teamKey);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error loading club dictionary for LSC ${lsc}:`, error);
        }
    }
    
    // Also try direct API search to find teams
    const nameVariations = [
        teamKeyword,
        teamKeyword.replace(/ swim team/i, '').trim(),
        teamKeyword.replace(/ club/i, '').trim(),
        teamKeyword.replace(/ aquatic/i, '').trim(),
    ].filter(v => v);
    
    const lscsToTry = ['PN', null, 'WA', 'CA', 'OR'];
    
    for (const nameVariation of nameVariations) {
        for (const lsc of lscsToTry) {
            try {
                const bodyObj = {
                    metadata: [
                        {
                            title: "clubName",
                            dim: "[Persons.ClubName]",
                            datatype: "text",
                        },
                        {
                            title: "lsc",
                            dim: "[Persons.LscCode]",
                            datatype: "text",
                        },
                        {
                            dim: "[Persons.ClubName]",
                            datatype: "text",
                            filter: {
                                contains: nameVariation,
                            },
                            panel: "scope",
                        },
                    ],
                    count: 1000,
                };
                
                if (lsc) {
                    bodyObj.metadata.push({
                        dim: "[Persons.LscCode]",
                        datatype: "text",
                        filter: {
                            equals: lsc,
                        },
                        panel: "scope",
                    });
                }
                
                const results = await fetchSwimValues(bodyObj);
                if (results && results.length > 0 && results.idx) {
                    const idx = results.idx;
                    for (const row of results) {
                        const clubName = row[idx.clubName];
                        const lscCode = row[idx.lsc];
                        if (clubName && lscCode) {
                            const teamKey = `${lscCode}:${clubName}`;
                            if (!seenTeams.has(teamKey)) {
                                matchingTeams.push({ name: clubName, code: null, lsc: lscCode });
                                seenTeams.add(teamKey);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`Error searching for teams:`, error);
                continue;
            }
        }
    }
    
    return matchingTeams;
}

// Show team search results in a table (similar to showSearch)
async function showTeamSearch(teams, searchQuery = '') {
    if (!teams || teams.length === 0) {
        window.updateContent("No teams found matching: " + (searchQuery || 'your search'));
        return;
    }
    
    // Sort results: exact name matches first, then by LSC, then by name
    if (searchQuery) {
        const queryLower = searchQuery.toLowerCase().trim();
        teams.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            
            // Check for exact match
            const exactA = nameA === queryLower;
            const exactB = nameB === queryLower;
            
            if (exactA && !exactB) return -1;
            if (!exactA && exactB) return 1;
            
            // Then sort by LSC, then by name
            if (a.lsc !== b.lsc) {
                return (a.lsc || '').localeCompare(b.lsc || '');
            }
            return nameA.localeCompare(nameB);
        });
    }
    
    let html = [];
    
    html.push(
        '<table class="fill top-margin" id="team-search-table"><thead><tr class="th">',
        '<th style="cursor: pointer;" onclick="event.stopPropagation(); sortTeamSearchTable(0)"># ↕</th>',
        '<th style="cursor: pointer;" onclick="event.stopPropagation(); sortTeamSearchTable(1)">Team Name ↕</th>',
        '<th style="cursor: pointer;" onclick="event.stopPropagation(); sortTeamSearchTable(2)">LSC ↕</th>',
        '<th style="cursor: pointer;" onclick="event.stopPropagation(); sortTeamSearchTable(3)">Code ↕</th>',
        '</tr></thead><tbody id="team-search-table-body">',
    );
    
    let index = 0;
    for (const team of teams) {
        const teamName = team.name || '';
        const lsc = team.lsc || '';
        const code = team.code || '-';
        
        // Escape for use in onclick handler (same pattern as swimmer search table)
        // Double escape single quotes for JavaScript string
        const escapedTeamName = teamName.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedLsc = (lsc || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedCode = (code === '-' ? '' : code).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        // Use inline onclick exactly like the swimmer search table does
        html.push(
            `<tr onclick="window.selectTeam('${escapedTeamName}', '${escapedLsc}', '${escapedCode}')" style="cursor: pointer;" data-index="${index}" data-name="${(teamName || '').toLowerCase()}" data-lsc="${(lsc || '').toLowerCase()}" data-code="${(code || '').toLowerCase()}" data-team-name="${escapedTeamName}">`,
            '<td>',
            ++index,
            '</td><td class="left">',
            teamName,
            "</td><td>",
            lsc,
            "</td><td>",
            code,
            "</td></tr>",
        );
    }
    html.push("</tbody></table>");
    
    // Store original values for sorting
    window._teamSearchTableData = teams;
    
    window.updateContent(html.join(""));
    
    // Remove any existing debug panel first
    const existingDebug = document.getElementById('team-table-debug');
    if (existingDebug) {
        existingDebug.remove();
    }
    
    // Remove any existing toggle button
    const existingToggle = document.getElementById('team-table-debug-toggle');
    if (existingToggle) {
        existingToggle.remove();
    }
    
    // Find the three dots button and position debug button before it
    const threeDotsButton = document.querySelector('.team-search-toggle');
    let toggleButton;
    
    if (threeDotsButton && threeDotsButton.parentElement) {
        // Create round magnifying glass icon button
        toggleButton = document.createElement('span');
        toggleButton.id = 'team-table-debug-toggle';
        toggleButton.innerHTML = '🔍';
        toggleButton.style.cssText = 'cursor: pointer; margin-right: 2px; padding: 2px 4px; color: #555; font-size: 18px; font-weight: bold; user-select: none; background: transparent; border-radius: 50%; width: 28px; height: 28px; display: none; align-items: center; justify-content: center; vertical-align: middle; transition: all 0.2s ease;';
        toggleButton.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(0,0,0,0.1)';
            this.style.color = '#007bff';
        });
        toggleButton.addEventListener('mouseleave', function() {
            this.style.background = 'transparent';
            this.style.color = '#555';
        });
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation();
            const debugArea = document.getElementById('team-table-debug');
            if (debugArea) {
                const isVisible = debugArea.style.display !== 'none';
                debugArea.style.display = isVisible ? 'none' : 'block';
                toggleButton.style.color = isVisible ? '#555' : '#007bff';
                toggleButton.style.background = isVisible ? 'transparent' : 'rgba(0,123,255,0.1)';
            }
        });
        // Insert right before the three dots button
        threeDotsButton.parentElement.insertBefore(toggleButton, threeDotsButton);
    } else {
        // Fallback: create button in top-right if three dots button not found
        toggleButton = document.createElement('button');
        toggleButton.id = 'team-table-debug-toggle';
        toggleButton.innerHTML = '🔍';
        toggleButton.style.cssText = 'position: fixed; top: 10px; right: 50px; background: rgba(0,0,0,0.7); color: #fff; border: 1px solid #555; padding: 8px; border-radius: 50%; width: 36px; height: 36px; font-size: 18px; z-index: 10001; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;';
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation();
            const debugArea = document.getElementById('team-table-debug');
            if (debugArea) {
                const isVisible = debugArea.style.display !== 'none';
                debugArea.style.display = isVisible ? 'none' : 'block';
            }
        });
        document.body.appendChild(toggleButton);
    }
    
    // Add debug info display area - position it below the toggle button
    // Use setTimeout to ensure button is in DOM before calculating position
    setTimeout(() => {
        const debugArea = document.getElementById('team-table-debug');
        if (debugArea && toggleButton) {
            const toggleRect = toggleButton.getBoundingClientRect();
            const debugTop = (toggleRect.bottom + 5) + 'px'; // 5px margin below button
            const debugRight = (window.innerWidth - toggleRect.right) + 'px'; // Align with right edge of button
            debugArea.style.top = debugTop;
            debugArea.style.right = debugRight;
        }
    }, 10);
    
    const debugArea = document.createElement('div');
    debugArea.id = 'team-table-debug';
    debugArea.style.cssText = 'position: fixed; top: 50px; right: 10px; background: rgba(0,0,0,0.9); color: #fff; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; z-index: 10000; max-width: 500px; max-height: 400px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: none;';
    debugArea.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><div style="font-weight: bold; color: #0f0; font-size: 14px;">🔍 Team Table Debug</div><button id="team-table-debug-close" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Hide</button></div><div id="team-table-debug-content" style="line-height: 1.6;">Waiting for click...</div>';
    document.body.appendChild(debugArea);
    
    // Add close button handler
    const closeButton = document.getElementById('team-table-debug-close');
    if (closeButton) {
        closeButton.addEventListener('click', function(e) {
            e.stopPropagation();
            debugArea.style.display = 'none';
            if (toggleButton) {
                toggleButton.style.color = '#555';
                toggleButton.style.background = 'transparent';
            }
        });
    }
    
    // Click outside to hide
    document.addEventListener('click', function(e) {
        const debugArea = document.getElementById('team-table-debug');
        const toggleButton = document.getElementById('team-table-debug-toggle');
        if (debugArea && toggleButton && debugArea.style.display !== 'none') {
            // Check if click is outside both debug panel and toggle button
            if (!debugArea.contains(e.target) && !toggleButton.contains(e.target)) {
                debugArea.style.display = 'none';
                if (toggleButton) {
                    toggleButton.style.color = '#555';
                    toggleButton.style.background = 'transparent';
                }
            }
        }
    });
    
    function addDebugMessage(message, type = 'info') {
        const debugContent = document.getElementById('team-table-debug-content');
        if (!debugContent) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const color = type === 'error' ? '#f44' : type === 'success' ? '#4f4' : '#ff4';
        const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `margin: 5px 0; padding: 8px; border-left: 3px solid ${color}; background: rgba(255,255,255,0.1); border-radius: 3px;`;
        logEntry.innerHTML = `<span style="color: #aaa;">[${timestamp}]</span> <span style="color: ${color}; font-weight: ${type === 'error' ? 'bold' : 'normal'};">${icon} ${message}</span>`;
        debugContent.appendChild(logEntry);
        debugContent.scrollTop = debugContent.scrollHeight;
        
        // Keep only last 30 messages
        while (debugContent.children.length > 30) {
            debugContent.removeChild(debugContent.firstChild);
        }
        
        // Also log to console
        console.log(`[Team Table Debug] ${message}`);
    }
    
    // Use event delegation on the table itself - works even if content gets replaced
    // This ensures clicks work even during loading or if content is updated
    setTimeout(() => {
        const table = document.getElementById("team-search-table");
        if (table) {
            addDebugMessage('Table found, attaching click handlers...', 'info');
            
            // Remove any existing listeners first
            const newTable = table.cloneNode(true);
            table.parentNode.replaceChild(newTable, table);
            
            // Attach event delegation listener
            newTable.addEventListener('click', function(e) {
                addDebugMessage(`Click detected on: ${e.target.tagName} (${e.target.textContent?.substring(0, 30) || 'no text'})`, 'info');
                
                // Find the clicked row
                const row = e.target.closest('tr');
                if (!row) {
                    addDebugMessage('No row found for click target', 'error');
                    return;
                }
                
                if (row.closest('thead')) {
                    addDebugMessage('Click was on header row, ignoring', 'info');
                    return; // Skip header rows
                }
                
                // Get data from the row
                const teamName = row.dataset.teamName;
                const lsc = row.dataset.lsc;
                const code = row.dataset.code;
                
                addDebugMessage(`Row data extracted: teamName="${teamName}", lsc="${lsc}", code="${code}"`, 'info');
                addDebugMessage(`Full row dataset: ${JSON.stringify(row.dataset)}`, 'info');
                
                if (!teamName) {
                    addDebugMessage('ERROR: No teamName in row dataset', 'error');
                    console.error('[Team table click delegation] Missing teamName:', row.dataset);
                    return;
                }
                
                if (typeof window.selectTeam !== 'function') {
                    addDebugMessage(`ERROR: window.selectTeam is ${typeof window.selectTeam}, not a function`, 'error');
                    console.error('[Team table click delegation] selectTeam not available');
                    return;
                }
                
                const clubCode = code === '-' || code === '' ? '' : code;
                addDebugMessage(`Calling selectTeam('${teamName}', '${lsc}', '${clubCode}')`, 'success');
                console.log('[Team table click delegation] Calling selectTeam:', { teamName, lsc, clubCode });
                
                try {
                    addDebugMessage(`About to call window.selectTeam...`, 'info');
                    const result = window.selectTeam(teamName, lsc, clubCode);
                    addDebugMessage(`selectTeam called successfully. Result: ${result}`, 'success');
                    if (result && typeof result.then === 'function') {
                        addDebugMessage('selectTeam returned a Promise, waiting for resolution...', 'info');
                        result.then((resolvedValue) => {
                            addDebugMessage(`✅ selectTeam Promise resolved successfully. Value: ${resolvedValue}`, 'success');
                            // Check if content was updated
                            setTimeout(() => {
                                const content = document.getElementById('content');
                                if (content) {
                                    const hasTeamTable = content.querySelector('#team-search-table');
                                    const hasSwimmerTable = content.querySelector('#search-table');
                                    addDebugMessage(`Content check: team table=${!!hasTeamTable}, swimmer table=${!!hasSwimmerTable}`, 'info');
                                }
                            }, 1000);
                        }).catch((err) => {
                            addDebugMessage(`❌ selectTeam Promise rejected: ${err.message}`, 'error');
                            addDebugMessage(`Error stack: ${err.stack?.substring(0, 300)}`, 'error');
                            console.error('[Team table click delegation] selectTeam Promise rejected:', err);
                        });
                    } else {
                        addDebugMessage(`selectTeam did not return a Promise (returned: ${typeof result})`, 'info');
                    }
                } catch (error) {
                    addDebugMessage(`❌ ERROR calling selectTeam: ${error.message}`, 'error');
                    addDebugMessage(`Error stack: ${error.stack?.substring(0, 300)}`, 'error');
                    console.error('[Team table click delegation] Error calling selectTeam:', error);
                }
            }, true); // Use capture phase
            
            addDebugMessage('Click handlers attached successfully', 'success');
        } else {
            addDebugMessage('ERROR: Table not found!', 'error');
        }
    }, 50);
}

/**
 * Attach click handlers to team table rows
 */
function attachTeamTableClickHandlers() {
    const tbody = document.getElementById("team-search-table-body");
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll("tr");
    rows.forEach(row => {
        // Remove any existing click listeners by cloning the row
        const newRow = row.cloneNode(true);
        row.parentNode.replaceChild(newRow, row);
        
        newRow.addEventListener('click', function(e) {
            // Don't trigger if clicking on a sortable header (shouldn't happen in tbody, but just in case)
            if (e.target.tagName === 'TH') return;
            
            // Don't prevent default - let the inline onclick handler work
            // This is just a backup in case onclick doesn't work
            // Get data from the row
            const teamName = newRow.dataset.teamName || '';
            const lsc = newRow.dataset.lsc || '';
            const code = newRow.dataset.code || '';
            
            console.log('[attachTeamTableClickHandlers] Backup click handler triggered:', { teamName, lsc, code, hasSelectTeam: typeof window.selectTeam });
            
            if (!teamName) {
                console.error('No team name found in row dataset');
                return;
            }
            
            if (typeof window.selectTeam !== 'function') {
                console.error('selectTeam function not available');
                return;
            }
            
            // Call selectTeam with the team data
            const clubCode = code === '-' || code === '' ? '' : code;
            window.selectTeam(teamName, lsc, clubCode);
        });
        
        // Add hover effect
        newRow.style.transition = 'background-color 0.2s';
        newRow.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f0f7ff';
        });
        newRow.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
}

// Sort function for team search table
function sortTeamSearchTable(columnIndex) {
    const table = document.getElementById("team-search-table");
    const tbody = document.getElementById("team-search-table-body");
    if (!table || !tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const currentSort = table.dataset.sortColumn;
    const currentOrder = table.dataset.sortOrder || 'asc';
    
    // Determine new sort order
    let newOrder = 'asc';
    if (currentSort == columnIndex && currentOrder == 'asc') {
        newOrder = 'desc';
    }
    
    // Update table sort state
    table.dataset.sortColumn = columnIndex;
    table.dataset.sortOrder = newOrder;
    
    // Sort rows
    rows.sort((a, b) => {
        let aVal, bVal;
        
        switch(columnIndex) {
            case 0: // Index
                aVal = parseInt(a.dataset.index) || 0;
                bVal = parseInt(b.dataset.index) || 0;
                break;
            case 1: // Team Name
                aVal = a.dataset.name || '';
                bVal = b.dataset.name || '';
                break;
            case 2: // LSC
                aVal = a.dataset.lsc || '';
                bVal = b.dataset.lsc || '';
                break;
            case 3: // Code
                aVal = a.dataset.code || '';
                bVal = b.dataset.code || '';
                break;
            default:
                return 0;
        }
        
        if (typeof aVal === 'string') {
            return newOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
            return newOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
    });
    
    // Clear and re-append sorted rows
    tbody.innerHTML = '';
    rows.forEach(row => {
        // Preserve onclick handler when re-adding rows
        tbody.appendChild(row);
    });
    
    // Update header arrows
    const headers = table.querySelectorAll('th');
    headers.forEach((th, i) => {
        if (i === columnIndex) {
            th.textContent = th.textContent.replace(/ ↕| ↑| ↓/g, '') + (newOrder === 'asc' ? ' ↑' : ' ↓');
        } else {
            th.textContent = th.textContent.replace(/ ↕| ↑| ↓/g, '') + ' ↕';
        }
    });
}

// Helper function to add debug messages to the debug panel
function addDebugMessageToPanel(message, type = 'info') {
    // Ensure debug panel exists - create it if it doesn't
    let debugArea = document.getElementById('team-table-debug');
    let debugContent = document.getElementById('team-table-debug-content');
    
    if (!debugArea || !debugContent) {
        // Create debug panel if it doesn't exist
        const existingDebug = document.getElementById('team-table-debug');
        if (existingDebug) {
            existingDebug.remove();
        }
        
        const existingToggle = document.getElementById('team-table-debug-toggle');
        if (existingToggle) {
            existingToggle.remove();
        }
        
        // Find three dots button for positioning
        const threeDotsButton = document.querySelector('.team-search-toggle');
        let toggleButton;
        
        if (threeDotsButton && threeDotsButton.parentElement) {
            toggleButton = document.createElement('span');
            toggleButton.id = 'team-table-debug-toggle';
            toggleButton.innerHTML = '🔍';
            toggleButton.style.cssText = 'cursor: pointer; margin-right: 2px; padding: 2px 4px; color: #555; font-size: 18px; font-weight: bold; user-select: none; background: transparent; border-radius: 50%; width: 28px; height: 28px; display: none; align-items: center; justify-content: center; vertical-align: middle; transition: all 0.2s ease;';
            toggleButton.addEventListener('click', function(e) {
                e.stopPropagation();
                const da = document.getElementById('team-table-debug');
                if (da) {
                    const isVisible = da.style.display !== 'none';
                    da.style.display = isVisible ? 'none' : 'block';
                    toggleButton.style.color = isVisible ? '#555' : '#007bff';
                    toggleButton.style.background = isVisible ? 'transparent' : 'rgba(0,123,255,0.1)';
                }
            });
            // Insert right before the three dots button
            threeDotsButton.parentElement.insertBefore(toggleButton, threeDotsButton);
        }
        
        debugArea = document.createElement('div');
        debugArea.id = 'team-table-debug';
        debugArea.style.cssText = 'position: fixed; top: 50px; right: 10px; background: rgba(0,0,0,0.9); color: #fff; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; z-index: 10000; max-width: 500px; max-height: 400px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: none;';
        debugArea.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><div style="font-weight: bold; color: #0f0; font-size: 14px;">🔍 Team Table Debug</div><button id="team-table-debug-close" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Hide</button></div><div id="team-table-debug-content" style="line-height: 1.6;">Waiting for messages...</div>';
        document.body.appendChild(debugArea);
        
        const closeButton = document.getElementById('team-table-debug-close');
        if (closeButton) {
            closeButton.addEventListener('click', function(e) {
                e.stopPropagation();
                debugArea.style.display = 'none';
                if (toggleButton) {
                    toggleButton.style.color = '#555';
                    toggleButton.style.background = 'transparent';
                }
            });
        }
        
        debugContent = document.getElementById('team-table-debug-content');
    }
    
    if (!debugContent) {
        console.error('[addDebugMessageToPanel] Debug content element not found');
        return;
    }
    
    // Don't automatically show the panel - let user click the debug button to see it
    // The panel will remain hidden by default
    
    const timestamp = new Date().toLocaleTimeString();
    const color = type === 'error' ? '#f44' : type === 'success' ? '#4f4' : '#ff4';
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    const logEntry = document.createElement('div');
    logEntry.style.cssText = `margin: 5px 0; padding: 8px; border-left: 3px solid ${color}; background: rgba(255,255,255,0.1); border-radius: 3px;`;
    logEntry.innerHTML = `<span style="color: #aaa;">[${timestamp}]</span> <span style="color: ${color}; font-weight: ${type === 'error' ? 'bold' : 'normal'};">${icon} ${message}</span>`;
    debugContent.appendChild(logEntry);
    debugContent.scrollTop = debugContent.scrollHeight;
    
    // Also log to console
    console.log(`[Team Debug] ${message}`);
}

// Select a team and show its swimmers
async function selectTeam(teamName, lsc, clubCode) {
    // Show loading message immediately in main content area
    window.updateContent(`<div style="padding: 40px; text-align: center; font-size: 24px; font-weight: 600; color: #333;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
            <span style="animation: spin 1s linear infinite; font-size: 32px;">⏳</span>
            <span>Loading swimmers for "${teamName}"...</span>
        </div>
    </div>`);
    
    // Add debug message immediately when team is clicked
    addDebugMessageToPanel(`🚀 selectTeam STARTED for "${teamName}" (LSC: ${lsc}, Code: ${clubCode || 'none'})`, 'info');
    
    // Normalize LSC code to uppercase (e.g., "pn" -> "PN") early
    if (lsc) {
        lsc = lsc.toUpperCase();
    }
    
    // Check cache first (1 hour timeout)
    addDebugMessageToPanel('Checking cache for team results...', 'info');
    window.updateContent(`<div style="padding: 40px; text-align: center; font-size: 24px; font-weight: 600; color: #333;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
            <span style="animation: spin 1s linear infinite; font-size: 32px;">⏳</span>
            <span>Checking cache for "${teamName}"...</span>
        </div>
    </div>`);
    
    const cacheKey = `team/${lsc}/${clubCode || 'none'}/${teamName}`;
    const cacheTimeout = 60 * 60; // 1 hour in seconds
    const cachedResult = await LocalCache.get(cacheKey, cacheTimeout);
    
    if (cachedResult) {
        console.log(`[selectTeam] Using cached results for "${teamName}"`);
        addDebugMessageToPanel(`✅ Found cached results (${cachedResult.length} swimmers), displaying...`, 'success');
        // Show detailed loading message even for cached results
        let cachedDebugInfo = [];
        cachedDebugInfo.push(`<div style="padding: 20px; font-family: monospace; background: #f5f5f5; border-radius: 8px; margin: 10px 0;">`);
        cachedDebugInfo.push(`<h3 style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 20px;">✅</span> Loading swimmers for: ${teamName}</h3>`);
        cachedDebugInfo.push(`<p><strong>LSC:</strong> ${lsc || 'none'}</p>`);
        cachedDebugInfo.push(`<p><strong>Club Code:</strong> ${clubCode || 'none'}</p>`);
        cachedDebugInfo.push(`<hr>`);
        cachedDebugInfo.push(`<p style="color: green;">✅ Found ${cachedResult.length} swimmers in cache</p>`);
        cachedDebugInfo.push(`<p style="display: flex; align-items: center; gap: 10px;"><span style="animation: spin 1s linear infinite; font-size: 18px;">⏳</span> Displaying results...</p>`);
        cachedDebugInfo.push(`</div>`);
        updateContentWithLoadingIndicator(cachedDebugInfo.join(''), true);
        await showSearch(cachedResult, teamName);
        addDebugMessageToPanel('✅ Results displayed from cache', 'success');
        return;
    }
    
    addDebugMessageToPanel('No cache found, starting fresh search...', 'info');
    window.updateContent(`<div style="padding: 40px; text-align: center; font-size: 24px; font-weight: 600; color: #333;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
            <span style="animation: spin 1s linear infinite; font-size: 32px;">⏳</span>
            <span>Loading swimmers for "${teamName}"...</span>
        </div>
        <div style="margin-top: 20px; font-size: 16px; color: #666;">
            <div>LSC: ${lsc || 'none'}</div>
            <div>Club Code: ${clubCode || 'none'}</div>
        </div>
    </div>`);
    
    let debugInfo = [];
    debugInfo.push(`<div style="padding: 20px; font-family: monospace; background: #f5f5f5; border-radius: 8px; margin: 10px 0;">`);
    debugInfo.push(`<h3 style="display: flex; align-items: center; gap: 10px;"><span style="animation: spin 1s linear infinite; font-size: 20px;">⏳</span> Loading swimmers for: ${teamName}</h3>`);
    debugInfo.push(`<p><strong>LSC:</strong> ${lsc || 'none'}</p>`);
    debugInfo.push(`<p><strong>Club Code:</strong> ${clubCode || 'none'}</p>`);
    debugInfo.push(`<hr>`);
    
    updateContentWithLoadingIndicator(debugInfo.join('') + '<p>Starting search...</p></div>', true);
    
    try {
        if (!lsc) {
            window.updateContent(debugInfo.join('') + '<p style="color: red;">❌ Error: LSC code is required to load swimmers. Please try searching again.</p></div>');
            return;
        }
        
        console.log(`[selectTeam] Starting search for team: "${teamName}", LSC: ${lsc}, Code: ${clubCode || 'none'}`);
        addDebugMessageToPanel(`LSC code found: ${lsc}`, 'success');
        debugInfo.push(`<p>✓ LSC code found: ${lsc}</p>`);
        
        let actualClubName = null;
        let allSwimmers = [];
        let idx = null;
        
        // Strategy: If we have a club code, use it directly (same as rankings do)
        if (clubCode && clubCode !== '-') {
            try {
                addDebugMessageToPanel(`Looking up club name for code "${clubCode}"...`, 'info');
                window.updateContent(`<div style="padding: 40px; text-align: center; font-size: 24px; font-weight: 600; color: #333;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
                        <span style="animation: spin 1s linear infinite; font-size: 32px;">⏳</span>
                        <span>Looking up club name for "${teamName}"...</span>
                    </div>
                </div>`);
                debugInfo.push(`<p>Looking up club name for code "${clubCode}"...</p>`);
                updateContentWithLoadingIndicator(debugInfo.join('') + '<p>Loading club dictionary...</p></div>', true);
                
                addDebugMessageToPanel('Waiting for club dictionary to load...', 'info');
                window.updateContent(`<div style="padding: 40px; text-align: center; font-size: 24px; font-weight: 600; color: #333;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
                        <span style="animation: spin 1s linear infinite; font-size: 32px;">⏳</span>
                        <span>Loading club dictionary...</span>
                    </div>
                </div>`);
                while (!window._clubDictinary) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                addDebugMessageToPanel('✅ Club dictionary loaded', 'success');
                
                // Try both uppercase and lowercase versions of club code
                const codeVariations = [clubCode.toUpperCase(), clubCode];
                if (clubCode.toLowerCase() !== clubCode.toUpperCase()) {
                    codeVariations.push(clubCode.toLowerCase());
                }
                
                addDebugMessageToPanel(`Trying code variations: ${codeVariations.join(', ')}`, 'info');
                for (const codeVar of codeVariations) {
                    actualClubName = await window._clubDictinary.loadClubName(lsc, codeVar);
                    if (actualClubName) {
                        console.log(`[selectTeam] ✅ Found club name from code "${codeVar}": "${actualClubName}"`);
                        addDebugMessageToPanel(`✅ Found club name: "${actualClubName}" (from code "${codeVar}")`, 'success');
                        debugInfo.push(`<p style="color: green;">✓ Found club name from code "${codeVar}": <strong>${actualClubName}</strong></p>`);
                        break;
                    }
                }
                
                if (actualClubName) {
                    // Normalize club name - remove "Swim Team" suffix if present
                    // Database likely stores "Bellevue Club" not "Bellevue Club Swim Team"
                    const normalizedName = actualClubName.replace(/ swim team$/i, '').trim();
                    if (normalizedName !== actualClubName) {
                        debugInfo.push(`<p>Normalizing club name: <strong>"${actualClubName}"</strong> → <strong>"${normalizedName}"</strong></p>`);
                        actualClubName = normalizedName;
                    }
                } else {
                    console.log(`[selectTeam] ⚠️ No club name found for code "${clubCode}" (tried: ${codeVariations.join(', ')})`);
                    debugInfo.push(`<p style="color: orange;">⚠️ No club name found for code "${clubCode}" (tried: ${codeVariations.join(', ')})</p>`);
                }
            } catch (error) {
                console.error(`[selectTeam] Error loading club name for code "${clubCode}":`, error);
                debugInfo.push(`<p style="color: red;">❌ Error loading club name: ${error.message}</p>`);
            }
        }
        
        // If we have a club name (from code lookup), use loadClubAgeSwimmerList for all age groups
        // This is exactly what rankings do and it works!
        if (actualClubName) {
            debugInfo.push(`<hr><h4>Using loadClubAgeSwimmerList (same as rankings)</h4>`);
            debugInfo.push(`<p>Club name: <strong>"${actualClubName}"</strong></p>`);
            debugInfo.push(`<p>Loading swimmers for all age groups...</p>`);
            updateContentWithLoadingIndicator(debugInfo.join('') + '<p>Loading swimmers...</p></div>', true);
            
            // Age groups to check (same as rankings)
            const ageGroups = ['10U', '11-12', '13-14', '15-16', '17-18', '19O'];
            
            // Try club name variations (rankings use "Bellevue Club" successfully)
            const clubNameVariations = [];
            if (actualClubName.toLowerCase().includes('bellevue')) {
                clubNameVariations.push('Bellevue Club'); // Rankings use this successfully - try first
            }
            clubNameVariations.push(actualClubName); // Then try normalized name
            // Remove duplicates
            const uniqueVariations = [...new Set(clubNameVariations)];
            
            // Check if loadClubAgeSwimmerList is available (from rankings.js)
            if (typeof loadClubAgeSwimmerList === 'function') {
                addDebugMessageToPanel('✓ loadClubAgeSwimmerList function found', 'success');
                debugInfo.push(`<p>✓ loadClubAgeSwimmerList function found</p>`);
                
                for (const ageKey of ageGroups) {
                    let swimmerList = null;
                    addDebugMessageToPanel(`Loading age group: ${ageKey}...`, 'info');
                    debugInfo.push(`<p style="display: flex; align-items: center; gap: 10px;"><span style="animation: spin 1s linear infinite; font-size: 18px;">⏳</span> Loading age group: <strong>${ageKey}</strong>...</p>`);
                    updateContentWithLoadingIndicator(debugInfo.join('') + '</div>', true);
                    
                    // Try each club name variation
                    for (const clubNameVar of uniqueVariations) {
                        try {
                            debugInfo.push(`<p>Loading age group: <strong>${ageKey}</strong> with club name: <strong>"${clubNameVar}"</strong>...</p>`);
                            updateContentWithLoadingIndicator(debugInfo.join('') + '</div>', true);
                            
                            // Try with forceRefresh=false first (use cache)
                            swimmerList = await loadClubAgeSwimmerList(lsc, clubNameVar, ageKey, false);
                            
                            // Debug: log what we got
                            console.log(`[selectTeam] loadClubAgeSwimmerList("${lsc}", "${clubNameVar}", "${ageKey}", false) returned:`, {
                                hasResult: !!swimmerList,
                                isArray: Array.isArray(swimmerList),
                                length: swimmerList?.length || 0,
                                hasIdx: !!swimmerList?.idx,
                                idxKeys: swimmerList?.idx ? Object.keys(swimmerList.idx) : 'no idx'
                            });
                            
                            // Check if result is valid (has idx)
                            if (swimmerList && !swimmerList.idx) {
                                debugInfo.push(`<p style="color: orange;">⚠️ Corrupted cache detected, clearing...</p>`);
                                // Clear corrupted cache
                                const cacheKey = "club/" + lsc + "_" + clubNameVar + "_" + ageKey;
                                localStorage.removeItem(cacheKey);
                                // Retry with forceRefresh=true
                                swimmerList = await loadClubAgeSwimmerList(lsc, clubNameVar, ageKey, true);
                                console.log(`[selectTeam] After cache clear, retry returned:`, {
                                    hasResult: !!swimmerList,
                                    length: swimmerList?.length || 0,
                                    hasIdx: !!swimmerList?.idx
                                });
                            }
                            
                            // If still no results, try clearing cache and retrying
                            if (!swimmerList || swimmerList.length === 0) {
                                debugInfo.push(`<p>Trying with cache cleared and forceRefresh...</p>`);
                                const cacheKey = "club/" + lsc + "_" + clubNameVar + "_" + ageKey;
                                localStorage.removeItem(cacheKey);
                                swimmerList = await loadClubAgeSwimmerList(lsc, clubNameVar, ageKey, true);
                                console.log(`[selectTeam] After forceRefresh, returned:`, {
                                    hasResult: !!swimmerList,
                                    length: swimmerList?.length || 0,
                                    hasIdx: !!swimmerList?.idx
                                });
                            }
                        
                            if (swimmerList && swimmerList.length > 0 && swimmerList.idx) {
                                addDebugMessageToPanel(`✅ Found ${swimmerList.length} swimmers in ${ageKey}`, 'success');
                                debugInfo.push(`<p style="color: green; display: flex; align-items: center; gap: 10px;"><span style="font-size: 18px;">✅</span> Found <strong>${swimmerList.length}</strong> swimmers in ${ageKey} with "${clubNameVar}"</p>`);
                                updateContentWithLoadingIndicator(debugInfo.join('') + '</div>', true);
                                break; // Found swimmers, stop trying variations
                            } else {
                                addDebugMessageToPanel(`No swimmers found in ${ageKey}`, 'info');
                                debugInfo.push(`<p style="color: gray;">No swimmers in ${ageKey} with "${clubNameVar}"</p>`);
                                updateContentWithLoadingIndicator(debugInfo.join('') + '</div>', true);
                            }
                        } catch (error) {
                            console.error(`[selectTeam] Error loading age ${ageKey} with "${clubNameVar}":`, error);
                            debugInfo.push(`<p style="color: red;">❌ Error loading ${ageKey} with "${clubNameVar}": ${error.message}</p>`);
                            continue; // Try next variation
                        }
                    }
                    
                    // If we found swimmers, merge them
                    if (swimmerList && swimmerList.length > 0 && swimmerList.idx) {
                        // Merge swimmers, ensuring unique pkeys
                        const existingPkeys = new Set(allSwimmers.map(s => s[idx ? idx.pkey : 0]));
                        for (const row of swimmerList) {
                            const pkey = row[swimmerList.idx.pkey];
                            if (!existingPkeys.has(pkey)) {
                                // Add all fields we need
                                const newRow = [
                                    row[swimmerList.idx.pkey], // pkey
                                    row[swimmerList.idx.age],  // age
                                    null, // name (will fetch later)
                                    actualClubName, // clubName (use normalized name)
                                    lsc, // lsc
                                    null, // gender (will fetch later)
                                ];
                                allSwimmers.push(newRow);
                                existingPkeys.add(pkey);
                            }
                        }
                        if (!idx) { // Set idx from the first successful call
                            idx = {
                                pkey: 0,
                                age: 1,
                                name: 2,
                                clubName: 3,
                                lsc: 4,
                                gender: 5
                            };
                        }
                    }
                }
            } else {
                // Fallback: wait for it to be available
                debugInfo.push(`<p>Waiting for loadClubAgeSwimmerList function...</p>`);
                let attempts = 0;
                while (typeof loadClubAgeSwimmerList !== 'function' && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                if (typeof loadClubAgeSwimmerList === 'function') {
                    debugInfo.push(`<p>✓ loadClubAgeSwimmerList function now available</p>`);
                    // Retry the above logic
                    // (For simplicity, we'll just show an error message)
                    debugInfo.push(`<p style="color: orange;">Please refresh and try again</p>`);
                } else {
                    debugInfo.push(`<p style="color: red;">❌ loadClubAgeSwimmerList not available</p>`);
                }
            }
        }
        
        // If we didn't get swimmers from club code approach, fall back to name search
        if (allSwimmers.length === 0) {
            debugInfo.push(`<hr><h4>Fallback: Searching by team name</h4>`);
            updateContentWithLoadingIndicator(debugInfo.join('') + '<p>Trying fallback approach...</p></div>', true);
            
            // Try team name variations
            const nameVariations = [];
            if (actualClubName) {
                nameVariations.push(actualClubName);
            }
            nameVariations.push(
                teamName.replace(/ swim team$/i, '').trim(),
                teamName.replace(/ club swim team$/i, ' club').trim(),
                teamName,
            );
            const uniqueVariations = [...new Set(nameVariations.filter(v => v))];
            
            debugInfo.push(`<p>Trying name variations:</p><ul>`);
            uniqueVariations.forEach(v => debugInfo.push(`<li>"${v}"</li>`));
            debugInfo.push(`</ul>`);
            
            for (const nameVariation of uniqueVariations) {
                debugInfo.push(`<p>Trying: <strong>"${nameVariation}"</strong>...</p>`);
                updateContentWithLoadingIndicator(debugInfo.join('') + '<p>Searching...</p></div>', true);
                
                try {
                    const swimmers = await loadClubSearch(nameVariation, true);
                    if (swimmers && swimmers.length > 0 && swimmers.idx) {
                        const beforeFilter = swimmers.length;
                        debugInfo.push(`<p style="color: green;">✓ Found ${beforeFilter} swimmers (before LSC filter)</p>`);
                        
                        if (lsc) {
                            const idx = swimmers.idx;
                            allSwimmers = swimmers.filter(row => row[idx.lsc] === lsc);
                            debugInfo.push(`<p>Filtered by LSC "${lsc}": ${allSwimmers.length} swimmers remain</p>`);
                            idx = swimmers.idx;
                        } else {
                            allSwimmers = swimmers;
                            idx = swimmers.idx;
                        }
                        
                        if (allSwimmers.length > 0) {
                            debugInfo.push(`<p style="color: green; font-size: 18px;"><strong>✅ SUCCESS! Found ${allSwimmers.length} swimmers</strong></p>`);
                            break;
                        }
                    }
                } catch (error) {
                    debugInfo.push(`<p style="color: red;">❌ Error: ${error.message}</p>`);
                }
            }
        }
        
        if (allSwimmers.length === 0) {
            console.error(`[selectTeam] ❌ All strategies failed`);
            debugInfo.push(`<hr><h3 style="color: red;">❌ No Swimmers Found</h3>`);
            debugInfo.push(`<p style="color: red;"><strong>No swimmers found for team: ${teamName}</strong></p>`);
            if (clubCode && clubCode !== '-') {
                debugInfo.push(`<p>Tried using club code "${clubCode}" → "${actualClubName || 'not found'}"</p>`);
            }
            debugInfo.push(`<p>Check the browser console for more details.</p>`);
            window.updateContent(debugInfo.join('') + '</div>');
            return;
        }
        
        console.log(`[selectTeam] ✅ Successfully found ${allSwimmers.length} swimmers for "${teamName}"`);
        addDebugMessageToPanel(`✅ Successfully found ${allSwimmers.length} swimmers!`, 'success');
        
        // Calculate age group breakdown for summary
        if (idx && allSwimmers.length > 0) {
            const ageGroupCounts = {};
            for (const row of allSwimmers) {
                const age = row[idx.age] || 'Unknown';
                ageGroupCounts[age] = (ageGroupCounts[age] || 0) + 1;
            }
            
            debugInfo.push(`<hr><h3 style="color: green;">✅ Successfully Found ${allSwimmers.length} Swimmers!</h3>`);
            debugInfo.push(`<p><strong>Age Group Breakdown:</strong></p><ul>`);
            const ageGroups = ['10U', '11-12', '13-14', '15-16', '17-18', '19O'];
            for (const ageKey of ageGroups) {
                const count = ageGroupCounts[ageKey] || 0;
                if (count > 0) {
                    debugInfo.push(`<li><strong>${ageKey}:</strong> ${count} swimmers</li>`);
                } else {
                    debugInfo.push(`<li style="color: gray;"><strong>${ageKey}:</strong> 0 swimmers</li>`);
                }
            }
            debugInfo.push(`</ul>`);
        } else {
            debugInfo.push(`<hr><h3 style="color: green;">✅ Successfully Found ${allSwimmers.length} Swimmers!</h3>`);
        }
        
        debugInfo.push(`<p>Fetching swimmer names and gender information...</p>`);
        debugInfo.push(`<p style="display: flex; align-items: center; gap: 10px;"><span style="animation: spin 1s linear infinite; font-size: 18px;">⏳</span> Loading swimmer details...</p>`);
        updateContentWithLoadingIndicator(debugInfo.join('') + '</div>', true);
        
        // Set idx if not already set
        if (!idx) {
            idx = { pkey: 0, age: 1, name: 2, clubName: 3, lsc: 4, gender: 5 };
        }
        allSwimmers.idx = idx;
        
        // Fetch names and genders for all found swimmers (in parallel for better performance)
        const pkeys = allSwimmers.map(row => row[idx.pkey]);
        addDebugMessageToPanel(`Fetching names and genders for ${pkeys.length} swimmers...`, 'info');
        debugInfo.push(`<p>Fetching details for ${pkeys.length} swimmers...</p>`);
        debugInfo.push(`<p style="display: flex; align-items: center; gap: 10px;"><span style="animation: spin 1s linear infinite; font-size: 18px;">⏳</span> Fetching swimmer details...</p>`);
        updateContentWithLoadingIndicator(debugInfo.join('') + '</div>', true);
        
        // Fetch names and genders in parallel
        const [nameMap, genderMap] = await Promise.all([
            fetchNamesForSwimmers(pkeys),
            fetchGendersForSwimmers(pkeys)
        ]);
        
        addDebugMessageToPanel(`✅ Fetched names and genders (${nameMap.size} names, ${genderMap.size} genders)`, 'success');
        debugInfo.push(`<p style="color: green;">✓ Fetched names and genders</p>`);
        debugInfo.push(`<p style="display: flex; align-items: center; gap: 10px;"><span style="animation: spin 1s linear infinite; font-size: 18px;">⏳</span> Preparing results...</p>`);
        updateContentWithLoadingIndicator(debugInfo.join('') + '</div>', true);
        
        // Update swimmers with names and genders
        const updatedSwimmers = allSwimmers.map(row => {
            const pkey = row[idx.pkey];
            const newRow = [...row];
            newRow[idx.name] = nameMap.get(pkey) || '';
            newRow[idx.gender] = genderMap.get(pkey) || '';
            return newRow;
        });
        updatedSwimmers.idx = idx;
        
        addDebugMessageToPanel('Caching results and preparing to display...', 'info');
        
        // Cache the results for 1 hour
        await LocalCache.set(cacheKey, updatedSwimmers);
        console.log(`[selectTeam] Cached results for "${teamName}" (${updatedSwimmers.length} swimmers)`);
        
        addDebugMessageToPanel(`Calling showSearch with ${updatedSwimmers.length} swimmers...`, 'info');
        
        // Display results using showSearch
        await showSearch(updatedSwimmers, teamName);
        
        addDebugMessageToPanel('✅ showSearch completed, results displayed!', 'success');
        
    } catch (error) {
        console.error('Error loading swimmers for team:', error);
        debugInfo.push(`<hr><h3 style="color: red;">❌ Error</h3>`);
        debugInfo.push(`<p style="color: red;">${error.message}</p>`);
        debugInfo.push(`<pre style="background: #fff; padding: 10px; overflow: auto;">${error.stack}</pre>`);
        window.updateContent(debugInfo.join('') + '</div>');
    }
}

// Helper function to fetch names for swimmers
async function fetchNamesForSwimmers(pkeys) {
    const nameMap = new Map();
    const batchSize = 500; // Increased batch size for better performance
    
    // Process batches in parallel (up to 3 at a time to avoid overwhelming the API)
    const maxConcurrent = 3;
    for (let i = 0; i < pkeys.length; i += batchSize * maxConcurrent) {
        const batches = [];
        for (let j = 0; j < maxConcurrent && (i + j * batchSize) < pkeys.length; j++) {
            const batch = pkeys.slice(i + j * batchSize, i + (j + 1) * batchSize);
            if (batch.length > 0) {
                batches.push(batch);
            }
        }
        
        // Process batches in parallel
        await Promise.all(batches.map(async (batch) => {
            try {
                const bodyObj = {
                    metadata: [
                        {
                            title: "pkey",
                            dim: "[Persons.PersonKey]",
                            datatype: "numeric",
                            filter: {
                                members: batch,
                            },
                        },
                        {
                            title: "name",
                            dim: "[Persons.FullName]",
                            datatype: "text",
                        },
                    ],
                    count: batch.length,
                };
                
                const results = await fetchSwimValues(bodyObj);
                if (results && results.length > 0 && results.idx) {
                    const idx = results.idx;
                    for (const row of results) {
                        nameMap.set(row[idx.pkey], row[idx.name]);
                    }
                }
            } catch (error) {
                console.error('Error fetching names for batch:', error);
            }
        }));
    }
    
    return nameMap;
}

async function searchByTeam() {
    const input = document.getElementById('team-search-input');
    if (!input) return;
    
    let teamKeyword = input.value.trim();
    if (!teamKeyword) {
        alert('Please enter a team name');
        return;
    }
    
    // Close the menu
    const menu = document.querySelector('.team-search-menu');
    const toggleBtn = document.querySelector('.team-search-toggle');
    if (menu && toggleBtn) {
        menu.style.display = 'none';
        toggleBtn.style.background = 'transparent';
        toggleBtn.style.color = '#555';
        toggleBtn.style.borderRadius = '4px';
    }
    
    // Show loading message with hourglass
    window.updateContent(`<div style="padding: 40px; text-align: center; font-weight: 600; color: #333;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
            <span style="animation: spin 1s linear infinite; font-size: 24px;">⏳</span>
            <span style="font-size: 16px !important;">Searching for teams matching "${teamKeyword}"...</span>
        </div>
    </div>`);
    
    try {
        const teams = await searchTeams(teamKeyword);
        await showTeamSearch(teams, teamKeyword);
    } catch (error) {
        console.error('Error searching for teams:', error);
        window.updateContent('Error searching for teams. Please try again. Error: ' + error.message);
    }
}

// Keep the old searchTeamByClubName function for when a team is selected
async function searchTeamByClubName(teamName) {
    const searchTerm = teamName.toLowerCase().trim();
    
    // Strategy 1: Direct search with name variations
    const nameVariations = [
        teamName, // Original search term
        teamName.replace(/ swim team/i, '').trim(),
        teamName.replace(/ club/i, '').trim(),
        teamName.replace(/ aquatic/i, '').trim(),
    ].filter(v => v);
    
    // Try LSCs in order of likelihood (PN = Pacific Northwest, then try all)
    const lscsToTry = ['PN', null, 'WA', 'CA', 'OR']; // null = try without LSC filter
    
    const [from, to] = [0, 100]; // Age range 0-100 for all ages
    
    // Try direct search first
    for (const nameVariation of nameVariations) {
        for (const lsc of lscsToTry) {
            try {
                const description = lsc ? `LSC ${lsc}` : 'all LSCs';
                console.log(`[Strategy 1] Trying to find team "${nameVariation}" in ${description}...`);
                
                // Use the EXACT same structure as loadClubAgeSwimmerList (proven to work)
                const bodyObj = {
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
                            title: "name",
                            dim: "[Persons.FullName]",
                            datatype: "text",
                        },
                        {
                            title: "clubName",
                            dim: "[Persons.ClubName]",
                            datatype: "text",
                        },
                        {
                            title: "lsc",
                            dim: "[Persons.LscCode]",
                            datatype: "text",
                        },
                        {
                            title: "gender",
                            dim: "[Persons.Gender]",
                            datatype: "text",
                        },
                        {
                            dim: "[Persons.ClubName]",
                            datatype: "text",
                            filter: {
                                contains: nameVariation,
                            },
                            panel: "scope",
                        },
                    ],
                    count: 5000,
                };
                
                // Add LSC filter only if specified (same as loadClubAgeSwimmerList)
                if (lsc) {
                    bodyObj.metadata.push({
                        dim: "[Persons.LscCode]",
                        datatype: "text",
                        filter: {
                            equals: lsc,
                        },
                        panel: "scope",
                    });
                }
                
                const swimmerList = await fetchSwimValues(bodyObj);
                
                if (swimmerList && swimmerList.length > 0 && swimmerList.idx) {
                    console.log(`✅ Found ${swimmerList.length} swimmers for team "${nameVariation}" in ${description}`);
                    
                    // Log sample club names to verify we got the right team
                    if (swimmerList.length > 0) {
                        const sampleClubs = new Set();
                        const sampleLSCs = new Set();
                        for (let i = 0; i < Math.min(10, swimmerList.length); i++) {
                            const club = swimmerList[i][swimmerList.idx.clubName];
                            const lscCode = swimmerList[i][swimmerList.idx.lsc];
                            if (club) sampleClubs.add(club);
                            if (lscCode) sampleLSCs.add(lscCode);
                        }
                        console.log('Sample club names found:', Array.from(sampleClubs));
                        console.log('Sample LSC codes found:', Array.from(sampleLSCs));
                    }
                    
                    return swimmerList;
                }
            } catch (error) {
                console.error(`Error searching ${description} with "${nameVariation}":`, error);
                continue;
            }
        }
    }
    
    // Strategy 2: Search through club dictionary to find matching club names
    console.log(`[Strategy 2] Searching club dictionary for teams matching "${searchTerm}"...`);
    const lscsForDictionary = ['PN', 'WA', 'CA', 'OR', 'AZ', 'CO', 'UT', 'NV'];
    const matchingClubNames = [];
    
    for (const lsc of lscsForDictionary) {
        try {
            // Wait for club dictionary to be available
            while (!window._clubDictinary) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const clubMap = await window._clubDictinary.loadClubMap(lsc);
            if (clubMap && clubMap.size > 0) {
                for (const [code, name] of clubMap) {
                    if (name && name.toLowerCase().includes(searchTerm)) {
                        matchingClubNames.push({ name, code, lsc });
                        console.log(`Found matching club: "${name}" (${code}) in LSC ${lsc}`);
                    }
                }
            }
        } catch (error) {
            console.error(`Error loading club dictionary for LSC ${lsc}:`, error);
        }
    }
    
    // If we found matching clubs, search for swimmers using those exact club names
    if (matchingClubNames.length > 0) {
        console.log(`[Strategy 2] Found ${matchingClubNames.length} matching clubs, searching for swimmers...`);
        
        // Group by LSC to search efficiently
        const clubsByLSC = {};
        for (const club of matchingClubNames) {
            if (!clubsByLSC[club.lsc]) {
                clubsByLSC[club.lsc] = [];
            }
            clubsByLSC[club.lsc].push(club.name);
        }
        
        // Search for each LSC
        for (const [lsc, clubNames] of Object.entries(clubsByLSC)) {
            try {
                console.log(`Searching for ${clubNames.length} clubs in LSC ${lsc}...`);
                
                const bodyObj = {
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
                            filter: { from: from, to: to },
                        },
                        {
                            title: "name",
                            dim: "[Persons.FullName]",
                            datatype: "text",
                        },
                        {
                            title: "clubName",
                            dim: "[Persons.ClubName]",
                            datatype: "text",
                        },
                        {
                            title: "lsc",
                            dim: "[Persons.LscCode]",
                            datatype: "text",
                        },
                        {
                            title: "gender",
                            dim: "[Persons.Gender]",
                            datatype: "text",
                        },
                        {
                            dim: "[Persons.ClubName]",
                            datatype: "text",
                            filter: {
                                members: clubNames, // Use "members" for exact match
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
                    count: 5000,
                };
                
                const swimmerList = await fetchSwimValues(bodyObj);
                
                if (swimmerList && swimmerList.length > 0 && swimmerList.idx) {
                    console.log(`✅ Found ${swimmerList.length} swimmers using club dictionary search`);
                    
                    // Log sample club names
                    const sampleClubs = new Set();
                    for (let i = 0; i < Math.min(10, swimmerList.length); i++) {
                        const club = swimmerList[i][swimmerList.idx.clubName];
                        if (club) sampleClubs.add(club);
                    }
                    console.log('Sample club names found:', Array.from(sampleClubs));
                    
                    return swimmerList;
                }
            } catch (error) {
                console.error(`Error searching LSC ${lsc} with club dictionary:`, error);
                continue;
            }
        }
    }
    
    console.log('❌ All search strategies failed');
    return null;
}

console.log("swimmer.js: Exporting functions...");
window.swimmer = swimmer;
window.search = search;
window.searchAll = searchAll;
window.toggle25 = toggle25;
window.loadEvents = loadEvents;
window.loadSwimerInfo = loadSwimerInfo;
window.loadSearch = loadSearch;
window.loadSwimmerDetails = loadSwimmerDetails;
window.sortSearchTable = sortSearchTable;
window.toggleSwimmerSearchMenu = toggleSwimmerSearchMenu;
window.toggleTeamSearchMenu = toggleTeamSearchMenu;
window.searchByTeam = searchByTeam;
window.selectTeam = selectTeam;
window.sortTeamSearchTable = sortTeamSearchTable;
console.log("swimmer.js: Functions exported - search:", typeof window.search);
