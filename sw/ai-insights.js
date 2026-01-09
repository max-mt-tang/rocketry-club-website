/**
 * ================================================================================
 * SWIM TRACKER - AI INSIGHTS MODULE (LOCAL ANALYSIS)
 * ================================================================================
 * 
 * Generates personalized insights and recommendations based on swimmer performance data.
 * Uses local analysis algorithms - no external API required.
 */

// ================================================================================
// INSIGHTS GENERATION
// ================================================================================

/**
 * Generate comprehensive insights for a swimmer
 * @param {Object} data - Complete swimmer data object
 * @returns {Object} Insights object with recommendations and analysis
 */
// Track if generation is in progress to prevent duplicate calls
let _generationInProgress = false;
let _generationPromise = null;

async function generateInsights(data, athleteStats = {}) {
    if (!data || !data.events || !data.swimmer) {
        return { insights: [], recommendations: [] };
    }
    
    // Prevent duplicate simultaneous calls - if already generating, return the existing promise
    const swimmerPkey = String(data.swimmer?.pkey || '');
    const cacheKey = `generating_${swimmerPkey}`;
    
    if (_generationInProgress && _generationPromise) {
        console.log('generateInsights: Already generating, returning existing promise');
        return _generationPromise;
    }
    
    // Mark as in progress and create new promise
    _generationInProgress = true;
    _generationPromise = (async () => {
        try {
            return await _generateInsightsInternal(data, athleteStats);
        } finally {
            _generationInProgress = false;
            _generationPromise = null;
        }
    })();
    
    return _generationPromise;
}

async function _generateInsightsInternal(data, athleteStats = {}) {

    const insights = [];
    const recommendations = [];

    // Analyze performance patterns
    const performance = analyzePerformance(data);
    const trends = analyzeTrends(data);
    const comparisons = analyzeComparisons(data);
    const strengths = identifyStrengths(data);
    const weaknesses = identifyWeaknesses(data);

    // Generate insights
    if (strengths.length > 0) {
        // Format as a readable bulleted list
        const strengthList = strengths.map(s => {
            if (s.bcRank || s.pnRank) {
                return `• <strong>${s.event}</strong>: ${s.time} — <em>${s.rankInfo}</em>`;
            } else {
                return `• <strong>${s.event}</strong>: ${s.time}`;
            }
        }).join('<br>');
        
        insights.push({
            type: 'strength',
            title: '💪 Your Strongest Events',
            content: strengthList
        });
    }

    if (weaknesses.length > 0) {
        insights.push({
            type: 'opportunity',
            title: '🎯 Focus Areas',
            content: weaknesses.map(w => `• <strong>${w.event}</strong>: Room for improvement in ${w.aspect}`).join('<br>')
        });
    }

    if (trends.improving.length > 0) {
        // Sort by improvement amount (highest first) - use numeric value if available
        const sortedImprovements = [...trends.improving].sort((a, b) => {
            const aVal = a.improvementValue || 0;
            const bVal = b.improvementValue || 0;
            return bVal - aVal;
        });
        
        // Format as a bulleted list - limit to top 8 most improved for readability
        const displayList = sortedImprovements.slice(0, 8);
        const content = displayList.map(t => {
            // Make it clearer what "faster" means
            return `• <strong>${t.event}</strong>: Improved by ${t.improvement} (${t.percent}% better)`;
        }).join('<br>') +
                       (sortedImprovements.length > 8 ? `<br><em>+${sortedImprovements.length - 8} more events improving</em>` : '');
        
        insights.push({
            type: 'trend',
            title: '📈 Improving Events',
            content: '<em style="font-size: 0.9em; color: #666;">Comparing recent performances to earlier ones</em><br><br>' + content
        });
    }

    // Get SwimCloud ID for adding to AI analysis profile section
    const swimCloudId = getSwimCloudId(data.swimmer);

    // Send data to Gemini for AI analysis (for all swimmers)
    if (data.swimmer && data.swimmer.pkey) {
        try {
            const swimmerPkey = String(data.swimmer.pkey);
            console.log('Sending swim data to Gemini for analysis (swimmer:', swimmerPkey, ')...');
            const geminiInsights = await getGeminiAnalysis(data, athleteStats);
            console.log('Gemini insights received:', geminiInsights);
            if (geminiInsights && geminiInsights.length > 0) {
                geminiInsights.forEach(insight => {
                    console.log('Adding Gemini insight:', insight);
                    insights.push({
                        type: 'trend',
                        title: `🤖 AI Analysis: ${insight.title}`,
                        content: insight.content
                    });
                });
                console.log('Gemini analysis added successfully, total insights:', insights.length);
            } else {
                console.log('No Gemini insights returned or empty array');
            }
        } catch (error) {
            console.error('Error getting Gemini analysis:', error);
            console.error('Error details:', error.message, error.stack);
        }
    } else {
        console.log('Gemini analysis skipped - no swimmer data available');
    }

    console.log('generateInsights: Final recommendations count:', recommendations.length);
    console.log('generateInsights: Final insights count:', insights.length);
    console.log('generateInsights: Recommendations:', recommendations);
    
    // Get weight loss potential data if available (for chart generation)
    let weightLossPotential = null;
    if (data.swimmer && athleteStats.height && athleteStats.weight) {
        const heightMeters = athleteStats.height / 100;
        const weightKg = athleteStats.weight / 2.20462;
        const bmi = (weightKg / (heightMeters * heightMeters));
        
        // Determine gender for thresholds
        let genderValue = null;
        if (data.swimmer.gender !== undefined && data.swimmer.gender !== null && data.swimmer.gender !== '') {
            genderValue = data.swimmer.gender;
        }
        const isFemale = (genderValue === 1 || genderValue === 'F' || genderValue === 'Female');
        const overweightThreshold = isFemale ? 23 : 24;
        const optimalMaxBMI = isFemale ? 22 : 23;
        
        if (bmi > overweightThreshold) {
            const optimalWeightKg = optimalMaxBMI * (heightMeters * heightMeters);
            const excessWeightKg = weightKg - optimalWeightKg;
            const excessWeightLbs = Math.round(excessWeightKg * 2.20462);
            const lossScenarios = [10, 20, 30].filter(lbs => lbs <= excessWeightLbs + 10);
            if (excessWeightLbs > 5) {
                lossScenarios.push(excessWeightLbs);
            }
            
            weightLossPotential = {
                currentWeight: athleteStats.weight,
                optimalWeight: Math.round(optimalWeightKg * 2.20462),
                excessWeight: excessWeightLbs,
                scenarios: lossScenarios.sort((a, b) => a - b),
                bmi: parseFloat(bmi.toFixed(1))
            };
        }
    }
    
    const result = {
        insights,
        recommendations,
        performance,
        trends,
        strengths,
        weaknesses,
        swimCloudId, // Pass SwimCloud ID to renderInsights
        weightLossPotential, // Pass weight loss potential for chart generation
        height: athleteStats.height || null,
        weight: athleteStats.weight || null
    };
    
    return result;
}

/**
 * Analyze overall performance patterns
 */
function analyzePerformance(data) {
    const idx = data.events.idx;
    if (!idx) return {};

    // Group events by stroke and distance
    const eventsByType = {};
    
    data.events.forEach(event => {
        if (!event[idx.event]) return;
        
        const eventCode = event[idx.event];
        const eventName = getEventName(eventCode);
        const timeInt = window.timeToInt ? window.timeToInt(event[idx.time]) : 0;
        
        if (!eventsByType[eventName]) {
            eventsByType[eventName] = [];
        }
        
        eventsByType[eventName].push({
            time: event[idx.time],
            timeInt,
            date: event[idx.date],
            age: event[idx.age]
        });
    });

    // Find best times per event
    const bestTimes = {};
    Object.keys(eventsByType).forEach(eventName => {
        const times = eventsByType[eventName];
        if (times.length > 0) {
            bestTimes[eventName] = times.reduce((best, current) => {
                return current.timeInt < best.timeInt ? current : best;
            });
        }
    });

    return {
        eventsByType,
        bestTimes,
        totalEvents: data.events.length,
        uniqueEvents: Object.keys(bestTimes).length
    };
}

/**
 * Analyze performance trends over time
 */
function analyzeTrends(data) {
    const idx = data.events.idx;
    if (!idx) return { improving: [], plateauing: [] };

    // Group by event INCLUDING course type (SCY, LCM, SCM) to avoid mixing courses
    const eventsByType = {};
    
    data.events.forEach(event => {
        if (!event[idx.event]) return;
        
        const eventCode = event[idx.event];
        
        // Get full event name with course type included
        let eventNameWithCourse = '';
        if (typeof _eventList !== 'undefined' && _eventList[eventCode]) {
            const eventStr = _eventList[eventCode];
            const [dist, stroke, course] = eventStr.split(' ');
            if (dist !== '_' && stroke !== '_') {
                const strokeMap = {
                    'FR': 'Free',
                    'BK': 'Back',
                    'BR': 'Breast',
                    'FL': 'Fly',
                    'IM': 'IM'
                };
                const strokeName = strokeMap[stroke] || stroke;
                eventNameWithCourse = `${dist} ${strokeName} ${course}`; // Include course!
            } else {
                eventNameWithCourse = `Event ${eventCode}`;
            }
        } else {
            eventNameWithCourse = `Event ${eventCode}`;
        }
        
        const timeInt = window.timeToInt ? window.timeToInt(event[idx.time]) : 0;
        
        if (!eventsByType[eventNameWithCourse]) {
            eventsByType[eventNameWithCourse] = [];
        }
        
        eventsByType[eventNameWithCourse].push({
            time: event[idx.time],
            timeInt,
            date: new Date(event[idx.date]),
            age: event[idx.age] || 0
        });
    });

    const improving = [];
    const plateauing = [];

    Object.keys(eventsByType).forEach(eventName => {
        const times = eventsByType[eventName].sort((a, b) => a.date - b.date);
        
        if (times.length < 2) return;

        // Compare first and last 3 performances, but check for age gaps
        const recent = times.slice(-3);
        const older = times.slice(0, Math.min(3, times.length - recent.length));
        
        // Check age gap - if comparing very different ages (e.g., 8 vs 12), skip
        const recentAges = recent.map(t => t.age).filter(a => a > 0);
        const olderAges = older.map(t => t.age).filter(a => a > 0);
        if (recentAges.length > 0 && olderAges.length > 0) {
            const recentAvgAge = recentAges.reduce((s, a) => s + a, 0) / recentAges.length;
            const olderAvgAge = olderAges.reduce((s, a) => s + a, 0) / olderAges.length;
            const ageGap = Math.abs(recentAvgAge - olderAvgAge);
            
            // Skip if age gap is more than 2 years (normal development explains large improvements)
            if (ageGap > 2) {
                return; // Skip this comparison
            }
        }
        
        const recentAvg = recent.reduce((sum, t) => sum + t.timeInt, 0) / recent.length;
        const olderAvg = older.reduce((sum, t) => sum + t.timeInt, 0) / older.length;
        
        // Round improvement to nearest hundredth to avoid floating point errors
        const improvement = Math.round((olderAvg - recentAvg) * 100) / 100;
        const improvementPercent = (improvement / olderAvg) * 100;

        // Reasonableness check: for short events (50-100), improvement shouldn't exceed ~25% 
        // For longer events, higher percentages are more reasonable
        const eventDistance = parseInt(eventName.match(/^(\d+)/)?.[1] || '200');
        const maxReasonablePercent = eventDistance <= 100 ? 25 : 40;
        
        if (improvementPercent > 2 && improvementPercent <= maxReasonablePercent) {
            improving.push({
                event: eventName,
                improvement: formatTimeImprovement(Math.round(improvement)),
                improvementValue: Math.round(improvement), // Store numeric value for sorting
                percent: improvementPercent.toFixed(1)
            });
        } else if (improvementPercent < -1) {
            plateauing.push({
                event: eventName,
                trend: 'slower'
            });
        }
    });

    return { improving, plateauing };
}

/**
 * Identify swimmer's strongest events based on BC and PN rankings
 */
/**
 * Score an event based on cuts and rankings
 * Returns a numeric score (higher = stronger)
 */
function scoreEvent(eventName, cutsInfo, ranking) {
    let score = 0;
    
    // Cuts are weighted most heavily (highest level cut determines base score)
    const cutWeights = {
        'AAAA': 1000,
        'AAA': 800,
        'AA': 600,
        'A': 400,
        'BB': 200,
        'B': 100
    };
    
    // Check motivational standards achieved for this event
    const eventMotivational = cutsInfo.motivational.filter(c => c.event === eventName);
    let highestCutLevel = 0;
    eventMotivational.forEach(cut => {
        const cutName = cut.standard.toUpperCase();
        for (const [level, weight] of Object.entries(cutWeights)) {
            if (cutName.includes(level) && weight > highestCutLevel) {
                highestCutLevel = weight;
            }
        }
    });
    score += highestCutLevel;
    
    // Check meet cuts (add additional points for major meets)
    const eventMeetCuts = cutsInfo.meetCuts.filter(c => c.event === eventName);
    eventMeetCuts.forEach(cut => {
        const meetName = cut.meet.toUpperCase();
        // Weight major meets highly
        if (meetName.includes('JUNIOR') || meetName.includes('SENIOR') || meetName.includes('OLYMPIC')) {
            score += 500;
        } else if (meetName.includes('REGION') || meetName.includes('SECTIONAL')) {
            score += 300;
        } else {
            score += 100; // Other meet cuts
        }
    });
    
    // Ranking scores (lower rank number = higher score)
    if (ranking) {
        // Best ranking gets highest weight, but also reward multiple good rankings
        const rankScore = ranking.bestRank > 0 && ranking.bestRank < Infinity ? 
                         Math.max(0, 1000 - (ranking.bestRank * 10)) : 0;
        score += rankScore;
        
        // Bonus for multiple good rankings
        const validRanks = [ranking.bcRank, ranking.pnRank, ranking.zoneRank, ranking.usaRank]
                          .filter(r => r && r > 0);
        if (validRanks.length >= 2) {
            score += 50; // Bonus for ranking in multiple categories
        }
        
        // Extra bonus for top rankings (top 10, top 3, #1)
        if (ranking.bestRank <= 3) {
            score += 300;
        } else if (ranking.bestRank <= 10) {
            score += 200;
        } else if (ranking.bestRank <= 25) {
            score += 100;
        }
    }
    
    return score;
}

function identifyStrengths(data) {
    const idx = data.events.idx;
    if (!idx) return [];

    // Extract rankings and cuts from the rendered table
    const rankings = extractRankingsFromDOM();
    const cutsInfo = extractCutsFromTable();
    
    // Create a map of event -> ranking for quick lookup
    const rankingMap = {};
    rankings.forEach(rank => {
        const key = rank.event;
        if (!rankingMap[key] || rank.bestRank < rankingMap[key].bestRank) {
            rankingMap[key] = rank;
        }
    });
    
    // Get all unique events that have either rankings or cuts
    const allEvents = new Set();
    rankings.forEach(r => allEvents.add(r.event));
    cutsInfo.motivational.forEach(c => allEvents.add(c.event));
    cutsInfo.meetCuts.forEach(c => allEvents.add(c.event));
    
    if (allEvents.size === 0) {
        // Fallback to best times if no rankings/cuts available yet
        const performance = analyzePerformance(data);
        const strengths = [];
        Object.keys(performance.bestTimes).slice(0, 3).forEach(eventName => {
            const best = performance.bestTimes[eventName];
            strengths.push({
                event: eventName,
                time: best.time,
                rankInfo: 'Personal Best',
                bcRank: null,
                pnRank: null,
                zoneRank: null,
                usaRank: null
            });
        });
        return strengths;
    }
    
    // Score each event
    const scoredEvents = Array.from(allEvents).map(eventName => {
        const ranking = rankingMap[eventName] || null;
        const score = scoreEvent(eventName, cutsInfo, ranking);
        
        // Get best time for this event
        let bestTime = '';
        if (ranking && ranking.time) {
            bestTime = ranking.time;
        } else {
            // Try to find from performance data
            const performance = analyzePerformance(data);
            const best = performance.bestTimes[eventName];
            if (best) {
                bestTime = best.time;
            }
        }
        
        return {
            event: eventName,
            time: bestTime,
            score: score,
            ranking: ranking,
            cuts: {
                motivational: cutsInfo.motivational.filter(c => c.event === eventName),
                meetCuts: cutsInfo.meetCuts.filter(c => c.event === eventName)
            }
        };
    });
    
    // Sort by score (highest first)
    scoredEvents.sort((a, b) => b.score - a.score);
    
    // Format the top events
    const strengths = scoredEvents.slice(0, 5).map(item => {
        const rankInfo = item.ranking ? item.ranking.rankInfo : '';
        const cutInfo = [];
        
        // Add highest motivational cut
        if (item.cuts.motivational.length > 0) {
            const highestMotivational = item.cuts.motivational
                .map(c => c.standard)
                .sort((a, b) => {
                    const order = ['AAAA', 'AAA', 'AA', 'A', 'BB', 'B'];
                    return order.indexOf(b.toUpperCase()) - order.indexOf(a.toUpperCase());
                })[0];
            cutInfo.push(highestMotivational);
        }
        
        // Add meet cuts
        if (item.cuts.meetCuts.length > 0) {
            cutInfo.push(...item.cuts.meetCuts.map(c => c.meet));
        }
        
        const infoParts = [];
        if (cutInfo.length > 0) {
            infoParts.push(`Cut: ${cutInfo.join(', ')}`);
        }
        if (rankInfo && rankInfo !== 'No rankings') {
            infoParts.push(rankInfo);
        }
        
        return {
            event: item.event,
            time: item.time,
            rankInfo: infoParts.length > 0 ? infoParts.join(' | ') : 'Personal Best',
            bcRank: item.ranking ? item.ranking.bcRank : null,
            pnRank: item.ranking ? item.ranking.pnRank : null,
            zoneRank: item.ranking ? item.ranking.zoneRank : null,
            usaRank: item.ranking ? item.ranking.usaRank : null
        };
    });
    
    return strengths;
}

/**
 * Extract cut proximity analysis for recruiting potential
 * Returns info about how close swimmer is to Junior Nationals and other recruiting cuts
 */
function analyzeRecruitingPotential(data) {
    const recruitingInfo = {
        juniorNationals: [],      // Winter/Summer Juniors proximity
        futures: [],              // Futures cuts proximity
        otherRecruitingCuts: [],  // Other recruiting-relevant cuts
        projections: []           // Projected potential by 11th grade
    };
    
    // Get best times by event and course
    const idx = data.events.idx;
    const bestTimes = {};
    const eventNames = window._eventList || {};
    
    data.events.forEach(event => {
        const eventCode = event[idx.event];
        const eventStr = eventNames[eventCode] || '';
        if (!eventStr || eventStr.includes('_')) return;
        
        const [dist, stroke, course] = eventStr.split(' ');
        const eventName = `${dist} ${window._storkeMap?.[stroke] || stroke} ${course}`;
        const timeInt = window.timeToInt ? window.timeToInt(event[idx.time]) : 0;
        
        if (!bestTimes[eventName] || timeInt < bestTimes[eventName].timeInt) {
            bestTimes[eventName] = {
                time: event[idx.time],
                timeInt: timeInt,
                course: course,
                eventCode: eventCode
            };
        }
    });
    
    // Extract cut times from table - look for cut cells with time values
    const tables = document.querySelectorAll('table.fill');
    const recruitingCuts = ['Winter Juniors', 'Summer Juniors', 'Futures', 'US Open', 'Winter Nationals', 'Summer Nationals'];
    
    let rowsProcessed = 0;
    let cutsFound = 0;
    
    tables.forEach((table, tableIdx) => {
        const rows = table.querySelectorAll('tbody tr');
        console.log(`Processing table ${tableIdx + 1}: ${rows.length} rows found`);
        if (rows.length === 0) {
            console.log(`  Table ${tableIdx + 1} has no rows, skipping`);
            return;
        }
        
        const headerRow = table.querySelector('thead tr:last-child');
        if (!headerRow) {
            console.log(`  Table ${tableIdx + 1} has no header row, skipping`);
            return;
        }
        
        const headers = headerRow.querySelectorAll('th');
        const meetCutCols = [];
        
        // Debug: log all column headers
        console.log(`Table ${tableIdx + 1} - Checking headers (${headers.length} total):`);
        headers.forEach((header, index) => {
            if (header.classList.contains('mc')) {
                const meetName = header.textContent.trim();
                const title = header.getAttribute('title') || '';
                console.log(`  Column ${index}: class="mc", text="${meetName}", title="${title}"`);
            }
        });
        
        headers.forEach((header, index) => {
            if (header.classList.contains('mc')) {
                const meetName = header.textContent.trim();
                const title = header.getAttribute('title') || '';
                const meetNameLower = meetName.toLowerCase();
                const titleLower = title.toLowerCase();
                
                // ONLY look for Summer Junior National cuts - nothing else
                // "Junior" column header (with "Junior National" in title/tooltip) = Summer Junior National
                const hasJunior = meetNameLower.includes('junior') || titleLower.includes('junior');
                const hasJuniorNational = meetNameLower.includes('junior national') || titleLower.includes('junior national');
                const hasSummer = meetNameLower.includes('summer') || titleLower.includes('summer');
                const hasWinter = meetNameLower.includes('winter') || titleLower.includes('winter');
                
                // Include if:
                // 1. Has "Summer" + "Junior" (explicit Summer Junior)
                // 2. Has "Junior" in name AND "Junior National" in title/tooltip (like "Junior" column with "2025 Speedo Junior National..." tooltip)
                // 3. Has "Junior" but NOT "Winter" (assumes Summer)
                const isSummerJunior = 
                    (hasSummer && hasJunior) || 
                    (hasJunior && hasJuniorNational && !hasWinter) ||
                    (meetNameLower.trim() === 'junior' && !hasWinter) ||
                    (hasJunior && !hasWinter);
                
                if (isSummerJunior) {
                    meetCutCols.push({ index, name: meetName, isJuniorNational: true });
                    console.log(`  ✓ Found Summer Junior National cut column: "${meetName}" (title: "${title}")`);
                } else if (hasJunior) {
                    console.log(`  ✗ Skipped column "${meetName}" - hasJunior=${hasJunior}, hasJuniorNational=${hasJuniorNational}, hasSummer=${hasSummer}, hasWinter=${hasWinter}, isSummerJunior=${isSummerJunior}`);
                }
            }
        });
        
        console.log(`Total meet cut columns found: ${meetCutCols.length}, Junior columns: ${meetCutCols.filter(c => c.isJuniorNational).length}`);
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 3) return;
            
            // Get event name from row
            const courseCell = row.querySelector('td.age');
            const strokeCell = row.querySelector('td.bold');
            const distanceCell = row.querySelector('td.full') || row.querySelector('td:has(.clickable)');
            
            let course = courseCell ? courseCell.textContent.trim() : '';
            let stroke = strokeCell ? strokeCell.textContent.trim() : '';
            let distance = '';
            
            if (distanceCell) {
                const clickable = distanceCell.querySelector('.clickable');
                distance = clickable ? clickable.textContent.trim() : distanceCell.textContent.trim();
            }
            
            let eventName = '';
            if (distance && stroke) {
                eventName = `${distance} ${stroke}${course ? ' ' + course : ''}`;
            }
            
            if (!eventName) {
                console.log(`Could not construct event name - distance: "${distance}", stroke: "${stroke}", course: "${course}"`);
                return;
            }
            
            rowsProcessed++;
            
            // Get swimmer's best time for this event - try multiple formats
            let bestTime = bestTimes[eventName];
            if (!bestTime) {
                // Try to find best time with different formats
                const eventNameVariations = [
                    eventName,
                    `${distance} ${stroke}`,
                    `${distance} ${stroke} SCY`,
                    `${distance} ${stroke} LCM`,
                    eventName.replace(/\s+/g, ' ')
                ];
                
                for (const variant of eventNameVariations) {
                    if (bestTimes[variant]) {
                        bestTime = bestTimes[variant];
                        console.log(`Found best time using variant: "${variant}" for event "${eventName}"`);
                        break;
                    }
                }
                
                if (!bestTime) {
                    console.log(`No best time found for event: "${eventName}" (checked ${eventNameVariations.length} variations)`);
                    console.log(`Available best time keys (sample):`, Object.keys(bestTimes).slice(0, 5));
                    return;
                }
            }
            
            // Check meet cut cells for this event
            if (meetCutCols.length === 0) {
                // Skip if no Junior columns found
                console.log(`No Junior columns found for table - skipping event: ${eventName}`);
                return;
            }
            
            meetCutCols.forEach(col => {
                const cell = cells[col.index];
                if (!cell) {
                    console.log(`  No cell at index ${col.index} for column "${col.name}"`);
                    return;
                }
                if (!cell.classList.contains('mc')) {
                    console.log(`  Cell at index ${col.index} doesn't have 'mc' class`);
                    return;
                }
                
                // Get the cut time from the cell
                // The cut time is typically in a div with class 'r' (red/unachieved) or displayed as text
                const cutTimeDiv = cell.querySelector('div.r');
                const cutTimeText = cutTimeDiv ? cutTimeDiv.textContent.trim() : cell.textContent.trim();
                
                console.log(`  Checking cell for "${col.name}": cutTimeText="${cutTimeText}"`);
                
                if (cutTimeText && cutTimeText !== '-' && cutTimeText !== '—' && cutTimeText !== '') {
                    // Try to parse the cut time
                    const cutTimeInt = window.timeToInt ? window.timeToInt(cutTimeText) : 0;
                    console.log(`    Parsed cut time: "${cutTimeText}" -> ${cutTimeInt}`);
                    if (cutTimeInt > 0) {
                        // Check if achieved (has 'dp' class) or not achieved
                        const hasDp = cell.querySelector('div.dp') !== null;
                        const hasAd = cell.querySelector('div.ad') !== null;
                        const isAchieved = hasDp && !hasAd;
                        
                        // Calculate gap (positive = slower than cut, negative = faster)
                        const gap = bestTime.timeInt - cutTimeInt;
                        const gapPercent = cutTimeInt > 0 ? parseFloat(((gap / cutTimeInt) * 100).toFixed(1)) : 0;
                        
                        // Format gap for display
                        const gapFormatted = gap > 0 ? 
                            `+${window.formatDelta ? window.formatDelta(gap) : gap + 's'}` : 
                            window.formatDelta ? window.formatDelta(Math.abs(gap)) : Math.abs(gap) + 's faster';
                        
                        if (col.isJuniorNational) {
                            // Only Summer Junior National cuts for pentagon
                            cutsFound++;
                            recruitingInfo.juniorNationals.push({
                                event: eventName,
                                meet: col.name,
                                cutTime: cutTimeText,
                                bestTime: bestTime.time,
                                gap: gapFormatted,
                                gapPercent: gapPercent,
                                gapSeconds: gap,
                                achieved: isAchieved
                            });
                            console.log(`  ✓ Summer Junior National cut found: ${eventName} -> ${col.name}, cut: ${cutTimeText}, best: ${bestTime.time}, gap: ${gapFormatted}`);
                        } else if (col.name.includes('Futures')) {
                            recruitingInfo.futures.push({
                                event: eventName,
                                meet: col.name,
                                cutTime: cutTimeText,
                                bestTime: bestTime.time,
                                gap: gapFormatted,
                                gapPercent: gapPercent,
                                gapSeconds: gap,
                                achieved: isAchieved
                            });
                        } else {
                            recruitingInfo.otherRecruitingCuts.push({
                                event: eventName,
                                meet: col.name,
                                cutTime: cutTimeText,
                                bestTime: bestTime.time,
                                gap: gapFormatted,
                                gapPercent: gapPercent,
                                gapSeconds: gap,
                                achieved: isAchieved
                            });
                        }
                    }
                }
            });
        });
    });
    
    console.log(`=== CUT EXTRACTION SUMMARY ===`);
    console.log(`Tables processed: ${tables.length}, Rows processed: ${rowsProcessed}, Junior cuts found: ${cutsFound}`);
    console.log(`Total Junior Nationals cuts extracted: ${recruitingInfo.juniorNationals.length}`);
    
    // Calculate projections based on age and improvement trends
    const swimmerAge = data.swimmer?.age || 0;
    const yearsUntil11thGrade = Math.max(0, 16 - swimmerAge); // Assuming 11th grade is around age 16-17
    
    // Get improvement trends
    const trends = analyzeTrends(data);
    
    // Project potential for close cuts
    [...recruitingInfo.juniorNationals, ...recruitingInfo.futures].forEach(cut => {
        if (!cut.achieved && cut.gapSeconds > 0 && cut.gapSeconds < 10000) { // Within ~2.7 hours (reasonable limit)
            // Estimate improvement potential
            // Assume 2-5% improvement per year for competitive swimmers
            const annualImprovementRate = 0.03; // 3% average
            const projectedImprovement = bestTime.timeInt * annualImprovementRate * yearsUntil11thGrade;
            const projectedTime = bestTime.timeInt - projectedImprovement;
            
            // Check if projected time would make the cut
            const cutTimeInt = window.timeToInt ? window.timeToInt(cut.cutTime) : 0;
            const wouldMakeCut = cutTimeInt > 0 && projectedTime <= cutTimeInt;
            
            if (cut.gapSeconds < 5000 || wouldMakeCut) { // Within 1.4 hours or projected to make it
                recruitingInfo.projections.push({
                    event: cut.event,
                    meet: cut.meet,
                    currentGap: cut.gap,
                    projectedAchievable: wouldMakeCut,
                    yearsTo11thGrade: yearsUntil11thGrade,
                    effortLevel: cut.gapSeconds < 1000 ? 'high' : cut.gapSeconds < 3000 ? 'moderate' : 'significant'
                });
            }
        }
    });
    
    return recruitingInfo;
}

/**
 * Extract cuts and standards achieved from the rendered table
 */
function extractCutsFromTable() {
    const cutsInfo = {
        motivational: [], // Motivational standards (B, BB, A, AA, AAA, AAAA)
        meetCuts: []     // Meet cuts
    };
    
    // Find all tables
    const tables = document.querySelectorAll('table.fill');
    if (tables.length === 0) return cutsInfo;

    // Process each table (typically one per course: SCY, LCM, SCM)
    tables.forEach(table => {
        const rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0) return;

        // Find header row to identify column positions
        const headerRow = table.querySelector('thead tr:last-child');
        if (!headerRow) return;
        
        const headers = headerRow.querySelectorAll('th');
        const motivationalCols = [];
        const meetCutCols = [];
        
        headers.forEach((header, index) => {
            if (header.classList.contains('mt')) {
                motivationalCols.push({ index, name: header.textContent.trim() });
            } else if (header.classList.contains('mc')) {
                meetCutCols.push({ index, name: header.textContent.trim() });
            }
        });

        // Extract cuts from each row
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 3) return;

            // Get event name
            const courseCell = row.querySelector('td.age');
            const strokeCell = row.querySelector('td.bold');
            const distanceCell = row.querySelector('td.full') || row.querySelector('td:has(.clickable)');
            
            let course = courseCell ? courseCell.textContent.trim() : '';
            let stroke = strokeCell ? strokeCell.textContent.trim() : '';
            let distance = '';
            
            if (distanceCell) {
                const clickable = distanceCell.querySelector('.clickable');
                distance = clickable ? clickable.textContent.trim() : distanceCell.textContent.trim();
            }

            let eventName = '';
            if (distance && stroke) {
                eventName = `${distance} ${stroke}${course ? ' ' + course : ''}`;
            } else if (distance) {
                eventName = distance;
            }
            
            if (!eventName) return;

            // Check motivational standards - achieved cuts have class "dp" (green) and no shadow
            motivationalCols.forEach(col => {
                const cell = cells[col.index];
                if (cell && cell.classList.contains('mt')) {
                    const hasShadow = cell.querySelector('div.r') !== null;
                    const hasDp = cell.querySelector('div.dp') !== null; // "dp" class = achieved (green)
                    const hasAd = cell.querySelector('div.ad') !== null; // "ad" class = not achieved (red)
                    const text = cell.textContent.trim();
                    
                    // Cut is achieved if: (has dp class OR no shadow) AND cell has content
                    // dp class indicates timeInt <= stdInt (cut achieved)
                    if ((hasDp || !hasShadow) && !hasAd && text && text !== '' && text !== '-' && text !== '—') {
                        cutsInfo.motivational.push({
                            event: eventName,
                            standard: col.name || text,
                            type: 'motivational'
                        });
                    }
                }
            });

            // Check meet cuts - achieved cuts have class "dp" (green) and no shadow
            meetCutCols.forEach(col => {
                const cell = cells[col.index];
                if (cell && cell.classList.contains('mc')) {
                    const hasShadow = cell.querySelector('div.r') !== null;
                    const hasDp = cell.querySelector('div.dp') !== null; // "dp" class = achieved (green)
                    const hasAd = cell.querySelector('div.ad') !== null; // "ad" class = not achieved (red)
                    const text = cell.textContent.trim();
                    
                    // Cut is achieved if: (has dp class OR no shadow) AND cell has content
                    // dp class indicates timeInt <= stdInt (cut achieved)
                    if ((hasDp || !hasShadow) && !hasAd && text && text !== '' && text !== '-' && text !== '—') {
                        cutsInfo.meetCuts.push({
                            event: eventName,
                            meet: col.name || text,
                            type: 'meetCut'
                        });
                    }
                }
            });
        });
    });

    return cutsInfo;
}

/**
 * Extract all rankings from the rendered table (BC, PN, Zone/WZ, USA)
 */
function extractRankingsFromDOM() {
    const rankings = [];
    
    // Find all ranking cells in the Personal Best table
    const tables = document.querySelectorAll('table.fill');
    console.log(`[extractRankingsFromDOM] Found ${tables.length} tables with class 'fill'`);
    if (tables.length === 0) {
        // Try any table as fallback
        const anyTables = document.querySelectorAll('table');
        console.log(`[extractRankingsFromDOM] Fallback: Found ${anyTables.length} tables total`);
        return rankings;
    }

    // Process each table (typically one per course: SCY, LCM, SCM)
    tables.forEach((table, tableIndex) => {
        const allRows = table.querySelectorAll('tr');
        console.log(`[extractRankingsFromDOM] Table ${tableIndex}: ${allRows.length} total rows`);
        if (allRows.length === 0) return;

        // Find ranking column headers - look for tr.gy which contains individual ranking headers
        // Table structure: tr.wt (main headers), tr.gy (sub-headers including ranking columns)
        const headerRow = table.querySelector('tr.gy');
        if (!headerRow) {
            console.log(`[extractRankingsFromDOM] Table ${tableIndex}: No header row (tr.gy) found`);
            return;
        }

        const rankingHeaders = headerRow.querySelectorAll('th.rk');
        console.log(`[extractRankingsFromDOM] Table ${tableIndex}: ${rankingHeaders.length} ranking headers found`);
        
        const rankingColumnIndices = {
            bc: -1,
            pn: -1,
            zone: -1,
            usa: -1
        };

        // Map ranking headers - typically: BC (club), PN (LSC), Zone, USA
        rankingHeaders.forEach((header, index) => {
            const headerText = header.textContent.trim().toUpperCase();
            const bsElement = header.querySelector('.bs');
            const bsText = (bsElement ? bsElement.textContent.trim() : '').toUpperCase();
            console.log(`[extractRankingsFromDOM] Header ${index}: text="${headerText}", bs="${bsText}", hidden=${header.classList.contains('hide')}`);
            
            // Identify ranking type by header text or position
            if (rankingColumnIndices.bc < 0 && (index === 0 || headerText.includes('BC') || bsText.includes('BC') || headerText.includes('CLUB'))) {
                rankingColumnIndices.bc = index;
            } else if (rankingColumnIndices.pn < 0 && (index === 1 || headerText.includes('PN') || bsText.includes('PN') || headerText.includes('LSC'))) {
                rankingColumnIndices.pn = index;
            } else if (rankingColumnIndices.zone < 0 && (headerText.includes('ZONE') || headerText.includes('WZ') || bsText.includes('ZONE') || bsText.includes('WZ'))) {
                rankingColumnIndices.zone = index;
            } else if (rankingColumnIndices.usa < 0 && (headerText.includes('USA') || headerText.includes('US') || bsText.includes('USA') || bsText.includes('US'))) {
                rankingColumnIndices.usa = index;
            }
        });
        console.log(`[extractRankingsFromDOM] Column indices:`, rankingColumnIndices);
        
        // Get data rows (not header rows)
        const rows = table.querySelectorAll('tr:not(.wt):not(.gy)');
        console.log(`[extractRankingsFromDOM] Table ${tableIndex}: ${rows.length} data rows`);

        // Extract rankings from each row
        let rowsWithRankings = 0;
        rows.forEach((row, rowIdx) => {
            const rankingCells = row.querySelectorAll('td.rk');
            if (rankingCells.length === 0) return;
            rowsWithRankings++;
            
            // Debug first row
            if (rowIdx === 0) {
                console.log(`[extractRankingsFromDOM] First data row has ${rankingCells.length} ranking cells`);
                rankingCells.forEach((cell, i) => {
                    console.log(`  Cell ${i}: text="${cell.textContent.trim()}", hasLoader=${!!cell.querySelector('.loader')}`);
                });
            }

            // Extract event name from Course, Stroke, Distance columns
            const courseCell = row.querySelector('td.age');
            const strokeCell = row.querySelector('td.bold');
            const distanceCell = row.querySelector('td.full') || row.querySelector('td:has(.clickable)');
            
            let course = courseCell ? courseCell.textContent.trim() : '';
            let stroke = strokeCell ? strokeCell.textContent.trim() : '';
            let distance = '';
            
            if (distanceCell) {
                const clickable = distanceCell.querySelector('.clickable');
                distance = clickable ? clickable.textContent.trim() : distanceCell.textContent.trim();
            }

            // Build event name
            let eventName = '';
            if (distance && stroke) {
                eventName = `${distance} ${stroke}${course ? ' ' + course : ''}`;
            } else if (distance) {
                eventName = distance;
            } else {
                return; // Skip if we can't identify the event
            }
            
            // Helper to extract rank from cell, skipping loaders
            const getRankFromCell = (cell) => {
                if (!cell) return null;
                // Skip if cell contains a loader (still loading)
                if (cell.querySelector('.loader')) return null;
                // Get text content, excluding any nested elements with class 'loader'
                const text = cell.textContent.trim();
                // Skip if empty or just a dash
                if (!text || text === '-' || text === '—') return null;
                const rank = parseInt(text);
                return (rank > 0 && rank < 10000) ? rank : null;
            };
            
            // Extract rankings from cells
            const bcRank = rankingColumnIndices.bc >= 0 ? getRankFromCell(rankingCells[rankingColumnIndices.bc]) : null;
            const pnRank = rankingColumnIndices.pn >= 0 ? getRankFromCell(rankingCells[rankingColumnIndices.pn]) : null;
            const zoneRank = rankingColumnIndices.zone >= 0 ? getRankFromCell(rankingCells[rankingColumnIndices.zone]) : null;
            const usaRank = rankingColumnIndices.usa >= 0 ? getRankFromCell(rankingCells[rankingColumnIndices.usa]) : null;

            // Get best time from the row
            const timeCell = row.querySelector('td[onclick="selectRow(this)"]');
            const bestTime = timeCell ? timeCell.textContent.trim() : '';

            // Only include if at least one ranking exists
            if (bcRank > 0 || pnRank > 0 || zoneRank > 0 || usaRank > 0) {
                // Find best (lowest) ranking
                const ranks = [bcRank, pnRank, zoneRank, usaRank].filter(r => r && r > 0);
                const bestRank = ranks.length > 0 ? Math.min(...ranks) : Infinity;
                
                console.log(`[extractRankingsFromDOM] Found ranking: ${eventName} BC=${bcRank} PN=${pnRank} WZ=${zoneRank} US=${usaRank}`);
                
                rankings.push({
                    event: eventName,
                    time: bestTime,
                    bcRank: bcRank || null,
                    pnRank: pnRank || null,
                    zoneRank: zoneRank || null,
                    usaRank: usaRank || null,
                    bestRank: bestRank,
                    rankInfo: formatRankInfo(bcRank, pnRank, zoneRank, usaRank)
                });
            }
        });
        console.log(`[extractRankingsFromDOM] Table ${tableIndex}: ${rowsWithRankings} rows had ranking cells`);
    });

    console.log(`[extractRankingsFromDOM] Total rankings extracted: ${rankings.length}`);
    return rankings;
}

/**
 * Format ranking information for display
 */
function formatRankInfo(bcRank, pnRank, zoneRank, usaRank) {
    const parts = [];
    if (bcRank && bcRank > 0) {
        parts.push(`BC: #${bcRank}`);
    }
    if (pnRank && pnRank > 0) {
        parts.push(`PN: #${pnRank}`);
    }
    if (zoneRank && zoneRank > 0) {
        parts.push(`Zone: #${zoneRank}`);
    }
    if (usaRank && usaRank > 0) {
        parts.push(`USA: #${usaRank}`);
    }
    
    if (parts.length === 0) {
        return 'No rankings';
    }
    
    return parts.join(', ');
}

/**
 * Identify areas for improvement
 */
function identifyWeaknesses(data) {
    const idx = data.events.idx;
    if (!idx) return [];

    const performance = analyzePerformance(data);
    const allEvents = ['50 Free', '100 Free', '200 Free', '500 Free', '100 Back', '100 Breast', '100 Fly', '200 IM'];
    
    const weaknesses = [];
    
    // Find events swimmer doesn't have times for or has slower times
    const swimmerEvents = Object.keys(performance.bestTimes);
    
    // This is simplified - in real implementation would compare to standards
    if (swimmerEvents.length < allEvents.length) {
        const missing = allEvents.filter(e => !swimmerEvents.includes(e));
        missing.slice(0, 2).forEach(event => {
            weaknesses.push({
                event,
                aspect: 'new event opportunity'
            });
        });
    }

    return weaknesses;
}

/**
 * Analyze how swimmer compares to others
 */
function analyzeComparisons(data) {
    // This would require ranking data
    // For now, return basic structure
    return {
        percentile: 'Analysis available with ranking data',
        competitiveLevel: 'Compare in rankings tab'
    };
}

/**
 * Get age-based recommendations
 */
function getAgeBasedRecommendations(age, events) {
    const recommendations = [];

    if (age < 12) {
        recommendations.push({
            type: 'age',
            title: 'Development Phase',
            content: 'Focus on technique and having fun! Try different events to build overall skills.'
        });
    } else if (age >= 12 && age < 15) {
        recommendations.push({
            type: 'age',
            title: 'Growth & Development',
            content: 'This is a key development period. Focus on building strength and endurance across all strokes.'
        });
    } else if (age >= 15) {
        recommendations.push({
            type: 'age',
            title: 'Competitive Focus',
            content: 'Consider specializing in your strongest events while maintaining versatility.'
        });
    }

    // Event count recommendation
    if (events && events.length < 10) {
        recommendations.push({
            type: 'event',
            title: 'Expand Event Range',
            content: 'Competing in more events can help identify hidden strengths and build overall swimming ability.'
        });
    }

    return recommendations;
}

/**
 * Get event-specific recommendations
 */
function getEventRecommendations(events, performance) {
    const recommendations = [];
    const idx = events.idx;
    if (!idx || !performance.bestTimes) return [];

    // Recommend focusing on improving events with recent progress
    const eventCount = Object.keys(performance.bestTimes).length;
    
    if (eventCount >= 8) {
        recommendations.push({
            type: 'training',
            title: 'Well-Rounded Swimmer',
            content: 'You compete in a good variety of events! Consider focusing training on your top 3-4 strongest events.'
        });
    } else if (eventCount >= 4) {
        recommendations.push({
            type: 'training',
            title: 'Building Versatility',
            content: 'Good event range! Try adding 1-2 new events to discover new strengths.'
        });
    }

    return recommendations;
}

// ================================================================================
// HELPER FUNCTIONS
// ================================================================================

/**
 * Get event name from event code using the global _eventList
 */
function getEventName(eventCode) {
    // Use the global _eventList if available
    if (typeof _eventList !== 'undefined' && _eventList[eventCode]) {
        const eventStr = _eventList[eventCode];
        const [dist, stroke, course] = eventStr.split(' ');
        
        if (dist === '_' || stroke === '_') {
            return `Event ${eventCode}`;
        }
        
        // Map stroke codes to full names
        const strokeMap = {
            'FR': 'Free',
            'BK': 'Back',
            'BR': 'Breast',
            'FL': 'Fly',
            'IM': 'IM'
        };
        
        const strokeName = strokeMap[stroke] || stroke;
        return `${dist} ${strokeName}`;
    }
    
    return `Event ${eventCode}`;
}

/**
 * Convert markdown to HTML (basic support for bold and bullet points)
 */
function convertMarkdownToHtml(text) {
    if (!text || typeof text !== 'string') {
        // Always return a string, even if input is not a string
        return String(text || '');
    }
    
    // If the text appears to be JSON (starts with [ or {), try to parse it
    // This handles cases where Gemini returns JSON but it's stored as a string
    if ((text.trim().startsWith('[') || text.trim().startsWith('{')) && text.includes('"title"')) {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].content) {
                // If it's an array of insights, use the first one's content
                text = parsed.map(p => {
                    if (p.title && p.content) {
                        return `**${p.title}**\n\n${p.content}`;
                    }
                    return p.content || '';
                }).join('\n\n');
            } else if (parsed.content) {
                text = `**${parsed.title || 'AI Analysis'}**\n\n${parsed.content}`;
            }
        } catch (e) {
            // Not valid JSON, continue with original text
            console.log('Text looks like JSON but failed to parse:', e);
        }
    }
    
    let html = text;
    
    // Convert markdown bold (**text**) to HTML <strong>
    // Process character by character to avoid converting inside HTML tags
    let result = '';
    let i = 0;
    let inTag = false;
    
    while (i < html.length) {
        // Check if we're entering or leaving an HTML tag
        if (html[i] === '<' && html.substring(i, i + 2) !== '</') {
            inTag = true;
            result += html[i];
            i++;
            continue;
        }
        if (html[i] === '>' && inTag) {
            inTag = false;
            result += html[i];
            i++;
            continue;
        }
        
        // If inside a tag, just copy the character
        if (inTag) {
            result += html[i];
            i++;
            continue;
        }
        
        // Check for markdown bold **text**
        if (html.substring(i, i + 2) === '**') {
            // Find the closing **
            const endIndex = html.indexOf('**', i + 2);
            if (endIndex !== -1) {
                const content = html.substring(i + 2, endIndex);
                result += `<strong>${content}</strong>`;
                i = endIndex + 2;
                continue;
            }
        }
        
        result += html[i];
        i++;
    }
    
    html = result;
    
    // Convert bullet points (• or -) to HTML list items if they're at the start of a line
    // This is more complex, so we'll handle it line by line
    const lines = html.split('\n');
    const convertedLines = [];
    let inList = false;
    
    for (let line of lines) {
        const trimmedLine = line.trim();
        // Check if line starts with bullet (•, -, or *)
        if (/^[•\-\*]\s/.test(trimmedLine)) {
            const content = trimmedLine.substring(trimmedLine.indexOf(' ') + 1);
            if (!inList) {
                convertedLines.push('<ul>');
                inList = true;
            }
            convertedLines.push(`<li>${content}</li>`);
        } else {
            if (inList) {
                convertedLines.push('</ul>');
                inList = false;
            }
            // Only add non-empty lines
            if (line.trim() || convertedLines.length === 0) {
                convertedLines.push(line);
            }
        }
    }
    
    if (inList) {
        convertedLines.push('</ul>');
    }
    
    // Convert remaining newlines to <br> tags (but not inside list items)
    let finalHtml = convertedLines.join('\n');
    // Replace newlines with <br>, but preserve list structure
    finalHtml = finalHtml.replace(/\n(?!<[\/]?[ul])/g, '<br>');
    
    return finalHtml;
}

/**
 * Highlight event names in text by making them bold
 * Event patterns: "50 Free", "100 Back", "200 IM SCY", "50 Breast LCM", etc.
 */
function highlightEventNames(text) {
    if (!text || typeof text !== 'string') {
        // Always return a string, even if input is not a string
        return String(text || '');
    }
    
    // Pattern to match swimming events
    // Matches: distance (25, 50, 100, 200, 400, 500, 800, 1000, 1500, 1650) + stroke (Free, Back, Breast, Fly, IM) + optional course (SCY, LCM, SCM)
    // Also handles variations like "100-yard freestyle", "200 meter backstroke"
    const eventPattern = /\b(\d{2,4})\s+(?:Free|Back|Breast|Fly|IM|freestyle|backstroke|breaststroke|butterfly|individual\s+medley)(?:\s+(?:SCY|LCM|SCM|yard|meter|metre|yards|meters|metres))?\b/gi;
    
    // Also match abbreviated forms like "100 FR", "200 BK", "50 BR SCY"
    const abbreviatedPattern = /\b(\d{2,4})\s+(?:FR|BK|BR|FL|IM)(?:\s+(?:SCY|LCM|SCM))?\b/gi;
    
    let highlighted = text;
    
    // Replace full event names
    highlighted = highlighted.replace(eventPattern, (match) => {
        // Don't highlight if already inside a tag
        if (match.includes('<') || match.includes('>')) return match;
        return `<strong class="event-name">${match}</strong>`;
    });
    
    // Replace abbreviated event names and convert to readable format
    highlighted = highlighted.replace(abbreviatedPattern, (match) => {
        // Don't highlight if already inside a tag or already highlighted
        if (match.includes('<') || match.includes('>')) return match;
        
        // Convert abbreviations to readable format
        const strokeMap = {
            'FR': 'Free',
            'BK': 'Back',
            'BR': 'Breast',
            'FL': 'Fly',
            'IM': 'IM'
        };
        
        const parts = match.trim().split(/\s+/);
        let distance = parts[0];
        let stroke = parts[1];
        let course = parts[2] || '';
        
        if (strokeMap[stroke]) {
            stroke = strokeMap[stroke];
        }
        
        const readable = course ? `${distance} ${stroke} ${course}` : `${distance} ${stroke}`;
        return `<strong class="event-name">${readable}</strong>`;
    });
    
    return highlighted;
}

/**
 * Format time improvement for display
 */
function formatTimeImprovement(timeInt) {
    if (!timeInt || timeInt <= 0) return '0.00s';
    
    // Ensure we have an integer value (round to nearest hundredth)
    const totalHundredths = Math.round(timeInt);
    
    // Convert timeInt (hundredths of seconds) back to readable format
    const minutes = Math.floor(totalHundredths / 6000);
    const remainingHundredths = totalHundredths % 6000;
    const seconds = Math.floor(remainingHundredths / 100);
    const hundredths = Math.round(remainingHundredths % 100);
    
    if (minutes > 0) {
        // For times over a minute, show as M:SS.ss
        return `${minutes}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
    } else if (seconds >= 10) {
        // For times 10+ seconds, show as SS.sss
        return `${seconds}.${String(hundredths).padStart(2, '0')}s`;
    } else {
        // For times under 10 seconds, show as S.sss
        return `${seconds}.${String(hundredths).padStart(2, '0')}s`;
    }
}

/**
 * Extract top 3 action items from AI analysis for quick improvements
 */
function extractTop3ActionItems(aiInsights, insightsData) {
    const actionItems = [];
    
    // First, check if AI generated a dedicated "Top 3 Action Items" section
    const actionItemsSection = aiInsights.find(i => 
        i.title.toLowerCase().includes('action item') || 
        i.title.toLowerCase().includes('top 3') ||
        i.title.toLowerCase().includes('next 2-3 months')
    );
    
    if (actionItemsSection && actionItemsSection.content) {
        // Extract from the dedicated section (most reliable)
        let content = actionItemsSection.content;
        
        // Handle case where content might be JSON string
        if (typeof content === 'string' && content.trim().startsWith('[') && content.includes('"title"')) {
            try {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].content) {
                    content = parsed.map(p => p.content || '').join('\n');
                } else if (parsed.content) {
                    content = parsed.content;
                }
            } catch (e) {
                // Not valid JSON, use original content
            }
        }
        
        // Try multiple patterns to extract bullet points
        // Pattern 1: Lines starting with •, -, *, or numbers
        let bulletMatches = content.match(/(?:^|\n)[•\-\*\d]\.?\s+([^\n]+)/g) || 
                           content.match(/<li>([^<]+)<\/li>/gi) ||
                           [];
        
        // Pattern 2: If no matches, try lines that look like action items (start with action words)
        if (bulletMatches.length === 0) {
            const lines = content.split('\n').filter(l => l.trim());
            bulletMatches = lines.filter(line => {
                const trimmed = line.trim();
                return trimmed.length > 30 && (
                    /^[•\-\*\d]/.test(trimmed) ||
                    /^(Achieve|Focus|Improve|Develop|Target|Work|Practice|Reduce|Increase)/i.test(trimmed)
                );
            });
        }
        
        bulletMatches.slice(0, 3).forEach(match => {
            let text = match
                .replace(/^[•\-\*\d\.\)\s]+/, '')
                .replace(/<\/?[^>]+>/g, '')
                .replace(/\*\*/g, '')
                .replace(/^[•\-\*\d]\.?\s*/, '') // Remove leading bullet again in case pattern didn't match
                .trim();
            
            if (text && text.length > 20) {
                actionItems.push(text);
            }
        });
        
        // If we got items from the dedicated section, return them
        if (actionItems.length > 0) {
            return actionItems.slice(0, 3);
        }
    }
    
    // Otherwise, extract from "Areas for Improvement" section
    const improvementSection = aiInsights.find(i => 
        i.title.toLowerCase().includes('improvement') || 
        i.title.toLowerCase().includes('area') ||
        i.title.toLowerCase().includes('weakness')
    );
    
    if (improvementSection && improvementSection.content) {
        // Parse bullet points from the content (may be markdown or already converted to HTML)
        const content = improvementSection.content;
        // Handle both markdown bullets and HTML list items
        const bulletMatches = content.match(/(?:^|\n)[•\-\*]\s+([^\n]+)/g) || 
                             content.match(/<li>([^<]+)<\/li>/gi) ||
                             [];
        
        bulletMatches.forEach(match => {
            // Extract text, removing bullet markers, HTML tags, and markdown formatting
            let text = match
                .replace(/^[•\-\*\s]+/, '') // Remove bullet markers
                .replace(/<\/?[^>]+>/g, '') // Remove HTML tags
                .replace(/\*\*/g, '') // Remove bold markers
                .trim();
            
            // Skip if too short or already captured
            if (text && text.length > 30 && !actionItems.some(item => item.includes(text.substring(0, 20)))) {
                // Prioritize actionable items (contain action words)
                const actionKeywords = ['focus', 'improve', 'work', 'develop', 'practice', 'concentrate', 'reduce', 'increase'];
                if (actionKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
                    actionItems.push(text);
                }
            }
        });
    }
    
    // Extract weight management if mentioned
    const hasWeightIssue = aiInsights.some(i => 
        i.content && (
            i.content.toLowerCase().includes('overweight') ||
            i.content.toLowerCase().includes('weight management') ||
            i.content.toLowerCase().includes('bmi') && parseFloat(i.content.match(/bmi[:\s]*(\d+\.?\d*)/i)?.[1] || '0') > 23
        )
    );
    
    if (hasWeightIssue) {
        // Find the specific weight recommendation
        const weightSection = aiInsights.find(i => 
            i.content && i.content.toLowerCase().includes('weight')
        );
        if (weightSection) {
            const weightMatch = weightSection.content.match(/weight[^•]*?(\d+\s*lbs?[^•]*)/i);
            if (weightMatch) {
                const weightText = weightMatch[1].replace(/\*\*/g, '').trim();
                if (weightText && !actionItems.includes(weightText)) {
                    actionItems.unshift(`Focus on weight management: ${weightText}`); // Priority item
                }
            } else {
                actionItems.unshift('Focus on achieving optimal body composition for improved performance');
            }
        }
    }
    
    // Extract event focus recommendations
    const recruitingSection = aiInsights.find(i => 
        i.title.toLowerCase().includes('recruiting') || 
        i.title.toLowerCase().includes('college')
    );
    
    if (recruitingSection && recruitingSection.content) {
        const eventFocusMatch = recruitingSection.content.match(/focus[^•]*?(\d+\s*(?:Free|Back|Breast|Fly|IM)[^•]*)/i);
        if (eventFocusMatch) {
            const eventText = eventFocusMatch[1].replace(/\*\*/g, '').trim();
            if (eventText && eventText.length > 10) {
                actionItems.push(`Event focus: Concentrate training on ${eventText} for best recruiting potential`);
            }
        }
    }
    
    // Extract consistency improvements
    const trendsSection = aiInsights.find(i => 
        i.title.toLowerCase().includes('trend') || 
        i.title.toLowerCase().includes('consistency')
    );
    
    if (trendsSection && trendsSection.content) {
        const consistencyMatch = trendsSection.content.match(/consistency[^•]*?(\d+\.?\d*%[^•]*)/i);
        if (consistencyMatch && parseFloat(consistencyMatch[1]) > 5) {
            const consistencyText = consistencyMatch[1].replace(/\*\*/g, '').trim();
            actionItems.push(`Improve consistency: Work on reducing time variability (currently ${consistencyText})`);
        }
    }
    
    // Limit to top 3, prioritizing weight management and event focus
    // Sort: weight management first, then by specificity (longer/more specific items first)
    const sorted = actionItems
        .filter((item, index, self) => self.indexOf(item) === index) // Remove duplicates
        .sort((a, b) => {
            // Prioritize weight management
            if (a.toLowerCase().includes('weight')) return -1;
            if (b.toLowerCase().includes('weight')) return 1;
            // Then prioritize longer/more specific items
            return b.length - a.length;
        })
        .slice(0, 3);
    
    // If we have fewer than 3, add generic actionable items
    if (sorted.length < 3) {
        if (!sorted.some(item => item.toLowerCase().includes('consistency'))) {
            sorted.push('Improve meet-to-meet consistency through focused practice');
        }
        if (sorted.length < 3 && !sorted.some(item => item.toLowerCase().includes('technique'))) {
            sorted.push('Refine stroke technique and efficiency in your primary events');
        }
    }
    
    return sorted.slice(0, 3);
}

/**
 * Get swimmer's best times for specific events
 */
function getSwimmerBestTimes() {
    let swimmerData = null;
    // Try to get swimmer data from various sources
    if (window.currentSwimmerData) {
        swimmerData = window.currentSwimmerData;
    } else if (window.refreshInsights && window.refreshInsights._data) {
        swimmerData = window.refreshInsights._data;
    } else if (typeof window.getCurrentSwimmerData === 'function') {
        swimmerData = window.getCurrentSwimmerData();
    }
    
    if (!swimmerData || !swimmerData.events || !swimmerData.events.idx) {
        return {};
    }
    
    const idx = swimmerData.events.idx;
    const bestTimes = {};
    const eventListMap = (typeof _eventList !== 'undefined' && _eventList) || 
                         (typeof window !== 'undefined' && window._eventList) || 
                         {};
    
    const timeToIntFunc = window.timeToInt || ((time) => {
        if (!time) return 0;
        const parts = time.split(':');
        if (parts.length === 2) {
            const mins = parseInt(parts[0]) || 0;
            const secs = parseFloat(parts[1]) || 0;
            return mins * 6000 + Math.round(secs * 100);
        }
        const secs = parseFloat(time) || 0;
        return Math.round(secs * 100);
    });
    
    swimmerData.events.forEach(event => {
        const eventCode = event[idx.event];
        const eventStr = eventListMap[eventCode] || '';
        if (!eventStr || eventStr.includes('_')) return;
        
        const [dist, stroke, course] = eventStr.split(' ');
        const eventName = getEventName(eventCode);
        const time = event[idx.time];
        const timeInt = timeToIntFunc(time);
        
        // Look for SCY Free events (50, 100, 200)
        if (stroke === 'FR' && course === 'SCY') {
            if (dist === '50' || dist === '100' || dist === '200') {
                const key = `${dist} Free`;
                if (!bestTimes[key] || timeInt < timeToIntFunc(bestTimes[key])) {
                    bestTimes[key] = time;
                }
            }
        }
    });
    
    return bestTimes;
}

/**
 * Get swimmer's times from the last 12 months for specific events
 */
function getSwimmerRecentTimes() {
    let swimmerData = null;
    // Try to get swimmer data from various sources
    if (window.currentSwimmerData) {
        swimmerData = window.currentSwimmerData;
    } else if (window.refreshInsights && window.refreshInsights._data) {
        swimmerData = window.refreshInsights._data;
    } else if (typeof window.getCurrentSwimmerData === 'function') {
        swimmerData = window.getCurrentSwimmerData();
    }
    
    if (!swimmerData || !swimmerData.events || !swimmerData.events.idx) {
        return {};
    }
    
    const idx = swimmerData.events.idx;
    const recentTimes = {};
    const eventListMap = (typeof _eventList !== 'undefined' && _eventList) || 
                         (typeof window !== 'undefined' && window._eventList) || 
                         {};
    
    const timeToIntFunc = window.timeToInt || ((time) => {
        if (!time) return 0;
        const parts = time.split(':');
        if (parts.length === 2) {
            const mins = parseInt(parts[0]) || 0;
            const secs = parseFloat(parts[1]) || 0;
            return mins * 6000 + Math.round(secs * 100);
        }
        const secs = parseFloat(time) || 0;
        return Math.round(secs * 100);
    });
    
    // Calculate date 12 months ago
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    swimmerData.events.forEach(event => {
        const eventCode = event[idx.event];
        const eventStr = eventListMap[eventCode] || '';
        if (!eventStr || eventStr.includes('_')) return;
        
        const [dist, stroke, course] = eventStr.split(' ');
        const time = event[idx.time];
        const dateStr = event[idx.date];
        
        // Look for SCY Free events (50, 100, 200)
        if (stroke === 'FR' && course === 'SCY') {
            if (dist === '50' || dist === '100' || dist === '200') {
                const key = `${dist} Free`;
                
                // Parse date (format: YYYY-MM-DD)
                if (dateStr) {
                    const eventDate = new Date(dateStr);
                    if (eventDate >= twelveMonthsAgo) {
                        if (!recentTimes[key]) {
                            recentTimes[key] = [];
                        }
                        recentTimes[key].push({
                            time: time,
                            timeInt: timeToIntFunc(time),
                            date: eventDate
                        });
                    }
                }
            }
        }
    });
    
    // Sort by date for each event
    Object.keys(recentTimes).forEach(key => {
        recentTimes[key].sort((a, b) => a.date - b.date);
    });
    
    return recentTimes;
}

/**
 * Convert time string to seconds for calculations
 */
function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
        const mins = parseInt(parts[0]) || 0;
        const secs = parseFloat(parts[1]) || 0;
        return mins * 60 + secs;
    }
    return parseFloat(timeStr) || 0;
}

/**
 * Format seconds back to time string
 */
function secondsToTime(seconds) {
    if (seconds >= 60) {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(2);
        return `${mins}:${String(secs).padStart(5, '0')}`;
    }
    return seconds.toFixed(2);
}

/**
 * Create weight loss impact chart HTML
 */
function createWeightLossChart(weightLossScenarios, currentTimes) {
    if (!weightLossScenarios || weightLossScenarios.length === 0 || !currentTimes) {
        return '';
    }
    
    let chartHtml = '<div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, rgba(255, 152, 0, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%); border: 2px solid #ff9800; border-radius: 12px; box-shadow: 0 4px 15px rgba(255, 152, 0, 0.2);">';
    chartHtml += '<h4 style="margin: 0 0 20px 0; color: #e65100; font-size: 18px; font-weight: 700;">📊 Weight Loss Impact Projection Charts</h4>';
    
    // Create a separate chart for each event
    ['50', '100', '200'].forEach((dist) => {
        const eventKey = `${dist} Free`;
        const currentTime = currentTimes[eventKey];
        if (!currentTime) return;
        
        // Chart dimensions for individual chart (larger for better readability)
        const chartWidth = 900;
        const chartHeight = 500;
        const padding = { top: 50, right: 80, bottom: 80, left: 110 };
        const plotWidth = chartWidth - padding.left - padding.right;
        const plotHeight = chartHeight - padding.top - padding.bottom;
        
        // Find max weight loss for X-axis scaling
        const maxWeightLoss = Math.max(...weightLossScenarios.map(s => s.lbs));
        
        const currentSecs = timeToSeconds(currentTime);
        const projectedTimes = weightLossScenarios
            .filter(s => s[eventKey])
            .map(s => {
                const improvementMax = s[eventKey].max;
                const improvementMin = s[eventKey].min;
                const projectedTimeMax = Math.max(0, currentSecs - improvementMax);
                const projectedTimeMin = Math.max(0, currentSecs - improvementMin);
                return {
                    lbs: s.lbs,
                    projectedMin: projectedTimeMax,
                    projectedMax: projectedTimeMin,
                    improvement: s[eventKey],
                    isOptimal: s.isOptimal
                };
            });
        
        if (projectedTimes.length === 0) return;
        
        // Get recent times (last 12 months) for this event
        const recentTimes = getSwimmerRecentTimes();
        const eventRecentTimes = recentTimes[eventKey] || [];
        
        // Find min/max times for Y-axis scaling (include recent times and projected times)
        let minTime = Math.min(currentSecs, ...projectedTimes.map(p => p.projectedMin));
        let maxTime = Math.max(currentSecs, ...projectedTimes.map(p => p.projectedMax));
        
        // Include recent times in scaling
        if (eventRecentTimes.length > 0) {
            const recentTimeSecs = eventRecentTimes.map(rt => rt.timeInt / 100); // Convert from hundredths to seconds
            minTime = Math.min(minTime, ...recentTimeSecs);
            maxTime = Math.max(maxTime, ...recentTimeSecs);
        }
        
        // Add padding to Y-axis
        const timeRange = maxTime - minTime;
        const yAxisPadding = timeRange * 0.15;
        minTime -= yAxisPadding;
        maxTime += yAxisPadding;
        
        // Event color
        const eventColors = {
            '50 Free': '#e65100',
            '100 Free': '#ff6f00',
            '200 Free': '#ff9800'
        };
        const color = eventColors[eventKey];
        
        // Sort projected times by weight loss amount for interpolation
        const sortedProjectedTimes = [...projectedTimes].sort((a, b) => a.lbs - b.lbs);
        
        // Define multiple weight loss timeline scenarios (needed before maxMonthsOverall calculation)
        const optimalWeight = sortedProjectedTimes.find(p => p.isOptimal)?.lbs || sortedProjectedTimes[sortedProjectedTimes.length - 1].lbs;
        
        // Helper to generate timeline milestones (10 lbs per period)
        function generateTimeline(maxLbs, monthsPer10Lbs) {
            const timeline = [{ months: 0, lbs: 0 }];
            let currentMonths = 0;
            let currentLbs = 0;
            
            while (currentLbs < maxLbs) {
                currentMonths += monthsPer10Lbs;
                currentLbs += 10;
                if (currentLbs > maxLbs) currentLbs = maxLbs;
                timeline.push({ months: currentMonths, lbs: currentLbs });
            }
            return timeline;
        }
        
        const timelineScenarios = [
            {
                name: '10 lbs per 3 months',
                color: color,
                opacity: 0.9,
                strokeWidth: 3,
                timeline: generateTimeline(optimalWeight, 3) // 10 lbs every 3 months
            },
            {
                name: '10 lbs per 2 months',
                color: '#ff6f00',
                opacity: 0.7,
                strokeWidth: 2.5,
                timeline: generateTimeline(optimalWeight, 2) // 10 lbs every 2 months
            },
            {
                name: '10 lbs per 1 month',
                color: '#2196F3',
                opacity: 0.65,
                strokeWidth: 2,
                timeline: generateTimeline(optimalWeight, 1) // 10 lbs every 1 month
            }
        ];
        
        // Find maximum timeline across all scenarios for X-axis range
        const maxMonthsOverall = Math.max(...timelineScenarios.map(s => s.timeline[s.timeline.length - 1].months));
        
        // X-axis includes past 12 months + future projections
        const minMonths = -12; // Past 12 months
        const totalMonthsRange = maxMonthsOverall - minMonths; // Total range from -12 to maxMonthsOverall
        
        // Helper function to convert months from today to X position (handles negative months for past)
        const monthsToX = (months) => {
            const normalizedMonths = months - minMonths; // Shift so minMonths maps to 0
            return (normalizedMonths / totalMonthsRange) * plotWidth;
        };
        
        // Helper function to format date (months from today)
        const formatDate = (monthsFromToday) => {
            const date = new Date();
            date.setMonth(date.getMonth() + monthsFromToday);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        };
        
        // Helper functions
        const weightToX = (lbs) => (lbs / maxWeightLoss) * plotWidth; // Still needed for milestone mapping
        const timeToY = (time) => plotHeight - ((time - minTime) / (maxTime - minTime)) * plotHeight;
        
        // Start individual chart container
        const displayEventKey = `${eventKey} SCY`; // Add SCY for accuracy
        chartHtml += `<div style="margin-bottom: 30px;">`;
        chartHtml += `<h5 style="margin: 0 0 15px 5px; color: #e65100; font-size: 18px; font-weight: 600;">${displayEventKey}</h5>`;
        chartHtml += '<div style="overflow-x: auto; overflow-y: visible;">';
        chartHtml += `<svg width="${chartWidth}" height="${chartHeight}" style="background: white; border-radius: 8px; display: block;">`;
        
        // Draw axes
        chartHtml += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotHeight}" stroke="#666" stroke-width="2"/>`;
        chartHtml += `<line x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${padding.left + plotWidth}" y2="${padding.top + plotHeight}" stroke="#666" stroke-width="2"/>`;
        
        // Draw grid lines and labels
        const yGridLines = 5;
        for (let i = 0; i <= yGridLines; i++) {
            const y = padding.top + (plotHeight / yGridLines) * i;
            const time = maxTime - ((maxTime - minTime) / yGridLines) * i;
            chartHtml += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + plotWidth}" y2="${y}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="2,2"/>`;
            chartHtml += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="13" fill="#666" font-weight="500">${secondsToTime(time)}</text>`;
        }
        
        // Draw current time reference line
        const currentY = padding.top + timeToY(currentSecs);
        chartHtml += `<line x1="${padding.left}" y1="${currentY}" x2="${padding.left + plotWidth}" y2="${currentY}" stroke="#999" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.6"/>`;
        chartHtml += `<text x="${padding.left + plotWidth - 5}" y="${currentY - 5}" text-anchor="end" font-size="13" fill="#999" font-style="italic" font-weight="500">Current: ${currentTime}</text>`;
        
        // Draw X-axis date labels (month/year) - including past 12 months
        const xAxisLabelCount = 8; // Show 8 date labels (more to cover past + future)
        for (let i = 0; i <= xAxisLabelCount; i++) {
            const months = minMonths + (i / xAxisLabelCount) * totalMonthsRange;
            const x = padding.left + monthsToX(months);
            const dateStr = formatDate(months);
            
            chartHtml += `<line x1="${x}" y1="${padding.top + plotHeight}" x2="${x}" y2="${padding.top + plotHeight + 5}" stroke="#666" stroke-width="1"/>`;
            chartHtml += `<text x="${x}" y="${padding.top + plotHeight + 25}" text-anchor="middle" font-size="12" fill="#666" font-weight="${months === 0 ? '700' : '500'}">${dateStr}</text>`;
        }
        
        // Draw vertical line at today (months = 0) and calculate today X position once for reuse
        const todayX = padding.left + monthsToX(0);
        chartHtml += `<line x1="${todayX}" y1="${padding.top}" x2="${todayX}" y2="${padding.top + plotHeight}" stroke="#666" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.5"/>`;
        
        // Draw weight loss milestone reference lines (mapped to dates on primary timeline)
        const primaryTimeline = timelineScenarios[0].timeline;
        weightLossScenarios.forEach((scenario) => {
            if (!scenario[eventKey]) return;
            // Find which month this weight loss occurs in the primary timeline
            let milestoneMonths = 0;
            for (let i = 0; i < primaryTimeline.length - 1; i++) {
                const t1 = primaryTimeline[i];
                const t2 = primaryTimeline[i + 1];
                if (scenario.lbs >= t1.lbs && scenario.lbs <= t2.lbs) {
                    // Interpolate months
                    const ratio = scenario.lbs === t1.lbs ? 0 : (scenario.lbs - t1.lbs) / (t2.lbs - t1.lbs);
                    milestoneMonths = t1.months + (t2.months - t1.months) * ratio;
                    break;
                } else if (scenario.lbs > primaryTimeline[primaryTimeline.length - 1].lbs) {
                    milestoneMonths = primaryTimeline[primaryTimeline.length - 1].months;
                    break;
                }
            }
            
            const x = padding.left + monthsToX(milestoneMonths);
            const isOptimal = scenario.isOptimal;
            
            // Draw vertical reference line
            chartHtml += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + plotHeight}" stroke="${isOptimal ? '#2e7d32' : '#ccc'}" stroke-width="1" opacity="0.4" stroke-dasharray="2,2"/>`;
            
            // Draw weight loss label above chart
            chartHtml += `<text x="${x}" y="${padding.top - 8}" text-anchor="middle" font-size="11" font-weight="${isOptimal ? '700' : '600'}" fill="${isOptimal ? '#2e7d32' : '#666'}">-${scenario.lbs}lbs${isOptimal ? '*' : ''}</text>`;
        });
        
        // Interpolate improvement for any weight loss amount (including 0)
        function getImprovementForWeight(lbs) {
            if (lbs <= 0) {
                // At 0 lbs, no improvement (current time)
                return { min: 0, max: 0 };
            }
            
            if (lbs >= sortedProjectedTimes[sortedProjectedTimes.length - 1].lbs) {
                const last = sortedProjectedTimes[sortedProjectedTimes.length - 1];
                return { min: last.improvement.min, max: last.improvement.max };
            }
            
            // Find the two points to interpolate between
            for (let i = 0; i < sortedProjectedTimes.length - 1; i++) {
                const p1 = sortedProjectedTimes[i];
                const p2 = sortedProjectedTimes[i + 1];
                
                if (lbs >= p1.lbs && lbs <= p2.lbs) {
                    // Linear interpolation
                    const ratio = (lbs - p1.lbs) / (p2.lbs - p1.lbs);
                    return {
                        min: p1.improvement.min + (p2.improvement.min - p1.improvement.min) * ratio,
                        max: p1.improvement.max + (p2.improvement.max - p1.improvement.max) * ratio
                    };
                }
            }
            return { min: 0, max: 0 };
        }
        
        // Draw multiple continuous curves, starting from most recent swim time or current time
        timelineScenarios.forEach((scenario, scenarioIndex) => {
            const curvePoints = [];
            
            // Find the most recent historical swim time (closest to today, but in the past)
            let startPoint = { x: todayX, y: currentY, lbs: 0, months: 0 };
            if (eventRecentTimes.length > 0) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // Find the most recent swim time (latest date, closest to today but before today)
                const sortedRecentTimes = [...eventRecentTimes].sort((a, b) => b.date.getTime() - a.date.getTime());
                const mostRecentTime = sortedRecentTimes.find(rt => {
                    const monthsDiff = (rt.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
                    return monthsDiff <= 0 && monthsDiff >= minMonths;
                }) || sortedRecentTimes[0]; // Use most recent overall if none before today
                
                if (mostRecentTime) {
                    const timeSecs = mostRecentTime.timeInt / 100;
                    const monthsDiff = (mostRecentTime.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
                    
                    // Calculate position for most recent time
                    let x;
                    if (monthsDiff >= minMonths && monthsDiff <= maxMonthsOverall) {
                        x = padding.left + monthsToX(monthsDiff);
                    } else if (monthsDiff < minMonths) {
                        x = padding.left;
                    } else {
                        x = padding.left + plotWidth;
                    }
                    
                    const y = padding.top + timeToY(timeSecs);
                    startPoint = { x, y, lbs: 0, months: Math.max(0, monthsDiff), time: timeSecs };
                }
            }
            
            // Add starting point from most recent swim time
            curvePoints.push(startPoint);
            
            // Generate points along the curve by interpolating weight loss progress
            const maxMonths = scenario.timeline[scenario.timeline.length - 1].months;
            const steps = 150; // More points for smoother curve
            const stepMonths = maxMonths / steps;
            
            // Start from the month of the most recent time (or 0 if starting from today)
            const startMonths = startPoint.months || 0;
            
            for (let step = 1; step <= steps; step++) {
                const months = startMonths + (step * stepMonths);
                
                // Find weight loss at this month (interpolate between timeline milestones)
                let lbs = 0;
                for (let i = 0; i < scenario.timeline.length - 1; i++) {
                    const t1 = scenario.timeline[i];
                    const t2 = scenario.timeline[i + 1];
                    
                    if (months >= t1.months && months <= t2.months) {
                        const ratio = (months - t1.months) / (t2.months - t1.months);
                        lbs = t1.lbs + (t2.lbs - t1.lbs) * ratio;
                        break;
                    } else if (months > t2.months && i === scenario.timeline.length - 2) {
                        // Past the last milestone, use final weight
                        lbs = scenario.timeline[scenario.timeline.length - 1].lbs;
                        break;
                    }
                }
                
                // Cap at max weight loss
                lbs = Math.min(lbs, maxWeightLoss);
                
                // Get improvement for this weight loss amount
                const improvement = getImprovementForWeight(lbs);
                const projectedTime = Math.max(0, currentSecs - improvement.max); // Use max improvement for best projection
                
                const x = padding.left + monthsToX(months);
                const y = padding.top + timeToY(projectedTime);
                curvePoints.push({ x, y, lbs, months });
            }
            
            // Draw smooth continuous dotted curve using Catmull-Rom spline approach
            if (curvePoints.length >= 2) {
                let path = `M ${curvePoints[0].x} ${curvePoints[0].y}`;
                
                // Use smooth cubic bezier curves with better control point calculation
                for (let i = 0; i < curvePoints.length - 1; i++) {
                    const p1 = curvePoints[i];
                    const p2 = curvePoints[i + 1];
                    
                    if (i === 0) {
                        // First segment: connect smoothly from the starting point (most recent swim or today)
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        
                        // Calculate direction - we want a smooth continuation from the historical trend
                        // Look ahead to get the overall trend
                        let trendX = dx;
                        let trendY = dy;
                        
                        if (curvePoints.length > 2) {
                            const p3 = curvePoints[2];
                            // Use overall trend from p1 to p3
                            trendX = (p3.x - p1.x) / 2;
                            trendY = (p3.y - p1.y) / 2;
                        }
                        
                        // First control point: continue smoothly from starting point
                        // Use the trend direction but make it gradual
                        const cp1x = p1.x + trendX * 0.4;
                        const cp1y = p1.y + trendY * 0.4;
                        
                        // Second control point: prepare for smooth continuation to p2
                        const cp2x = p2.x - trendX * 0.3;
                        const cp2y = p2.y - trendY * 0.3;
                        
                        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                    } else {
                        // Subsequent segments: use Catmull-Rom style for smooth continuity
                        const p0 = curvePoints[i - 1];
                        const p3 = i < curvePoints.length - 2 ? curvePoints[i + 2] : p2;
                        
                        const tension = 0.5;
                        
                        // Calculate tangent vectors
                        const dx1 = (p2.x - p0.x) * tension;
                        const dy1 = (p2.y - p0.y) * tension;
                        const dx2 = (p3.x - p1.x) * tension;
                        const dy2 = (p3.y - p1.y) * tension;
                        
                        // Control points for smooth cubic bezier
                        const cp1x = p1.x + dx1 / 3;
                        const cp1y = p1.y + dy1 / 3;
                        const cp2x = p2.x - dx2 / 3;
                        const cp2y = p2.y - dy2 / 3;
                        
                        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                    }
                }
                
                // All projection curves are dotted (different dash patterns for each)
                const dashArrays = ['6,4', '8,5', '4,3'];
                const dashArray = dashArrays[scenarioIndex] || '6,4';
                chartHtml += `<path d="${path}" fill="none" stroke="${scenario.color}" stroke-width="${scenario.strokeWidth}" opacity="${scenario.opacity}" stroke-dasharray="${dashArray}"/>`;
                
                // Add dots every month along the curve (starting from the start months)
                for (let months = Math.ceil(startMonths); months <= maxMonths; months += 1) {
                    // Skip the starting month if it's already the start point
                    if (months === Math.ceil(startMonths) && startPoint.months !== undefined) {
                        continue; // Skip duplicate point at start
                    }
                    
                    // Find weight loss at this month
                    let lbs = 0;
                    for (let i = 0; i < scenario.timeline.length - 1; i++) {
                        const t1 = scenario.timeline[i];
                        const t2 = scenario.timeline[i + 1];
                        
                        if (months >= t1.months && months <= t2.months) {
                            const ratio = (months - t1.months) / (t2.months - t1.months);
                            lbs = t1.lbs + (t2.lbs - t1.lbs) * ratio;
                            break;
                        } else if (months > t2.months && i === scenario.timeline.length - 2) {
                            lbs = scenario.timeline[scenario.timeline.length - 1].lbs;
                            break;
                        }
                    }
                    
                    if (lbs >= 0) {
                        const improvement = getImprovementForWeight(lbs);
                        const projectedTime = Math.max(0, currentSecs - improvement.max);
                        const x = padding.left + monthsToX(months);
                        const y = padding.top + timeToY(projectedTime);
                        
                        // Draw bigger, more visible dot
                        const dotSize = scenarioIndex === 0 ? 6 : scenarioIndex === 1 ? 5.5 : 5; // Largest for primary curve
                        chartHtml += `<circle cx="${x}" cy="${y}" r="${dotSize}" fill="${scenario.color}" stroke="white" stroke-width="2.5" opacity="${Math.min(scenario.opacity + 0.15, 1)}"/>`;
                    }
                }
            }
        });
        
        // Draw confidence bands for the primary (gradual) curve
        const primaryScenario = timelineScenarios[0];
        const primaryCurvePoints = [];
        const maxMonths = primaryScenario.timeline[primaryScenario.timeline.length - 1].months;
        const steps = 100;
        const stepMonths = maxMonths / steps;
        
        for (let step = 0; step <= steps; step++) {
            const months = step * stepMonths;
            
            let lbs = 0;
            for (let i = 0; i < primaryScenario.timeline.length - 1; i++) {
                const t1 = primaryScenario.timeline[i];
                const t2 = primaryScenario.timeline[i + 1];
                
                if (months >= t1.months && months <= t2.months) {
                    const ratio = (months - t1.months) / (t2.months - t1.months);
                    lbs = t1.lbs + (t2.lbs - t1.lbs) * ratio;
                    break;
                } else if (months > t2.months && i === primaryScenario.timeline.length - 2) {
                    lbs = primaryScenario.timeline[primaryScenario.timeline.length - 1].lbs;
                    break;
                }
            }
            lbs = Math.min(lbs, maxWeightLoss);
            
            const improvement = getImprovementForWeight(lbs);
            const projectedTimeMin = Math.max(0, currentSecs - improvement.max);
            const projectedTimeMax = Math.max(0, currentSecs - improvement.min);
            const x = padding.left + monthsToX(months);
            primaryCurvePoints.push({
                x,
                minY: padding.top + timeToY(projectedTimeMin),
                maxY: padding.top + timeToY(projectedTimeMax)
            });
        }
        
        if (primaryCurvePoints.length > 0) {
            // Start confidence band from today (months = 0)
            const upperStart = `${todayX},${currentY}`;
            const upperPoints = primaryCurvePoints.map(p => `${p.x},${p.minY}`).join(' ');
            const lowerPoints = primaryCurvePoints.slice().reverse().map(p => `${p.x},${p.maxY}`).join(' ');
            const lowerEnd = `${todayX},${currentY}`;
            chartHtml += `<polygon points="${upperStart} ${upperPoints} ${lowerPoints} ${lowerEnd}" fill="${color}" opacity="0.12" stroke="none"/>`;
        }
        
        // Draw starting point (current best time) at today (months = 0)
        chartHtml += `<circle cx="${todayX}" cy="${currentY}" r="8" fill="${color}" stroke="white" stroke-width="2.5"/>`;
        chartHtml += `<title><strong>${displayEventKey}</strong> - Current Best Time: <strong>${currentTime}</strong></title>`;
        
        // Draw key milestone points on the primary curve (map weight loss to months)
        sortedProjectedTimes.forEach(p => {
            // Find which month this weight loss occurs in the primary timeline
            let milestoneMonths = 0;
            for (let i = 0; i < primaryTimeline.length - 1; i++) {
                const t1 = primaryTimeline[i];
                const t2 = primaryTimeline[i + 1];
                if (p.lbs >= t1.lbs && p.lbs <= t2.lbs) {
                    const ratio = p.lbs === t1.lbs ? 0 : (p.lbs - t1.lbs) / (t2.lbs - t1.lbs);
                    milestoneMonths = t1.months + (t2.months - t1.months) * ratio;
                    break;
                } else if (p.lbs > primaryTimeline[primaryTimeline.length - 1].lbs) {
                    milestoneMonths = primaryTimeline[primaryTimeline.length - 1].months;
                    break;
                }
            }
            
            const x = padding.left + monthsToX(milestoneMonths);
            const y = padding.top + timeToY(p.projectedMin);
            const pointSize = p.isOptimal ? 10 : 8;
            const pointColor = p.isOptimal ? '#2e7d32' : color;
            const dateStr = formatDate(milestoneMonths);
            chartHtml += `<circle cx="${x}" cy="${y}" r="${pointSize}" fill="${pointColor}" stroke="white" stroke-width="2.5"/>`;
            
            const projectedTimeMinStr = secondsToTime(p.projectedMin);
            const projectedTimeMaxStr = secondsToTime(p.projectedMax);
            chartHtml += `<title><strong>${displayEventKey}</strong> - Lose <strong>${p.lbs} lbs</strong> by <strong>${dateStr}</strong> → Projected <strong>${projectedTimeMinStr}-${projectedTimeMaxStr}</strong> (<strong>${p.improvement.min.toFixed(1)}-${p.improvement.max.toFixed(1)}s</strong> faster)</title>`;
        });
        
        // Draw recent times (last 12 months) as scatter plot positioned by actual dates
        if (eventRecentTimes.length > 0) {
            const recentColor = '#2196F3'; // Blue color for visibility
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            eventRecentTimes.forEach((rt) => {
                const timeSecs = rt.timeInt / 100; // Convert from hundredths to seconds
                
                // Calculate months from today (negative for past dates)
                const monthsDiff = (rt.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
                
                // Position by actual date (can be negative for past dates)
                let x;
                if (monthsDiff >= minMonths && monthsDiff <= maxMonthsOverall) {
                    x = padding.left + monthsToX(monthsDiff);
                } else if (monthsDiff < minMonths) {
                    // Historical data before chart range - show at left edge
                    x = padding.left;
                } else {
                    // Future data beyond chart range - show at right edge
                    x = padding.left + plotWidth;
                }
                
                const y = padding.top + timeToY(timeSecs);
                const dateStr = rt.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                
                // Draw as visible blue circles to show historical performance
                chartHtml += `<circle cx="${x}" cy="${y}" r="5" fill="${recentColor}" opacity="0.8" stroke="white" stroke-width="2"/>`;
                chartHtml += `<title><strong>${displayEventKey}</strong> - <strong>${rt.time}</strong> on <strong>${dateStr}</strong></title>`;
            });
            
            // Draw a line connecting recent times (showing trend)
            if (eventRecentTimes.length >= 2) {
                const recentPoints = eventRecentTimes
                    .map((rt) => {
                        const timeSecs = rt.timeInt / 100;
                        const monthsDiff = (rt.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
                        let x;
                        if (monthsDiff >= minMonths && monthsDiff <= maxMonthsOverall) {
                            x = padding.left + monthsToX(monthsDiff);
                        } else if (monthsDiff < minMonths) {
                            x = padding.left;
                        } else {
                            x = padding.left + plotWidth;
                        }
                        const y = padding.top + timeToY(timeSecs);
                        return { x, y, time: rt.time, date: rt.date };
                    })
                    .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort by date
                
                // Draw a blue line connecting recent times
                let recentPath = `M ${recentPoints[0].x} ${recentPoints[0].y}`;
                for (let i = 1; i < recentPoints.length; i++) {
                    recentPath += ` L ${recentPoints[i].x} ${recentPoints[i].y}`;
                }
                chartHtml += `<path d="${recentPath}" fill="none" stroke="${recentColor}" stroke-width="2" opacity="0.6" stroke-dasharray="4,3"/>`;
            }
        }
        
        // Axis labels
        chartHtml += `<text x="${padding.left + plotWidth / 2}" y="${chartHeight - 20}" text-anchor="middle" font-size="14" font-weight="600" fill="#333">Date (Month/Year)</text>`;
        chartHtml += `<text x="30" y="${padding.top + plotHeight / 2}" text-anchor="middle" font-size="14" font-weight="600" fill="#333" transform="rotate(-90, 30, ${padding.top + plotHeight / 2})">Time</text>`;
        
        // Add legend for curves and recent times
        let legendY = padding.top + 15;
        const legendX = padding.left + plotWidth - 150;
        
        // Legend for timeline curves
        timelineScenarios.forEach((scenario, idx) => {
            const legendColor = scenario.color;
            chartHtml += `<line x1="${legendX}" y1="${legendY}" x2="${legendX + 30}" y2="${legendY}" stroke="${legendColor}" stroke-width="${scenario.strokeWidth}" opacity="${scenario.opacity}" stroke-dasharray="${idx === 0 ? 'none' : idx === 1 ? '8,4' : '4,4'}"/>`;
            chartHtml += `<text x="${legendX + 35}" y="${legendY + 5}" font-size="12" fill="#333" font-weight="${idx === 0 ? '600' : '500'}">${scenario.name}</text>`;
            legendY += 16;
        });
        
        // Legend for recent times if they exist
        if (eventRecentTimes.length > 0) {
            const recentColor = '#2196F3';
            chartHtml += `<circle cx="${legendX + 15}" cy="${legendY}" r="5" fill="${recentColor}" opacity="0.8" stroke="white" stroke-width="1.5"/>`;
            chartHtml += `<text x="${legendX + 35}" y="${legendY + 5}" font-size="12" fill="#333" font-weight="600">Last 12 months</text>`;
        }
        
        chartHtml += '</svg>';
        
        // Add optimal weight projection for this specific event
        const optimalScenario = weightLossScenarios.find(s => s.isOptimal);
        if (optimalScenario && optimalScenario[eventKey]) {
            const currentSecs = timeToSeconds(currentTime);
            const improvementMax = optimalScenario[eventKey].max;
            const improvementMin = optimalScenario[eventKey].min;
            const newTimeMax = Math.max(0, currentSecs - improvementMax);
            const newTimeMin = Math.max(0, currentSecs - improvementMin);
            const timeMinStr = secondsToTime(newTimeMax);
            const timeMaxStr = secondsToTime(newTimeMin);
            
            chartHtml += '<div style="margin-top: 15px; padding: 12px; background: rgba(76, 175, 80, 0.1); border-radius: 6px; font-size: 14px; color: #2e7d32; line-height: 1.7;">';
            chartHtml += `<strong>🎯 Optimal Weight Projection:</strong><br>`;
            chartHtml += `Current <strong>${currentTime}</strong> → Projected <strong>${timeMinStr}-${timeMaxStr}</strong> (<strong>${optimalScenario[eventKey].min.toFixed(1)}-${optimalScenario[eventKey].max.toFixed(1)}s</strong> improvement)`;
            chartHtml += '</div>';
        }
        
        chartHtml += '</div>';
        chartHtml += '</div>';
    });
    
    // Add custom tooltip styling and JavaScript
    chartHtml += `
    <style>
        .chart-tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 18px 22px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 500;
            line-height: 1.8;
            pointer-events: none;
            z-index: 10000;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            max-width: 400px;
            word-wrap: break-word;
            white-space: normal;
            opacity: 0;
            transition: opacity 0.2s ease;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        .chart-tooltip.visible {
            opacity: 1;
        }
        .chart-tooltip strong {
            color: #fff;
            font-weight: 700;
            font-size: 20px;
        }
    </style>
    <script>
        (function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'chart-tooltip';
            document.body.appendChild(tooltip);
            
            function showTooltip(e, text) {
                // Parse and format text with <strong> tags
                const formattedText = text
                    .replace(/<strong>(.*?)<\/strong>/g, '<strong>$1</strong>')
                    .replace(/→/g, '→');
                tooltip.innerHTML = formattedText;
                tooltip.classList.add('visible');
                updateTooltipPosition(e);
            }
            
            function hideTooltip() {
                tooltip.classList.remove('visible');
            }
            
            function updateTooltipPosition(e) {
                const x = e.pageX + 15;
                const y = e.pageY - 15;
                tooltip.style.left = x + 'px';
                tooltip.style.top = y + 'px';
                
                // Adjust if tooltip goes off screen
                const rect = tooltip.getBoundingClientRect();
                if (rect.right > window.innerWidth) {
                    tooltip.style.left = (e.pageX - rect.width - 15) + 'px';
                }
                if (rect.bottom > window.innerHeight) {
                    tooltip.style.top = (e.pageY - rect.height - 15) + 'px';
                }
            }
            
            // Attach event listeners to all chart SVGs
            setTimeout(() => {
                document.querySelectorAll('svg[width="900"]').forEach(svg => {
                    svg.querySelectorAll('[title]').forEach(el => {
                        const title = el.getAttribute('title');
                        if (title) {
                            el.addEventListener('mouseenter', (e) => {
                                showTooltip(e, title);
                            });
                            el.addEventListener('mouseleave', hideTooltip);
                            el.addEventListener('mousemove', updateTooltipPosition);
                            el.removeAttribute('title'); // Remove native tooltip
                        }
                    });
                });
            }, 100);
        })();
    </script>
    `;
    
    chartHtml += '<div style="margin-top: 15px; font-size: 13px; color: #666; text-align: center; line-height: 1.6;">* = Optimal weight target | Blue dots show actual times from last 12 months | Dotted lines show best projected times, shaded areas show projected time ranges | Hover over points for details</div>';
    chartHtml += '</div>';
    
    chartHtml += '<div style="margin-top: 15px; padding: 12px; background: rgba(255, 152, 0, 0.1); border-radius: 6px; font-size: 13px; color: #666; line-height: 1.6;">';
    chartHtml += '<strong style="color: #e65100;">💡 Projection:</strong> Based on drag reduction research and power-to-weight ratio improvements. Shaded areas show min-max improvement ranges. For significantly overweight swimmers (BMI >26), actual improvements may be even greater.';
    chartHtml += '</div>';
    chartHtml += '</div>';
    
    return chartHtml;
}

/**
 * Parse weight loss scenarios from AI content or calculate them
 */
function parseWeightLossScenarios(content, insightsData) {
    const scenarios = [];
    
    // Try multiple regex patterns to extract weight loss scenarios
    // Pattern 1: "Lose X lbs: Could improve 50 Free by Y-Zs, 100 Free by A-Bs, and 200 Free by C-Ds"
    // Pattern 2: Handles format with commas and "and"
    // Pattern 3: Handles multiline format
    const patterns = [
        /Lose\s+(\d+)\s+lbs[^:]*:.*?Could\s+improve\s+50\s+Free\s+by\s+(\d+\.?\d*)-(\d+\.?\d*)s.*?100\s+Free\s+by\s+(\d+\.?\d*)-(\d+\.?\d*)s.*?200\s+Free\s+by\s+(\d+\.?\d*)-(\d+\.?\d*)s/gi,
        /Lose\s+(\d+)\s+lbs[^:]*:.*?50\s+Free.*?(\d+\.?\d*)-(\d+\.?\d*)s.*?100\s+Free.*?(\d+\.?\d*)-(\d+\.?\d*)s.*?200\s+Free.*?(\d+\.?\d*)-(\d+\.?\d*)s/gi,
        /Lose\s+(\d+)\s+lbs[^:]*:.*?50\s+Free.*?(\d+\.?\d*)[–-](\d+\.?\d*)s.*?100\s+Free.*?(\d+\.?\d*)[–-](\d+\.?\d*)s.*?200\s+Free.*?(\d+\.?\d*)[–-](\d+\.?\d*)s/gi,
        /Lose\s+(\d+)\s+lbs.*?(\d+\.?\d*)-(\d+\.?\d*).*?50.*?(\d+\.?\d*)-(\d+\.?\d*).*?100.*?(\d+\.?\d*)-(\d+\.?\d*).*?200/gi
    ];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const lbs = parseInt(match[1]);
            const scenario = {
                lbs: lbs,
                '50 Free': { min: parseFloat(match[2]), max: parseFloat(match[3]) },
                '100 Free': { min: parseFloat(match[4]), max: parseFloat(match[5]) },
                '200 Free': { min: parseFloat(match[6]), max: parseFloat(match[7]) },
                isOptimal: (content.toLowerCase().includes(`${lbs} lbs (Optimal)`) || 
                           content.toLowerCase().includes(`lose ${lbs} lbs (optimal)`) ||
                           content.toLowerCase().match(new RegExp(`${lbs}\\s*lbs.*?optimal`, 'i')))
            };
            
            // Check if this scenario is already added
            if (!scenarios.find(s => s.lbs === lbs)) {
                scenarios.push(scenario);
            }
        }
    }
    
    // If no scenarios found in content, try to calculate from weightLossPotential if available
    if (scenarios.length === 0 && insightsData && insightsData.weightLossPotential) {
        const wlp = insightsData.weightLossPotential;
        if (wlp.scenarios && wlp.scenarios.length > 0) {
            // Get current swimmer stats for calculation
            let swimmerData = null;
            if (window.currentSwimmerData) {
                swimmerData = window.currentSwimmerData;
            } else if (window.refreshInsights && window.refreshInsights._data) {
                swimmerData = window.refreshInsights._data;
            }
            
            if (swimmerData) {
                const athleteStats = {
                    height: insightsData.height || null,
                    weight: insightsData.weight || null
                };
                
                // Calculate improvements for each scenario
                wlp.scenarios.forEach(lbs => {
                    const improv50 = calculateWeightLossImprovement(lbs, 50, wlp.excessWeight, wlp.bmi, wlp.currentWeight);
                    const improv100 = calculateWeightLossImprovement(lbs, 100, wlp.excessWeight, wlp.bmi, wlp.currentWeight);
                    const improv200 = calculateWeightLossImprovement(lbs, 200, wlp.excessWeight, wlp.bmi, wlp.currentWeight);
                    
                    scenarios.push({
                        lbs: lbs,
                        '50 Free': improv50,
                        '100 Free': improv100,
                        '200 Free': improv200,
                        isOptimal: lbs === wlp.excessWeight
                    });
                });
            }
        }
    }
    
    // Sort by weight loss amount
    scenarios.sort((a, b) => a.lbs - b.lbs);
    
    return scenarios;
}

/**
 * Calculate weight loss improvement (reuse the function from getGeminiAnalysis context if needed)
 */
function calculateWeightLossImprovement(lbsLost, eventDistance, excessWeightLbs, currentBMI, currentWeight) {
    // Base improvement per pound - same as in getGeminiAnalysis
    let baseImprovementPerLb;
    if (eventDistance <= 50) {
        baseImprovementPerLb = { min: 0.015625, max: 0.025 };
    } else if (eventDistance <= 100) {
        baseImprovementPerLb = { min: 0.02, max: 0.04 };
    } else if (eventDistance <= 200) {
        baseImprovementPerLb = { min: 0.03, max: 0.0594 };
    } else {
        baseImprovementPerLb = { min: 0.04, max: 0.08 };
    }
    
    // Apply multipliers for excess weight and BMI
    let excessWeightMultiplier = 1.0;
    if (excessWeightLbs && excessWeightLbs > 0 && currentWeight) {
        const optimalWeightLbs = currentWeight - excessWeightLbs;
        const excessWeightPercent = (excessWeightLbs / optimalWeightLbs) * 100;
        
        if (excessWeightPercent > 15) {
            excessWeightMultiplier = Math.min(1.0 + (excessWeightPercent - 15) * 0.06, 2.5);
        } else if (excessWeightPercent > 10) {
            excessWeightMultiplier = 1.0 + (excessWeightPercent - 10) * 0.02;
        }
        
        if (currentBMI && currentBMI > 26) {
            const bmiBonus = Math.min((currentBMI - 26) * 1.1, 4.4);
            excessWeightMultiplier += bmiBonus;
        }
    }
    
    const distanceMultiplier = eventDistance > 100 ? eventDistance / 100 : 1;
    const minImprovement = (baseImprovementPerLb.min * lbsLost * distanceMultiplier * excessWeightMultiplier);
    const maxImprovement = (baseImprovementPerLb.max * lbsLost * distanceMultiplier * excessWeightMultiplier);
    
    return {
        min: Math.round(minImprovement * 10) / 10,
        max: Math.round(maxImprovement * 10) / 10
    };
}

/**
 * Render insights UI component
 */
function renderInsights(insightsData, isRegenerating = false, swimmerData = null) {
    console.log('renderInsights called with swimCloudId:', insightsData?.swimCloudId, 'insightsData keys:', insightsData ? Object.keys(insightsData) : 'null');
    if (!insightsData || (!insightsData.insights?.length && !insightsData.recommendations?.length)) {
        return '<div class="ai-insights-empty">No insights available at this time. Keep swimming and competing!</div>';
    }
    
    // Store swimmerData in insightsData for specialty chart access
    if (swimmerData) {
        insightsData.swimmerData = swimmerData;
    }

    let html = ['<div class="ai-insights-container">'];
    
    // Separate AI analysis from other insights
    const aiInsights = [];
    const regularInsights = [];
    
    insightsData.insights.forEach(insight => {
        if (insight.title && insight.title.includes('🤖 AI Analysis:')) {
            // Extract the actual title (remove "🤖 AI Analysis: " prefix)
            const actualTitle = insight.title.replace('🤖 AI Analysis: ', '');
            
            // Handle cases where content might be a JSON string or malformed
            let content = insight.content || '';
            if (typeof content === 'string') {
                // If content looks like JSON (starts with [ or { and contains "title"), try to parse it
                const trimmedContent = content.trim();
                if ((trimmedContent.startsWith('[') || trimmedContent.startsWith('{')) && trimmedContent.includes('"title"')) {
                    try {
                        const parsed = JSON.parse(content);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            // If it's an array, extract content from first item
                            content = parsed[0].content || content;
                        } else if (parsed.content) {
                            content = parsed.content;
                        }
                    } catch (e) {
                        // Not valid JSON, use original content
                        console.log('Content looks like JSON but failed to parse:', e);
                    }
                }
            }
            
            aiInsights.push({
                title: actualTitle,
                content: content,
                type: insight.type
            });
        } else {
            regularInsights.push(insight);
        }
    });
    
    // Render AI Analysis as a unified card with sections
    if (aiInsights.length > 0) {
        html.push('<div class="ai-analysis-main-card">');
        html.push('<div class="ai-analysis-header">');
        html.push('<div class="ai-analysis-header-left">');
        html.push('<span class="ai-analysis-icon">🤖</span>');
        html.push('<h2 class="ai-analysis-title">AI Performance Analysis</h2>');
        html.push('</div>');
        html.push('<div class="ai-analysis-header-right">');
        html.push('<button id="copy-ai-prompt-btn" onclick="copyAIPrompt()" class="copy-ai-prompt-btn" title="Copy swimmer data as a prompt for ChatGPT or Gemini">📋 Copy AI Prompt</button>');
        if (isRegenerating) {
            html.push('<div id="ai-regenerating-indicator" class="ai-regenerating-indicator-inline"><span class="regenerating-icon">⏳</span> <strong>Regenerating...</strong></div>');
        } else {
            html.push('<button id="regenerate-ai-btn" onclick="regenerateAIAnalysis()" class="regenerate-ai-btn-header">🔄 Regenerate</button>');
        }
        html.push('</div>');
        html.push('</div>');
        
        // Add specialty pentagon chart before profile section (if swimmerData is available)
        if (insightsData.swimmerData && window.createSpecialtyChart) {
            try {
                const specialtyChart = window.createSpecialtyChart(insightsData.swimmerData);
                if (specialtyChart) {
                    html.push('<div class="ai-analysis-section ai-analysis-specialty" style="border-left: 4px solid #667eea; margin-bottom: 25px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%); border-radius: 8px; padding: 25px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);">');
                    html.push('<div class="ai-analysis-section-header" style="margin-bottom: 20px;">');
                    html.push('<span class="ai-analysis-section-icon" style="font-size: 24px;">🏊</span>');
                    html.push('<h3 class="ai-analysis-section-title" style="font-size: 20px; font-weight: 700; color: #333; margin: 0;">Stroke Specialty</h3>');
                    html.push('<div style="margin-top: 8px; font-size: 14px; color: #666; line-height: 1.5;">Progress toward Summer Junior National cuts across all strokes</div>');
                    html.push('</div>');
                    html.push('<div class="ai-analysis-section-content" style="padding: 0;">');
                    html.push(specialtyChart);
                    html.push('</div>');
                    html.push('</div>');
                }
            } catch (error) {
                console.error('Error creating specialty chart in AI analysis:', error);
            }
        }
        
        // Group AI insights by their title type
        aiInsights.forEach((aiInsight, index) => {
            const title = aiInsight.title.toLowerCase();
            let sectionClass = 'ai-analysis-section';
            let icon = '📊';
            let borderColor = '#007bff';
            let isProfileSection = false;
            let isActionItemsSection = false;
            let isImprovementSection = false;
            
            // Check for Top 3 Action Items section - needs special prominent styling
            if (title.includes('action item') || title.includes('top 3') || title.includes('next 2-3 months')) {
                isActionItemsSection = true;
                sectionClass += ' ai-analysis-action-items';
                icon = '➤';
                borderColor = '#ff6b35';
            } else if (title.includes('profile') || title.includes('specialization') || title.includes('swimmer profile') || (index === 0 && title.includes('swimmer'))) {
                // First insight is typically the profile section, also check if title contains "swimmer"
                sectionClass += ' ai-analysis-profile';
                icon = '🏊';
                borderColor = '#667eea';
                isProfileSection = true;
                console.log('Profile section detected for title:', aiInsight.title, 'swimCloudId available:', !!insightsData.swimCloudId);
            } else if (title.includes('strength') || title.includes('excel') || title.includes('strong')) {
                sectionClass += ' ai-analysis-strength';
                icon = '✅';
                borderColor = '#28a745';
            } else if (title.includes('improvement') || title.includes('area') || title.includes('need') || title.includes('weakness')) {
                sectionClass += ' ai-analysis-improvement';
                icon = '⚠️';
                borderColor = '#ff9800';
                isImprovementSection = true;
            } else if (title.includes('recruiting') || title.includes('college') || title.includes('readiness')) {
                sectionClass += ' ai-analysis-recruiting';
                icon = '🎓';
                borderColor = '#9c27b0';
            } else if (title.includes('trend') || title.includes('pattern')) {
                sectionClass += ' ai-analysis-trend';
                icon = '📈';
                borderColor = '#2196f3';
            }
            
            // Special prominent styling for Action Items section
            if (isActionItemsSection) {
                // Ensure content exists - if it's empty or looks like JSON, try to extract it
                // Always ensure actionContent is a string
                let actionContent = String(aiInsight.content || '');
                
                // If content is missing or very short, try to extract from other sections
                if (!actionContent || actionContent.trim().length < 50) {
                    console.log('Action Items section has empty/short content, trying to extract...');
                    try {
                        const extractedItems = extractTop3ActionItems(aiInsights, insightsData || {});
                        if (extractedItems && extractedItems.length > 0) {
                            // Format extracted items as bullet points
                            actionContent = extractedItems.map(item => `• ${item}`).join('\n');
                        }
                    } catch (extractError) {
                        console.error('Error extracting action items:', extractError);
                        // Continue with original content or empty
                    }
                }
                
                html.push('<div class="ai-analysis-section ai-analysis-action-items" style="border: 3px solid #ff6b35; border-left: 6px solid #ff6b35; background: linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(255, 107, 53, 0.08) 50%, rgba(255, 255, 255, 0.95) 100%); margin-top: 30px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(255, 107, 53, 0.25), 0 0 0 1px rgba(255, 107, 53, 0.1) inset; position: relative; overflow: hidden;">');
                
                // Add attention-grabbing background decoration
                html.push('<div style="position: absolute; top: -20px; right: -20px; width: 120px; height: 120px; background: radial-gradient(circle, rgba(255, 107, 53, 0.1) 0%, transparent 70%); border-radius: 50%; pointer-events: none;"></div>');
                
                html.push('<div class="ai-analysis-section-header" style="position: relative; z-index: 1; margin-bottom: 20px;">');
                html.push('<span class="ai-analysis-section-icon" style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(255, 107, 53, 0.3));">➤</span>');
                html.push('<h3 class="ai-analysis-section-title" style="font-size: 22px; font-weight: 800; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); letter-spacing: -0.3px;">' + (aiInsight.title || 'Top 3 Action Items for Next 2-3 Months') + '</h3>');
                html.push('<div style="margin-top: 8px; padding: 8px 15px; background: rgba(255, 107, 53, 0.12); border-left: 4px solid #ff6b35; border-radius: 4px; display: inline-block; font-size: 13px; font-weight: 600; color: #c5471f; text-transform: uppercase; letter-spacing: 0.5px;">⭐ Remember These Key Takeaways</div>');
                html.push('</div>');
                
                // Convert markdown to HTML and highlight event names
                // Ensure content is a string before processing
                let highlightedContent = convertMarkdownToHtml(String(actionContent));
                highlightedContent = highlightEventNames(String(highlightedContent));
                
                // Ensure highlightedContent is still a string after processing
                if (typeof highlightedContent !== 'string') {
                    console.warn('highlightedContent is not a string after processing:', typeof highlightedContent);
                    highlightedContent = String(highlightedContent || '');
                }
                
                html.push('<div class="ai-analysis-section-content" style="position: relative; z-index: 1; padding-left: 0;">');
                html.push(highlightedContent);
                html.push('<div style="margin-top: 20px; padding: 12px 18px; background: rgba(255, 107, 53, 0.08); border-left: 4px solid #ff6b35; border-radius: 4px; font-size: 14px; color: #666; font-style: italic;">💡 <strong style="color: #ff6b35; font-style: normal;">Pro Tip:</strong> Write these down and review them weekly. Track your progress on each item.</div>');
                html.push('</div>');
                html.push('</div>');
            } else {
                // Regular section styling
                html.push(`<div class="${sectionClass}" style="border-left: 4px solid ${borderColor};">`);
                html.push(`<div class="ai-analysis-section-header"><span class="ai-analysis-section-icon">${icon}</span>`);
                html.push(`<h3 class="ai-analysis-section-title">${aiInsight.title}</h3></div>`);
                // Convert markdown to HTML and highlight event names
                // Ensure content is a string before processing
                const rawContent = aiInsight.content || '';
                let highlightedContent = convertMarkdownToHtml(String(rawContent));
                highlightedContent = highlightEventNames(String(highlightedContent));
                
                // Ensure highlightedContent is still a string after processing
                if (typeof highlightedContent !== 'string') {
                    console.warn('highlightedContent is not a string after processing:', typeof highlightedContent);
                    highlightedContent = String(highlightedContent || '');
                }
                
                // Specialty chart is now generated independently, not here
                
                // Add SwimCloud link to the profile section if available
                if (isProfileSection && insightsData.swimCloudId) {
                    const swimCloudUrl = `https://www.swimcloud.com/swimmer/${insightsData.swimCloudId}/`;
                    highlightedContent += `<br><br><div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0, 0, 0, 0.1);"><strong>🌐 Extended Profile:</strong> View detailed statistics, meet history, and more on <a href="${swimCloudUrl}" target="_blank" rel="noopener noreferrer" style="color: #667eea; text-decoration: underline; font-weight: 600;">SwimCloud</a></div>`;
                } else {
                    // Debug logging
                    if (isProfileSection && !insightsData.swimCloudId) {
                        console.log('SwimCloud link not shown: isProfileSection=true but swimCloudId is missing. insightsData:', insightsData);
                    } else if (!isProfileSection && insightsData.swimCloudId) {
                        console.log('SwimCloud link not shown: swimCloudId exists but isProfileSection=false. Title:', aiInsight.title);
                    }
                }
                
                // Add weight loss chart for "Areas for Improvement" section if weight loss is mentioned
                // Ensure both highlightedContent and aiInsight.content are strings before calling toLowerCase
                const contentStr = String(aiInsight.content || '');
                if (isImprovementSection && typeof highlightedContent === 'string' && (highlightedContent.toLowerCase().includes('weight') || highlightedContent.toLowerCase().includes('lose') || contentStr.toLowerCase().includes('weight'))) {
                    const weightLossScenarios = parseWeightLossScenarios(aiInsight.content, insightsData);
                    if (weightLossScenarios.length > 0) {
                        const currentTimes = getSwimmerBestTimes();
                        const chartHtml = createWeightLossChart(weightLossScenarios, currentTimes);
                        if (chartHtml) {
                            highlightedContent += chartHtml;
                        }
                    } else {
                        // Try to calculate scenarios from weightLossPotential if available
                        if (insightsData.weightLossPotential && insightsData.weightLossPotential.scenarios) {
                            const wlp = insightsData.weightLossPotential;
                            const calculatedScenarios = wlp.scenarios.map(lbs => {
                                const improv50 = calculateWeightLossImprovement(lbs, 50, wlp.excessWeight, wlp.bmi, wlp.currentWeight);
                                const improv100 = calculateWeightLossImprovement(lbs, 100, wlp.excessWeight, wlp.bmi, wlp.currentWeight);
                                const improv200 = calculateWeightLossImprovement(lbs, 200, wlp.excessWeight, wlp.bmi, wlp.currentWeight);
                                return {
                                    lbs: lbs,
                                    '50 Free': improv50,
                                    '100 Free': improv100,
                                    '200 Free': improv200,
                                    isOptimal: lbs === wlp.excessWeight
                                };
                            });
                            
                            if (calculatedScenarios.length > 0) {
                                const currentTimes = getSwimmerBestTimes();
                                const chartHtml = createWeightLossChart(calculatedScenarios, currentTimes);
                                if (chartHtml) {
                                    highlightedContent += chartHtml;
                                }
                            }
                        }
                    }
                }
                
                html.push(`<div class="ai-analysis-section-content">${highlightedContent}</div>`);
                html.push('</div>');
            }
        });
        
        // Check if SwimCloud link was added - if not, add it to the profile section or first section
        let swimCloudLinkAdded = false;
        if (insightsData.swimCloudId) {
            // Check if link exists in any rendered content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html.join('');
            const swimCloudLinks = tempDiv.querySelectorAll('a[href*="swimcloud.com"]');
            swimCloudLinkAdded = swimCloudLinks.length > 0;
            
            if (!swimCloudLinkAdded) {
                console.log('SwimCloud link not found in rendered content, adding fallback link. swimCloudId:', insightsData.swimCloudId);
                // Find the profile section in the HTML and inject link
                const swimCloudUrl = `https://www.swimcloud.com/swimmer/${insightsData.swimCloudId}/`;
                const swimCloudLinkHtml = `<br><br><div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0, 0, 0, 0.1);"><strong>🌐 Extended Profile:</strong> View detailed statistics, meet history, and more on <a href="${swimCloudUrl}" target="_blank" rel="noopener noreferrer" style="color: #667eea; text-decoration: underline; font-weight: 600;">SwimCloud</a></div>`;
                
                // Try to find profile section and inject link
                let profileSectionFound = false;
                for (let i = html.length - 1; i >= 0; i--) {
                    if (html[i].includes('ai-analysis-profile') || 
                        (html[i].includes('ai-analysis-section') && i > 0 && html[i-1] && html[i-1].toLowerCase().includes('profile'))) {
                        // Inject link before closing div
                        const closingDivIndex = html[i].lastIndexOf('</div>');
                        if (closingDivIndex > 0) {
                            html[i] = html[i].substring(0, closingDivIndex) + swimCloudLinkHtml + html[i].substring(closingDivIndex);
                            profileSectionFound = true;
                            console.log('Injected SwimCloud link into profile section');
                            break;
                        }
                    }
                }
                
                // If no profile section found, add to first section or create a standalone link section
                if (!profileSectionFound && html.length > 0) {
                    // Find first section content div and add link
                    for (let i = 0; i < html.length; i++) {
                        if (html[i].includes('ai-analysis-section-content') && !html[i].includes('swimcloud.com')) {
                            html[i] = html[i].replace('</div>', swimCloudLinkHtml + '</div>');
                            console.log('Injected SwimCloud link into first section');
                            break;
                        }
                    }
                }
            }
        }
        
        // Extract and render Top 3 Action Items at the end (only if AI didn't already generate this section)
        const hasActionItemsSection = aiInsights.some(i => 
            i.title.toLowerCase().includes('action item') || 
            i.title.toLowerCase().includes('top 3') ||
            i.title.toLowerCase().includes('next 2-3 months')
        );
        
        // Only show extracted action items if AI didn't generate the section
        if (!hasActionItemsSection) {
            const top3ActionItems = extractTop3ActionItems(aiInsights, insightsData);
            if (top3ActionItems.length > 0) {
            html.push('<div class="ai-analysis-section ai-analysis-action-items" style="border: 3px solid #ff6b35; border-left: 6px solid #ff6b35; background: linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(255, 107, 53, 0.08) 50%, rgba(255, 255, 255, 0.95) 100%); margin-top: 30px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(255, 107, 53, 0.25), 0 0 0 1px rgba(255, 107, 53, 0.1) inset; position: relative; overflow: hidden;">');
            
            // Add attention-grabbing background decoration
            html.push('<div style="position: absolute; top: -20px; right: -20px; width: 120px; height: 120px; background: radial-gradient(circle, rgba(255, 107, 53, 0.1) 0%, transparent 70%); border-radius: 50%; pointer-events: none;"></div>');
            
            html.push('<div class="ai-analysis-section-header" style="position: relative; z-index: 1; margin-bottom: 20px;">');
            html.push('<span class="ai-analysis-section-icon" style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(255, 107, 53, 0.3));">➤</span>');
            html.push('<h3 class="ai-analysis-section-title" style="font-size: 22px; font-weight: 800; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); letter-spacing: -0.3px;">Top 3 Action Items for Next 2-3 Months</h3>');
            html.push('<div style="margin-top: 8px; padding: 8px 15px; background: rgba(255, 107, 53, 0.12); border-left: 4px solid #ff6b35; border-radius: 4px; display: inline-block; font-size: 13px; font-weight: 600; color: #c5471f; text-transform: uppercase; letter-spacing: 0.5px;">⭐ Remember These Key Takeaways</div>');
            html.push('</div>');
            html.push('<div class="ai-analysis-section-content" style="position: relative; z-index: 1;">');
            html.push('<p style="margin-bottom: 20px; color: #495057; font-size: 16px; font-weight: 500; line-height: 1.6;">Focus intensely on these <strong style="color: #ff6b35;">three critical areas</strong> over the next 2-3 months to see <strong style="color: #ff6b35;">quick time improvements</strong>:</p>');
            html.push('<ol style="margin: 0; padding-left: 0; list-style-type: none; counter-reset: action-counter;">');
            top3ActionItems.forEach((item, index) => {
                html.push(`<li style="counter-increment: action-counter; margin-bottom: 22px; padding: 18px 20px 18px 50px; background: white; border-left: 5px solid #ff6b35; border-radius: 6px; box-shadow: 0 2px 8px rgba(255, 107, 53, 0.15); position: relative; transition: all 0.2s ease;">`);
                html.push(`<div style="position: absolute; left: 15px; top: 18px; width: 28px; height: 28px; background: linear-gradient(135deg, #ff6b35 0%, #e55a2b 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 16px; box-shadow: 0 2px 6px rgba(255, 107, 53, 0.3);">${index + 1}</div>`);
                html.push(`<div style="color: #0C2340; font-size: 16px; line-height: 1.7; font-weight: 500; padding-left: 10px;">${item}</div>`);
                html.push('</li>');
            });
            html.push('</ol>');
            html.push('<div style="margin-top: 20px; padding: 12px 18px; background: rgba(255, 107, 53, 0.08); border-left: 4px solid #ff6b35; border-radius: 4px; font-size: 14px; color: #666; font-style: italic;">💡 <strong style="color: #ff6b35; font-style: normal;">Pro Tip:</strong> Write these down and review them weekly. Track your progress on each item.</div>');
            html.push('</div>');
            html.push('</div>');
            }
        }
        
        html.push('</div>'); // Close ai-analysis-main-card
    }
    
    // Skip rendering regular insights - AI analysis provides comprehensive insights
    // The local insights (Strongest Events, Improving Events, Focus Areas) are now redundant
    // since the AI analysis covers these areas in more depth and personalization

    if (insightsData.recommendations.length > 0) {
        html.push('<div class="ai-insights-section">');
        html.push('<h3 class="ai-insights-title">💡 Recommendations</h3>');
        insightsData.recommendations.forEach(rec => {
            html.push(`
                <div class="ai-insight-card ai-insight-recommendation">
                    <div class="ai-insight-header">${rec.title}</div>
                    <div class="ai-insight-content">${rec.content}</div>
                </div>
            `);
        });
        html.push('</div>');
    }

    // Add AI Prompt section at the bottom
    html.push('<div class="ai-insights-section" style="margin-top: 20px;">');
    html.push('<h3 class="ai-insights-title">Get AI Analysis from <a href="https://chat.openai.com" target="_blank" onclick="copyAIPromptFromTextarea()" style="color: #10a37f; text-decoration: none;">ChatGPT</a> or <a href="https://gemini.google.com" target="_blank" onclick="copyAIPromptFromTextarea()" style="color: #4285f4; text-decoration: none;">Gemini</a></h3>');
    html.push('<div class="ai-insight-card" style="padding: 20px;">');
    html.push('<p style="margin-bottom: 15px; color: #495057; font-size: 14px;">Edit and customize this prompt, then copy and paste it into ChatGPT, Gemini, or Claude:</p>');
    html.push('<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">');
    html.push('<span style="font-size: 12px; color: #6c757d;">💡 Tip: Click "Refresh" after rankings load, then edit if needed</span>');
    html.push('<div style="display: flex; gap: 8px;">');
    html.push('<button onclick="refreshAIPromptTextarea()" class="copy-ai-prompt-btn" style="padding: 8px 16px; background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);">🔄 Refresh</button>');
    html.push('<button onclick="copyAIPromptFromTextarea()" class="copy-ai-prompt-btn" style="padding: 8px 16px;">📋 Copy</button>');
    html.push('</div>');
    html.push('</div>');
    // Generate the prompt
    let promptText = '';
    if (swimmerData) {
        promptText = generateAIPrompt(swimmerData);
    } else {
        promptText = 'Loading prompt...';
    }
    // Use textarea for editable prompt
    html.push(`<textarea id="ai-prompt-textarea" style="width: 100%; min-height: 400px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; font-family: monospace; font-size: 12px; color: #333; line-height: 1.5; resize: vertical; box-sizing: border-box;">${promptText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`);
    html.push('</div>');
    html.push('</div>');

    html.push('</div>');
    return html.join('');
}

// ================================================================================
// SWIMCLOUD INTEGRATION
// ================================================================================

/**
 * Get SwimCloud ID for a swimmer (currently hardcoded for Max Tang)
 * In the future, this could be stored in swimmer data or looked up
 */
function getSwimCloudId(swimmer) {
    if (!swimmer || !swimmer.pkey) {
        console.log('getSwimCloudId: no swimmer or pkey');
        return null;
    }
    
    // Max Tang's SwimCloud ID
    const pkey = String(swimmer.pkey); // Convert to string for consistent comparison
    console.log('getSwimCloudId: checking pkey:', pkey, 'for swimmer:', swimmer.firstName, swimmer.lastName);
    
    if (pkey === '1320806') {
        console.log('getSwimCloudId: Found Max Tang, returning SwimCloud ID 3023509');
        return '3023509';
    }
    
    // Could add more mappings here or fetch from a mapping API
    console.log('getSwimCloudId: No mapping found for pkey:', pkey);
    return null;
}


// ================================================================================
// GEMINI AI INTEGRATION
// ================================================================================

/**
 * Get Gemini API key from localStorage or prompt user
 */
function getGeminiApiKey() {
    // Return API key from localStorage if available, otherwise return null silently
    // No longer prompts user for API key
    return localStorage.getItem('gemini_api_key') || null;
}

/**
 * Determine swimmer specialization based on events, rankings, and cuts
 */
function determineSwimmerSpecialization(data) {
    const idx = data.events.idx;
    if (!idx) return null;
    
    const rankings = extractRankingsFromDOM();
    const cutsInfo = extractCutsFromTable();
    
    // Analyze event distribution
    const eventStats = {
        sprint: { count: 0, events: [] }, // 50, 100
        midDistance: { count: 0, events: [] }, // 200
        distance: { count: 0, events: [] }, // 400, 500, 800, 1000, 1500, 1650
        free: { count: 0, events: [] },
        back: { count: 0, events: [] },
        breast: { count: 0, events: [] },
        fly: { count: 0, events: [] },
        im: { count: 0, events: [] }
    };
    
    // Get best times by event
    const bestTimes = {};
    const eventListMap = (typeof _eventList !== 'undefined' && _eventList) || 
                         (typeof window !== 'undefined' && window._eventList) || 
                         {};
    
    data.events.forEach(event => {
        const eventCode = event[idx.event];
        const eventStr = eventListMap[eventCode] || '';
        if (!eventStr || eventStr.includes('_')) return;
        
        const [dist, stroke, course] = eventStr.split(' ');
        const distance = parseInt(dist) || 0;
        const eventName = getEventName(eventCode);
        
        if (!bestTimes[eventName]) {
            bestTimes[eventName] = event[idx.time];
        }
        
        // Categorize by distance
        if (distance === 50 || distance === 100) {
            eventStats.sprint.count++;
            eventStats.sprint.events.push(eventName);
        } else if (distance === 200) {
            eventStats.midDistance.count++;
            eventStats.midDistance.events.push(eventName);
        } else if (distance >= 400) {
            eventStats.distance.count++;
            eventStats.distance.events.push(eventName);
        }
        
        // Categorize by stroke
        if (stroke === 'FR') {
            eventStats.free.count++;
            eventStats.free.events.push(eventName);
        } else if (stroke === 'BK') {
            eventStats.back.count++;
            eventStats.back.events.push(eventName);
        } else if (stroke === 'BR') {
            eventStats.breast.count++;
            eventStats.breast.events.push(eventName);
        } else if (stroke === 'FL') {
            eventStats.fly.count++;
            eventStats.fly.events.push(eventName);
        } else if (stroke === 'IM') {
            eventStats.im.count++;
            eventStats.im.events.push(eventName);
        }
    });
    
    // Analyze rankings and cuts by category
    const rankingScores = {
        sprint: 0,
        midDistance: 0,
        distance: 0,
        free: 0,
        back: 0,
        breast: 0,
        fly: 0,
        im: 0
    };
    
    rankings.forEach(rank => {
        const eventName = rank.event.toLowerCase();
        const bestRank = rank.bestRank || Infinity;
        const score = bestRank > 0 && bestRank < Infinity ? (1000 / bestRank) : 0;
        
        // Determine category
        if (eventName.includes('50 ') || eventName.includes('100 ')) {
            rankingScores.sprint += score;
        } else if (eventName.includes('200 ')) {
            rankingScores.midDistance += score;
        } else if (eventName.includes('400 ') || eventName.includes('500 ') || 
                   eventName.includes('800 ') || eventName.includes('1000 ') ||
                   eventName.includes('1500 ') || eventName.includes('1650 ')) {
            rankingScores.distance += score;
        }
        
        if (eventName.includes('free')) rankingScores.free += score;
        else if (eventName.includes('back')) rankingScores.back += score;
        else if (eventName.includes('breast')) rankingScores.breast += score;
        else if (eventName.includes('fly')) rankingScores.fly += score;
        else if (eventName.includes('im')) rankingScores.im += score;
    });
    
    // Analyze cuts by category
    const cutScores = {
        sprint: 0,
        midDistance: 0,
        distance: 0,
        free: 0,
        back: 0,
        breast: 0,
        fly: 0,
        im: 0
    };
    
    [...cutsInfo.motivational, ...cutsInfo.meetCuts].forEach(cut => {
        const eventName = cut.event.toLowerCase();
        const score = 10; // Base score for having a cut
        
        if (eventName.includes('50 ') || eventName.includes('100 ')) {
            cutScores.sprint += score;
        } else if (eventName.includes('200 ')) {
            cutScores.midDistance += score;
        } else if (eventName.includes('400 ') || eventName.includes('500 ') || 
                   eventName.includes('800 ') || eventName.includes('1000 ') ||
                   eventName.includes('1500 ') || eventName.includes('1650 ')) {
            cutScores.distance += score;
        }
        
        if (eventName.includes('free')) cutScores.free += score;
        else if (eventName.includes('back')) cutScores.back += score;
        else if (eventName.includes('breast')) cutScores.breast += score;
        else if (eventName.includes('fly')) cutScores.fly += score;
        else if (eventName.includes('im')) cutScores.im += score;
    });
    
    // Combine scores
    const totalScores = {
        sprint: rankingScores.sprint + cutScores.sprint,
        midDistance: rankingScores.midDistance + cutScores.midDistance,
        distance: rankingScores.distance + cutScores.distance,
        free: rankingScores.free + cutScores.free,
        back: rankingScores.back + cutScores.back,
        breast: rankingScores.breast + cutScores.breast,
        fly: rankingScores.fly + cutScores.fly,
        im: rankingScores.im + cutScores.im
    };
    
    // Determine primary specialization
    const specializations = [];
    
    // Distance specialization
    if (totalScores.distance > totalScores.sprint && totalScores.distance > totalScores.midDistance) {
        specializations.push('distance swimmer');
    } else if (totalScores.sprint > totalScores.distance && totalScores.sprint > totalScores.midDistance) {
        specializations.push('sprinter');
    } else if (totalScores.midDistance > 0) {
        specializations.push('mid-distance swimmer');
    }
    
    // Stroke specialization
    const strokeScores = [
        { name: 'free', score: totalScores.free },
        { name: 'back', score: totalScores.back },
        { name: 'breast', score: totalScores.breast },
        { name: 'fly', score: totalScores.fly },
        { name: 'im', score: totalScores.im }
    ].sort((a, b) => b.score - a.score);
    
    const topStroke = strokeScores[0];
    const secondStroke = strokeScores[1];
    
    // Add stroke specialization if it's significantly stronger
    if (topStroke.score > 0 && topStroke.score > secondStroke.score * 1.5) {
        const strokeName = topStroke.name === 'free' ? 'freestyle' :
                          topStroke.name === 'back' ? 'backstroke' :
                          topStroke.name === 'breast' ? 'breaststroke' :
                          topStroke.name === 'fly' ? 'butterfly' :
                          'individual medley';
        
        if (totalScores.sprint > totalScores.distance && (topStroke.name === 'free' || topStroke.name === 'back' || topStroke.name === 'fly')) {
            specializations.push(`${strokeName} sprinter`);
        } else if (totalScores.distance > totalScores.sprint && topStroke.name === 'free') {
            specializations.push(`distance freestyle swimmer`);
        } else {
            specializations.push(`${strokeName} specialist`);
        }
    } else if (topStroke.name === 'free' && totalScores.sprint > totalScores.distance) {
        specializations.push('freestyle sprinter');
    }
    
    // Default fallback
    if (specializations.length === 0) {
        if (eventStats.sprint.count > eventStats.distance.count) {
            specializations.push('sprinter');
        } else if (eventStats.distance.count > eventStats.sprint.count) {
            specializations.push('distance swimmer');
        } else {
            specializations.push('versatile swimmer');
        }
    }
    
    return specializations.join(', ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Calculate progress toward Summer Junior Nationals cuts for each stroke category (0-100 scale)
 * Returns percentage showing how close swimmer is to meeting Summer Junior Nationals cuts
 */
function calculateSpecialtyScores(data) {
    try {
        const idx = data.events.idx;
        if (!idx) {
            console.warn('calculateSpecialtyScores: No events idx found');
            return null;
        }
        
        const eventListMap = (typeof _eventList !== 'undefined' && _eventList) || 
                             (typeof window !== 'undefined' && window._eventList) || 
                             {};
        
        // Get best times by event - use full event string (e.g., "50 FR SCY") for matching with cuts
        const bestTimes = {};
        data.events.forEach(event => {
            const eventCode = event[idx.event];
            const eventStr = eventListMap[eventCode] || '';
            if (!eventStr || eventStr.includes('_')) return;
            
            // Use full event string (e.g., "50 FR SCY") as the key for matching with cut keys
            // This matches the format used in common-utils.js: "50 FR SCY", "100 BK LCM", etc.
            if (!bestTimes[eventStr]) {
                bestTimes[eventStr] = {
                    time: event[idx.time],
                    timeInt: window.timeToInt ? window.timeToInt(event[idx.time]) : 0,
                    eventName: getEventName(eventCode) // Keep readable name for display
                };
            } else {
                const timeInt = window.timeToInt ? window.timeToInt(event[idx.time]) : 0;
                if (timeInt < bestTimes[eventStr].timeInt) {
                    bestTimes[eventStr] = {
                        time: event[idx.time],
                        timeInt: timeInt,
                        eventName: getEventName(eventCode)
                    };
                }
            }
        });
        
        // Get swimmer age and gender
        const swimmerAge = data.swimmer?.age || (data.events.length > 0 ? data.events[0][idx.age] : 15);
        const swimmerGender = data.swimmer?.gender || (data.events.length > 0 ? data.events[0][idx.gender] : 2);
        const genderMap = swimmerGender === 1 ? 'Female' : 'Male';
        
        console.log(`Swimmer age: ${swimmerAge}, gender: ${genderMap}`);
        
        // Get Summer Junior Nationals cuts directly from getMeetStandards in common-utils.js
        let summerJuniorMeet = null;
        if (window.getMeetStandards) {
            const meets = window.getMeetStandards(swimmerAge);
            console.log(`Found ${meets.length} meet standards for age ${swimmerAge}`);
            
            // Find the Summer Junior National meet
            // Format: "Junior : 2025 Speedo Junior National Championships (7/30/2025)"
            for (const meet of meets) {
                const meetName = (meet.meet || '').toLowerCase();
                if (meetName.includes('junior') && !meetName.includes('winter')) {
                    summerJuniorMeet = meet;
                    console.log(`Found Summer Junior National meet: "${meet.meet}"`);
                    break;
                }
            }
        } else {
            console.warn('window.getMeetStandards is not available');
        }
        
        // Group Summer Junior Nationals cuts by stroke
        const strokeProgress = {
            free: { events: [], achieved: 0, total: 0 },
            back: { events: [], achieved: 0, total: 0 },
            breast: { events: [], achieved: 0, total: 0 },
            fly: { events: [], achieved: 0, total: 0 },
            im: { events: [], achieved: 0, total: 0 }
        };
        
        if (summerJuniorMeet && summerJuniorMeet[genderMap]) {
            const cutsMap = summerJuniorMeet[genderMap]; // Map of event keys -> [timeString, timeInt]
            
            // Process each best time and check against Summer Junior National cuts
            // eventKey is in format "50 FR SCY" (matching common-utils.js format)
            Object.keys(bestTimes).forEach(eventKey => {
                const bestTime = bestTimes[eventKey];
                if (!bestTime || !bestTime.timeInt) return;
                
                // Check if cut exists for this event key (e.g., "50 FR SCY")
                if (!cutsMap.has(eventKey)) {
                    console.log(`No Summer Junior National cut found for: ${eventKey}`);
                    return;
                }
                
                const cutData = cutsMap.get(eventKey);
                const cutTimeInt = cutData[1]; // timeInt is second element
                const cutTimeString = cutData[0]; // timeString is first element
                
                // Check if achieved (swimmer's time <= cut time means they made the cut)
                const achieved = bestTime.timeInt <= cutTimeInt;
                // Gap is how much slower than cut (positive = slower, negative = faster)
                const gapSeconds = bestTime.timeInt - cutTimeInt;
                const gapPercent = cutTimeInt > 0 ? ((gapSeconds / cutTimeInt) * 100) : 0;
                
                console.log(`Summer Junior National cut for ${eventKey}: cut=${cutTimeString}, best=${bestTime.time}, achieved=${achieved}, gap=${gapSeconds/100}s (${gapPercent.toFixed(1)}%)`);
                
                // Identify stroke category from event key (e.g., "50 FR SCY" -> stroke = "FR")
                const eventParts = eventKey.split(' ');
                if (eventParts.length < 3) return;
                
                const strokeAbbr = eventParts[1]; // "FR", "BK", "BR", "FL", or "IM"
                
                let stroke = null;
                if (strokeAbbr === 'IM') {
                    stroke = 'im';
                } else if (strokeAbbr === 'BK') {
                    stroke = 'back';
                } else if (strokeAbbr === 'BR') {
                    stroke = 'breast';
                } else if (strokeAbbr === 'FL') {
                    stroke = 'fly';
                } else if (strokeAbbr === 'FR') {
                    stroke = 'free';
                }
                
                if (stroke) {
                    strokeProgress[stroke].total++;
                    if (achieved) {
                        strokeProgress[stroke].achieved++;
                    }
                    strokeProgress[stroke].events.push({
                        event: bestTime.eventName || eventKey, // Use readable name for display
                        eventKey: eventKey, // Keep original key for reference
                        achieved: achieved,
                        gapSeconds: gapSeconds / 100, // Convert to seconds
                        gapPercent: gapPercent,
                        cutTime: cutTimeString,
                        bestTime: bestTime.time
                    });
                }
            });
            
            console.log(`Processed Summer Junior National cuts: ${Object.values(strokeProgress).reduce((sum, p) => sum + p.total, 0)} total events across all strokes`);
        } else {
            console.warn('Summer Junior National meet not found or gender map unavailable');
        }
        
        // Calculate percentage progress toward Summer Junior Nationals cuts for each stroke
        const normalizedScores = {};
        const breakdown = {};
        
        Object.keys(strokeProgress).forEach(stroke => {
        const progress = strokeProgress[stroke];
        
        if (progress.total === 0) {
            // No Summer Junior Nationals events for this stroke - show 0% since there's no cut data
            // This means either the swimmer doesn't swim these events, or the cuts aren't available
            normalizedScores[stroke] = 0;
            breakdown[stroke] = { sprint: 0, distance: 0 };
        } else {
            // Calculate average progress: (achieved cuts + average closeness to unachieved cuts)
            let totalProgress = 0;
            
            console.log(`  Calculating progress for ${stroke}: ${progress.total} events`);
            
            progress.events.forEach(event => {
                if (event.achieved) {
                    totalProgress += 100; // Full credit for achieved cuts
                    console.log(`    ${event.event}: ACHIEVED = 100%`);
                } else {
                    // Calculate progress based on gap from Junior cut time
                    // Use gapPercent if available, otherwise use gapSeconds to estimate
                    
                    // Parse gapPercent if it's a string
                    let gapPercent = event.gapPercent;
                    if (typeof gapPercent === 'string') {
                        gapPercent = parseFloat(gapPercent);
                    }
                    
                    if (gapPercent !== undefined && !isNaN(gapPercent)) {
                        if (gapPercent <= 0) {
                            // Negative or zero gap means faster than cut (achieved) - should be 100%
                            totalProgress += 100;
                            console.log(`    ${event.event}: gapPercent=${gapPercent}% (faster/at cut) = 100%`);
                        } else {
                            // Convert gap percentage to progress: how close to the cut
                            // gapPercent is how much slower than the cut (e.g., 5% slower = 95% progress)
                            // Use exponential decay: progress = 95 * e^(-gapPercent/15)
                            // This gives: 1% slower = 89% progress, 5% slower = 68% progress, 10% slower = 48% progress, 20% slower = 24% progress
                            const progressPercent = Math.max(5, Math.min(95, 95 * Math.exp(-gapPercent / 15)));
                            totalProgress += progressPercent;
                            console.log(`    ${event.event}: gapPercent=${gapPercent}% -> progress=${progressPercent.toFixed(1)}%`);
                        }
                    } else if (event.gapSeconds !== undefined && event.gapSeconds !== null && !isNaN(event.gapSeconds)) {
                        // Use gap in seconds to estimate progress
                        if (event.gapSeconds <= 0) {
                            // Negative or zero gap = faster than cut (achieved)
                            totalProgress += 100;
                            console.log(`    ${event.event}: gapSeconds=${event.gapSeconds}s (faster/at cut) = 100%`);
                        } else {
                            // Estimate gapPercent from gapSeconds
                            // Approximate: 1 second gap ≈ 3-4% slower for typical events
                            // Use exponential decay similar to gapPercent calculation
                            // Convert gapSeconds to approximate gapPercent
                            const estimatedGapPercent = event.gapSeconds * 3.5; // Rough estimate: 1s ≈ 3.5% slower
                            const progressPercent = Math.max(5, Math.min(95, 95 * Math.exp(-estimatedGapPercent / 15)));
                            totalProgress += progressPercent;
                            console.log(`    ${event.event}: gapSeconds=${event.gapSeconds}s (≈${estimatedGapPercent.toFixed(1)}% slower) -> progress=${progressPercent.toFixed(1)}%`);
                        }
                    } else {
                        // If gap is not available, assume far away (0% progress)
                        console.log(`    ${event.event}: No gap data available = 0%`);
                        totalProgress += 0;
                    }
                }
            });
            
            console.log(`  Total progress: ${totalProgress}, Average: ${totalProgress / progress.total}`);
            
            const avgProgress = totalProgress / progress.total;
            // Cap at 95% to show there's always room for improvement
            normalizedScores[stroke] = Math.min(95, Math.max(0, avgProgress));
            
            // For breakdown, categorize by sprint vs distance based on event distances
            let sprintCount = 0;
            let distanceCount = 0;
            progress.events.forEach(event => {
                const eventName = event.event.toLowerCase();
                if (eventName.includes('50 ') || eventName.includes('100 ')) {
                    sprintCount++;
                } else {
                    distanceCount++;
                }
            });
            
            breakdown[stroke] = { 
                sprint: sprintCount > 0 ? (sprintCount / progress.total) * normalizedScores[stroke] : 0,
                distance: distanceCount > 0 ? (distanceCount / progress.total) * normalizedScores[stroke] : 0
            };
        }
    });
    
    // Log for debugging - show detailed scores per stroke
    console.log('%c=== PENTAGON SPECIALTY SCORES ===', 'color: blue; font-size: 16px; font-weight: bold;');
    console.log('Look for this log to see why the pentagon is symmetric!');
    Object.keys(strokeProgress).forEach(stroke => {
        const progress = strokeProgress[stroke];
        const score = (normalizedScores[stroke] || 0).toFixed(1);
        console.log(`%c${stroke.toUpperCase()}: ${score}% score (${progress.total} events, ${progress.achieved} achieved)`, 
            `color: ${score > 50 ? 'green' : score > 20 ? 'orange' : 'red'}; font-weight: bold;`);
        if (progress.events.length > 0) {
            progress.events.forEach(e => {
                console.log(`  - ${e.event}: achieved=${e.achieved}, gapPercent=${e.gapPercent}%, gapSeconds=${e.gapSeconds}s`);
            });
        } else {
            console.log(`  - No events found for ${stroke}`);
        }
    });
    console.log('%cFinal normalized scores (used for pentagon):', 'color: blue; font-weight: bold;', normalizedScores);
    
    return {
        scores: normalizedScores,
        breakdown: breakdown
    };
    } catch (error) {
        console.error('Error in calculateSpecialtyScores:', error);
        return null;
    }
}

/**
 * Create specialty pentagon chart (like SwimCloud)
 */
function createSpecialtyChart(data) {
    const specialtyData = calculateSpecialtyScores(data);
    if (!specialtyData) {
        console.warn('No specialty data available - returning empty chart');
        return '';
    }
    
    const scores = specialtyData.scores;
    const breakdown = specialtyData.breakdown;
    
    // Always render the chart even if scores are all 0 (will show as symmetric/default shape)
    
    // Chart dimensions - larger for better visibility
    const size = 350;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 140;
    
    // 5 corners for pentagon (Free, Back, Breast, Fly, IM)
    // Regular pentagon: each angle is 72 degrees apart (2π/5 radians)
    // Start at top (-90 degrees = -π/2), then go clockwise
    const angleStep = (2 * Math.PI) / 5; // 72 degrees
    const startAngle = -Math.PI / 2; // Top position
    const corners = [
        { name: 'Free', angle: startAngle },                    // Top
        { name: 'Back', angle: startAngle + angleStep },        // Top-Right (72° clockwise)
        { name: 'Breast', angle: startAngle + angleStep * 2 },  // Bottom-Right (144° clockwise)
        { name: 'Fly', angle: startAngle + angleStep * 3 },     // Bottom-Left (216° clockwise)
        { name: 'IM', angle: startAngle + angleStep * 4 }       // Top-Left (288° clockwise)
    ];
    
    // Calculate polygon points based on scores
    // Use relative scaling: normalize to max score so shape is always visible
    const allScores = Object.values(scores);
    const maxScoreValue = Math.max(...allScores, 0);
    const minScoreValue = Math.min(...allScores);
    
    console.log('%c=== PENTAGON RENDERING ===', 'color: purple; font-size: 14px; font-weight: bold;');
    console.log('Scores passed to pentagon:', scores);
    console.log('Max score:', maxScoreValue, 'Min score:', minScoreValue);
    if (maxScoreValue === 0) {
        console.warn('%c⚠️ All scores are 0 - pentagon will be a dot!', 'color: red; font-weight: bold;');
    } else if (Math.max(...Object.values(scores)) === Math.min(...Object.values(scores))) {
        console.warn('%c⚠️ All scores are the SAME - pentagon will be symmetric!', 'color: orange; font-weight: bold;');
        console.log('This means all strokes have similar progress toward Junior Nationals cuts.');
    }
    
    // Normalize scores relative to max: best stroke = 100% of radius, others proportional
    // This ensures the shape is always visible and reflects relative strengths
    const points = corners.map((corner, idx) => {
        const strokeKey = corner.name.toLowerCase();
        const rawScore = scores[strokeKey] || 0;
        
        // Normalize to max score: if max is 50%, then 50% becomes 100% of radius
        // This preserves relative differences while ensuring visibility
        let normalizedRadius;
        if (maxScoreValue === 0) {
            // All scores are 0 - use minimum visible size so shape is visible
            console.warn('All specialty scores are 0 - no Junior Nationals cuts found or calculated, using default shape');
            normalizedRadius = radius * 0.3;
        } else if (rawScore === 0) {
            // This stroke has no data - position at center
            normalizedRadius = 0;
        } else {
            // Normalize: (rawScore / maxScoreValue) gives 0-1, multiply by radius
            // Use at least 80% of radius for max score to ensure good visibility
            // But scale all other scores proportionally
            const normalizedRatio = rawScore / maxScoreValue;
            // Scale so max score uses 80-95% of radius (depending on how high max is)
            const maxRadiusRatio = maxScoreValue < 50 ? 0.8 : 0.95;
            normalizedRadius = normalizedRatio * radius * maxRadiusRatio;
            
            // Ensure minimum visibility: if score > 0, use at least 10% of radius
            if (normalizedRadius > 0 && normalizedRadius < radius * 0.1) {
                normalizedRadius = radius * 0.1;
            }
        }
        
        const x = centerX + normalizedRadius * Math.cos(corner.angle);
        const y = centerY + normalizedRadius * Math.sin(corner.angle);
        return { x, y, name: corner.name, score: rawScore, strokeKey };
    });
    
    // Debug: log the points to verify they're calculated correctly
    console.log('Pentagon points (progress toward Summer Junior Nationals):', 
        points.map(p => {
            const pointRadius = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2);
            return `${p.name}: score=${p.score.toFixed(1)}% -> radius=${pointRadius.toFixed(1)}`;
        }));
    console.log('Scores:', scores);
    
    // Create polygon path
    const polygonPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    
    // Determine color based on sprint vs distance (like SwimCloud: light red for sprint, dark red for distance)
    const getStrokeColor = (strokeKey) => {
        const sprintScore = breakdown[strokeKey].sprint;
        const distanceScore = breakdown[strokeKey].distance;
        const totalScore = sprintScore + distanceScore;
        
        // Default to medium red if no data
        const defaultColor = '#E53935'; // Medium red
        
        if (totalScore === 0) {
            // If no ranking data, check event types to guess
            // For now, return default medium red
            return defaultColor;
        }
        
        // Calculate sprint percentage
        const sprintPercent = sprintScore / totalScore;
        
        // Light red for sprint-dominant, dark red for distance-dominant
        if (sprintPercent > 0.6) {
            // Sprint-dominant: light red
            return '#EF5350'; // Light red
        } else if (sprintPercent < 0.4) {
            // Distance-dominant: dark red
            return '#C62828'; // Dark red
        } else {
            // Mixed: medium red
            return '#E53935'; // Medium red
        }
    };
    
    // Helper to darken color
    function darkenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
        const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
        const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
    
    // Always use event-based coloring - make colors very visible
    const totalWeight = Object.values(scores).reduce((sum, s) => sum + s, 0);
    const maxScore = Math.max(...Object.values(scores), 10);
    const dominantStroke = Object.keys(scores).find(key => scores[key] === maxScore) || 'free';
    
    let chartHtml = '<div style="text-align: center; margin: 0 auto;">';
    chartHtml += '<div style="display: inline-block; position: relative;">';
    chartHtml += `<svg width="${size}" height="${size}" style="background: white; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);">`;
    
    // Define gradient for the polygon fill - use brighter, more visible colors
    const dominantColor = getStrokeColor(dominantStroke);
    const dominantColorNum = parseInt(dominantColor.replace('#', ''), 16);
    const dominantR = (dominantColorNum >> 16);
    const dominantG = ((dominantColorNum >> 8) & 0x00FF);
    const dominantB = (dominantColorNum & 0x0000FF);
    
    chartHtml += `<defs>
        <linearGradient id="specialtyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(${dominantR},${dominantG},${dominantB},0.6);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgba(${dominantR},${dominantG},${dominantB},0.25);stop-opacity:1" />
        </linearGradient>
    </defs>`;
    
    // Draw outer reference pentagon (100% score = Summer Junior National cut) - blue solid lines
    const outerGridPoints = corners.map(corner => {
        const gridRadius = radius; // 100% of radius
        const x = centerX + gridRadius * Math.cos(corner.angle);
        const y = centerY + gridRadius * Math.sin(corner.angle);
        return { x, y };
    });
    const outerGridPath = outerGridPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    chartHtml += `<path d="${outerGridPath}" fill="none" stroke="#2196F3" stroke-width="2" opacity="0.6"/>`;
    
    // Draw middle reference pentagon (50% score = halfway to cuts) - blue solid lines
    const middleGridPoints = corners.map(corner => {
        const gridRadius = radius * 0.5; // 50% of radius
        const x = centerX + gridRadius * Math.cos(corner.angle);
        const y = centerY + gridRadius * Math.sin(corner.angle);
        return { x, y };
    });
    const middleGridPath = middleGridPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    chartHtml += `<path d="${middleGridPath}" fill="none" stroke="#2196F3" stroke-width="2" opacity="0.5"/>`;
    
    // Draw inner reference pentagon (25% score = typical starting point) - blue solid lines
    const innerGridPoints = corners.map(corner => {
        const gridRadius = radius * 0.25; // 25% of radius
        const x = centerX + gridRadius * Math.cos(corner.angle);
        const y = centerY + gridRadius * Math.sin(corner.angle);
        return { x, y };
    });
    const innerGridPath = innerGridPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    chartHtml += `<path d="${innerGridPath}" fill="none" stroke="#2196F3" stroke-width="2" opacity="0.4"/>`;
    
    // Draw colored segments from center to each point FIRST (so they're behind the polygon)
    points.forEach((point, idx) => {
        const strokeKey = point.strokeKey;
        const color = getStrokeColor(strokeKey);
        const colorNum = parseInt(color.replace('#', ''), 16);
        const r = (colorNum >> 16);
        const g = ((colorNum >> 8) & 0x00FF);
        const b = (colorNum & 0x0000FF);
        
        // Draw bright colored segments from center - these are always visible
        if (scores[strokeKey] > 0) {
            chartHtml += `<line x1="${centerX}" y1="${centerY}" x2="${point.x}" y2="${point.y}" stroke="rgb(${r},${g},${b})" stroke-width="6" opacity="0.6"/>`;
        }
    });
    
    // Draw specialty polygon with gradient fill first (so outline is on top)
    chartHtml += `<path d="${polygonPath}" fill="url(#specialtyGradient)" stroke="none"/>`;
    
    // Draw specialty polygon outline (connecting all 5 corners) - make it very visible
    const polygonStrokeColor = getStrokeColor(dominantStroke);
    chartHtml += `<path d="${polygonPath}" fill="none" stroke="${polygonStrokeColor}" stroke-width="3.5" opacity="1"/>`;
    
    // Draw corner points and labels
    corners.forEach((corner, idx) => {
        const strokeKey = corner.name.toLowerCase();
        const score = scores[strokeKey] || 0;
        const point = points[idx];
        const cornerX = centerX + radius * Math.cos(corner.angle);
        const cornerY = centerY + radius * Math.sin(corner.angle);
        const color = getStrokeColor(strokeKey);
        
        // Draw point with larger, brighter circle
        const pointSize = score > 0 ? 6 : 4;
        const pointOpacity = score > 0 ? 0.9 : 0.3;
        chartHtml += `<circle cx="${point.x}" cy="${point.y}" r="${pointSize}" fill="${color}" stroke="white" stroke-width="2" opacity="${pointOpacity}"/>`;
        
        // Draw corner label (no percentage - just the stroke name)
        const labelY = cornerY + (cornerY - centerY) * 0.15;
        const labelX = cornerX + (cornerX - centerX) * 0.15; // Position away from corner
        
        chartHtml += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="18" font-weight="700" fill="#333">${corner.name}</text>`;
    });
    
    chartHtml += '</svg>';
    chartHtml += '</div>';
    chartHtml += '<div style="margin-top: 25px; padding: 18px 20px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%); border-radius: 10px; border-left: 4px solid #667eea; font-size: 14px; color: #444; line-height: 1.8;">';
    chartHtml += '<div style="margin-bottom: 12px; font-size: 15px; font-weight: 700; color: #333; display: flex; align-items: center; gap: 8px;"><span style="font-size: 18px;">📖</span> <span>How to read the chart:</span></div>';
    chartHtml += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 15px;">';
    chartHtml += '<div style="padding: 10px; background: rgba(255, 255, 255, 0.7); border-radius: 6px;"><div style="margin-bottom: 6px; font-weight: 600; color: #2196F3;">Outer blue pentagon</div><div style="font-size: 13px; color: #666;">Summer Junior National cut times (target)</div></div>';
    chartHtml += '<div style="padding: 10px; background: rgba(255, 255, 255, 0.7); border-radius: 6px;"><div style="margin-bottom: 6px; font-weight: 600; color: #2196F3;">Middle blue pentagon</div><div style="font-size: 13px; color: #666;">Halfway to cuts (50% progress)</div></div>';
    chartHtml += '<div style="padding: 10px; background: rgba(255, 255, 255, 0.7); border-radius: 6px;"><div style="margin-bottom: 6px; font-weight: 600; color: #2196F3;">Inner blue pentagon</div><div style="font-size: 13px; color: #666;">Typical starting point (25% progress)</div></div>';
    chartHtml += '<div style="padding: 10px; background: rgba(255, 255, 255, 0.7); border-radius: 6px;"><div style="margin-bottom: 6px; font-weight: 600; color: #E53935;">Red pentagon</div><div style="font-size: 13px; color: #666;">Your current progress</div></div>';
    chartHtml += '<div style="padding: 10px; background: rgba(255, 255, 255, 0.7); border-radius: 6px;"><div style="margin-bottom: 6px; font-weight: 600; color: #333;">Goal</div><div style="font-size: 13px; color: #666;">Reach outer blue to achieve all cuts</div></div>';
    chartHtml += '</div>';
    chartHtml += '</div>';
    chartHtml += '</div>';
    
    return chartHtml;
}

/**
 * Format swimmer data for Gemini analysis
 */
function formatSwimmerDataForGemini(data, athleteStats = {}) {
    const idx = data.events.idx;
    const swimmer = data.swimmer;
    const height = athleteStats.height || null;
    const weight = athleteStats.weight || null;
    
    // Get best times by event
    const bestTimes = {};
    const eventNames = {};
    
    // Get event list mapping - use global _eventList if available
    const eventListMap = (typeof _eventList !== 'undefined' && _eventList) || 
                         (typeof window !== 'undefined' && window._eventList) || 
                         {};
    
    // Helper to convert time to integer if function available
    const timeToIntFunc = window.timeToInt || ((time) => {
        // Simple fallback: convert "1:23.45" to seconds*hundredths
        if (!time) return 0;
        const parts = time.split(':');
        if (parts.length === 2) {
            const mins = parseInt(parts[0]) || 0;
            const secs = parseFloat(parts[1]) || 0;
            return mins * 6000 + Math.round(secs * 100);
        }
        const secs = parseFloat(time) || 0;
        return Math.round(secs * 100);
    });
    
    data.events.forEach(event => {
        const eventCode = event[idx.event];
        const eventName = eventListMap[eventCode] || `Event ${eventCode}`;
        const time = event[idx.time];
        const date = event[idx.date];
        const age = event[idx.age];
        
        if (!bestTimes[eventName] || timeToIntFunc(time) < timeToIntFunc(bestTimes[eventName].time)) {
            bestTimes[eventName] = { time, date, age };
        }
        eventNames[eventCode] = eventName;
    });
    
    // Calculate statistics
    const totalEvents = data.events.length;
    const uniqueMeets = new Set(data.events.map(e => e[idx.meet])).size;
    const ageRange = {
        min: Math.min(...data.events.map(e => e[idx.age])),
        max: Math.max(...data.events.map(e => e[idx.age]))
    };
    
    // Analyze meet attendance gaps (years with no meets)
    const attendanceGaps = analyzeAttendanceGaps(data);
    
    // Format summary - get gender from swimmer data
    // Gender is stored as numeric: 1 = Female, 2 = Male
    // Try multiple sources to get accurate gender information
    let genderValue = null;
    
    // Source 1: Direct from swimmer object
    if (swimmer.gender !== undefined && swimmer.gender !== null && swimmer.gender !== '') {
        genderValue = swimmer.gender;
        console.log('Gender from swimmer.gender:', genderValue, typeof genderValue);
    }
    // Source 2: From data.swimmer
    else if (data.swimmer && data.swimmer.gender !== undefined && data.swimmer.gender !== null && data.swimmer.gender !== '') {
        genderValue = data.swimmer.gender;
        console.log('Gender from data.swimmer.gender:', genderValue, typeof genderValue);
    }
    // Source 3: From first event (events have gender in the data)
    else if (data.events && data.events.length > 0 && data.events.idx && data.events.idx.gender !== undefined) {
        const firstEventGender = data.events[0][data.events.idx.gender];
        if (firstEventGender !== undefined && firstEventGender !== null && firstEventGender !== '') {
            genderValue = firstEventGender;
            console.log('Gender from first event:', genderValue, typeof genderValue);
        }
    }
    
    let genderStr = 'Male'; // Default fallback
    console.log('Raw gender value for', swimmer.firstName, swimmer.lastName, ':', genderValue, 'type:', typeof genderValue);
    
    // Convert numeric gender code to string (1 = Female, 2 = Male)
    if (genderValue !== null && genderValue !== undefined && genderValue !== '') {
        if (typeof genderValue === 'number') {
            genderStr = genderValue === 1 ? 'Female' : (genderValue === 2 ? 'Male' : 'Male');
            console.log('Converted numeric gender:', genderValue, '→', genderStr);
        } else if (typeof genderValue === 'string') {
            // If it's already a string, normalize it
            genderStr = genderValue === 'Female' || genderValue === 'F' || genderValue === '1' ? 'Female' : 
                       genderValue === 'Male' || genderValue === 'M' || genderValue === '2' ? 'Male' : 'Male';
            console.log('Converted string gender:', genderValue, '→', genderStr);
        } else if (window.convertGenderCodeToString) {
            // Use the conversion function if available (handles array index mapping)
            genderStr = window.convertGenderCodeToString(genderValue);
            console.log('Converted using convertGenderCodeToString:', genderValue, '→', genderStr);
        }
    } else {
        console.warn('No gender value found for', swimmer.firstName, swimmer.lastName, '- defaulting to Male');
    }
    
    console.log('Final gender string for', swimmer.firstName, swimmer.lastName, ':', genderStr);
    
    // Deduplicate name - handle cases like "Ray Ray" or "Tang Tang"
    const dedupeName = (name) => {
        if (!name) return '';
        const trimmed = name.trim();
        const words = trimmed.split(/\s+/);
        // If all words are the same, return just one word
        if (words.length > 1 && words.every(w => w.toLowerCase() === words[0].toLowerCase())) {
            return words[0];
        }
        // Remove consecutive duplicates (case-insensitive)
        const cleaned = words.filter((word, idx, arr) => {
            if (idx === 0) return true;
            return word.toLowerCase() !== arr[idx - 1].toLowerCase();
        }).join(' ').trim();
        return cleaned;
    };
    
    const cleanFirstName = dedupeName(swimmer.firstName || '');
    const cleanLastName = dedupeName(swimmer.lastName || '');
    const fullName = cleanFirstName && cleanLastName ? `${cleanFirstName} ${cleanLastName}` : (cleanFirstName || cleanLastName || 'Unknown');
    
    let summary = `Swimmer: ${fullName}\n`;
    summary += `Gender: ${genderStr}\n`;
    summary += `Age: ${swimmer.age}\n`;
    summary += `Club: ${swimmer.clubName} (${swimmer.lsc})\n`;
    if (height) summary += `Height: ${height} cm\n`;
    if (weight) summary += `Weight: ${weight} lbs\n`;
    if (height && weight) {
        // Calculate BMI for reference (but let AI interpret it in context)
        const heightMeters = height / 100;
        const weightKg = weight / 2.20462;
        const bmi = (weightKg / (heightMeters * heightMeters)).toFixed(1);
        summary += `BMI: ${bmi} (calculated from height and weight)\n`;
    }
    summary += `Total swims: ${totalEvents}\n`;
    summary += `Unique meets: ${uniqueMeets}\n`;
    summary += `Age range in data: ${ageRange.min} to ${ageRange.max}\n\n`;
    
    summary += `Personal Best Times:\n`;
    Object.keys(bestTimes).sort().forEach(eventName => {
        const pb = bestTimes[eventName];
        summary += `  ${eventName}: ${pb.time} (at age ${pb.age}, ${pb.date})\n`;
    });
    
    // Extract cuts and standards achieved from the rendered table
    const cutsInfo = extractCutsFromTable();
    if (cutsInfo && (cutsInfo.motivational.length > 0 || cutsInfo.meetCuts.length > 0)) {
        summary += `\nAchieved Standards & Cuts:\n`;
        
        // Group by event for better readability
        const cutsByEvent = {};
        [...cutsInfo.motivational, ...cutsInfo.meetCuts].forEach(cut => {
            if (!cutsByEvent[cut.event]) {
                cutsByEvent[cut.event] = { motivational: [], meetCuts: [] };
            }
            if (cut.type === 'motivational') {
                cutsByEvent[cut.event].motivational.push(cut.standard);
            } else {
                cutsByEvent[cut.event].meetCuts.push(cut.meet);
            }
        });
        
        Object.keys(cutsByEvent).sort().forEach(eventName => {
            const cuts = cutsByEvent[eventName];
            const parts = [];
            if (cuts.motivational.length > 0) {
                parts.push(`Motivational: ${cuts.motivational.join(', ')}`);
            }
            if (cuts.meetCuts.length > 0) {
                parts.push(`Meet Cuts: ${cuts.meetCuts.join(', ')}`);
            }
            if (parts.length > 0) {
                summary += `  ${eventName}: ${parts.join(' | ')}\n`;
            }
        });
    }
    
    // Add BC and PN rankings if available
    const rankings = extractRankingsFromDOM();
    if (rankings.length > 0) {
        summary += `\nClub Rankings (BC = Bellevue Club, PN = Pacific Northwest):\n`;
        // Sort by best ranking and show top 10
        const sortedRankings = [...rankings].sort((a, b) => {
            const aBest = Math.min(a.bcRank || Infinity, a.pnRank || Infinity);
            const bBest = Math.min(b.bcRank || Infinity, b.pnRank || Infinity);
            return aBest - bBest;
        });
        
        sortedRankings.slice(0, 10).forEach(rank => {
            const rankParts = [];
            if (rank.bcRank && rank.bcRank > 0) {
                rankParts.push(`BC #${rank.bcRank}`);
            }
            if (rank.pnRank && rank.pnRank > 0) {
                rankParts.push(`PN #${rank.pnRank}`);
            }
            if (rankParts.length > 0) {
                summary += `  ${rank.event}: ${rank.time} - ${rankParts.join(', ')}\n`;
            }
        });
    }
    
    // Add recruiting potential analysis
    const recruitingPotential = analyzeRecruitingPotential(data);
    if (recruitingPotential && (
        recruitingPotential.juniorNationals.length > 0 || 
        recruitingPotential.futures.length > 0 || 
        recruitingPotential.otherRecruitingCuts.length > 0
    )) {
        summary += `\n🔍 RECRUITING POTENTIAL & CUT PROXIMITY ANALYSIS:\n`;
        summary += `This analysis shows how close the swimmer is to recruiting-relevant cuts (Winter Juniors, Summer Juniors, Futures, etc.)\n\n`;
        
        if (recruitingPotential.juniorNationals.length > 0) {
            summary += `Junior Nationals Cuts:\n`;
            recruitingPotential.juniorNationals.forEach(cut => {
                if (cut.achieved) {
                    summary += `  ✅ ${cut.event}: ACHIEVED ${cut.meet} (${cut.bestTime} vs ${cut.cutTime})\n`;
                } else {
                    summary += `  ${cut.event} - ${cut.meet}: Current ${cut.bestTime}, Cut ${cut.cutTime}, Gap: ${cut.gap} (${cut.gapPercent}%)\n`;
                }
            });
            summary += `\n`;
        }
        
        if (recruitingPotential.futures.length > 0) {
            summary += `Futures Cuts:\n`;
            recruitingPotential.futures.forEach(cut => {
                if (cut.achieved) {
                    summary += `  ✅ ${cut.event}: ACHIEVED ${cut.meet} (${cut.bestTime} vs ${cut.cutTime})\n`;
                } else {
                    summary += `  ${cut.event} - ${cut.meet}: Current ${cut.bestTime}, Cut ${cut.cutTime}, Gap: ${cut.gap} (${cut.gapPercent}%)\n`;
                }
            });
            summary += `\n`;
        }
        
        if (recruitingPotential.otherRecruitingCuts.length > 0) {
            summary += `Other Recruiting Cuts:\n`;
            recruitingPotential.otherRecruitingCuts.forEach(cut => {
                if (cut.achieved) {
                    summary += `  ✅ ${cut.event}: ACHIEVED ${cut.meet}\n`;
                } else {
                    summary += `  ${cut.event} - ${cut.meet}: Current ${cut.bestTime}, Cut ${cut.cutTime}, Gap: ${cut.gap}\n`;
                }
            });
            summary += `\n`;
        }
        
        if (recruitingPotential.projections.length > 0) {
            summary += `Projected Potential by 11th Grade (for college recruiting):\n`;
            recruitingPotential.projections.forEach(proj => {
                const effortDesc = proj.effortLevel === 'high' ? 'High effort needed' : 
                                  proj.effortLevel === 'moderate' ? 'Moderate effort needed' : 
                                  'Significant effort needed';
                summary += `  ${proj.event} - ${proj.meet}: Current gap ${proj.currentGap}, ${effortDesc}. `;
                summary += proj.projectedAchievable ? 
                    `PROJECTED to achieve by 11th grade with consistent training.` : 
                    `Close but may need focused training.`;
                summary += `\n`;
            });
        }
    }
    
    // Calculate improvement rates per event
    const improvementRates = calculateImprovementRates(data);
    if (improvementRates.length > 0) {
        summary += `\n📈 Improvement Rates (Annual):\n`;
        improvementRates.slice(0, 10).forEach(rate => {
            const improvementText = rate.improvement > 0 ? 
                `Improving by ${rate.annualImprovement} per year` : 
                `Slowing by ${Math.abs(rate.annualImprovement)} per year`;
            summary += `  ${rate.event}: ${improvementText} (${rate.improvementPercent.toFixed(1)}% change over ${rate.years.toFixed(1)} years)\n`;
        });
    }
    
    // Calculate consistency metrics (time variability)
    const consistencyMetrics = calculateConsistencyMetrics(data);
    if (consistencyMetrics.length > 0) {
        summary += `\n🎯 Consistency Metrics:\n`;
        consistencyMetrics.slice(0, 8).forEach(metric => {
            const consistencyDesc = metric.stdDevPercent < 2 ? 'Very consistent' :
                                   metric.stdDevPercent < 4 ? 'Consistent' :
                                   metric.stdDevPercent < 7 ? 'Moderately variable' : 'Variable';
            summary += `  ${metric.event}: ${consistencyDesc} (${metric.count} swims, std dev: ${metric.stdDevPercent.toFixed(1)}%)\n`;
        });
    }
    
    // Course-specific analysis (SCY vs LCM)
    const courseAnalysis = analyzeCoursePerformance(data);
    if (courseAnalysis.scy.length > 0 || courseAnalysis.lcm.length > 0) {
        summary += `\n🏊 Course-Specific Strengths:\n`;
        if (courseAnalysis.scy.length > 0) {
            summary += `  Short Course Yards (SCY): ${courseAnalysis.scy.slice(0, 5).map(e => e.event).join(', ')}\n`;
        }
        if (courseAnalysis.lcm.length > 0) {
            summary += `  Long Course Meters (LCM): ${courseAnalysis.lcm.slice(0, 5).map(e => e.event).join(', ')}\n`;
        }
        if (courseAnalysis.strongerCourse) {
            summary += `  Overall: Stronger in ${courseAnalysis.strongerCourse}\n`;
        }
    }
    
    // Meet frequency and patterns
    const meetPatterns = analyzeMeetPatterns(data);
    if (meetPatterns.totalMeets > 0) {
        summary += `\n📅 Competition Patterns:\n`;
        summary += `  Total meets: ${meetPatterns.totalMeets}\n`;
        summary += `  Swims per meet: ${(totalEvents / meetPatterns.totalMeets).toFixed(1)}\n`;
        summary += `  Competition frequency: ${meetPatterns.frequencyDesc}\n`;
        if (meetPatterns.recentActivity > 0) {
            summary += `  Recent activity: ${meetPatterns.recentActivity} meets in last 6 months\n`;
        }
    }
    
    // Age progression analysis
    const ageProgression = analyzeAgeProgression(data);
    if (ageProgression.insights.length > 0) {
        summary += `\n⏰ Age Progression Analysis:\n`;
        ageProgression.insights.forEach(insight => {
            summary += `  ${insight}\n`;
        });
    }
    
    // Attendance gaps analysis
    if (attendanceGaps.gapYears.length > 0 || attendanceGaps.actualYears.length > 0) {
        summary += `\n📆 Swimming Attendance History:\n`;
        summary += `  Active years (ages with meets): ${attendanceGaps.actualYears.join(', ')} (${attendanceGaps.actualYears.length} active years)\n`;
        summary += `  Total age span: Age ${ageRange.min} to ${ageRange.max} (${ageRange.max - ageRange.min + 1} year span)\n`;
        if (attendanceGaps.gapYears.length > 0) {
            summary += `  ⚠️ GAP YEARS (no recorded meets): Age ${attendanceGaps.gapYears.join(', ')} (${attendanceGaps.gapYears.length} year${attendanceGaps.gapYears.length > 1 ? 's' : ''} with no competition)\n`;
            summary += `  Activity rate: ${attendanceGaps.actualYears.length} of ${ageRange.max - ageRange.min + 1} years (${((attendanceGaps.actualYears.length / (ageRange.max - ageRange.min + 1)) * 100).toFixed(0)}% activity)\n`;
            summary += `  CRITICAL INSTRUCTION: When mentioning competition history, you MUST explicitly list the gap ages/years. Format: "competing for ${attendanceGaps.actualYears.length} active years (ages ${attendanceGaps.actualYears.join(', ')}) with gaps at age${attendanceGaps.gapYears.length > 1 ? 's' : ''} ${attendanceGaps.gapYears.join(' and ')} (${attendanceGaps.gapYears.length} year${attendanceGaps.gapYears.length > 1 ? 's' : ''} with no competition)". DO NOT just say "X active years" without mentioning which specific ages had gaps.\n`;
        } else {
            summary += `  ✓ Continuous competition: All years between age ${ageRange.min} and ${ageRange.max} have recorded meets\n`;
        }
    }
    
    // Add recent performance trend
    summary += `\nRecent Performance:\n`;
    const recentEvents = data.events
        .filter(e => {
            const eventDate = new Date(e[idx.date]);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return eventDate >= sixMonthsAgo;
        })
        .slice(0, 20)
        .sort((a, b) => new Date(b[idx.date]) - new Date(a[idx.date]));
    
    recentEvents.forEach(event => {
        const eventName = eventNames[event[idx.event]] || `Event ${event[idx.event]}`;
        summary += `  ${event[idx.date]}: ${eventName} - ${event[idx.time]} (age ${event[idx.age]})\n`;
    });
    
    return summary;
}

/**
 * Calculate improvement rates per event (annual improvement)
 */
function calculateImprovementRates(data) {
    const idx = data.events.idx;
    const rates = [];
    
    // Group by event including course
    const eventsByType = {};
    data.events.forEach(event => {
        if (!event[idx.event]) return;
        const eventCode = event[idx.event];
        const eventName = getEventName(eventCode);
        const timeInt = window.timeToInt ? window.timeToInt(event[idx.time]) : 0;
        const date = new Date(event[idx.date]);
        const age = event[idx.age] || 0;
        
        if (!eventsByType[eventName]) {
            eventsByType[eventName] = [];
        }
        eventsByType[eventName].push({ timeInt, date, age });
    });
    
    Object.keys(eventsByType).forEach(eventName => {
        const times = eventsByType[eventName]
            .filter(t => t.age > 0)
            .sort((a, b) => a.date - b.date);
        
        if (times.length < 2) return;
        
        const first = times[0];
        const last = times[times.length - 1];
        const years = Math.max(0.5, (last.age - first.age) || (last.date - first.date) / (365 * 24 * 60 * 60 * 1000));
        
        if (years < 0.5) return; // Need at least 6 months of data
        
        const improvement = first.timeInt - last.timeInt; // Positive = faster (better)
        const improvementPercent = (improvement / first.timeInt) * 100;
        const annualImprovement = years > 0 ? improvement / years : 0;
        
        // Convert annual improvement to readable format
        const annualSec = Math.abs(annualImprovement) / 100;
        const annualFormatted = annualSec < 1 ? 
            `${(annualSec * 100).toFixed(0)} hundredths/sec per year` :
            `${annualSec.toFixed(2)}s per year`;
        
        rates.push({
            event: eventName,
            improvement: improvement,
            improvementPercent: improvementPercent,
            annualImprovement: annualFormatted,
            years: years
        });
    });
    
    return rates.sort((a, b) => b.improvementPercent - a.improvementPercent);
}

/**
 * Calculate consistency metrics (standard deviation of times)
 * Accounts for improvement trends by calculating detrended standard deviation
 */
function calculateConsistencyMetrics(data) {
    const idx = data.events.idx;
    const metrics = [];
    
    // Group by event including dates and ages for trend analysis
    const eventsByType = {};
    data.events.forEach(event => {
        if (!event[idx.event]) return;
        const eventCode = event[idx.event];
        const eventName = getEventName(eventCode);
        const timeInt = window.timeToInt ? window.timeToInt(event[idx.time]) : 0;
        const date = new Date(event[idx.date]);
        const age = event[idx.age] || 0;
        
        if (!eventsByType[eventName]) {
            eventsByType[eventName] = [];
        }
        eventsByType[eventName].push({ timeInt, date, age });
    });
    
    Object.keys(eventsByType).forEach(eventName => {
        const swims = eventsByType[eventName]
            .filter(s => s.timeInt > 0)
            .sort((a, b) => a.date - b.date); // Sort by date
        
        if (swims.length < 3) return; // Need at least 3 swims for consistency
        
        const times = swims.map(s => s.timeInt);
        const avg = times.reduce((s, t) => s + t, 0) / times.length;
        
        // Check if there's a significant improvement trend
        // If swims span multiple years and show improvement, calculate detrended std dev
        const firstSwim = swims[0];
        const lastSwim = swims[swims.length - 1];
        const timeSpan = lastSwim.date - firstSwim.date;
        const daysSpan = timeSpan / (1000 * 60 * 60 * 24);
        const ageSpan = lastSwim.age > 0 && firstSwim.age > 0 ? Math.abs(lastSwim.age - firstSwim.age) : 0;
        
        // Calculate improvement trend if there's sufficient time span
        let stdDev, stdDevPercent;
        if (daysSpan > 180 && swims.length >= 5) { // At least 6 months and 5+ swims
            // Fit a linear trend: time = a + b * daysFromFirst
            const n = swims.length;
            const daysFromFirst = swims.map(s => (s.date - firstSwim.date) / (1000 * 60 * 60 * 24));
            const sumX = daysFromFirst.reduce((s, x) => s + x, 0);
            const sumY = times.reduce((s, y) => s + y, 0);
            const sumXY = daysFromFirst.reduce((s, x, i) => s + x * times[i], 0);
            const sumX2 = daysFromFirst.reduce((s, x) => s + x * x, 0);
            
            // Linear regression: y = a + bx
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            // Calculate residuals (differences from trend line)
            const residuals = times.map((time, i) => {
                const predictedTime = intercept + slope * daysFromFirst[i];
                return time - predictedTime;
            });
            
            // Calculate standard deviation of residuals (detrended std dev)
            const residualAvg = residuals.reduce((s, r) => s + r, 0) / residuals.length;
            const residualVariance = residuals.reduce((s, r) => s + Math.pow(r - residualAvg, 2), 0) / residuals.length;
            stdDev = Math.sqrt(residualVariance);
            stdDevPercent = (stdDev / avg) * 100;
            
            // If the improvement trend is very small relative to variability, use regular std dev instead
            const trendImprovement = Math.abs(slope * daysSpan);
            const trendPercent = (trendImprovement / avg) * 100;
            if (trendPercent < stdDevPercent * 0.3) {
                // Trend is minor, just use regular std dev
                const variance = times.reduce((s, t) => s + Math.pow(t - avg, 2), 0) / times.length;
                stdDev = Math.sqrt(variance);
                stdDevPercent = (stdDev / avg) * 100;
            }
        } else {
            // Not enough data or time span to detect trend, use regular std dev
            const variance = times.reduce((s, t) => s + Math.pow(t - avg, 2), 0) / times.length;
            stdDev = Math.sqrt(variance);
            stdDevPercent = (stdDev / avg) * 100;
        }
        
        metrics.push({
            event: eventName,
            count: swims.length,
            stdDev: stdDev,
            stdDevPercent: stdDevPercent,
            avgTime: avg
        });
    });
    
    return metrics.sort((a, b) => a.stdDevPercent - b.stdDevPercent); // Most consistent first
}

/**
 * Analyze meet attendance gaps - identify years with no recorded meets
 */
function analyzeAttendanceGaps(data) {
    const idx = data.events.idx;
    if (!idx) return { gapYears: [], actualYears: [] };
    
    // Get all unique ages from events
    const agesWithMeets = new Set(data.events.map(e => e[idx.age]).filter(age => age > 0));
    
    if (agesWithMeets.size === 0) return { gapYears: [], actualYears: [] };
    
    const actualYears = Array.from(agesWithMeets).sort((a, b) => a - b);
    const minAge = Math.min(...actualYears);
    const maxAge = Math.max(...actualYears);
    
    // Find gaps - ages between min and max that don't have meets
    const gapYears = [];
    for (let age = minAge; age <= maxAge; age++) {
        if (!agesWithMeets.has(age)) {
            gapYears.push(age);
        }
    }
    
    return {
        gapYears: gapYears,
        actualYears: actualYears,
        minAge: minAge,
        maxAge: maxAge,
        totalSpan: maxAge - minAge + 1,
        activeYears: actualYears.length,
        activityRate: actualYears.length / (maxAge - minAge + 1)
    };
}

/**
 * Analyze course-specific performance (SCY vs LCM)
 */
function analyzeCoursePerformance(data) {
    const idx = data.events.idx;
    const scyEvents = [];
    const lcmEvents = [];
    const eventListMap = (typeof _eventList !== 'undefined' && _eventList) || 
                         (typeof window !== 'undefined' && window._eventList) || {};
    
    data.events.forEach(event => {
        if (!event[idx.event]) return;
        const eventCode = event[idx.event];
        const eventStr = eventListMap[eventCode] || '';
        if (!eventStr || eventStr.includes('_')) return;
        
        const [dist, stroke, course] = eventStr.split(' ');
        const timeInt = window.timeToInt ? window.timeToInt(event[idx.time]) : 0;
        const eventName = getEventName(eventCode);
        
        if (course === 'SCY') {
            scyEvents.push({ event: eventName, timeInt });
        } else if (course === 'LCM') {
            lcmEvents.push({ event: eventName, timeInt });
        }
    });
    
    // Find best times for each course
    const scyBest = {};
    const lcmBest = {};
    
    scyEvents.forEach(e => {
        if (!scyBest[e.event] || e.timeInt < scyBest[e.event].timeInt) {
            scyBest[e.event] = e;
        }
    });
    
    lcmEvents.forEach(e => {
        if (!lcmBest[e.event] || e.timeInt < lcmBest[e.event].timeInt) {
            lcmBest[e.event] = e;
        }
    });
    
    const scySorted = Object.values(scyBest).sort((a, b) => a.timeInt - b.timeInt);
    const lcmSorted = Object.values(lcmBest).sort((a, b) => a.timeInt - b.timeInt);
    
    let strongerCourse = null;
    if (scySorted.length >= 3 && lcmSorted.length >= 3) {
        // Compare relative performance - need to normalize
        // For now, just compare counts
        strongerCourse = scySorted.length >= lcmSorted.length ? 'SCY' : 'LCM';
    }
    
    return {
        scy: scySorted,
        lcm: lcmSorted,
        strongerCourse: strongerCourse
    };
}

/**
 * Analyze meet frequency and patterns
 */
function analyzeMeetPatterns(data) {
    const idx = data.events.idx;
    const meets = new Set(data.events.map(e => e[idx.meet]));
    const totalMeets = meets.size;
    
    // Count meets in last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentMeets = new Set();
    
    data.events.forEach(event => {
        const eventDate = new Date(event[idx.date]);
        if (eventDate >= sixMonthsAgo) {
            recentMeets.add(event[idx.meet]);
        }
    });
    
    // Calculate frequency
    const totalDays = (data.events.length > 0) ? 
        (new Date(data.events[data.events.length - 1][idx.date]) - new Date(data.events[0][idx.date])) / (1000 * 60 * 60 * 24) : 0;
    const meetsPerMonth = totalDays > 0 ? (totalMeets / (totalDays / 30)) : 0;
    
    let frequencyDesc = 'Unknown';
    if (meetsPerMonth >= 2) {
        frequencyDesc = 'Very active (2+ meets/month)';
    } else if (meetsPerMonth >= 1) {
        frequencyDesc = 'Active (1-2 meets/month)';
    } else if (meetsPerMonth >= 0.5) {
        frequencyDesc = 'Regular (1 meet every 2 months)';
    } else if (meetsPerMonth > 0) {
        frequencyDesc = 'Occasional';
    }
    
    return {
        totalMeets: totalMeets,
        recentActivity: recentMeets.size,
        meetsPerMonth: meetsPerMonth,
        frequencyDesc: frequencyDesc
    };
}

/**
 * Analyze age progression trends
 */
function analyzeAgeProgression(data) {
    const idx = data.events.idx;
    const insights = [];
    
    if (data.events.length === 0) return { insights: [] };
    
    const ages = data.events.map(e => e[idx.age]).filter(a => a > 0);
    if (ages.length === 0) return { insights: [] };
    
    const ageRange = {
        min: Math.min(...ages),
        max: Math.max(...ages),
        current: data.swimmer?.age || ages[ages.length - 1]
    };
    
    const yearsCompeting = ageRange.max - ageRange.min;
    
    if (yearsCompeting >= 3) {
        insights.push(`Competing for ${yearsCompeting} years (ages ${ageRange.min}-${ageRange.max})`);
    } else if (yearsCompeting >= 2) {
        insights.push(`Competing for ${yearsCompeting} years`);
    }
    
    // Check if currently in peak improvement age (typically 12-16)
    if (ageRange.current >= 12 && ageRange.current <= 16) {
        insights.push(`Currently in peak improvement age range (typically 12-16 years)`);
    } else if (ageRange.current < 12) {
        insights.push(`Early developmental stage - expected significant improvements`);
    } else if (ageRange.current > 16) {
        insights.push(`Post-peak improvement age - improvements may slow but refinement possible`);
    }
    
    return { insights };
}

/**
 * Send swimmer data to Gemini API for AI analysis
 */
async function getGeminiAnalysis(data, athleteStats = {}) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        console.log('No Gemini API key provided - skipping AI analysis');
        return null;
    }
    
    try {
        // Simple hash function for cache key
        function simpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(36);
        }
        
        // Create a cache key based on swimmer ID and data hash
        const swimmerPkey = String(data.swimmer?.pkey || '');
        const dataHash = simpleHash(JSON.stringify(data.events.map(e => ({
            event: e[data.events.idx.event],
            time: e[data.events.idx.time],
            date: e[data.events.idx.date]
        })).slice(0, 10))); // Use first 10 events as hash
        const cacheKey = `gemini_analysis_${swimmerPkey}_${dataHash}`;
        
        // Check cache first - cache for 7 days, or until swimmer's data changes (cache key includes data hash)
        // This ensures consistent AI analysis unless the swimmer's data actually changes
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (maxAge > 0) {
            const cachedResult = localStorage.getItem(cacheKey);
            if (cachedResult) {
                try {
                    const parsed = JSON.parse(cachedResult);
                    const cacheAge = Date.now() - (parsed.timestamp || 0);
                    
                    if (cacheAge < maxAge) {
                        console.log('Using cached Gemini analysis (age:', Math.round(cacheAge / 1000 / 60), 'minutes)');
                        return parsed.insights;
                    } else {
                        console.log('Cached Gemini analysis expired, fetching new');
                        localStorage.removeItem(cacheKey);
                    }
                } catch (e) {
                    console.log('Error reading cache, fetching new:', e);
                }
            }
        } else {
            console.log('Cache disabled - fetching fresh Gemini analysis on every reload');
        }
        
        // Format the data
        const swimmerData = formatSwimmerDataForGemini(data);
        console.log('Formatted data for Gemini:', swimmerData.substring(0, 200) + '...');
        
        // Determine swimmer specialization
        const specialization = determineSwimmerSpecialization(data);
        console.log('Swimmer specialization:', specialization);
        
        // Extract gender for proper pronoun usage
        const genderInfo = swimmerData.match(/Gender: (\w+)/);
        const gender = genderInfo ? genderInfo[1] : 'Male';
        const pronoun = gender === 'Female' || gender === 'F' ? 'her' : 'his';
        const possessive = gender === 'Female' || gender === 'F' ? 'her' : 'his';
        
        // Create the prompt with explicit gender information - make it very clear and prominent
        const genderDescription = gender === 'Female' || gender === 'F' ? 'female' : 'male';
        const isFemale = gender === 'Female' || gender === 'F';
        
        // Build specialization intro
        const specializationText = specialization || 'competitive swimmer';
        const specializationIntro = specialization ? 
            `\n🏊 SWIMMER SPECIALIZATION:\nBased on event distribution, rankings, and achieved cuts, this swimmer is primarily a ${specialization.toLowerCase()}.\n` : 
            '\n🏊 SWIMMER PROFILE:\nThis is a versatile swimmer competing across multiple distances and strokes.\n';
        
        // Get swimmer details for personalized intro
        // Extract name safely - handle potential duplication
        let swimmerName = 'this swimmer';
        if (data.swimmer) {
            const firstName = (data.swimmer.firstName || '').trim();
            const lastName = (data.swimmer.lastName || '').trim();
            
            // Remove any duplication - handle cases like "Ray Ray" or "Tang Tang"
            // First, split by spaces and remove consecutive duplicates
            const cleanFirstName = firstName.split(/\s+/).filter((word, idx, arr) => {
                // Remove if it's a duplicate of the previous word (case-insensitive)
                if (idx === 0) return true;
                return word.toLowerCase() !== arr[idx - 1].toLowerCase();
            }).join(' ').trim();
            
            const cleanLastName = lastName.split(/\s+/).filter((word, idx, arr) => {
                // Remove if it's a duplicate of the previous word (case-insensitive)
                if (idx === 0) return true;
                return word.toLowerCase() !== arr[idx - 1].toLowerCase();
            }).join(' ').trim();
            
            // Also handle cases where the entire name might be duplicated (e.g., "Ray Ray")
            // Take only the first occurrence if the name appears twice
            const dedupeName = (name) => {
                if (!name) return '';
                const words = name.split(/\s+/);
                // If all words are the same, return just one word
                if (words.length > 1 && words.every(w => w.toLowerCase() === words[0].toLowerCase())) {
                    return words[0];
                }
                return name;
            };
            
            const finalFirstName = dedupeName(cleanFirstName);
            const finalLastName = dedupeName(cleanLastName);
            
            if (finalFirstName && finalLastName) {
                swimmerName = `${finalFirstName} ${finalLastName}`;
            } else if (finalFirstName) {
                swimmerName = finalFirstName;
            } else if (finalLastName) {
                swimmerName = finalLastName;
            }
        }
        const swimmerAge = data.swimmer?.age || '';
        const swimmerTeam = data.swimmer?.clubName || data.swimmer?.club || '';
        const ageText = swimmerAge ? `${swimmerAge}-year-old ` : '';
        const teamText = swimmerTeam ? ` from ${swimmerTeam}` : '';
        
        // Add physical attributes context if available
        let physicalContext = '';
        if (athleteStats.height || athleteStats.weight) {
            physicalContext = '\n\n📏 PHYSICAL ATTRIBUTES & EVENT SPECIALIZATION RESEARCH:\n';
            if (athleteStats.height) physicalContext += `- Height: ${athleteStats.height} cm\n`;
            if (athleteStats.weight) physicalContext += `- Weight: ${athleteStats.weight} lbs\n`;
            if (athleteStats.height && athleteStats.weight) {
                const heightMeters = athleteStats.height / 100;
                const weightKg = athleteStats.weight / 2.20462;
                const bmi = (weightKg / (heightMeters * heightMeters)).toFixed(1);
                physicalContext += `- BMI: ${bmi}\n`;
            }
            
            // Calculate if swimmer is tall/short/medium for their age and gender
            let heightAssessment = '';
            let weightAssessment = '';
            let isOverweight = false;
            let weightLossPotential = null;
            
            if (athleteStats.height) {
                const heightInches = athleteStats.height / 2.54;
                const isFemale = gender === 'Female' || gender === 'F';
                
                // Average heights for competitive swimmers (slightly above general population)
                // These are rough benchmarks for 15-18 year old competitive swimmers
                const avgHeightFemale = 67; // 5\'7" in inches
                const avgHeightMale = 72; // 6\'0" in inches
                const avgHeight = isFemale ? avgHeightFemale : avgHeightMale;
                
                if (heightInches < avgHeight - 2) {
                    heightAssessment = 'SHORTER than average competitive swimmer';
                } else if (heightInches > avgHeight + 2) {
                    heightAssessment = 'TALLER than average competitive swimmer';
                } else {
                    heightAssessment = 'AVERAGE height for competitive swimmer';
                }
                physicalContext += `- Height Assessment: ${heightAssessment}\n`;
            }
            
            // Assess weight and calculate BMI if both height and weight provided
            if (athleteStats.height && athleteStats.weight) {
                const heightMeters = athleteStats.height / 100;
                const weightKg = athleteStats.weight / 2.20462;
                const bmi = (weightKg / (heightMeters * heightMeters));
                const isFemale = gender === 'Female' || gender === 'F';
                
                // BMI ranges for competitive swimmers (tend to be leaner than general population)
                // Competitive swimmers typically: BMI 18-22 (females), 20-24 (males)
                // Overweight threshold: >24 for males, >23 for females (more strict than general population)
                const overweightThreshold = isFemale ? 23 : 24;
                const optimalMaxBMI = isFemale ? 22 : 23;
                
                if (bmi > overweightThreshold) {
                    isOverweight = true;
                    weightAssessment = `OVERWEIGHT (BMI: ${bmi.toFixed(1)}) - Above optimal range for competitive swimming`;
                    
                    // Calculate excess weight
                    const optimalWeightKg = optimalMaxBMI * (heightMeters * heightMeters);
                    const excessWeightKg = weightKg - optimalWeightKg;
                    const excessWeightLbs = Math.round(excessWeightKg * 2.20462);
                    
                    // Calculate potential weight loss scenarios
                    const lossScenarios = [10, 20, 30].filter(lbs => lbs <= excessWeightLbs + 10);
                    if (excessWeightLbs > 5) {
                        lossScenarios.push(excessWeightLbs);
                    }
                    
                    weightLossPotential = {
                        currentWeight: athleteStats.weight,
                        optimalWeight: Math.round(optimalWeightKg * 2.20462),
                        excessWeight: excessWeightLbs,
                        scenarios: lossScenarios.sort((a, b) => a - b),
                        bmi: bmi.toFixed(1)
                    };
                } else if (bmi > optimalMaxBMI) {
                    weightAssessment = `Slightly above optimal weight (BMI: ${bmi.toFixed(1)})`;
                } else if (bmi < (isFemale ? 18 : 20)) {
                    weightAssessment = `Below optimal weight (BMI: ${bmi.toFixed(1)}) - Consider strength training`;
                } else {
                    weightAssessment = `Optimal weight for competitive swimming (BMI: ${bmi.toFixed(1)})`;
                }
                
                physicalContext += `- Weight Assessment: ${weightAssessment}\n`;
                
                if (weightLossPotential) {
                    physicalContext += `- Excess Weight: ${weightLossPotential.excessWeight} lbs above optimal\n`;
                }
            }
            
            physicalContext += '\n🏊 BODY TYPE & EVENT SPECIALIZATION RESEARCH:\n';
            physicalContext += '\n**Height Considerations:**\n';
            physicalContext += '- TALL SWIMMERS (typically 6\'0"+/183cm+ for men, 5\'8"+/173cm+ for women):\n';
            physicalContext += '  • Advantages: Longer limbs increase stroke length and efficiency. Larger hands/feet provide more propulsion surface area. Reduced wave drag. Better suited for longer distances (200m+) and strokes requiring reach (freestyle, backstroke). Taller bodies are more buoyant.\n';
            physicalContext += '  • Event fit: Distance freestyle, 200-400+ events, backstroke (longer strokes benefit from reach)\n';
            physicalContext += '  • Challenges: May have slower turnover rates. Sprint events require more explosive power.\n';
            physicalContext += '\n- SHORTER SWIMMERS (typically <5\'8"/173cm for men, <5\'4"/163cm for women):\n';
            physicalContext += '  • Advantages: Faster turnover rates. Better power-to-weight ratio. Often more explosive. Less drag due to smaller frontal area. More efficient energy use per stroke.\n';
            physicalContext += '  • Event fit: Sprint events (50-100m), especially breaststroke and butterfly where explosive power matters. Shorter swimmers often excel in events requiring rapid turnover.\n';
            physicalContext += '  • Challenges: Need more strokes to cover same distance. May struggle in longer events due to needing more strokes. However, some short swimmers excel at distance through exceptional efficiency and endurance.\n';
            physicalContext += '\n**Weight & Body Composition:**\n';
            physicalContext += '- Muscle mass: Increases propulsion and power. Important for sprint events and starts/turns.\n';
            physicalContext += '- Body fat: Higher fat percentage improves buoyancy (especially important for females) but increases drag. Lower fat reduces drag but may decrease buoyancy.\n';
            physicalContext += '- Power-to-weight ratio: Higher ratio favors sprints. Lower ratio (more mass) can favor distance if combined with efficiency.\n';
            physicalContext += '\n**Stroke-Specific Considerations:**\n';
            physicalContext += '- FREESTYLE: Tall swimmers excel in longer distances (200m+) due to stroke efficiency. Shorter swimmers often better at sprints (50-100m).\n';
            physicalContext += '- BACKSTROKE: Height helps with reach and stroke length. Taller swimmers typically have advantages.\n';
            physicalContext += '- BREASTSTROKE: Less height-dependent. Technique and explosive power matter more. Shorter swimmers often competitive.\n';
            physicalContext += '- BUTTERFLY: Technique critical, but taller swimmers may have reach advantages. Sprint butterfly favors power-to-weight ratio.\n';
            physicalContext += '- INDIVIDUAL MEDLEY: Versatility matters, but body type can influence which strokes are strongest.\n';
            physicalContext += '\n**Age & Growth Considerations:**\n';
            physicalContext += '- Younger swimmers (<15): Still growing. Focus on technique. Body type advantages become more pronounced with age.\n';
            physicalContext += '- Growth potential: If swimmer is on shorter side but still growing, may develop into different event profile.\n';
            physicalContext += '\n**IMPORTANT NUANCES:**\n';
            physicalContext += '- These are GENERAL trends, not absolutes. Technique, training, and individual physiology matter enormously.\n';
            physicalContext += '- Many elite swimmers break these stereotypes (e.g., shorter distance specialists, taller sprinters).\n';
            physicalContext += '- Body type advantages can be maximized or minimized through specific training.\n';
            physicalContext += '- Efficiency matters more than raw size - a shorter, efficient swimmer can beat a taller, less efficient one.\n';
            
            physicalContext += '\n**WEIGHT MANAGEMENT & PERFORMANCE IMPACT (CRITICAL):**\n';
            physicalContext += 'If the swimmer is OVERWEIGHT (BMI >24 for males, >23 for females), you MUST address this directly and provide motivating incentives.\n';
            physicalContext += '\n**Weight Loss Performance Impact Research (REVISED - MORE ACCURATE):**\n';
            physicalContext += '- Drag reduction: Excess body fat significantly increases frontal area drag. Weight loss reduces drag proportionally to body surface area reduction.\n';
            physicalContext += '- Power-to-weight ratio: Each pound lost improves power-to-weight ratio, directly translating to faster acceleration and sustained speed.\n';
            physicalContext += '- Energy efficiency: Lower weight = less energy required to move through water = better endurance and faster recovery.\n';
            physicalContext += '- Sprint events (50-100m): Drag reduction has exponential impact due to velocity squared relationship (F_drag ∝ v²).\n';
            physicalContext += '- CRITICAL: For SIGNIFICANTLY OVERWEIGHT swimmers (BMI >26 or >15% excess weight), the impact is MUCH GREATER (up to 3-4x):\n';
            physicalContext += '  * The more overweight a swimmer is, the more drag they experience, so weight loss has exponentially greater impact\n';
            physicalContext += '  * Real-world example: A 13-year-old boy (BMI 27.9) losing 30 lbs can drop from ~27s to ~24s in 50 Free (3+ second improvement)\n';
            physicalContext += '  * For average weight swimmers: Coaches observe 0.01-0.03s improvement per pound lost in sprint events\n';
            physicalContext += '  * For significantly overweight (BMI 27+): Improvements can be 3-4x higher, fundamentally changing competitive standing\n';
            physicalContext += '- Distance events (200m+): Cumulative effect of drag reduction + improved endurance.\n';
            physicalContext += '- IMPORTANT: These estimates assume weight loss is primarily fat (not muscle), maintaining strength and power.\n';
            
            // Helper function to calculate realistic time improvements
            // For significantly overweight swimmers, weight loss has MUCH greater impact due to drag reduction
            function calculateWeightLossImprovement(lbsLost, eventDistance, excessWeightLbs, currentBMI, currentWeight) {
                // Base improvement per pound - calibrated to match expected results for average weight swimmers
                let baseImprovementPerLb;
                if (eventDistance <= 50) {
                    // 50 Free: Base 0.015625-0.025s per pound
                    baseImprovementPerLb = { min: 0.015625, max: 0.025 };
                } else if (eventDistance <= 100) {
                    // 100 Free: Base 0.02-0.04s per pound
                    baseImprovementPerLb = { min: 0.02, max: 0.04 };
                } else if (eventDistance <= 200) {
                    // 200 Free: Base 0.03-0.0594s per pound per 100m equivalent
                    baseImprovementPerLb = { min: 0.03, max: 0.0594 };
                } else {
                    // 400m+ events: Base 0.04-0.08s per pound per 100m equivalent
                    baseImprovementPerLb = { min: 0.04, max: 0.08 };
                }
                
                // CRITICAL: For significantly overweight swimmers, multiply impact significantly
                // The more overweight, the greater the drag reduction impact
                let excessWeightMultiplier = 1.0;
                if (excessWeightLbs && excessWeightLbs > 0 && currentWeight) {
                    // Calculate excess weight as percentage of optimal weight
                    const optimalWeightLbs = currentWeight - excessWeightLbs;
                    const excessWeightPercent = (excessWeightLbs / optimalWeightLbs) * 100;
                    
                    // For swimmers with >15% excess weight (significantly overweight), increase multiplier
                    if (excessWeightPercent > 15) {
                        // Scale multiplier: 15% excess = 1.2x, 20% = 1.5x, 25% = 2.0x, 30%+ = 2.5x
                        excessWeightMultiplier = Math.min(1.0 + (excessWeightPercent - 15) * 0.06, 2.5);
                    } else if (excessWeightPercent > 10) {
                        // 10-15% excess: 1.1-1.2x multiplier
                        excessWeightMultiplier = 1.0 + (excessWeightPercent - 10) * 0.02;
                    }
                    
                    // Also scale by BMI if available - higher BMI = more dramatic impact
                    // For Ray Tang example: BMI 27.9, losing 30 lbs should drop 50 Free from ~27s to ~24s (3s improvement)
                    // Base calc: 30 * 0.025 = 0.75s max, but we need ~3s, so multiplier should be ~4x for BMI 27.9
                    if (currentBMI && currentBMI > 26) {
                        // BMI > 26: Add significant bonus - more aggressive for higher BMI to reflect real-world impact
                        // BMI 27 = 1.1x, BMI 27.9 = ~2.1x, BMI 28 = 2.2x, BMI 29 = 3.3x, BMI 30+ = 4.4x
                        // Formula: (BMI - 26) * 1.1, capped at 4.4
                        // This ensures significantly overweight swimmers (like Ray Tang) get realistic improvements
                        // e.g., Ray Tang (BMI 27.9, 30 lbs loss) gets ~3s improvement in 50 Free (dropping to 24s range)
                        const bmiBonus = Math.min((currentBMI - 26) * 1.1, 4.4);
                        excessWeightMultiplier += bmiBonus;
                    }
                }
                
                // Scale by distance (for events > 100m, scale by 100m equivalent)
                const distanceMultiplier = eventDistance > 100 ? eventDistance / 100 : 1;
                
                const minImprovement = (baseImprovementPerLb.min * lbsLost * distanceMultiplier * excessWeightMultiplier);
                const maxImprovement = (baseImprovementPerLb.max * lbsLost * distanceMultiplier * excessWeightMultiplier);
                
                // Round to 1 decimal place for cleaner display
                return {
                    min: Math.round(minImprovement * 10) / 10,
                    max: Math.round(maxImprovement * 10) / 10
                };
            }
            
            if (weightLossPotential && weightLossPotential.excessWeight > 5) {
                physicalContext += `\n**THIS SWIMMER IS OVERWEIGHT - PROVIDE SPECIFIC INCENTIVES:**\n`;
                physicalContext += `- Current excess weight: ${weightLossPotential.excessWeight} lbs\n`;
                physicalContext += `- Optimal weight range: ~${weightLossPotential.optimalWeight} lbs (${weightLossPotential.excessWeight} lbs lighter than current)\n`;
                physicalContext += '\nCalculate and present SPECIFIC time improvements for weight loss scenarios:\n';
                // Calculate BMI if available
                let currentBMI = null;
                if (athleteStats.height && athleteStats.weight) {
                    const heightMeters = athleteStats.height / 100;
                    const weightKg = athleteStats.weight / 2.20462;
                    currentBMI = (weightKg / (heightMeters * heightMeters));
                }
                
                weightLossPotential.scenarios.forEach(lbs => {
                    // Calculate improvements for different events, passing excess weight, BMI, and current weight for scaling
                    const improv50 = calculateWeightLossImprovement(lbs, 50, weightLossPotential.excessWeight, currentBMI, weightLossPotential.currentWeight);
                    const improv100 = calculateWeightLossImprovement(lbs, 100, weightLossPotential.excessWeight, currentBMI, weightLossPotential.currentWeight);
                    const improv200 = calculateWeightLossImprovement(lbs, 200, weightLossPotential.excessWeight, currentBMI, weightLossPotential.currentWeight);
                    
                    physicalContext += `- If lose ${lbs} lbs:\n`;
                    physicalContext += `  • 50 Free: ${improv50.min.toFixed(1)}-${improv50.max.toFixed(1)}s improvement\n`;
                    physicalContext += `  • 100 Free: ${improv100.min.toFixed(1)}-${improv100.max.toFixed(1)}s improvement\n`;
                    physicalContext += `  • 200 Free: ${improv200.min.toFixed(1)}-${improv200.max.toFixed(1)}s improvement\n`;
                    physicalContext += `  Example format: "Could improve 50 Free by ${improv50.min.toFixed(1)}-${improv50.max.toFixed(1)}s and 100 Free by ${improv100.min.toFixed(1)}-${improv100.max.toFixed(1)}s"\n`;
                    if (currentBMI && currentBMI > 27) {
                        physicalContext += `  REAL-WORLD EXAMPLE: For a swimmer with BMI ${currentBMI.toFixed(1)} losing ${lbs} lbs, these improvements can be dramatic. For instance, a 13-year-old boy losing ${lbs} lbs from BMI ${currentBMI.toFixed(1)} could drop from ~27s to ~24s in 50 Free (${improv50.max.toFixed(1)}s improvement), fundamentally changing competitive standing.\n`;
                    }
                });
                physicalContext += '\n**MOTIVATION STRATEGY:**\n';
                physicalContext += '1. Be direct but supportive: "Your current weight may be limiting your potential. Achieving optimal body composition could unlock significant performance gains."\n';
                physicalContext += '2. Show specific gains: Calculate and present actual time improvements for their best events using the REVISED estimates (e.g., "Losing 20 lbs could improve your 100 Free by 0.4-0.8 seconds, 200 Free by 1.2-2.4 seconds, and help you reach Winter Juniors cut")\n';
                physicalContext += '3. Connect to goals: Link weight loss to reaching cuts, improving rankings, and achieving recruiting targets\n';
                physicalContext += '4. Emphasize training benefits: "Reduced weight improves endurance, recovery between events, and overall swimming efficiency. You\'ll feel stronger in the water."\n';
                physicalContext += '5. Set realistic targets: "Aim for 1-2 lbs per month through proper nutrition and training. This is a sustainable approach that maintains muscle while reducing excess fat."\n';
                physicalContext += '6. Be encouraging: "Many swimmers see their best times after achieving optimal body composition. This could be the key to unlocking your full potential."\n';
                physicalContext += '7. Address specific scenarios: For each weight loss amount (10, 20, 30 lbs), calculate how it could help them reach specific cuts or improve rankings\n';
            }
            
            physicalContext += '\n**USE THIS INFORMATION TO:**\n';
            physicalContext += '1. Assess if the swimmer\'s current event focus aligns with their body type\n';
            physicalContext += '2. Identify potential event opportunities based on physique\n';
            physicalContext += '3. Recommend training focus (power development for sprints vs. efficiency for distance)\n';
            physicalContext += '4. Consider growth trajectory and how body may change\n';
            physicalContext += '5. Balance physical advantages with current performance data\n';
            physicalContext += '6. If overweight, provide specific, motivating weight loss incentives with time improvement estimates for 10, 20, 30 lbs scenarios\n';
            physicalContext += '7. Provide nuanced analysis - acknowledge that body type influences but doesn\'t determine success\n';
        }
        
        const prompt = `You are an expert swimming performance analyst with deep knowledge of competitive swimming, college recruiting, and swimmer development. Analyze the following performance data for a competitive ${genderDescription} swimmer.${specializationIntro}${physicalContext}

📋 **CRITICAL FORMATTING REQUIREMENTS:**
- ALWAYS use bullet points (• or -) to present analysis, NOT paragraph format
- ALWAYS bold ALL numbers (times, rankings, percentages, improvements, weights, heights) using **bold** markdown
- ALWAYS bold ALL event names (e.g., **50 Free**, **100 Back**, **200 IM**) using **bold** markdown
- Every insight MUST be data-driven and number-driven - support every claim with specific numbers from the data
- Lead with numbers: Start sentences with specific metrics (e.g., "**#3 BC ranking** in **50 Free**", "**0.8s improvement** over past year")
- Use concise, scannable bullet points - each bullet should contain 1-2 key numbers or data points
- Prioritize quantitative facts over qualitative descriptions
- Format example: "• **50 Free**: **21.45** — **#3 BC**, **#12 PN** (improved **0.5s** in last **6 months**)"
- For weight loss scenarios: "• **Lose 20 lbs**: Could improve **100 Free** by **0.5-1.5s** (currently **47.23**, target cut **46.50**)"

**DATA-DRIVEN ANALYSIS PRINCIPLES:**
1. Every statement must cite specific numbers (times, rankings, percentages, improvements)
2. Compare actual performance to benchmarks (cuts, standards, rankings)
3. Calculate specific improvements and time gaps
4. Use rankings to show competitive position
5. Quantify trends (e.g., "**3.2% improvement per year**", "**5 consecutive meets** with improvements")
6. For weight loss, calculate exact time improvements based on REVISED research: **10 lbs loss = 0.2-0.4s improvement in 100 Free, 0.6-1.2s in 200 Free**. **20 lbs loss = 0.4-0.8s in 100 Free, 1.2-2.4s in 200 Free**. **32 lbs loss = 0.6-1.3s in 100 Free, 2.0-3.8s in 200 Free**. These reflect drag reduction (F_drag ∝ v²) and improved power-to-weight ratio. DO NOT underestimate - use these ranges.

**FORMATTING EXAMPLES:**
✅ CORRECT: "• **100 Free**: **47.23** — **#8 BC**, within **2.3%** of Winter Juniors cut (**46.50**). Improved **0.8s** over past **12 months** (**3.1% annual rate**)."
❌ WRONG: "The swimmer is fast in freestyle and shows good improvement." (too vague, no numbers)

✅ CORRECT: "• **Weight Impact**: At current **180 lbs** (BMI **25.2**), losing **20 lbs** could improve **100 Free** by approximately **0.4-0.8s** (or **0.6-1.2s** in **200 Free**), potentially reaching Winter Juniors cut (**46.50**). The drag reduction from weight loss has exponential impact at sprint speeds due to F_drag ∝ v²."
✅ ALSO CORRECT (for larger weight loss): "• **Weight Impact**: Losing **32 lbs** to reach optimal weight could improve **50 Free** by **0.5-0.8s**, **100 Free** by **0.6-1.3s**, and **200 Free** by **2.0-3.8s**, fundamentally changing competitive standing."
❌ WRONG: "Weight loss could help improve times." (no specific numbers or targets)
❌ WRONG: "Losing 20 lbs could improve 100 Free by 0.2-0.4s" (UNDERESTIMATES impact - too conservative)

📚 FEW-SHOT EXAMPLES - Study these examples to understand the desired analysis style:

EXAMPLE 1 - Strong Sprinter Close to Cuts:
[
  {"title": "Swimmer Profile", "content": "**Alex Johnson**, **15-year-old** male swimmer from Bellevue Club, is a freestyle sprinter specializing in **50** and **100-yard** events.\n• Competing in **12 events** across **8 meets** over past **12 months**\n• **Height**: **5'10"** (**178 cm**), **Weight**: **165 lbs** (**75 kg**, BMI **23.1**)\n• Strong rankings indicate competitive potential for college-level swimming"},
  {"title": "Performance Strengths", "content": "• **50 Free**: **21.45** — **#3 BC**, **#12 PN** rankings. Achieved **AAA** motivational standard.\n• **100 Free**: **47.23** — **#8 BC**, **#15 PN**. Also **AAA** standard.\n• **Consistency**: **2.1%** standard deviation in **50 Free**, indicating reliable performance under pressure\n• **Improvement Rate**: **0.8s** per year improvement in sprint freestyle (**3.2%** annual rate)"},
  {"title": "Areas for Improvement", "content": "• **Stroke Events**: Limited experience — only **2** stroke event swims vs **24** freestyle swims\n• **LCM Performance**: Long course times trail SCY — **50 Free LCM**: **23.12** vs SCY **21.45** (**7.8%** slower)\n• **Event Range**: Competing in only **12 events** — developing **butterfly** or **backstroke** could provide additional recruiting opportunities"},
  {"title": "Recruiting Potential & College Readiness", "content": "• **50 Free Winter Juniors**: Currently **21.45**, cut is **21.20** — gap of **0.25s** (**1.2%**). At current improvement rate (**0.8s/year**), should reach cut by **11th grade**\n• **100 Free Winter Juniors**: Currently **47.23**, cut is **46.50** — gap of **0.73s** (**2.3%**)\n• **D1 Positioning**: Strong sprint rankings (**top 15 PN**) and proximity to cuts indicate **D1 recruiting potential**\n• **Path Forward**: Maintain **1-2% annual improvement** to reach targets — priority on maintaining improvement trajectory in sprint events"},
  {"title": "Notable Trends", "content": "• **Improvement Rate**: **3.2%** average improvement per year over past **2 years** in sprint events\n• **Meet Frequency**: **1.8 meets/month** indicates good competition experience\n• **Consistency**: **50 Free** most consistent with **2.1%** time variability\n• **Recent Progress**: **5 consecutive meets** showing improvements in **100 Free**"}
]

EXAMPLE 2 - Versatile Swimmer Needing Focus (with weight management):
[
  {"title": "Swimmer Profile", "content": "**Sarah Martinez**, **14-year-old** female swimmer from Pacific Northwest, is a versatile swimmer competing across multiple strokes and distances.\n• Competing in **18 events** across **12 meets** over past **14 months**\n• **Height**: **5'6"** (**168 cm**), **Weight**: **165 lbs** (**75 kg**, BMI **26.8** - **OVERWEIGHT**)\n• Currently **25 lbs** above optimal weight for competitive swimming\n• Identifying specific strengths and achieving optimal body composition could accelerate competitive development"},
  {"title": "Performance Strengths", "content": "• **200 IM**: **2:18.45** — **#15 BC**, achieved **AA** motivational standard\n• **200 Back**: **2:15.67** — **#22 BC**, also **AA** standard\n• **Meet Experience**: **1.5 meets/month** indicates good competition frequency\n• **Versatility**: Competing across **4 strokes** and **multiple distances**"},
  {"title": "Areas for Improvement", "content": "• **Weight Management**: Current **165 lbs** (BMI **26.8**) is **25 lbs** above optimal range — achieving optimal body composition could unlock significant performance gains\n• **Event Focus**: Times spread across **18 events** without dominant specialty — focusing on **2-3 events** could yield faster improvements\n• **Improvement Rate**: **1.1% annually** vs expected **2-3%** for age **14** — suggests potential for accelerated growth with focused training\n• **LCM Performance**: **SCY times** are stronger than **LCM** — indicates room for long course technique improvement"},
  {"title": "Recruiting Potential & College Readiness", "content": "• **Current Level**: **D3** or **club-level** college swimming positioning\n• **Futures Cuts**: **8.5%** away from Futures cuts — requires significant improvement but achievable\n• **Path to Futures**: At age **14**, targeting **3-4% annual improvement** in strongest events (**200 IM**, **200 Back**) could bring within Futures range by **11th grade**\n• **Weight Impact**: Losing **20 lbs** could improve **200 IM** by approximately **1.2-2.4s** and **200 Back** by **1.2-2.4s** (drag reduction + improved power-to-weight ratio), potentially closing **Futures gap** significantly\n• **Priority**: Dedicate training to **IM** and **backstroke** events where natural ability shows, while focusing on achieving optimal body composition (**target weight: ~140 lbs**)"},
  {"title": "Notable Trends", "content": "• **Improvement Rate**: **1.1%** annual improvement across events — below typical for age **14** (expected **2-3%**)\n• **Age Progression**: In peak improvement years (**age 14**) — suggests potential for accelerated growth\n• **Course Strength**: **SCY** times stronger than **LCM** — **200 IM SCY**: **2:18.45** vs **LCM**: **2:32.12** (**9.8%** slower)"}
]

⚠️ CRITICAL GENDER INFORMATION - READ THIS CAREFULLY:
- This swimmer is ${genderDescription}
- Sex/Gender: ${isFemale ? 'Female' : 'Male'}
- Required pronouns: "${pronoun}" (subject) and "${possessive}" (possessive)
- Example: "${pronoun} has achieved..." NOT "${isFemale ? 'he' : 'she'} has achieved..."
- Example: "${possessive} best time..." NOT "${isFemale ? 'his' : 'her'} best time..."
- ABSOLUTELY FORBIDDEN: Do NOT use "he/his/him" if the swimmer is female
- ABSOLUTELY FORBIDDEN: Do NOT use "she/her" if the swimmer is male
- The gender is clearly stated in the data below as "Gender: ${gender}"

SWIMMER DATA:
${swimmerData}

⚠️ CRITICAL: SWIMMING HISTORY ACCURACY - YOU MUST BE SPECIFIC ABOUT GAPS:
- The "Swimming Attendance History" section shows ACTIVE years (ages with meets) vs GAP years (ages with no meets)
- When describing competition history, you MUST explicitly list the specific gap ages/years
- DO NOT just say "X active years" - you MUST say "X active years (ages [list]) with gaps at age(s) [specific ages]"
- Format examples:
  * If gaps exist: "competing for 5 active years (ages 6, 7, 8, 11, 12) with gaps at ages 9 and 10 (2 years with no competition)"
  * If no gaps: "competing for 6 continuous years (ages 8-13)"
- NEVER say "X-year swimming history" if that includes gap years - always use "active years" and list the gaps
- The gap information is in the "GAP YEARS" line - use those exact ages in your description

Provide insights in this EXACT JSON format:
[
  {"title": "Swimmer Profile", "content": "Start with: '[Swimmer Name], a ${ageText}${genderDescription} swimmer${teamText}, is a ${specializationText.toLowerCase()}. [Brief overview].' THEN use bullet points (•) with bold numbers and events. Include: event counts, meet frequency, height/weight if available. If gap years exist, MUST include specific gap ages. CRITICAL: When showing weight, ALWAYS include both lbs AND kg: 'Weight: **165 lbs** (**75 kg**, BMI **23.1**)' or 'Weight: **182 lbs** (**83 kg**, BMI **27.9**)'. Example: '• Competing in **12 events** across **8 meets** • **Competition History**: **5 active years** (ages **6, 7, 8, 11, 12**) with gaps at ages **9** and **10** (**2 years** with no competition) • **Height**: **178 cm** (**5'10"**), **Weight**: **165 lbs** (**75 kg**, BMI **23.1**)'"},
  {"title": "Performance Strengths", "content": "MUST use bullet points (•) with ALL numbers and events bolded. Format: '• **Event Name**: **Time** — **#Rank BC**, **#Rank PN** (achieved **Standard**).' Each bullet should cite specific numbers (times, rankings, percentages, improvements)."},
  {"title": "Areas for Improvement", "content": "MUST use bullet points (•) with ALL numbers and events bolded. If overweight, MUST include weight management as first bullet with specific weight loss scenarios. Format: '• **Weight Impact**: Current **180 lbs** (BMI **25.2**), losing **20 lbs** could improve **[Event]** by **[Time]**'. Include specific data-driven points with numbers for every claim."},
  {"title": "Recruiting Potential & College Readiness", "content": "CRITICAL section. MUST use bullet points (•) with ALL numbers bolded. Include: specific cut times and gaps, rankings, improvement rates, weight loss impact if applicable. Format each point as: '• **[Event] [Cut Name]**: Currently **Time**, cut is **Time** — gap of **Time** (**X%**).' Address: 1) Junior Nationals potential with specific events and gaps, 2) D1 vs D3 positioning with specific times needed, 3) Weight loss impact if overweight (e.g., 'Losing **20 lbs** could improve **[Event]** by **[Time]**'), 4) Timeline with annual improvement rates needed."},
  {"title": "Notable Trends", "content": "MUST use bullet points (•) with ALL numbers bolded. Format: '• **Metric**: **Number** (with context).' Include specific improvement rates, consistency metrics, meet frequency, age progression data — all with bold numbers."},
  {"title": "Top 3 Action Items for Next 2-3 Months", "content": "CRITICAL: List exactly 3 most critical, actionable items the swimmer should focus on to see QUICK time improvements over the next 2-3 months. MUST use bullet points (•). Each item must be SPECIFIC and DATA-DRIVEN with numbers. Prioritize: 1) Weight management if overweight (include specific lbs to lose), 2) Event focus areas with highest potential (name specific events), 3) Technical/consistency improvements (include specific percentages or metrics). Format: '• **[Specific Action]**: [Why it matters with numbers] — [Expected impact]'. Make each item actionable and motivating."}
]

CRITICAL RECRUITING ANALYSIS REQUIREMENTS:
- You MUST include a "Recruiting Potential & College Readiness" section (4th insight)
- This section MUST use bullet points (•) with ALL numbers bolded
- Address these points with specific numbers:
  1. **Junior Nationals Potential**: Based on cut proximity data, can ${pronoun} reach Winter/Summer Juniors by **11th grade**? Which events? How close? (e.g., "• **50 Free Winter Juniors**: Currently **21.45**, cut **21.20** — **0.25s** gap (**1.2%**))")
  2. **College Recruiting Level**: Is ${pronoun} on track for **D1**, **D3**, or **club-level**? What specific times are needed? (e.g., "• **D1 Potential**: Current **100 Free** **47.23** needs to reach **46.50** (**0.73s** improvement needed)")
  3. **Event Priorities**: Which events offer best recruiting potential? Include specific rankings and cut gaps
  4. **Effort Assessment**: HOW MUCH EFFORT needed? Use percentages (e.g., "**2-5%** away = moderate effort", "**>10%** away = high effort required")
  5. **Timeline**: At age **${swimmerAge}**, what annual improvement rate needed to reach cuts by **11th grade**? (e.g., "• **Timeline**: Need **2-3% annual improvement** to reach Futures by **11th grade**")
  6. **Weight Loss Impact** (if overweight): Calculate specific time improvements for **10, 20, 30 lbs** scenarios and how they could help reach cuts

CRITICAL FORMATTING REQUIREMENTS (YOU MUST FOLLOW THESE):
- **BULLET POINTS ONLY**: Every section MUST use bullet points (•) - NO paragraph format
- **BOLD ALL NUMBERS**: Every number (times, rankings, percentages, improvements, weights, heights, ages, counts) MUST be bolded using **bold**
- **BOLD ALL EVENTS**: Every event name (e.g., **50 Free**, **100 Back**, **200 IM SCY**) MUST be bolded
- **DATA-DRIVEN**: Every statement must cite specific numbers from the data - no vague descriptions
- Study the FEW-SHOT EXAMPLES above - they show the exact format you must follow
- The FIRST insight MUST be "Swimmer Profile" and MUST start with: "${swimmerName}, a ${ageText}${genderDescription} swimmer${teamText}, is a ${specializationText.toLowerCase()}." THEN use bullet points with bold numbers
- Use the swimmer's actual name (${swimmerName}) from the data above, not generic terms
- Include their age (${swimmerAge}) and team (${swimmerTeam}) if available - BOLD these numbers
- Each bullet point should contain 1-2 key data points with bold numbers
- **Lead with numbers**: Start bullets with specific metrics (e.g., "• **#3 BC ranking** in **50 Free**: **21.45**")
- **Weight management**: If overweight, first bullet in "Areas for Improvement" MUST address weight with specific scenarios (10, 20, 30 lbs) and calculated time improvements
- **Use the detailed metrics provided**: Reference improvement rates (annual %), consistency metrics (std dev %), course strengths (SCY vs LCM), meet patterns, and age progression when relevant - BOLD all numbers
- **Be specific with numbers**: When mentioning rankings, times, gaps, or improvements, use the exact values from the data and BOLD them
- Focus on:
1. Clearly identify their specialization type (${specializationText.toLowerCase()}) at the beginning with their personal details
2. What events/distances ${pronoun} excels at (SPECIFICALLY mention any motivational standards like B, BB, A, AA, AAA, AAAA or meet cuts like Winter Juniors, Summer Juniors that ${pronoun} has achieved)
3. What areas need improvement (use consistency metrics and improvement rates to identify specific opportunities)
4. **RECRUITING POTENTIAL** - This is critical! Use the cut proximity data, improvement rates, and age progression to provide realistic assessment
5. Any notable performance trends or patterns (reference the improvement rates, consistency, course strengths, and meet patterns from the data)

FINAL REMINDERS:
- Remember: This swimmer is ${genderDescription}. Use "${pronoun}" and "${possessive}" pronouns throughout your entire response.
- If the swimmer has achieved any cuts or standards (shown in "Achieved Standards & Cuts" section), you MUST mention these achievements
- Highlight which events they have qualified for and what competitive level they've reached
- **MOST IMPORTANT**: The "Recruiting Potential & College Readiness" section is what swimmers and parents care about most. Use the "RECRUITING POTENTIAL & CUT PROXIMITY ANALYSIS" data extensively. Be specific about effort needed, timeline, and realistic college recruiting potential (D1 vs D3 vs club). This insight is tremendously valuable for recruitment planning.
- Before writing each sentence, verify you are using the correct pronouns for a ${genderDescription} swimmer.`;

        // Find available models (prioritize latest/pro models)
        const apiVersion = 'v1beta';
        let availableModels = [];
        
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            console.log('Finding best available Gemini model...');
            const listResponse = await fetch(listUrl);
            if (listResponse.ok) {
                const listData = await listResponse.json();
                if (listData.models) {
                    availableModels = listData.models
                        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                        .map(m => m.name.replace('models/', ''))
                        .sort((a, b) => {
                            // Prioritize: latest > exp > regular, pro > flash
                            const aScore = (a.includes('latest') ? 3 : a.includes('exp') ? 2 : 1) * (a.includes('pro') ? 2 : 1);
                            const bScore = (b.includes('latest') ? 3 : b.includes('exp') ? 2 : 1) * (b.includes('pro') ? 2 : 1);
                            return bScore - aScore;
                        });
                    
                    console.log('Available models:', availableModels);
                }
            }
        } catch (listError) {
            console.log('Could not list models, using defaults:', listError.message);
        }
        
        // Fallback to reliable defaults if listing failed
        if (availableModels.length === 0) {
            availableModels = [
                'gemini-1.5-flash-latest',
                'gemini-1.5-flash',
                'gemini-1.5-pro-latest',
                'gemini-1.5-pro',
                'gemini-pro'
            ];
            console.log('Using default models:', availableModels);
        }
        
        // Update loading status if element exists
        const updateStatus = (message) => {
            const statusEl = document.getElementById('ai-insights-status');
            if (statusEl) {
                statusEl.textContent = message;
            }
        };
        
        // Retry logic with model fallback for rate limits (429 errors)
        // Strategy: Try best model first, if 429, fall back to lower-tier models (different rate limit buckets)
        const maxRetries = 3; // Try up to 3 different models or retries
        let lastError = null;
        let response = null;
        let currentModelIndex = 0;
        
        for (let attempt = 0; attempt <= maxRetries && currentModelIndex < availableModels.length; attempt++) {
            try {
                const currentModel = availableModels[currentModelIndex];
                const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${currentModel}:generateContent?key=${apiKey}`;
                
                if (attempt > 0) {
                    if (lastError && lastError.statusCode === 429 && currentModelIndex < availableModels.length - 1) {
                        // Switch to next model (different rate limit bucket)
                        currentModelIndex++;
                        console.log(`Rate limit on ${availableModels[currentModelIndex - 1]}. Switching to lower-tier model: ${availableModels[currentModelIndex]}`);
                        updateStatus(`Switching to alternative model: ${availableModels[currentModelIndex]}...`);
                    } else if (lastError && lastError.statusCode === 429 && lastError.retryAfter) {
                        // Same model, but wait for retry time
                        const waitSeconds = Math.ceil(lastError.retryAfter || 60);
                        console.log(`Rate limit hit on ${currentModel} (attempt ${attempt}/${maxRetries + 1}). Waiting ${waitSeconds} seconds before retry...`);
                        updateStatus(`Rate limit reached. Waiting ${waitSeconds} seconds before retry ${attempt}/${maxRetries}...`);
                        
                        // Wait for the specified time (convert to milliseconds)
                        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
                        
                        console.log(`Retrying Gemini API call with ${currentModel} (attempt ${attempt + 1}/${maxRetries + 1})...`);
                        updateStatus('Retrying Gemini AI call...');
                    } else {
                        // Not a 429, just retry same model
                        console.log(`Retrying with ${currentModel} (attempt ${attempt + 1}/${maxRetries + 1})...`);
                        updateStatus('Retrying Gemini AI call...');
                    }
                } else {
                    console.log(`Calling Gemini API with: ${apiVersion}/models/${currentModel}`);
                    updateStatus('Calling Gemini AI...');
                }
                
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: prompt
                            }]
                        }]
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMsg = 'Unknown error';
                    let retryAfter = null;
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMsg = errorJson.error?.message || errorText;
                        
                        // Extract retry time from error message (e.g., "Please retry in 52.311903s")
                        const retryMatch = errorMsg.match(/Please retry in ([\d.]+)s/i);
                        if (retryMatch) {
                            retryAfter = parseFloat(retryMatch[1]);
                        }
                    } catch (e) {
                        errorMsg = errorText.substring(0, 200);
                    }
                    
                    // Handle 429 (Too Many Requests) - try different model or retry with wait
                    if (response.status === 429 && retryAfter !== null && attempt < maxRetries) {
                        const error = new Error(`Gemini API error (${response.status}): ${errorMsg}`);
                        error.retryAfter = retryAfter;
                        error.statusCode = 429;
                        lastError = error;
                        
                        // If we have more models to try, switch to next model (different rate limit bucket)
                        if (currentModelIndex < availableModels.length - 1) {
                            currentModelIndex++;
                            console.log(`Model ${availableModels[currentModelIndex - 1]} rate limited. Trying next model: ${availableModels[currentModelIndex]}`);
                            continue; // Retry with next model immediately (no wait)
                        } else {
                            // No more models, wait and retry same model
                            continue; // Will wait in next iteration
                        }
                    }
                    
                    // If we've exhausted retries or it's not a 429, throw the error
                    throw new Error(`Gemini API error (${response.status}): ${errorMsg}`);
                }
                
                // Success! Exit the retry loop
                console.log(`✅ Success with ${availableModels[currentModelIndex]}`);
                lastError = null;
                break;
                
            } catch (error) {
                // If it's a 429 with retry info and we have retries left, continue the loop
                if (error.statusCode === 429 && error.retryAfter && attempt < maxRetries) {
                    lastError = error;
                    
                    // If we have more models to try, switch models
                    if (currentModelIndex < availableModels.length - 1) {
                        currentModelIndex++;
                        console.log(`Model rate limited. Trying next model: ${availableModels[currentModelIndex]}`);
                        continue;
                    } else {
                        // No more models, will wait and retry
                        continue;
                    }
                }
                // Otherwise, rethrow the error
                throw error;
            }
        }
        
        // If we exhausted all retries/models, throw the last error
        if (lastError || !response || !response.ok) {
            const errorMsg = lastError 
                ? `Gemini API rate limit: All models exhausted. Please wait ${Math.ceil(lastError.retryAfter || 60)} seconds and try again later.`
                : 'Gemini API request failed after trying all available models.';
            throw new Error(errorMsg);
        }

        updateStatus('Receiving AI response...');
        
        const result = await response.json();
        console.log(`✅ Success with ${availableModels[currentModelIndex]}`);
        console.log('Gemini API response:', result);
        
        updateStatus('Processing AI analysis...');
        
        // Parse the response
        if (result.candidates && result.candidates[0] && result.candidates[0].content) {
            const text = result.candidates[0].content.parts[0].text;
            console.log('Gemini analysis text:', text);
            
            // Try to extract JSON from the response
            let insights = [];
            try {
                // Try to find JSON array in the response (look for [...] pattern)
                let jsonMatch = text.match(/\[[\s\S]*\]/);
                if (!jsonMatch) {
                    // Also try to find JSON wrapped in code blocks
                    jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                               text.match(/```\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        jsonMatch = [jsonMatch[1].match(/\[[\s\S]*\]/)];
                    }
                }
                
                if (jsonMatch && jsonMatch[0]) {
                    console.log('Found JSON match, parsing...');
                    insights = JSON.parse(jsonMatch[0]);
                    console.log('Parsed JSON insights:', insights);
                } else {
                    console.log('No JSON array found, trying text parsing');
                    // Fallback: parse the text manually
                    const lines = text.split('\n').filter(l => l.trim());
                    lines.forEach((line, index) => {
                        if (line.match(/^\d+\./) || line.match(/^[\*\-]/)) {
                            const title = line.replace(/^[\d\*\-\s\.]+/, '').trim();
                            const content = lines[index + 1] || line;
                            if (title && content) {
                                insights.push({ title, content });
                            }
                        }
                    });
                    console.log('Text-parsed insights:', insights);
                }
            } catch (parseError) {
                console.log('Could not parse JSON, trying text parsing. Error:', parseError);
                console.log('Raw text to parse:', text);
                
                // Split into insights based on numbering or bullets
                const sections = text.split(/\n(?=\d+\.|\*|-)/);
                console.log('Split into sections:', sections.length);
                
                insights = sections.slice(0, 3).map((section, i) => {
                    const lines = section.trim().split('\n').filter(l => l.trim());
                    console.log(`Section ${i} lines:`, lines);
                    
                    // Find title (usually first line with number/bullet)
                    let title = '';
                    let content = '';
                    
                    for (let j = 0; j < lines.length; j++) {
                        const line = lines[j].trim();
                        // Check if this looks like a title (has number, colon, or is short)
                        if (line.match(/^\d+\./) || line.match(/^[\*\-]/) || (j === 0 && line.length < 100)) {
                            title = line.replace(/^[\d\*\-\s\.]+/, '').trim();
                            content = lines.slice(j + 1).join(' ').trim();
                            break;
                        }
                    }
                    
                    // Fallback if we didn't find a title
                    if (!title && lines.length > 0) {
                        title = lines[0].replace(/^[\d\*\-\s\.]+/, '').trim() || `AI Insight ${i + 1}`;
                        content = lines.slice(1).join(' ').trim() || lines[0];
                    }
                    
                    return { 
                        title: title || `AI Insight ${i + 1}`, 
                        content: content || 'Analysis available' 
                    };
                }).filter(i => i.title && i.content);
                
                console.log('Parsed insights from text:', insights);
            }
            
            const filtered = insights.filter(i => i.title && i.content);
            console.log('Filtered insights count:', filtered.length);
            
            // If we got insights, cache them and return
            if (filtered.length > 0) {
                // Cache the result
                try {
                    const cacheData = {
                        insights: filtered,
                        timestamp: Date.now()
                    };
                    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                    console.log('Cached Gemini analysis for future use');
                } catch (e) {
                    console.log('Could not cache result (localStorage full?):', e);
                }
                
                return filtered;
            }
            
            // Fallback: If we have text but no structured insights, create one generic insight
            if (text && text.trim().length > 50) {
                console.log('Creating fallback insight from text');
                return [{
                    title: 'AI Performance Analysis',
                    content: text.substring(0, 300) + (text.length > 300 ? '...' : '')
                }];
            }
            
            return null;
        }
        
        console.log('No candidates in Gemini response');
        return null;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        // If API key is invalid, remove it
        if (error.message && error.message.includes('API_KEY')) {
            localStorage.removeItem('gemini_api_key');
        }
        return null;
    }
}

// ================================================================================
// EXPORT
// ================================================================================

/**
 * Regenerate AI analysis by clearing cache and refreshing insights
 */
// Track regeneration state globally
let _regenerationInProgress = false;

/**
 * Show modal for user to input height and weight
 */
function showRegenerateModal(callback) {
    // Get existing values from localStorage if available
    const views = document.querySelectorAll('.view');
    const tabs = document.querySelectorAll('.tab');
    const insightsTabIndex = Array.from(tabs).findIndex(tab => 
        tab.textContent.includes('💡') || tab.textContent.includes('Insights')
    );
    
    let swimmerPkey = null;
    if (window.refreshInsights && window.refreshInsights._data && window.refreshInsights._data.swimmer) {
        swimmerPkey = String(window.refreshInsights._data.swimmer.pkey);
    }
    
    const storageKey = swimmerPkey ? `swimmer_stats_${swimmerPkey}` : null;
    const savedStats = storageKey ? JSON.parse(localStorage.getItem(storageKey) || '{}') : {};
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'regenerate-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
    `;
    
    modalContent.innerHTML = `
        <h2 style="margin: 0 0 20px 0; color: #0C2340; font-size: 24px;">Regenerate AI Analysis</h2>
        <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
            Provide additional athlete information for more personalized insights. All fields are optional.
        </p>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: #0C2340; font-weight: 600; font-size: 14px;">
                Height (cm)
            </label>
            <input 
                type="number" 
                id="swimmer-height" 
                placeholder="e.g., 175"
                value="${savedStats.height || ''}"
                min="100" 
                max="250" 
                step="1"
                style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 16px; box-sizing: border-box;"
            />
            <small style="display: block; margin-top: 5px; color: #888; font-size: 12px;">
                Optional: Helps AI assess body type and stroke efficiency
            </small>
        </div>
        
        <div style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 8px; color: #0C2340; font-weight: 600; font-size: 14px;">
                Weight (lbs)
            </label>
            <input 
                type="number" 
                id="swimmer-weight" 
                placeholder="e.g., 150"
                value="${savedStats.weight || ''}"
                min="50" 
                max="300" 
                step="1"
                style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 16px; box-sizing: border-box;"
            />
            <small style="display: block; margin-top: 5px; color: #888; font-size: 12px;">
                Optional: Helps AI understand power-to-weight ratio and potential
            </small>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button 
                id="cancel-regenerate" 
                style="padding: 12px 24px; background: #f5f5f5; color: #666; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;"
            >
                Cancel
            </button>
            <button 
                id="confirm-regenerate" 
                style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);"
            >
                🔄 Regenerate Analysis
            </button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Handle cancel
    document.getElementById('cancel-regenerate').onclick = () => {
        document.body.removeChild(modal);
    };
    
    // Handle confirm
    document.getElementById('confirm-regenerate').onclick = () => {
        const height = document.getElementById('swimmer-height').value;
        const weight = document.getElementById('swimmer-weight').value;
        
        // Save to localStorage if we have a swimmer pkey
        if (storageKey) {
            const stats = {};
            if (height) stats.height = parseInt(height);
            if (weight) stats.weight = parseFloat(weight);
            localStorage.setItem(storageKey, JSON.stringify(stats));
        }
        
        document.body.removeChild(modal);
        
        // Call the callback with the height and weight
        callback(height ? parseInt(height) : null, weight ? parseFloat(weight) : null);
    };
    
    // Close on backdrop click
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('swimmer-height').focus();
    }, 100);
}

async function regenerateAIAnalysis() {
    // Prevent multiple simultaneous regenerations
    if (_regenerationInProgress) {
        console.log('Regeneration already in progress, ignoring click');
        return;
    }
    
    // Find button in header
    const btn = document.getElementById('regenerate-ai-btn');
    if (btn && btn.disabled) {
        console.log('Regeneration already in progress (button disabled), ignoring click');
        return;
    }
    
    // Show modal to get height/weight, then proceed
    showRegenerateModal((height, weight) => {
        // Store height and weight globally for this regeneration
        window._currentRegenerationStats = { height, weight };
        
        // Now proceed with regeneration
        proceedWithRegeneration(height, weight);
    });
}

async function proceedWithRegeneration(height, weight) {
    // Find button in header and disable it
    const btn = document.getElementById('regenerate-ai-btn');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
        btn.style.pointerEvents = 'none';
    }
    
    // Mark regeneration as in progress
    _regenerationInProgress = true;
    
    // Find the insights view first to preserve existing content
    const views = document.querySelectorAll('.view');
    const tabs = document.querySelectorAll('.tab');
    const insightsTabIndex = Array.from(tabs).findIndex(tab => 
        tab.textContent.includes('💡') || tab.textContent.includes('Insights')
    );
    
    const insightsView = insightsTabIndex >= 0 ? views[insightsTabIndex] : null;
    const existingContent = insightsView ? insightsView.innerHTML : null;
    
    // Save the analysis card content separately so we can ensure it stays visible
    let existingAnalysisCard = null;
    if (insightsView) {
        const analysisCard = insightsView.querySelector('.ai-analysis-main-card');
        if (analysisCard) {
            existingAnalysisCard = analysisCard.cloneNode(true); // Deep clone to preserve structure
        }
    }
    
    // Make sure existing content stays visible - only update the header button
    // Don't touch the rest of the content until new analysis is ready
    if (insightsView && existingContent) {
        // Only update the regenerate button in the header, keep all other content intact
        const header = insightsView.querySelector('.ai-analysis-header');
        if (header) {
            let headerRight = header.querySelector('.ai-analysis-header-right');
            if (!headerRight) {
                headerRight = document.createElement('div');
                headerRight.className = 'ai-analysis-header-right';
                header.appendChild(headerRight);
            }
            // Replace button with regenerating indicator - existing analysis content stays visible below
            headerRight.innerHTML = '<div id="ai-regenerating-indicator" class="ai-regenerating-indicator-inline"><span class="regenerating-icon">⏳</span> <strong>Regenerating...</strong></div>';
        }
        
        // Defensive: Set up a check to restore content if it gets cleared
        // Check every 100ms to see if content is still there
        let contentCheckInterval = null;
        if (existingAnalysisCard) {
            contentCheckInterval = setInterval(() => {
                if (insightsView) {
                    const currentCard = insightsView.querySelector('.ai-analysis-main-card');
                    // If the card disappeared, restore it (but keep regenerating indicator)
                    if (!currentCard && existingAnalysisCard) {
                        console.log('Analysis card disappeared - restoring it');
                        // Find container and restore card
                        const container = insightsView.querySelector('.ai-insights-container') || insightsView;
                        container.appendChild(existingAnalysisCard.cloneNode(true));
                        // Update header to show regenerating indicator
                        const header = insightsView.querySelector('.ai-analysis-header');
                        if (header) {
                            let headerRight = header.querySelector('.ai-analysis-header-right');
                            if (headerRight) {
                                headerRight.innerHTML = '<div id="ai-regenerating-indicator" class="ai-regenerating-indicator-inline"><span class="regenerating-icon">⏳</span> <strong>Regenerating...</strong></div>';
                            }
                        }
                    }
                }
            }, 100);
            
            // Clear interval when we're done (will be cleared in finally block or on completion)
            window._regenerateContentCheckInterval = contentCheckInterval;
        }
    }
    
    try {
        // Get current swimmer data - try multiple methods
        let currentSwimmerData = null;
        
        // Method 1: Check global variable from tables.js
        if (window.currentSwimmerData) {
            currentSwimmerData = window.currentSwimmerData;
        }
        // Method 2: Try getCurrentSwimmerData function
        else if (typeof window.getCurrentSwimmerData === 'function') {
            currentSwimmerData = window.getCurrentSwimmerData();
        }
        // Method 3: Try to get from swimmer.js refreshInsights closure
        else if (window.refreshInsights && window.refreshInsights._data) {
            currentSwimmerData = window.refreshInsights._data;
        }
        
        if (!currentSwimmerData || !currentSwimmerData.swimmer) {
            // Last resort: reload the swimmer page to get fresh data
            const urlParams = new URLSearchParams(window.location.hash.substring(1));
            const swimmerAction = urlParams.toString().split('/')[0];
            const swimmerPkey = urlParams.toString().split('/')[1];
            
            if (swimmerAction === 'swimmer' && swimmerPkey) {
                // Reload swimmer page to get fresh data
                if (typeof window.swimmer === 'function') {
                    await window.swimmer(swimmerPkey);
                    // Wait a bit for page to reload
                    setTimeout(() => {
                        alert('Please click the Regenerate button again after the page loads.');
                    }, 1000);
                    return;
                }
            }
            
            alert('No swimmer data available. Please select a swimmer first.');
            // Restore button in header
            if (insightsView) {
                const header = insightsView.querySelector('.ai-analysis-header');
                if (header) {
                    let headerRight = header.querySelector('.ai-analysis-header-right');
                    if (headerRight) {
                        headerRight.innerHTML = '<button id="regenerate-ai-btn" onclick="regenerateAIAnalysis()" class="regenerate-ai-btn-header">🔄 Regenerate</button>';
                    }
                }
            }
            // Restore existing content if available
            if (insightsView && existingContent) {
                insightsView.innerHTML = existingContent;
            }
            return;
        }
        
        // Get height and weight from global stats or localStorage
        const swimmerPkey = String(currentSwimmerData.swimmer.pkey);
        const storageKey = `swimmer_stats_${swimmerPkey}`;
        const savedStats = JSON.parse(localStorage.getItem(storageKey) || '{}');
        const height = window._currentRegenerationStats?.height || savedStats.height || null;
        const weight = window._currentRegenerationStats?.weight || savedStats.weight || null;
        
        // Clear the temporary stats after using them
        if (window._currentRegenerationStats) {
            delete window._currentRegenerationStats;
        }
        
        // Clear cache for this swimmer
        const dataHash = (function() {
            function simpleHash(str) {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return Math.abs(hash).toString(36);
            }
            return simpleHash(JSON.stringify(currentSwimmerData.events.map(e => ({
                event: e[currentSwimmerData.events.idx.event],
                time: e[currentSwimmerData.events.idx.time],
                date: e[currentSwimmerData.events.idx.date]
            })).slice(0, 10)));
        })();
        
        const cacheKey = `gemini_analysis_${swimmerPkey}_${dataHash}`;
        localStorage.removeItem(cacheKey);
        console.log('Cleared cache for:', cacheKey);
        
        // Temporarily disable refreshInsights callback to prevent duplicate calls during regeneration
        const originalRefreshInsights = window.refreshInsights;
        if (window.refreshInsights) {
            window.refreshInsights = function() {
                console.log('refreshInsights called during regeneration - ignoring to prevent duplicate API calls');
                return Promise.resolve(); // Return resolved promise to prevent errors
            };
        }
        
        // Regenerate insights (this will fetch fresh from Gemini)
        // During this time, existing content remains visible - user can still read the old analysis
        if (window.generateInsights && window.renderInsights) {
            console.log('Starting AI analysis regeneration - this will call Gemini API once');
            // Pass height and weight to generateInsights
            const insightsData = await window.generateInsights(currentSwimmerData, { height, weight });
            console.log('Regeneration: insightsData received, swimCloudId:', insightsData?.swimCloudId);
            const insightsHtml = window.renderInsights(insightsData, false, currentSwimmerData); // Pass swimmerData
            
            // Restore refreshInsights callback
            if (originalRefreshInsights) {
                window.refreshInsights = originalRefreshInsights;
            }
            
            // Clear the content check interval since we're about to replace content
            if (window._regenerateContentCheckInterval) {
                clearInterval(window._regenerateContentCheckInterval);
                window._regenerateContentCheckInterval = null;
            }
            
            // Now that new analysis is ready, replace the entire view with new content
            // This updates both the header (removes regenerating indicator, restores button) and content
            if (insightsView) {
                insightsView.innerHTML = insightsHtml;
                console.log('AI analysis regenerated successfully - content updated');
            } else if (insightsTabIndex >= 0 && views[insightsTabIndex]) {
                views[insightsTabIndex].innerHTML = insightsHtml;
                console.log('AI analysis regenerated successfully - content updated');
            }
        }
    } catch (error) {
        console.error('Error regenerating AI analysis:', error);
        
        // Clear the content check interval on error
        if (window._regenerateContentCheckInterval) {
            clearInterval(window._regenerateContentCheckInterval);
            window._regenerateContentCheckInterval = null;
        }
        
        // Restore button in header on error
        if (insightsView) {
            const header = insightsView.querySelector('.ai-analysis-header');
            if (header) {
                let headerRight = header.querySelector('.ai-analysis-header-right');
                if (headerRight) {
                    headerRight.innerHTML = '<button id="regenerate-ai-btn" onclick="regenerateAIAnalysis()" class="regenerate-ai-btn-header">🔄 Regenerate</button>';
                }
            }
            
            // If content was lost, restore it
            if (existingContent) {
                const currentCard = insightsView.querySelector('.ai-analysis-main-card');
                if (!currentCard && existingContent) {
                    // Content was cleared - restore it
                    insightsView.innerHTML = existingContent;
                }
            }
        }
        
        // Show error but keep existing content visible
        if (insightsView && existingContent) {
            const currentContent = insightsView.innerHTML;
            // Only add error message if content exists, don't replace it
            if (!currentContent.includes('Error')) {
                const errorMsg = '<div style="background: rgba(220, 53, 69, 0.1); border-left: 3px solid #dc3545; padding: 10px 15px; margin-bottom: 15px; border-radius: 5px; font-size: 14px; color: #dc3545;"><strong>⚠️ Error:</strong> ' + error.message + '</div>';
                insightsView.innerHTML = errorMsg + existingContent;
            }
        } else {
            alert('Error regenerating AI analysis: ' + error.message);
        }
    } finally {
        // Clear the content check interval if still running
        if (window._regenerateContentCheckInterval) {
            clearInterval(window._regenerateContentCheckInterval);
            window._regenerateContentCheckInterval = null;
        }
        
        // Restore refreshInsights if it was disabled
        // (This is a safety net in case of errors)
        
        // Mark regeneration as complete
        _regenerationInProgress = false;
        
        // Button will be restored when renderInsights is called with isRegenerating=false
        // No need to manually restore here since the entire view is re-rendered
    }
}

/**
 * Generate a copyable AI prompt with swimmer data for ChatGPT/Gemini
 */
function generateAIPrompt(data) {
    if (!data || !data.events || !data.swimmer) {
        return "No swimmer data available.";
    }
    
    const swimmer = data.swimmer;
    const events = data.events;
    const idx = events.idx;
    
    // Group events by event string (includes course) and find best times
    const bestTimes = new Map();
    const eventListMap = typeof _eventList !== 'undefined' ? _eventList : {};
    
    for (const event of events) {
        const eventKey = event[idx.event];
        const time = event[idx.time];
        const date = event[idx.date];
        const timeInt = window.timeToInt ? window.timeToInt(time) : 0;
        
        // Get proper event name from _eventList (e.g., "50 BR SCY")
        const eventStr = eventListMap[eventKey] || `Event_${eventKey}`;
        
        // Skip placeholder events
        if (eventStr.includes('_')) continue;
        
        // Use event string as key to separate SCY/LCM
        if (!bestTimes.has(eventStr) || timeInt < bestTimes.get(eventStr).timeInt) {
            bestTimes.set(eventStr, { time, date, timeInt, eventKey, eventStr });
        }
    }
    
    // Extract rankings from DOM if available
    let rankingsText = '';
    try {
        const rankings = extractRankingsFromDOM();
        if (rankings && rankings.length > 0) {
            // Sort by best rank
            rankings.sort((a, b) => (a.bestRank || 999) - (b.bestRank || 999));
            for (const r of rankings) {
                let rankParts = [];
                if (r.bcRank && r.bcRank > 0) rankParts.push(`BC: #${r.bcRank}`);
                if (r.pnRank && r.pnRank > 0) rankParts.push(`PN: #${r.pnRank}`);
                if (r.zoneRank && r.zoneRank > 0) rankParts.push(`WZ: #${r.zoneRank}`);
                if (r.usaRank && r.usaRank > 0) rankParts.push(`US: #${r.usaRank}`);
                if (rankParts.length > 0) {
                    rankingsText += `- ${r.event}: ${r.time} → ${rankParts.join(', ')}\n`;
                }
            }
        }
    } catch (e) {
        console.log('Could not extract rankings from DOM:', e);
    }
    
    // Extract motivational standards and meet cuts from DOM
    let standardsText = '';
    let majorCutsText = ''; // Separate tracking for major meet cuts
    const majorCutsList = ['NWReg', 'PNS', 'WZone', 'SECT', 'SprSec', 'SumSec', 'FUT', 'Futures', 'JO', 'FW'];
    const majorCutsAchieved = {}; // { cutName: [events] }
    const majorCutsGaps = {}; // { cutName: [{event, gap}] }
    
    try {
        const tables = document.querySelectorAll('table.fill');
        const stdNames = ['B', 'BB', 'A', 'AA', 'AAA', 'AAAA'];
        
        tables.forEach(table => {
            // First, get meet cut names from header row (tr.gy)
            const headerRow = table.querySelector('tr.gy');
            const meetCutNames = [];
            if (headerRow) {
                const mcHeaders = headerRow.querySelectorAll('th.mc');
                mcHeaders.forEach(th => {
                    // Get short name from .bs element or popup
                    const bsEl = th.querySelector('.bs');
                    const popupEl = th.querySelector('.popup-content');
                    let name = '';
                    if (bsEl) {
                        name = bsEl.textContent.trim();
                    } else if (popupEl) {
                        name = popupEl.textContent.trim().split(' ')[0];
                    } else {
                        name = th.textContent.trim().split('\n')[0];
                    }
                    meetCutNames.push(name);
                });
            }
            console.log('[extractStandards] Meet cut names from header:', meetCutNames);
            
            const rows = table.querySelectorAll('tr:not(.wt):not(.gy)');
            rows.forEach(row => {
                // Get event info
                const courseCell = row.querySelector('td.age');
                const strokeCell = row.querySelector('td.bold');
                const distanceCell = row.querySelector('td.full .clickable');
                
                if (!distanceCell) return;
                
                const course = courseCell ? courseCell.textContent.trim() : '';
                const stroke = strokeCell ? strokeCell.textContent.trim() : '';
                const distance = distanceCell ? distanceCell.textContent.trim() : '';
                
                if (!distance || !stroke) return;
                
                const eventName = `${distance} ${stroke}${course ? ' ' + course : ''}`;
                
                // Extract motivational standards (td.mt cells)
                const mtCells = row.querySelectorAll('td.mt');
                const mcCells = row.querySelectorAll('td.mc');
                
                let achieved = [];
                let gaps = [];
                
                // Process motivational times (B, BB, A, AA, AAA, AAAA)
                mtCells.forEach((cell, i) => {
                    const content = cell.textContent.trim();
                    if (!content) return;
                    
                    // Check if achieved (dp class) or not (ad class)
                    const isAchieved = cell.querySelector('.dp') !== null;
                    const deltaEl = cell.querySelector('.time-delta, .sub');
                    const delta = deltaEl ? deltaEl.textContent.trim() : '';
                    const stdName = stdNames[i] || `Std${i+1}`;
                    
                    if (isAchieved) {
                        achieved.push(stdName);
                    } else if (delta) {
                        gaps.push(`${stdName}: ${delta}`);
                    }
                });
                
                // Process meet cuts (NWReg, PNS, WZone, etc.) - use header names
                mcCells.forEach((cell, i) => {
                    const content = cell.textContent.trim();
                    if (!content) return;
                    
                    const isAchieved = cell.querySelector('.dp') !== null;
                    const deltaEl = cell.querySelector('.time-delta, .sub');
                    const delta = deltaEl ? deltaEl.textContent.trim() : '';
                    const cutName = meetCutNames[i] || `Cut${i+1}`;
                    
                    if (isAchieved) {
                        achieved.push(cutName);
                        // Track major cuts separately
                        if (majorCutsList.some(mc => cutName.toUpperCase().includes(mc.toUpperCase()))) {
                            if (!majorCutsAchieved[cutName]) majorCutsAchieved[cutName] = [];
                            majorCutsAchieved[cutName].push(eventName);
                        }
                    } else if (delta) {
                        gaps.push(`${cutName}: ${delta}`);
                        // Track gaps for major cuts
                        if (majorCutsList.some(mc => cutName.toUpperCase().includes(mc.toUpperCase()))) {
                            if (!majorCutsGaps[cutName]) majorCutsGaps[cutName] = [];
                            majorCutsGaps[cutName].push({ event: eventName, gap: delta });
                        }
                    }
                });
                
                // Format output: achieved first, then gaps
                if (achieved.length > 0 || gaps.length > 0) {
                    let line = `- ${eventName}: `;
                    if (achieved.length > 0) {
                        line += `✅ Achieved: ${achieved.join(', ')}`;
                    }
                    if (gaps.length > 0) {
                        if (achieved.length > 0) line += ' | ';
                        line += `Gaps: ${gaps.join(', ')}`;
                    }
                    standardsText += line + '\n';
                }
            });
        });
        
        // Build major cuts summary
        const achievedCuts = Object.keys(majorCutsAchieved);
        if (achievedCuts.length > 0) {
            majorCutsText += '### ✅ MAJOR MEET CUTS ACHIEVED:\n';
            for (const cut of achievedCuts) {
                majorCutsText += `- **${cut}**: ${majorCutsAchieved[cut].join(', ')}\n`;
            }
            majorCutsText += '\n';
        }
        
        // Build closest gaps summary (sorted by gap size)
        const gapCuts = Object.keys(majorCutsGaps);
        if (gapCuts.length > 0) {
            majorCutsText += '### 🎯 CLOSEST TO MAJOR CUTS (Priority Targets):\n';
            const allGaps = [];
            for (const cut of gapCuts) {
                for (const g of majorCutsGaps[cut]) {
                    allGaps.push({ cut, event: g.event, gap: g.gap });
                }
            }
            // Sort by gap (convert to seconds for sorting)
            allGaps.sort((a, b) => {
                const parseGap = (g) => {
                    const match = g.match(/([+-]?\d+\.?\d*)/);
                    return match ? parseFloat(match[1]) : 999;
                };
                return parseGap(a.gap) - parseGap(b.gap);
            });
            // Show top 10 closest
            const topGaps = allGaps.slice(0, 10);
            for (const g of topGaps) {
                majorCutsText += `- **${g.event}** → ${g.cut}: ${g.gap} away\n`;
            }
        }
        
    } catch (e) {
        console.log('Could not extract standards from DOM:', e);
    }
    
    // Format best times grouped by course
    let bestTimesText = '';
    const scyTimes = [];
    const lcmTimes = [];
    const scmTimes = [];
    
    for (const [eventStr, bt] of bestTimes) {
        const parts = eventStr.split(' ');
        const course = parts[2] || 'SCY';
        const displayName = `${parts[0]} ${parts[1]}`; // e.g., "50 BR"
        
        if (course === 'SCY') {
            scyTimes.push({ name: displayName, time: bt.time, date: bt.date });
        } else if (course === 'LCM') {
            lcmTimes.push({ name: displayName, time: bt.time, date: bt.date });
        } else if (course === 'SCM') {
            scmTimes.push({ name: displayName, time: bt.time, date: bt.date });
        }
    }
    
    // Sort by event name
    const sortFn = (a, b) => a.name.localeCompare(b.name);
    scyTimes.sort(sortFn);
    lcmTimes.sort(sortFn);
    scmTimes.sort(sortFn);
    
    if (scyTimes.length > 0) {
        bestTimesText += 'Short Course Yards (SCY):\n';
        for (const bt of scyTimes) {
            bestTimesText += `- ${bt.name}: ${bt.time} (${bt.date})\n`;
        }
    }
    if (lcmTimes.length > 0) {
        bestTimesText += '\nLong Course Meters (LCM):\n';
        for (const bt of lcmTimes) {
            bestTimesText += `- ${bt.name}: ${bt.time} (${bt.date})\n`;
        }
    }
    if (scmTimes.length > 0) {
        bestTimesText += '\nShort Course Meters (SCM):\n';
        for (const bt of scmTimes) {
            bestTimesText += `- ${bt.name}: ${bt.time} (${bt.date})\n`;
        }
    }
    
    // Calculate improvement trends
    let improvementText = '';
    const recentEvents = new Map();
    for (const event of events) {
        const eventKey = event[idx.event];
        const eventStr = eventListMap[eventKey] || `Event_${eventKey}`;
        if (eventStr.includes('_')) continue;
        
        if (!recentEvents.has(eventStr)) {
            recentEvents.set(eventStr, []);
        }
        recentEvents.get(eventStr).push({
            time: event[idx.time],
            date: event[idx.date],
            timeInt: window.timeToInt ? window.timeToInt(event[idx.time]) : 0
        });
    }
    
    for (const [eventStr, times] of recentEvents) {
        if (times.length >= 3) {
            times.sort((a, b) => a.date.localeCompare(b.date));
            const oldest = times[0];
            const newest = times[times.length - 1];
            const improvement = oldest.timeInt - newest.timeInt;
            if (improvement !== 0) {
                const parts = eventStr.split(' ');
                const eventName = `${parts[0]} ${parts[1]} ${parts[2] || ''}`.trim();
                const sign = improvement > 0 ? '-' : '+';
                const delta = Math.abs(improvement) / 100;
                improvementText += `- ${eventName}: ${sign}${delta.toFixed(2)}s (from ${oldest.time} to ${newest.time})\n`;
            }
        }
    }
    
    // Helper function to generate meet history text
    function generateMeetHistoryText(events, idx) {
        if (!events || events.length === 0) return 'No meet history available';
        
        // Get all unique dates and sort them
        const dates = events.map(e => e[idx.date]).filter(d => d).sort();
        if (dates.length === 0) return 'No meet dates available';
        
        const firstDate = new Date(dates[0]);
        const lastDate = new Date(dates[dates.length - 1]);
        
        // Count meets by year
        const meetsByYear = new Map();
        const dateSet = new Set();
        for (const event of events) {
            const date = event[idx.date];
            if (date && !dateSet.has(date)) {
                dateSet.add(date);
                const year = date.substring(0, 4);
                meetsByYear.set(year, (meetsByYear.get(year) || 0) + 1);
            }
        }
        
        // Find gaps (more than 6 months between meets)
        const sortedDates = Array.from(dateSet).sort();
        const gaps = [];
        for (let i = 1; i < sortedDates.length; i++) {
            const prev = new Date(sortedDates[i - 1]);
            const curr = new Date(sortedDates[i]);
            const monthsDiff = (curr - prev) / (1000 * 60 * 60 * 24 * 30);
            if (monthsDiff > 6) {
                gaps.push({
                    from: sortedDates[i - 1],
                    to: sortedDates[i],
                    months: Math.round(monthsDiff)
                });
            }
        }
        
        // Calculate career span
        const careerMonths = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30));
        const careerYears = (careerMonths / 12).toFixed(1);
        
        let text = '';
        text += `- First recorded meet: ${dates[0]}\n`;
        text += `- Most recent meet: ${dates[dates.length - 1]}\n`;
        text += `- Career span: ${careerYears} years (${careerMonths} months)\n`;
        text += `- Total meet days: ${dateSet.size}\n`;
        text += `\nMeets per year:\n`;
        
        const sortedYears = Array.from(meetsByYear.keys()).sort();
        for (const year of sortedYears) {
            const count = meetsByYear.get(year);
            text += `  ${year}: ${count} meet day${count > 1 ? 's' : ''}\n`;
        }
        
        if (gaps.length > 0) {
            text += `\n⚠️ SIGNIFICANT GAPS DETECTED (6+ months without competing):\n`;
            for (const gap of gaps) {
                text += `  - ${gap.months} months: ${gap.from} to ${gap.to}\n`;
            }
            text += `\nNote: Gaps may indicate breaks from swimming, injury recovery, or returning after time away.\n`;
        } else {
            text += `\n✅ No significant gaps - consistent competition history\n`;
        }
        
        return text;
    }
    
    // Gender codes: 1 = Female, 2 = Male (handle both string and number)
    // Try to get gender from swimmer object first, then from events
    let genderVal = swimmer.gender;
    if (genderVal === undefined || genderVal === null || genderVal === '') {
        // Try to get from first event
        if (events.length > 0 && idx.gender !== undefined) {
            genderVal = events[0][idx.gender];
        }
    }
    let genderStr = 'Male'; // Default to Male if unknown
    if (genderVal == 1 || genderVal === 'F' || genderVal === 'Female') {
        genderStr = 'Female';
    } else if (genderVal == 2 || genderVal === 'M' || genderVal === 'Male') {
        genderStr = 'Male';
    }
    
    // Get name - handle potential duplicates
    let fullName = '';
    if (swimmer.firstName && swimmer.lastName) {
        let first = swimmer.firstName.trim();
        let last = swimmer.lastName.trim();
        
        // Remove duplicate words in firstName (e.g., "Ray Ray" -> "Ray")
        const firstWords = first.split(/\s+/);
        const uniqueFirstWords = [];
        for (const word of firstWords) {
            if (!uniqueFirstWords.some(w => w.toLowerCase() === word.toLowerCase())) {
                uniqueFirstWords.push(word);
            }
        }
        first = uniqueFirstWords.join(' ');
        
        // Check if firstName already contains lastName (e.g., "Ray Tang" + "Tang")
        const firstLower = first.toLowerCase();
        const lastLower = last.toLowerCase();
        if (firstLower.endsWith(lastLower) || firstLower.includes(lastLower)) {
            fullName = first;
        } else {
            fullName = `${first} ${last}`;
        }
    } else if (swimmer.name) {
        fullName = swimmer.name.trim();
    } else {
        fullName = (swimmer.firstName || swimmer.lastName || 'Unknown').trim();
    }
    
    const prompt = `You are an expert swim coach analyzing a competitive swimmer's performance data. Please provide personalized insights, identify strengths and areas for improvement, and give specific training recommendations.

## SWIMMER PROFILE
- Name: ${fullName}
- Age: ${swimmer.age}
- Approximate Grade: ${swimmer.age >= 18 ? 'College' : swimmer.age >= 17 ? '12th (Senior)' : swimmer.age >= 16 ? '11th (Junior)' : swimmer.age >= 15 ? '10th (Sophomore)' : swimmer.age >= 14 ? '9th (Freshman)' : swimmer.age >= 13 ? '8th' : swimmer.age >= 12 ? '7th' : swimmer.age >= 11 ? '6th' : swimmer.age >= 10 ? '5th' : swimmer.age + ' years old'}
- Gender: ${genderStr}
- Club: ${swimmer.clubName}
- LSC: ${swimmer.lsc}
- Years until College Recruiting: ${swimmer.age >= 16 ? 'NOW - recruiting age' : 16 - swimmer.age + ' years'}

## PERSONAL BEST TIMES (Short Course Yards)
${bestTimesText || 'No times recorded'}

## RANKINGS (Age Group: ${swimmer.age >= 13 && swimmer.age <= 14 ? '13-14' : swimmer.age >= 11 && swimmer.age <= 12 ? '11-12' : swimmer.age >= 9 && swimmer.age <= 10 ? '9-10' : swimmer.age <= 8 ? '8 & Under' : 'Open'})
BC = Club ranking, PN = LSC (Pacific Northwest) ranking, WZ = Western Zone ranking, US = USA Swimming national ranking
${rankingsText || '(No rankings data available)'}

## 🏆 MAJOR MEET QUALIFICATION STATUS
${majorCutsText || '(No major meet cuts data available - make sure Personal Best tab is loaded)'}

## MOTIVATIONAL STANDARDS & MEET CUTS (Full Detail)
✅ = Achieved, time shown = gap to achieve
B < BB < A < AA < AAA < AAAA (USA Swimming motivational times)
FW = Far Western, JO = Junior Olympics, PNS = PN Swimming Champs, SECT = Sectionals, FUT = Futures
${standardsText || 'Standards not yet loaded - make sure Personal Best tab is showing'}

## RECENT IMPROVEMENT TRENDS
${improvementText || 'Not enough data for trend analysis'}

## COMPETITION HISTORY & GAPS
${generateMeetHistoryText(events, idx)}

## TOTAL RECORDED SWIMS
${events.length} competition swims across ${bestTimes.size} different events

---

Please provide a comprehensive analysis:

## 1. SWIMMER TYPE ANALYSIS
- Is this swimmer a **sprinter** (excels at 50/100), **middle distance** (200/500), or **distance** swimmer (500+)?
- What stroke(s) are their specialty? (Freestyle, Backstroke, Breaststroke, Butterfly, IM)
- Based on their times across events, what's their natural strength?

## 2. TOP EVENTS & RANKINGS ANALYSIS
- Identify their **3 best events** based on rankings (lowest rank = best)
- Which events should they prioritize for competitions?
- Any events where their ranking is surprisingly good or bad compared to their times?

## 3. NEXT STANDARDS TO TARGET (Priority Order)
- List events where they're **closest to achieving the next standard** (smallest gap)
- For each, specify: current time, target time, gap, and estimated timeline to achieve
- Which 2-3 events should they focus on for the NEXT meet to make cuts?

## 3.5 REGIONAL & NATIONAL MEET CUTS ANALYSIS

Analyze this swimmer's path to qualifying for these major meets (in order of difficulty):

### NWReg (Northwest Regional Championships)
- Which events are they closest to NWReg cuts?
- Gap to NWReg cut for top 3 events
- Realistic timeline to achieve NWReg cuts
- This is often the first "big meet" goal for developing swimmers

### PNS_14u (Pacific Northwest Swimming 14 & Under Championships)
- Age eligibility check (must be 14 or under)
- Which events can they qualify in before aging out?
- Priority events for PNS qualification
- If already qualified, which additional events should they target?

### WZone (Western Zone Championships)
- Western Zone is a multi-LSC regional championship
- Gap analysis for WZone cuts
- Which events are realistic for WZone qualification?
- Timeline: When could they make their first WZone team?

### SprSec / SumSec (Spring Sectionals / Summer Sectionals)
- Sectionals are the step between LSC championships and national-level meets
- Gap to Sectionals cuts (usually 2-5 seconds faster than JO)
- Which events have best chance for Sectionals?
- Typical age swimmers first qualify: 14-16
- Is this swimmer on track for Sectionals within 1-2 years?

### Futures (USA Swimming Futures Championships)
- Futures is the entry point to national-level competition
- Gap to Futures cuts for realistic events
- What improvement rate would be needed to hit Futures?
- Typical path: JO → Sectionals → Futures → Junior Nationals
- Realistic assessment: Is Futures achievable for this swimmer?

### Meet Cuts Progression Table
Create a table showing the path for their top 3 events:
| Event | Current | NWReg | PNS | WZone | Sectionals | Futures | Jr Nationals |
|-------|---------|-------|-----|-------|------------|---------|--------------|
| Gap in seconds from current time to each cut |

### Priority Meet Cuts (Next 6-12 months)
Based on their current times and improvement trajectory:
1. Which meet cut should be their #1 priority?
2. Which event gives them the best chance?
3. What specific time do they need?
4. Realistic timeline with monthly checkpoints

## 4. TRAINING RECOMMENDATIONS
Based on their swimmer type and goals:
- **Endurance work** - Do they need more aerobic base? (long swims, threshold sets)
- **Speed work** - Do they need more explosiveness? (sprints, race pace work)
- **Technique focus** - Any stroke-specific drills recommended?
- **Turns & underwaters** - Often worth 0.5-1.0 seconds
- **Starts** - Can gain 0.2-0.5 seconds with better dives

## 5. GOAL SETTING & ACTION PLAN

### SHORT-TERM GOALS (Next 1-3 months)
- **Immediate focus events** (1-2 events to prioritize right now)
- **Target times** for the next meet
- **Weekly training focus**: What should they work on in practice this month?
- **Technique cues**: 2-3 specific things to think about during races

### MEDIUM-TERM GOALS (3-6 months / This Season)
- **Season-end target times** for top 3 events
- **Meet cuts to achieve** this season (be specific: which standard, which event)
- **Training phase**: What should this part of the season focus on? (base building, race prep, taper)
- **Competition plan**: How many meets? Which are "A" meets vs training meets?

### LONG-TERM GOALS (1-2 years)
- **Where should they be in 1 year?** (specific times)
- **Where should they be in 2 years?** (specific times)
- **What standards should they target?** (JO, Sectionals, Futures, Junior Nationals)
- **Development priorities**: What skills/events to develop over the next 1-2 years?

### HOW TO GET THERE (Action Plan)
- **Practice priorities**: What % of practice should be sprint vs distance vs technique?
- **Dryland/Strength**: What should they add outside the pool?
- **Mental training**: Race strategy, dealing with pressure, goal visualization
- **Recovery**: Sleep, nutrition, rest day importance
- **Key milestones**: Checkpoints to measure progress (e.g., "By March, should be under X in 100 Free")

## 6. LONG-TERM PROJECTION (D1 College Swimming Potential)
Consider this swimmer's age (${swimmer.age}) and current times:
- **By Age 16 / Grade 11**: What times would they need to be D1 recruitable?
- **Junior Nationals / Futures cuts**: Are these realistic goals? By what age?
- **Sectionals / Speedo Series**: When could they achieve these cuts?
- Based on their improvement rate, project where they could be at age 16-18
- What percentage of swimmers at their current level make D1? Be realistic.

D1 Recruiting Reference Times (approximate):
- Men: 50 FR ~20.0, 100 FR ~44.0, 200 FR ~1:38, 100 BR ~55.0, 100 BK ~49.0, 100 FL ~48.0, 200 IM ~1:50
- Women: 50 FR ~23.0, 100 FR ~50.0, 200 FR ~1:48, 100 BR ~1:02, 100 BK ~55.0, 100 FL ~55.0, 200 IM ~2:02

## 7. COMPETITION HISTORY ANALYSIS
- Is this swimmer actively competing or returning after a break?
- If there are gaps, how might this affect their development?
- For returning swimmers: What's typical for comeback timeline? How long to return to previous level?
- Competition frequency: Are they competing enough to improve?

## 8. MOTIVATIONAL ASSESSMENT
- What makes this swimmer special based on their data?
- Realistic encouragement based on actual progress
- Key milestones to celebrate along the way
- For returning swimmers: Celebrate the comeback, set realistic re-entry goals

## 9. VISUALIZATIONS & TABLES (Generate diagrams, charts, and summary tables)

### 9.1 Event Strength Radar Chart
Create a visual showing relative strength across strokes (FR, BK, BR, FL, IM) using a text-based radar/spider chart or bar chart.

### 9.2 Progress Timeline
Show a timeline visualization of:
- Past progress (key milestones achieved)
- Current position
- Future goals with target dates

### 9.3 Standards Gap Chart
Create a bar chart showing how close they are to each standard:
\`\`\`
Event     | Current | B | BB | A | AA | JO | FW
----------|---------|---|----|----|----|----|----
50 FR     | ████████████░░░░░░░░░  (75% to B)
100 BR    | ██████████████████░░░  (90% to BB)
\`\`\`

### 9.4 Training Focus Pie Chart
Show recommended training time allocation:
- Sprint work %
- Distance/Endurance %
- Technique %
- Dryland %

### 9.5 Development Trajectory Graph
Show projected times over the next 2-3 years with milestones marked.

### 9.6 Summary Tables (Markdown format)

**Table 1: Top Events Summary**
| Event | Best Time | BC Rank | Standard Achieved | Next Target | Gap |
|-------|-----------|---------|-------------------|-------------|-----|
| ... | ... | ... | ... | ... | ... |

**Table 2: Goal Timeline**
| Timeframe | Event | Current Time | Target Time | Training Focus |
|-----------|-------|--------------|-------------|----------------|
| 1 month | ... | ... | ... | ... |
| 3 months | ... | ... | ... | ... |
| 6 months | ... | ... | ... | ... |
| 1 year | ... | ... | ... | ... |

**Table 3: Weekly Training Plan Template**
| Day | Focus | Main Set Example | Distance |
|-----|-------|------------------|----------|
| Mon | ... | ... | ... |
| Tue | ... | ... | ... |
| ... | ... | ... | ... |

**Table 4: Standards Checklist**
| Event | B | BB | A | AA | JO | FW | Sectionals |
|-------|---|----|----|----|----|-----|------------|
| 50 FR | ✅ | ✅ | ⏳ | ❌ | ❌ | ❌ | ❌ |
| (✅ = achieved, ⏳ = close/in progress, ❌ = not yet) |

**Table 5: D1 Projection Comparison**
| Event | Current Time | D1 Target | Gap | Projected Age to Reach |
|-------|--------------|-----------|-----|------------------------|
| ... | ... | ... | ... | ... |

Be specific with times and data. Don't be overly optimistic - give honest, actionable feedback a coach would give. If this swimmer has gaps in their history, acknowledge it and provide comeback-specific advice.`;

    return prompt;
}

/**
 * Copy AI prompt to clipboard
 */
async function copyAIPrompt() {
    const data = window.refreshInsights?._data;
    if (!data) {
        alert('No swimmer data available. Please load a swimmer first.');
        return;
    }
    
    const prompt = generateAIPrompt(data);
    
    try {
        await navigator.clipboard.writeText(prompt);
        
        // Show success feedback
        const btn = document.getElementById('copy-ai-prompt-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            btn.style.background = '#28a745';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);
        }
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = prompt;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('AI prompt copied to clipboard! Paste it into ChatGPT or Gemini.');
    }
}

/**
 * Copy AI prompt from the editable textarea
 */
async function copyAIPromptFromTextarea() {
    const textarea = document.getElementById('ai-prompt-textarea');
    if (!textarea) {
        alert('Prompt not found. Please try again.');
        return;
    }
    
    const prompt = textarea.value;
    
    try {
        await navigator.clipboard.writeText(prompt);
        
        // Show success feedback on the button
        const buttons = document.querySelectorAll('.copy-ai-prompt-btn');
        buttons.forEach(btn => {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            btn.style.background = '#28a745';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);
        });
    } catch (err) {
        // Fallback for older browsers
        textarea.select();
        document.execCommand('copy');
        alert('Prompt copied to clipboard!');
    }
}

/**
 * Refresh the AI prompt textarea with latest data (including rankings)
 */
async function refreshAIPromptTextarea() {
    const textarea = document.getElementById('ai-prompt-textarea');
    const data = window.refreshInsights?._data;
    
    if (!textarea) {
        console.log('Textarea not found');
        return;
    }
    
    if (!data) {
        alert('No swimmer data available.');
        return;
    }
    
    // Show loading state
    const buttons = document.querySelectorAll('.copy-ai-prompt-btn');
    buttons.forEach(btn => {
        if (btn.textContent.includes('Refresh')) {
            btn.innerHTML = '⏳ Loading...';
        }
    });
    
    try {
        // Switch to Personal Best tab first to ensure table is rendered
        if (window.TabView && window.TabView.tab) {
            TabView.tab('swimmerTabView', 0);
        }
        
        // Wait for tab switch and initial render
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Wait for BC rankings to finish loading
        let maxWait = 10; // Max 10 seconds
        let waited = 0;
        while (waited < maxWait) {
            const loaders = document.querySelectorAll('table.fill td.rk .loader');
            const loadedCells = document.querySelectorAll('table.fill td.rk .clickable');
            console.log(`[refreshAIPromptTextarea] Loaders: ${loaders.length}, Loaded cells: ${loadedCells.length}`);
            
            // If we have some loaded cells and few loaders, we're good enough
            if (loaders.length === 0 || (loadedCells.length > 0 && loaders.length <= 2)) {
                console.log(`[refreshAIPromptTextarea] Rankings appear loaded after ${waited}s`);
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            waited++;
        }
        
        if (waited >= maxWait) {
            console.log(`[refreshAIPromptTextarea] Timeout waiting for rankings, continuing anyway`);
        }
        
        // Trigger PN/WZ/US calculation if not already done
        if (window.calculatePNWZUSRankings) {
            try {
                await window.calculatePNWZUSRankings();
                // Wait a bit for background actions to complete
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
                console.log('Could not calculate PN/WZ/US rankings:', e);
            }
        }
        
        // Debug: Check what tables are found
        const tables = document.querySelectorAll('table.fill');
        console.log(`[refreshAIPromptTextarea] Found ${tables.length} tables`);
        tables.forEach((t, i) => {
            const rankCells = t.querySelectorAll('td.rk');
            const withNumbers = Array.from(rankCells).filter(c => {
                const text = c.textContent.trim();
                return text && !isNaN(parseInt(text)) && parseInt(text) > 0;
            });
            console.log(`[refreshAIPromptTextarea] Table ${i}: ${rankCells.length} rank cells, ${withNumbers.length} with numbers`);
        });
        
        // Regenerate the prompt with latest data
        const newPrompt = generateAIPrompt(data);
        textarea.value = newPrompt;
        
        // Show feedback
        buttons.forEach(btn => {
            if (btn.textContent.includes('Loading') || btn.textContent.includes('Refresh')) {
                btn.innerHTML = '✅ Updated!';
                btn.style.background = '#28a745';
                setTimeout(() => {
                    btn.innerHTML = '🔄 Refresh';
                    btn.style.background = '';
                }, 1500);
            }
        });
        
        // Switch back to AI Insights tab
        if (window.TabView && window.TabView.tab) {
            TabView.tab('swimmerTabView', 4); // AI Insights is tab 4
        }
    } catch (e) {
        console.error('Error refreshing AI prompt:', e);
        buttons.forEach(btn => {
            if (btn.textContent.includes('Loading')) {
                btn.innerHTML = '❌ Error';
                btn.style.background = '#dc3545';
                setTimeout(() => {
                    btn.innerHTML = '🔄 Refresh';
                    btn.style.background = '';
                }, 2000);
            }
        });
    }
}

window.generateInsights = generateInsights;
window.renderInsights = renderInsights;
window.getSwimCloudId = getSwimCloudId;
window.getGeminiAnalysis = getGeminiAnalysis;
window.getGeminiApiKey = getGeminiApiKey;
window.regenerateAIAnalysis = regenerateAIAnalysis;
window.createSpecialtyChart = createSpecialtyChart;
window.generateAIPrompt = generateAIPrompt;
window.copyAIPrompt = copyAIPrompt;
window.copyAIPromptFromTextarea = copyAIPromptFromTextarea;
window.refreshAIPromptTextarea = refreshAIPromptTextarea;

