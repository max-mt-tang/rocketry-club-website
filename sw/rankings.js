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
    // Check cache first for fast rendering - return immediately if cached
    // Personal Best times will be fetched in background for accurate rankings
    let cached = await LocalCache.get("rank/" + key);
    if (cached) {
        // Extract event code from key for postLoadRankFast
        let [genderStr, ageKey, eventCode, zone, lsc, club] = decodeRankMapKey(key);
        
        // Handle cached ranking data format with preserved idx
        if (cached.values && cached.idx) {
            // This is raw data stored by LocalCache.func(), need to process it
            let restoredData = cached.values;
            restoredData.idx = cached.idx;
            // Process through postLoadRank but skip Personal Best fetching for speed
            // Personal Best will be fetched in background
            return await postLoadRankFast(restoredData, eventCode);
        }
        // If it's already an array with idx, process it
        if (Array.isArray(cached) && cached.idx) {
            return await postLoadRankFast(cached, eventCode);
        }
    }
    return null;
}

async function loadRank(key, forceRefresh = false) {
    // Use shorter cache timeout for rankings (1 hour instead of 1 day) to get fresher data
    const rankingCacheTimeout = 60 * 60; // 1 hour in seconds
    
    // If force refresh, completely bypass cache and fetch fresh data
    if (forceRefresh) {
        console.log('Force refreshing ranking data for:', key);
        
        // Clear all related caches
        localStorage.removeItem("rank/" + key);
        let [genderStr, ageKey, event, zone, lsc, club] = decodeRankMapKey(key);
        if (club) {
            // Clear club swimmer list cache
            let clubName = club;
            if (club && club.length <= 4 && window._clubDictinary) {
                clubName = await window._clubDictinary.loadClubName(lsc, club);
            }
            if (clubName) {
                let clubCacheKey = "club/" + lsc + "_" + clubName + "_" + ageKey;
                localStorage.removeItem(clubCacheKey);
            }
        }
        
        // Fetch data directly without using cache
        let values;
        if (club) {
            // For club rankings, we need to bypass the cache in loadRankDataByClub too
            // Clear the club cache first
            let clubName = club;
            if (club && club.length <= 4 && window._clubDictinary) {
                clubName = await window._clubDictinary.loadClubName(lsc, club);
            }
            if (clubName) {
                let clubCacheKey = "club/" + lsc + "_" + clubName + "_" + ageKey;
                localStorage.removeItem(clubCacheKey);
            }
            // Call loadRankDataByClub with forceRefresh=true to fetch fresh data
            values = await loadRankDataByClub(key, true);
        } else {
            values = await LoadRankDataAll(key);
            values = await filterByAge(values, ageKey);
        }

        // Process the fresh data
        if (!values || !Array.isArray(values)) {
            return null;
        }

        let idx = values.idx;
        if (!idx || idx.sortkey === undefined) {
            return null;
        }

        // remove sortkey from values and idx
        for (let row of values) {
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
        values.idx = idx;
        
        // Process and return fresh data with Personal Best times
        // Pass event code so postLoadRank can fetch Personal Best times for all swimmers
        return await postLoadRank(values, true, event); // fetchPersonalBest = true for accurate rankings
    }
    
    // Normal load - but always fetch fresh Personal Best times
    // We still use cache for the initial ranking data, but postLoadRank will update with Personal Best times
    let cacheTimeout = rankingCacheTimeout;
    
    // Extract event from key for passing to postLoadRank
    let [genderStrForEvent, ageKeyForEvent, eventForPost, zoneForEvent, lscForEvent, clubForEvent] = decodeRankMapKey(key);
    
    let values = await LocalCache.func("rank/" + key, async () => {
        let [genderStr, ageKey, event, zone, lsc, club] = decodeRankMapKey(key);

        let values;
        if (club) {
            values = await loadRankDataByClub(key, false);
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
    }, cacheTimeout);

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
        
        // Pass event code so postLoadRank can fetch Personal Best times if needed
        return await postLoadRank(values, false, eventForPost); // Don't fetch Personal Best during initial load
    }
    
    return null;
}

// Fast version that skips Personal Best fetching - used for initial rendering
async function postLoadRankFast(values, eventCode = null) {
    // Same as postLoadRank but without Personal Best fetching
    return await postLoadRank(values, false, eventCode); // skipPersonalBest = false means don't fetch
}

async function postLoadRank(values, fetchPersonalBest = true, eventCodeParam = null) {
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
    
    // Debug: Log all Ray Tang entries before deduplication
    const rayPkeyDebug = '500281';
    const rayEntries = values.filter(row => row && row[idx.pkey] === rayPkeyDebug);
    if (rayEntries.length > 0) {
        console.log(`[postLoadRank] Found ${rayEntries.length} Ray Tang entries before deduplication:`);
        rayEntries.forEach((row, i) => {
            console.log(`  Entry ${i + 1}: time=${row[idx.time]}, date=${row[idx.date]}, meet=${row[idx.meet]}`);
        });
    }

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
    // If times are equal or very close (within 0.01 seconds), prefer more recent date
    let seenSwimmers = new Map(); // Map<pkey, {time, date, row}>
    let uniqueSwimmers = [];
    
    // Track duplicate counts for debugging
    let duplicateCounts = new Map(); // Map<pkey, count>

    // Track specific swimmers for debugging
    const maxPkey = '1320806'; // Max Tang's pkey
    const rayPkey = '500281';  // Ray Tang's pkey

    for (let row of values) {
        if (!row || !row[idx.pkey] || !row[idx.time]) {
            continue;
        }

        let pkey = row[idx.pkey];
        let currentTime = window.timeToInt(row[idx.time]);
        let currentDate = row[idx.date] || '';
        let swimmerName = row[idx.name];

        // Skip if timeToInt returned invalid result
        if (isNaN(currentTime) || currentTime <= 0) {
            continue;
        }

        if (!seenSwimmers.has(pkey)) {
            // First time seeing this swimmer
            seenSwimmers.set(pkey, { time: currentTime, date: currentDate, row: row });
            uniqueSwimmers.push(row);
            duplicateCounts.set(pkey, 1);

            if (pkey === rayPkey) {
                console.log(`[postLoadRank] First entry for Ray Tang: time=${row[idx.time]}, date=${currentDate}`);
            }
        } else {
            // We've seen this swimmer before, check if this time is faster or more recent
            let previous = seenSwimmers.get(pkey);
            let previousTime = previous.time;
            let previousDate = previous.date;
            duplicateCounts.set(pkey, (duplicateCounts.get(pkey) || 1) + 1);

            if (pkey === rayPkey) {
                console.log(`[postLoadRank] Comparing Ray Tang entries:`);
                console.log(`  Previous: time=${previous.row[idx.time]}, date=${previousDate}`);
                console.log(`  Current:  time=${row[idx.time]}, date=${currentDate}`);
            }

            // Time difference threshold: 0.01 seconds (1 centisecond)
            const timeDiff = Math.abs(currentTime - previousTime);
            const timeThreshold = 1; // 1 centisecond = 0.01 seconds

            if (currentTime < previousTime - timeThreshold) {
                // This time is significantly faster, replace the previous entry
                seenSwimmers.set(pkey, { time: currentTime, date: currentDate, row: row });
                // Find and replace the previous entry
                for (let i = 0; i < uniqueSwimmers.length; i++) {
                    if (uniqueSwimmers[i][idx.pkey] === pkey) {
                        uniqueSwimmers[i] = row;
                        if (pkey === rayPkey) {
                            console.log(`[postLoadRank] Replaced Ray Tang entry with faster time`);
                        }
                        break;
                    }
                }
            } else if (timeDiff <= timeThreshold && currentDate > previousDate) {
                // Times are equal or very close (within threshold), prefer more recent date
                seenSwimmers.set(pkey, { time: currentTime, date: currentDate, row: row });
                // Find and replace the previous entry
                for (let i = 0; i < uniqueSwimmers.length; i++) {
                    if (uniqueSwimmers[i][idx.pkey] === pkey) {
                        uniqueSwimmers[i] = row;
                        if (pkey === rayPkey) {
                            console.log(`[postLoadRank] Replaced Ray Tang entry with more recent date (times are equal)`);
                        }
                        break;
                    }
                }
            } else if (pkey === rayPkey) {
                console.log(`[postLoadRank] Kept previous Ray Tang entry (faster or same time)`);
            }
        }
    }
    
    // Log swimmers with multiple entries (to verify deduplication is working)
    const swimmersWithDuplicates = Array.from(duplicateCounts.entries()).filter(([pkey, count]) => count > 1);
    if (swimmersWithDuplicates.length > 0) {
        console.log(`[postLoadRank] Found ${swimmersWithDuplicates.length} swimmers with multiple entries (deduplicated):`);
        swimmersWithDuplicates.slice(0, 10).forEach(([pkey, count]) => {
            const entry = seenSwimmers.get(pkey);
            if (entry) {
                const isRay = (pkey == rayPkey) ? ' <-- RAY' : '';
                console.log(`  pkey ${pkey}: ${count} entries, kept time=${entry.row[idx.time]}, date=${entry.date}${isRay}`);
            }
        });
    }


    // Check if Max and Ray made it through deduplication
    const finalMax = uniqueSwimmers.find(row => row[idx.pkey] === maxPkey);
    const finalRay = uniqueSwimmers.find(row => row[idx.pkey] === rayPkey);

    if (finalRay) {
        console.log(`[postLoadRank] Final Ray Tang entry after deduplication: time=${finalRay[idx.time]}, date=${finalRay[idx.date]}`);
    } else {
        console.log(`[postLoadRank] Ray Tang not found in deduplicated results`);
    }

    // Use event code from parameter (passed from loadRank) since the event field is a filter, not a returned field
    let eventCode = eventCodeParam;
    if (!eventCode && uniqueSwimmers.length > 0) {
        // Try to extract from data as fallback
        if (idx.eventkey !== undefined && uniqueSwimmers[0][idx.eventkey]) {
            eventCode = uniqueSwimmers[0][idx.eventkey];
        } else if (idx.eventcode !== undefined && uniqueSwimmers[0][idx.eventcode]) {
            eventCode = uniqueSwimmers[0][idx.eventcode];
        } else if (idx.event !== undefined && uniqueSwimmers[0][idx.event]) {
            eventCode = uniqueSwimmers[0][idx.event];
        }
    }
    console.log(`[postLoadRank] eventCode: ${eventCode} (from param: ${eventCodeParam})`)
    
    // Fetch Personal Best times for all swimmers directly from API
    // IMPORTANT: We do NOT filter by event code in the API call because that returns unreliable/outdated data.
    // Instead, we fetch ALL events for each swimmer and find the best time for the specific event locally.
    if (eventCode && uniqueSwimmers.length > 0 && fetchPersonalBest) {
        console.log(`[postLoadRank] Fetching Personal Best times for ${uniqueSwimmers.length} swimmers for event ${eventCode}...`);
        
        // Collect all pkeys
        let pkeys = uniqueSwimmers
            .filter(row => row && row[idx.pkey])
            .map(row => row[idx.pkey]);
        
        // Fetch Personal Best times in batches
        let personalBestMap = new Map(); // Map<pkey, {time, date, timeInt}>
        
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
                        
                        // Debug: log for Ray Tang
                        if (pkey == '500281') {
                            console.log(`[postLoadRank] Ray Tang: fetched ${events.length} events, looking for eventCode=${eventCode}`);
                            console.log(`[postLoadRank] Ray Tang: eventsIdx.event=${eventsIdx.event}`);
                            // Log first few events for debugging
                            for (let i = 0; i < Math.min(5, events.length); i++) {
                                console.log(`[postLoadRank] Ray Tang event ${i}: code=${events[i][eventsIdx.event]}, time=${events[i][eventsIdx.time]}`);
                            }
                        }
                        
                        // Find best time for the specific event locally
                        for (let event of events) {
                            if (event[eventsIdx.event] == eventCode) {
                                let eventTimeInt = window.timeToInt(event[eventsIdx.time]);
                                if (eventTimeInt < bestTimeInt) {
                                    bestTimeInt = eventTimeInt;
                                    bestTime = event[eventsIdx.time];
                                    bestDate = event[eventsIdx.date] ? event[eventsIdx.date].substring(0, 10) : null;
                                }
                            }
                        }
                        
                        // Debug: log result for Ray Tang
                        if (pkey == '500281') {
                            if (bestTime) {
                                console.log(`[postLoadRank] Ray Tang: found best time=${bestTime}, date=${bestDate}`);
                            } else {
                                console.log(`[postLoadRank] Ray Tang: NO best time found for eventCode=${eventCode}`);
                            }
                        }
                        
                        if (bestTime) {
                            personalBestMap.set(pkey, {
                                time: bestTime,
                                date: bestDate,
                                timeInt: bestTimeInt
                            });
                        }
                    } else if (pkey == '500281') {
                        console.log(`[postLoadRank] Ray Tang: fetchSwimValues returned empty or no idx`);
                    }
                } catch (e) {
                    console.log(`[postLoadRank] Error fetching Personal Best for pkey ${pkey}:`, e);
                }
            });
            
            await Promise.all(promises);
        }
        
        console.log(`[postLoadRank] Fetched Personal Best times for ${personalBestMap.size} swimmers`);
        
        // Update ranking data with Personal Best times
        let updateCount = 0;
        const rayPkey = '500281';
        for (let i = 0; i < uniqueSwimmers.length; i++) {
            let row = uniqueSwimmers[i];
            let pkey = row[idx.pkey];
            let personalBest = personalBestMap.get(pkey);
            
            if (personalBest) {
                let currentTimeInt = window.timeToInt(row[idx.time]);
                // Use Personal Best if it's better (faster)
                if (personalBest.timeInt < currentTimeInt) {
                    let oldTime = row[idx.time];
                    row[idx.time] = personalBest.time;
                    row[idx.date] = personalBest.date;
                    updateCount++;
                    if (pkey == rayPkey) {
                        console.log(`[postLoadRank] ✅ Updated Ray Tang: ${oldTime} (${currentTimeInt}) -> ${personalBest.time} (${personalBest.timeInt})`);
                    }
                } else if (pkey == rayPkey) {
                    console.log(`[postLoadRank] Ray Tang Personal Best (${personalBest.time}) same or slower than ranking data (${row[idx.time]})`);
                }
            } else if (pkey == rayPkey) {
                console.log(`[postLoadRank] ⚠️ No Personal Best found for Ray Tang in API response`);
            }
        }
        console.log(`[postLoadRank] Updated ${updateCount} swimmers with Personal Best times`);
        
        // Log final Ray Tang entry after Personal Best update
        const finalRayAfterPB = uniqueSwimmers.find(row => row[idx.pkey] == rayPkey);
        if (finalRayAfterPB) {
            console.log(`[postLoadRank] Final Ray Tang entry after Personal Best update: time=${finalRayAfterPB[idx.time]}, date=${finalRayAfterPB[idx.date]}`);
        }
    }

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

    // Always fetch fresh data with Personal Best times for accurate ranking
    let data = await loadRank(mapKey, true); // forceRefresh = true to get latest Personal Best times

    const element = document.getElementById(id);
    if (!element) {
        return;
    }

    if (!data || !data.values) {
        element.innerHTML = createClickableDiv("", `go('rank', '${mapKey}')`);
        return;
    }

    // Verify data is sorted correctly (should be sorted by postLoadRank)
    // Double-check sorting to ensure consistency with ranking details page
    if (data.values && data.values.length > 0 && data.values.idx) {
        let idx = data.values.idx;
        // Re-sort to ensure consistency
        data.values.sort((a, b) => {
            let timeA = window.timeToInt(a[idx.time]);
            let timeB = window.timeToInt(b[idx.time]);
            return timeA - timeB;
        });
    }

    // Debug: Log Ray Tang's ranking calculation
    const rayPkey = '500281';
    if (pkey == rayPkey) {
        console.log(`[getRank] Calculating rank for Ray Tang:`);
        console.log(`  mapKey: ${mapKey}`);
        console.log(`  timeInt: ${timeInt} (should be 3366 for 33.66)`);
        
        // Verify timeInt conversion
        const expectedTimeInt = window.timeToInt ? window.timeToInt('33.66') : null;
        if (expectedTimeInt) {
            console.log(`  Expected timeInt for "33.66": ${expectedTimeInt}`);
            if (timeInt !== expectedTimeInt) {
                console.warn(`  WARNING: timeInt mismatch! Got ${timeInt}, expected ${expectedTimeInt}`);
            }
        }
        
        console.log(`  Ranking data has ${data.values.length} swimmers`);
        
        // Find Ray's entry in ranking data
        const rayEntry = data.values.find(row => row && row[data.values.idx.pkey] == rayPkey);
        if (rayEntry) {
            const rayTimeInRanking = rayEntry[data.values.idx.time];
            const rayTimeIntInRanking = window.timeToInt(rayTimeInRanking);
            const rayDateInRanking = rayEntry[data.values.idx.date];
            console.log(`  Ray's entry in ranking data: time=${rayTimeInRanking}, timeInt=${rayTimeIntInRanking}, date=${rayDateInRanking}`);
            console.log(`  Time difference: Personal Best (${timeInt}) vs Ranking Data (${rayTimeIntInRanking}) = ${timeInt - rayTimeIntInRanking}`);
        } else {
            console.log(`  Ray NOT found in ranking data!`);
        }
        
        // Log top 10 times in ranking data for debugging
        console.log(`  Top 10 times in ranking data (after re-sort):`);
        for (let i = 0; i < Math.min(10, data.values.length); i++) {
            const row = data.values[i];
            if (row && row[data.values.idx.time]) {
                const rowTime = row[data.values.idx.time];
                const rowTimeInt = window.timeToInt(rowTime);
                const rowPkey = row[data.values.idx.pkey];
                const isRay = (rowPkey == rayPkey) ? ' <-- RAY' : '';
                const isFaster = (rowTimeInt < timeInt) ? ' [FASTER]' : '';
                console.log(`    Position ${i+1}: ${rowTime} (${rowTimeInt})${isRay}${isFaster}`);
            }
        }
    }

    let rank = calculateRank(data.values, pkey, timeInt);

    if (pkey == rayPkey) {
        console.log(`  Calculated rank: ${rank} (should be 8 if 7 swimmers are faster)`);
    }

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

    // Count how many swimmers have times faster than (not equal to) the Personal Best time
    // Rank = number of swimmers faster + 1
    let fasterCount = 0;
    
    // Debug for Ray Tang
    const rayPkey = '500281';
    const isRay = (pkey == rayPkey);
    
    if (isRay) {
        console.log(`[calculateRank] Starting calculation for Ray Tang:`);
        console.log(`  Personal Best timeInt: ${timeInt} (33.66)`);
        console.log(`  Total swimmers in ranking: ${values.length}`);
    }
    
    // Find Ray's entry in ranking data to check for swimmers between his Personal Best and old ranking time
    let rayEntry = null;
    let rayOldTimeInt = null;
    
    if (isRay) {
        rayEntry = values.find(row => row && row[values.idx.pkey] == rayPkey);
        if (rayEntry) {
            rayOldTimeInt = window.timeToInt(rayEntry[values.idx.time]);
            const rayPosition = values.indexOf(rayEntry) + 1;
            console.log(`  Found Ray's entry at position ${rayPosition}: ${rayEntry[values.idx.time]} (${rayOldTimeInt})`);
        }
    }
    
    for (let i = 0; i < values.length; ++i) {
        // Add safety check for row data
        if (!values[i] || values[i][values.idx.pkey] === undefined || values[i][values.idx.time] === undefined) {
            continue;
        }

        let rowTimeInt = window.timeToInt(values[i][values.idx.time]);
        let rowTime = values[i][values.idx.time];
        let rowPkey = values[i][values.idx.pkey];

        // Count swimmers who are faster (strictly less than Personal Best time)
        // IMPORTANT: We count ALL swimmers faster than Personal Best, not just those before Ray's entry
        // This handles the case where Ray's entry in ranking data has an old time
        if (rowTimeInt < timeInt) {
            fasterCount++;
            
            if (isRay && fasterCount <= 15) {
                console.log(`  Faster swimmer #${fasterCount}: ${rowTime} (${rowTimeInt}) - pkey: ${rowPkey} - position ${i+1}`);
            }
        } else if (isRay && rowPkey == rayPkey) {
            // Ray's entry found - already logged above
        } else if (isRay && rayOldTimeInt && rowTimeInt > timeInt && rowTimeInt < rayOldTimeInt) {
            // This is a swimmer with time between Ray's Personal Best and old ranking time
            // They should be counted as faster than Ray's Personal Best
            fasterCount++;
            console.log(`  Faster swimmer #${fasterCount}: ${rowTime} (${rowTimeInt}) - pkey: ${rowPkey} - position ${i+1} [BETWEEN Ray's PB and old ranking time]`);
        }
    }

    const rank = fasterCount + 1;
    
    if (isRay) {
        console.log(`[calculateRank] Result: ${fasterCount} swimmers faster, rank = ${rank}`);
    }

    // Rank is the number of swimmers faster + 1
    // If 7 swimmers are faster, rank is 8
    return rank;
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
    extraClass = "",
) {
    let html = [];

    let rankDataKey = getRankDataKey(genderStr, event, ageKey, zone, lsc, club);
    let cellClass = "full rk" + (extraClass ? " " + extraClass : "");

    // Always show loader and fetch fresh data in background with Personal Best times
    // This ensures rankings are calculated with everyone's latest Personal Best times
    let id = rankDataKey + "_" + pkey;
    
    html.push(
        `<td class="${cellClass}" id="${id}">`,
        createClickableDiv(
            '<div class="loader"></div>',
            `go('rank','${rankDataKey}')`,
        ),
        "</td>",
    );

    // Queue background action to fetch fresh ranking data with Personal Best times
    _backgroundActions.push([getRank, [rankDataKey, timeInt, pkey, id]]);

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
                label.textContent = 'Top3';
            }
            
            // Auto toggle ON and show flash
            toggle.checked = true;
            if (window.toggleTop3Highlight) {
                window.toggleTop3Highlight(true);
            }
        }
    }
}

// ================================================================================
// ADDITIONAL RANKING FUNCTIONS (moved from scripts.js)
// ================================================================================

async function loadClubAgeSwimmerList(lsc, clubName, ageKey, forceRefresh = false) {
    let cacheKey = "club/" + lsc + "_" + clubName + "_" + ageKey;
    
    // If force refresh, clear cache first and use timeout of 0 to bypass cache
    if (forceRefresh) {
        localStorage.removeItem(cacheKey);
    }
    
    // Use timeout of 0 to bypass cache when forceRefresh is true
    let cacheTimeout = forceRefresh ? 0 : undefined;

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
    }, cacheTimeout);
}

async function loadRankDataByClub(key, forceRefresh = false) {
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

    let swimmerList = await loadClubAgeSwimmerList(lsc, clubName, ageKey, forceRefresh);

    // Check if swimmerList is valid
    if (!swimmerList || swimmerList.length === 0) {
        swimmerList = [];
        swimmerList.idx = { pkey: 0, age: 1 };
    }

    // Check if swimmerList has idx, if not it came from corrupted cache
    if (!swimmerList.idx) {
        // Clear the corrupted cache entry
        let cacheKey = "club/" + lsc + "_" + clubName + "_" + ageKey;
        localStorage.removeItem(cacheKey);
        // Try loading again (this will bypass cache)
        swimmerList = await loadClubAgeSwimmerList(lsc, clubName, ageKey, true);
        if (!swimmerList || !swimmerList.idx) {
            swimmerList = [];
            swimmerList.idx = { pkey: 0, age: 1 };
        }
    }
    
    // For BC rankings, also include swimmers from BCST roster who may have transferred
    // Their times from previous clubs should still count for BC team rankings
    let bcstRosterPkeys = [];
    if (club === 'BC' && window.bcstRoster) {
        // Ensure roster is loaded
        if (!window.bcstRoster.isLoaded) {
            console.log('[loadRankDataByClub] Loading BCST roster for BC rankings...');
            try {
                await window.bcstRoster.loadRoster();
            } catch (e) {
                console.error('[loadRankDataByClub] Failed to load BCST roster:', e);
            }
        }
        
        if (window.bcstRoster.isLoaded) {
            let [fromAge, toAge] = decodeAgeKey(ageKey);
            let genderFilter = genderStr === 'Male' ? 'Male' : 'Female';
            
            console.log(`[loadRankDataByClub] Checking BCST roster for ${genderFilter} ${fromAge}-${toAge}...`);
            
            // Get all BCST roster swimmers matching age and gender
            let groups = window.bcstRoster.getGroupHierarchy();
            let existingPkeys = new Set(swimmerList.map(row => String(row[swimmerList.idx.pkey])));
            
            for (let group of groups) {
                let swimmers = window.bcstRoster.getSwimmers(group);
                if (!swimmers) continue;
                
                for (let swimmer of swimmers) {
                    if (swimmer.gender !== genderFilter) continue;
                    if (swimmer.age < fromAge || swimmer.age > toAge) continue;
                    if (!swimmer.id) continue;
                    
                    // Add to list if not already present
                    if (!existingPkeys.has(String(swimmer.id))) {
                        bcstRosterPkeys.push(swimmer.id);
                        existingPkeys.add(String(swimmer.id));
                        console.log(`[loadRankDataByClub] Adding BCST roster swimmer: ${swimmer.name} (${swimmer.id}) from ${group}`);
                    }
                }
            }
            
            if (bcstRosterPkeys.length > 0) {
                console.log(`[loadRankDataByClub] Added ${bcstRosterPkeys.length} BCST roster swimmers not in USA Swimming BC list`);
            } else {
                console.log(`[loadRankDataByClub] All BCST roster swimmers already in USA Swimming BC list`);
            }
        }
    }


    // Combine swimmer list pkeys with BCST roster pkeys
    let allPkeys = swimmerList
        .filter(row => row && row[swimmerList.idx.pkey])
        .map((row) => row[swimmerList.idx.pkey]);
    
    // Add BCST roster pkeys
    for (let pkey of bcstRosterPkeys) {
        if (!allPkeys.includes(pkey) && !allPkeys.includes(String(pkey))) {
            allPkeys.push(pkey);
        }
    }
    
    if (allPkeys.length === 0) {
        console.log('[loadRankDataByClub] No swimmers to query');
        return [];
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
                    members: allPkeys,
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

    // For BC rankings, DON'T filter by club to include transferred swimmers' times
    // For other clubs, still filter by club
    // This is because BCST has many transferred swimmers whose times are recorded under previous clubs
    if (club && club !== 'BC') {
        bodyObj.metadata.push({
            dim: "[OrgUnit.Level4Code]",
            datatype: "text",
            filter: {
                equals: club,
            },
            panel: "scope",
        });
    } else if (club === 'BC') {
        console.log(`[loadRankDataByClub] Skipping club filter for BC to include ALL times for BC swimmers (including transfers)`);
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

/**
 * Debug why a specific swimmer is missing from rankings
 * Usage: debugMissingSwimmer(797518) in browser console
 */
async function debugMissingSwimmer(pkey) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`DEBUG: Why is swimmer ${pkey} missing from rankings?`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Wait for fetchSwimValues to be available
    while (!window.fetchSwimValues) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 1: Get swimmer info directly from API
    console.log('Step 1: Loading swimmer info...');
    let bodyObj = {
        metadata: [
            { title: "firstName", dim: "[Persons.FirstAndPreferredName]", datatype: "text" },
            { title: "lastName", dim: "[Persons.LastName]", datatype: "text" },
            { title: "age", dim: "[Persons.Age]", datatype: "numeric" },
            { title: "clubName", dim: "[Persons.ClubName]", datatype: "text" },
            { title: "lsc", dim: "[Persons.LscCode]", datatype: "text" },
            { title: "pkey", dim: "[Persons.PersonKey]", datatype: "numeric", filter: { equals: pkey } },
        ],
        count: 1,
    };
    
    let values = await window.fetchSwimValues(bodyObj);
    
    if (!values || values.length === 0) {
        console.error(`❌ Swimmer ${pkey} not found in USA Swimming database!`);
        return;
    }
    
    let row = values[0];
    let idx = values.idx;
    let swimmerInfo = {
        firstName: row[idx.firstName],
        lastName: row[idx.lastName],
        age: row[idx.age],
        clubName: row[idx.clubName],
        lsc: row[idx.lsc],
    };
    
    console.log('✅ Swimmer found:');
    console.log(`   Name: ${swimmerInfo.firstName} ${swimmerInfo.lastName}`);
    console.log(`   Age: ${swimmerInfo.age}`);
    console.log(`   Club: ${swimmerInfo.clubName}`);
    console.log(`   LSC: ${swimmerInfo.lsc}`);
    
    // Step 2: Determine age group
    let ageKey = getAgeKey(swimmerInfo.age);
    let [fromAge, toAge] = decodeAgeKey(ageKey);
    console.log(`\nStep 2: Age group determination`);
    console.log(`   Age ${swimmerInfo.age} → Age key: ${ageKey} (${fromAge}-${toAge})`);
    
    // Step 3: Check if swimmer appears in club swimmer list
    console.log(`\nStep 3: Checking club swimmer list for ${swimmerInfo.lsc}/${swimmerInfo.clubName}/${ageKey}...`);
    
    let clubCacheKey = "club/" + swimmerInfo.lsc + "_" + swimmerInfo.clubName + "_" + ageKey;
    console.log(`   Cache key: ${clubCacheKey}`);
    
    // Clear cache to get fresh data
    localStorage.removeItem(clubCacheKey);
    
    let swimmerList = await loadClubAgeSwimmerList(swimmerInfo.lsc, swimmerInfo.clubName, ageKey, true);
    
    if (!swimmerList || swimmerList.length === 0) {
        console.error(`❌ No swimmers found for "${swimmerInfo.clubName}" in age group ${fromAge}-${toAge}`);
        console.log('   This could mean:');
        console.log('   - Club name mismatch in API');
        console.log('   - No swimmers in this age range registered with this club');
        
        // Try with partial club name
        console.log('\n   Trying with partial club name...');
        let words = swimmerInfo.clubName.split(' ');
        for (let i = 1; i <= words.length; i++) {
            let partial = words.slice(0, i).join(' ');
            let partialList = await loadClubAgeSwimmerList(swimmerInfo.lsc, partial, ageKey, true);
            if (partialList && partialList.length > 0) {
                console.log(`   ✅ Found ${partialList.length} swimmers with club name "${partial}"`);
                let found = partialList.some(r => r[partialList.idx?.pkey] == pkey);
                if (found) {
                    console.log(`   ✅ Swimmer ${pkey} FOUND with partial name "${partial}"!`);
                    break;
                }
            }
        }
        return;
    }
    
    console.log(`✅ Found ${swimmerList.length} swimmers in club list`);
    
    // Check if our swimmer is in the list
    let foundInList = false;
    let pkeyIdx = swimmerList.idx?.pkey;
    let ageIdx = swimmerList.idx?.age;
    
    console.log('\n   Swimmers in list:');
    for (let row of swimmerList) {
        let rowPkey = row[pkeyIdx];
        let rowAge = row[ageIdx];
        if (rowPkey == pkey) {
            foundInList = true;
            console.log(`   ✅ ${rowPkey} (age ${rowAge}) ← THIS IS THE TARGET SWIMMER`);
        } else {
            console.log(`      ${rowPkey} (age ${rowAge})`);
        }
    }
    
    if (!foundInList) {
        console.error(`\n❌ Swimmer ${pkey} NOT in club swimmer list!`);
        console.log('   Possible reasons:');
        console.log(`   1. Age mismatch: Swimmer is ${swimmerInfo.age}, but API filter is ${fromAge}-${toAge}`);
        console.log(`   2. Club name: "${swimmerInfo.clubName}" may not match exactly in Persons table`);
        console.log(`   3. LSC mismatch: "${swimmerInfo.lsc}" registration issue`);
        return;
    }
    
    console.log(`\n✅ Swimmer ${pkey} IS in the club swimmer list!`);
    
    // Step 4: Check what events/times this swimmer has
    // Use exact same query as loadEvents() in swimmer.js
    console.log(`\nStep 4: Loading swimmer's event times (same query as Personal Best tab)...`);
    
    let eventsBody = {
        metadata: [
            { title: "time", dim: "[UsasSwimTime.SwimTimeFormatted]", datatype: "text" },
            { title: "age", dim: "[UsasSwimTime.AgeAtMeetKey]", datatype: "numeric" },
            { title: "std", dim: "[TimeStandard.TimeStandardName]", datatype: "text" },
            { title: "lsc", dim: "[OrgUnit.Level3Code]", datatype: "text" },
            { title: "club", dim: "[OrgUnit.Level4Code]", datatype: "text" },
            { title: "date", dim: "[SeasonCalendar.CalendarDate (Calendar)]", datatype: "datetime", level: "days", sort: "asc" },
            { title: "event", dim: "[UsasSwimTime.SwimEventKey]", datatype: "numeric" },
            { title: "meet", dim: "[UsasSwimTime.MeetKey]", datatype: "numeric" },
            { title: "gender", dim: "[UsasSwimTime.EventCompetitionCategoryKey]", datatype: "numeric" },
            { dim: "[UsasSwimTime.PersonKey]", datatype: "numeric", filter: { equals: pkey }, panel: "scope" },
        ],
        count: 5000,
    };
    
    let events = await window.fetchSwimValues(eventsBody, "event");
    
    if (!events || events.length === 0) {
        console.error(`❌ No swim times found for swimmer ${pkey}!`);
        console.log('   They are registered with the club but have no recorded times.');
        return;
    }
    
    console.log(`✅ Found ${events.length} swim time records`);
    
    // Group by event
    let eventMap = new Map();
    let eIdx = events.idx;
    
    // Event key to name mapping
    let eventNames = {
        1: '50 FR', 2: '100 FR', 3: '200 FR', 4: '500 FR', 5: '1000 FR', 6: '1650 FR',
        7: '100 IM', 8: '200 IM', 9: '400 IM',
        10: '50 BK', 11: '100 BK', 12: '200 BK',
        13: '50 BR', 14: '100 BR', 15: '200 BR',
        16: '50 FL', 17: '100 FL', 18: '200 FL',
    };
    
    for (let e of events) {
        let eventKey = e[eIdx.event];
        let eventName = eventNames[eventKey] || `Event ${eventKey}`;
        let club = e[eIdx.club];
        let time = e[eIdx.time];
        let date = e[eIdx.date];
        let gender = e[eIdx.gender];
        
        let key = `${eventKey}`;
        if (!eventMap.has(key)) {
            eventMap.set(key, {
                eventKey,
                eventName,
                club,
                gender,
                times: []
            });
        }
        eventMap.get(key).times.push({ time, date });
    }
    
    console.log('\n   Events with times:');
    console.log('   ─'.repeat(40));
    console.log('   Event Key | Gender | Club | Event Name | Best Time | # Times');
    console.log('   ─'.repeat(40));
    
    for (let [key, data] of eventMap) {
        // Sort times to find best
        data.times.sort((a, b) => {
            let aInt = window.timeToInt ? window.timeToInt(a.time) : 0;
            let bInt = window.timeToInt ? window.timeToInt(b.time) : 0;
            return aInt - bInt;
        });
        let best = data.times[0];
        let genderStr = data.gender == 1 ? 'M' : data.gender == 2 ? 'F' : '?';
        let clubStr = (data.club || '?').padEnd(4);
        console.log(`   ${data.eventKey.toString().padEnd(9)} | ${genderStr.padEnd(6)} | ${clubStr} | ${data.eventName.padEnd(12)} | ${best.time.padEnd(10)} | ${data.times.length} times`);
    }
    
    console.log('\n✅ Debug complete. Compare event keys above with the ranking you\'re viewing.');
    console.log('   If the event key doesn\'t appear in the list, the swimmer has no times for that event.');
}

window.debugMissingSwimmer = debugMissingSwimmer;

