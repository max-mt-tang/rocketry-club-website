/**
 * ================================================================================
 * SWIM TRACKER - CACHE MODULE
 * ================================================================================
 * 
 * Local storage cache system with smart cleanup and quota management.
 * Handles caching for swimmer data, rankings, and other API responses.
 */

// ================================================================================
// LOCAL STORAGE CACHE SYSTEM
// ================================================================================

class LocalCache {
    static set(key, value) {
        try {
            // Don't cache rankings with "Unknown" gender to avoid quota issues
            if (key.includes("Unknown_")) {
                console.log("Skipping cache for Unknown gender key:", key);
                return;
            }
            localStorage.setItem(
                key,
                JSON.stringify({ time: new Date(), data: value }),
            );
        } catch (error) {
            if (error.name === "QuotaExceededError") {
                console.log(
                    "localStorage quota exceeded, implementing smart cache cleanup",
                );
                LocalCache.smartCleanup();
                // Try to store again after cleanup
                try {
                    localStorage.setItem(
                        key,
                        JSON.stringify({ time: new Date(), data: value }),
                    );
                } catch (retryError) {
                    console.log(
                        "Still cannot store after cleanup, skipping cache for:",
                        key,
                    );
                }
            } else {
                console.error("Error setting localStorage:", error);
            }
        }
    }

    static async get(key, timeoutInSec) {
        let item = JSON.parse(localStorage.getItem(key));

        if (!item) {
            return;
        }

        timeoutInSec = timeoutInSec || window._1DayInSec;
        if (new Date() - new Date(item.time) > timeoutInSec * 1000) {
            return;
        }

        return item.data;
    }

    static async func(key, func, timeoutInSec) {
        let data = await LocalCache.get(key, timeoutInSec);
        if (data) {
            // Handle all ranking data (BC, PN, WZ, US) format with preserved idx
            if (key.startsWith('rank/') && data.values && data.idx) {
                console.log('Restoring ranking data from cache with idx for key:', key);
                let restoredData = data.values;
                restoredData.idx = data.idx;
                return restoredData;
            }
            return data;
        }

        data = await func();
        if (!data) {
            return;
        }

        // For all ranking data (BC, PN, WZ, US), ensure idx property is preserved in cache
        if (key.startsWith('rank/') && Array.isArray(data) && data.idx) {
            console.log('Caching ranking data with idx preservation for key:', key);
            // Store both the array data and the idx separately to preserve it
            let cacheData = {
                values: [...data], // Copy the array
                idx: {...data.idx} // Copy the idx object
            };
            LocalCache.set(key, cacheData);
            return data;
        } else {
            LocalCache.set(key, data);
            return data;
        }
    }

    static smartCleanup() {
        console.log("Starting smart cache cleanup...");
        let keys = Object.keys(localStorage);
        let cacheEntries = [];

        // Collect all cache entries with timestamps
        for (let key of keys) {
            if (
                key.startsWith("rank/") ||
                key.startsWith("swimmer/") ||
                key.startsWith("clubs/") ||
                key.startsWith("search/")
            ) {
                try {
                    let item = JSON.parse(localStorage.getItem(key));
                    if (item && item.time) {
                        cacheEntries.push({
                            key: key,
                            time: new Date(item.time),
                            size: localStorage.getItem(key).length,
                        });
                    }
                } catch (e) {
                    // Invalid entry, remove it
                    localStorage.removeItem(key);
                }
            }
        }

        // Sort by age (oldest first) and size (largest first for same age)
        cacheEntries.sort((a, b) => {
            let timeDiff = a.time - b.time;
            return timeDiff !== 0 ? timeDiff : b.size - a.size;
        });

        // Remove oldest 25% of cache entries
        let toRemove = Math.ceil(cacheEntries.length * 0.25);
        let removedSize = 0;

        for (let i = 0; i < toRemove && i < cacheEntries.length; i++) {
            localStorage.removeItem(cacheEntries[i].key);
            removedSize += cacheEntries[i].size;
        }

        console.log(
            `Cleaned up ${toRemove} cache entries, freed ~${Math.round(removedSize / 1024)}KB`,
        );
        LocalCache.logStorageUsage();
    }

    static logStorageUsage() {
        let total = 0;
        let keys = Object.keys(localStorage);
        for (let key of keys) {
            total += localStorage.getItem(key).length;
        }
        console.log(
            `localStorage usage: ${Math.round(total / 1024)}KB across ${keys.length} keys`,
        );
    }
}

// ================================================================================
// VERSION CHECK AND CACHE MANAGEMENT
// ================================================================================

async function checkVersion() {
    const version = 1;

    let preVersion = Number(localStorage.getItem("version"));
    if (preVersion < 1) {
        localStorage.clear();
    }

    localStorage.setItem("version", version);
}

/**
 * Manual cache clearing function for settings page
 */
async function clearCache(elem) {
    if (!elem) {
        let key = document.getElementById("cache-key").value;
        let list = Object.keys(localStorage);
        if (key.startsWith("!")) {
            key = key.substring(1);
            for (let k of list) {
                if (!k.startsWith(key)) {
                    localStorage.removeItem(k);
                }
            }
            alert("Cache key not started with " + key + " is cleared.");
        } else {
            for (let k of list) {
                if (k.startsWith(key)) {
                    localStorage.removeItem(k);
                }
            }
            alert("Cache key started with " + key + " is cleared.");
        }
    }

    let list = Object.keys(localStorage);
    let text = "";
    for (let k of list) {
        text += k + "\n";
    }
    document.getElementById("cache-info").innerText = text;
}

// Export for global access
window.LocalCache = LocalCache;
window.clearCache = clearCache;
window.checkVersion = checkVersion;
