/**
 * ================================================================================
 * SWIM TRACKER - SWIMMER MODULE
 * ================================================================================
 * 
 * Swimmer data loading, processing, and display functionality.
 * Handles swimmer profiles, best times tables, and meet history.
 */

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
    if (!data.events || !data.events.idx) {
        console.log("Events data missing idx property:", data.events);
        return data;
    }
    let idx = data.events.idx;
    let meets = new Set(data.events.map((e) => e[idx.meet]));

    // Wait for _meetDictinary to be available
    while (!window._meetDictinary) {
        console.log(`🏊 WAITING: _meetDictinary not yet available in processSwimmerData, waiting 100ms...`);
        await new Promise(resolve => setTimeout(resolve, 100));
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
    html.push(createDetailsPageTitle(data));
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

    let progressGraph = createProgressGraph(data.swimmer.pkey, data.events);
    console.log("Progress graph created, length:", progressGraph.length);
    console.log("Progress graph content preview:", progressGraph.substring(0, 100));

    tabView.addTab("<p>Personal Best</p>", personalBestTable);
    tabView.addTab(
        createClickableDiv(
            "Progress Graph",
            `showGraph(null,{pkey:${data.swimmer.pkey}})`,
        ),
        progressGraph,
    );
    tabView.addTab("<p>Age Best</p>", ageBestTable);
    tabView.addTab("<p>Meets</p>", meetTable);
    
    // Add AI Insights tab
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

function createDetailsPageTitle(data) {
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

    html.push(
        '<div class="match-size header"><span>',
        displayName,
        "</span><span>",
        window.convertGenderCodeToString(data.swimmer.gender),
        "</span><span>",
        data.swimmer.age,
        "</span><span>",
        data.swimmer.clubName,
        "</span><span>Birthday: ",
        (window.BirthdayDictionary ? BirthdayDictionary.format(data.swimmer.birthday) : (data.swimmer.birthday ? data.swimmer.birthday.join(' - ') : '')),
        "</span><span>Total Event: ",
        data.events.length,
        "</span></div>",
    );

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
    showSearch(values);
}

async function searchAll(params) {
    return await search(params, true);
}

async function loadSearch(name, all) {
    let key = "search/" + name + (all ? "<ALL>" : "");
    return await LocalCache.func(key, async () => {
        let values = await loadSwimmerSearch(name, all);
        if (!values || values.length == 0) {
            values = await loadClubSearch(name, all);
        }

        if (!values || values.length <= 1) {
            return values;
        }

        values = await filterSwimmers(values);
        if (values) {
            values.sort((a, b) => a[values.idx.age] - b[values.idx.age]);
        }
        return values;
    });
}

async function filterSwimmers(values) {
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

    let list = await fetchSwimValues(bodyObj, "event");
    if (!list) {
        return;
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
}

function showSearch(values) {
    console.log("showSearch called with:", values);
    console.log("values.length:", values?.length);
    console.log("values.idx:", values?.idx);
    console.log("First result structure:", values?.length > 0 ? values[0] : 'No results');

    if (!values || values.length == 0) {
        window.updateContent("No result found");
        return;
    }

    if (values.length == 1) {
        let pkey = null;

        // Try to get pkey from idx mapping first
        if (values.idx && values.idx.pkey !== undefined) {
            pkey = values[0][values.idx.pkey];
            console.log("Using idx mapping for pkey:", pkey);
        } else {
            console.log("Search result missing or invalid idx structure:", values.idx);
            // Try fallback approaches
            if (values[0]) {
                // Try common index positions
                pkey = values[0][4] || values[0].pkey || values[0][0];
                console.log("Using fallback pkey detection:", pkey);
                console.log("Available properties in first result:", Object.keys(values[0] || {}));
            }
        }

        if (pkey) {
            console.log("Navigating to swimmer with pkey:", pkey);
            window.location.replace("#swimmer/" + encodeURIComponent(pkey));
        } else {
            console.error("Could not determine swimmer pkey from search result");
            console.log("Full first result:", values[0]);
            window.updateContent("Error: Could not determine swimmer ID from search result");
        }
        return;
    }

    let html = [];

    html.push(
        '<table class="fill top-margin" id="search-table"><tbody><tr class="th"><th></th><th>Name</th><th>Age</th><th>Club</th><th>LSC</th></tr>',
    );
    let index = 0;
    for (let [name, age, club, lsc, pkey] of values) {
        html.push(
            `<tr onclick="go('swimmer', ${pkey})"><td>`,
            ++index,
            '</td><td class="left">',
            name,
            "</td><td>",
            age,
            '</td><td class="left">',
            club,
            "</td><td>",
            lsc,
            "</td></tr>",
        );
    }
    html.push("</tbody></table>");

    window.updateContent(html.join(""));
}

async function loadClubSearch(value, all) {
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
                filter: {
                    contains: value,
                },
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
        ],
        count: 5000,
    };

    if (!all) {
        bodyObj.metadata[1].filter = {
            to: 18,
        };
    } else {
        bodyObj.metadata[1].filter = {
            from: 19,
        };
    }

    return await fetchSwimValues(bodyObj);
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
    } else {
        console.log("loadSwimmerSearch: No valid idx found, creating fallback");
        // Create fallback idx mapping based on expected search result structure
        values.idx = {
            name: 0,
            age: 1,
            clubName: 2,
            lsc: 3,
            pkey: 4
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
        bodyObj.metadata[1].filter = {
            to: 18,
        };
    } else {
        bodyObj.metadata[1].filter = {
            from: 19,
        };
    }

    return await fetchSwimValues(bodyObj);
}

// ================================================================================
// GLOBAL EXPORTS
// ================================================================================

console.log("swimmer.js: Exporting functions...");
window.swimmer = swimmer;
window.search = search;
window.searchAll = searchAll;
window.toggle25 = toggle25;
console.log("swimmer.js: Functions exported - search:", typeof window.search);
