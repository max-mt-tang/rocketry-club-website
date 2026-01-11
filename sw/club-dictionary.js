/**
 * ================================================================================
 * SWIM TRACKER - CLUB DICTIONARY MODULE
 * ================================================================================
 * 
 * Club dictionary for mapping club codes to club names.
 * Depends on fetchSwimValues and LocalCache from api.js
 */

// ================================================================================
// CLUB DICTIONARY
// ================================================================================

class ClubDictinary {
    #dict;
    constructor() {
        this.#dict = new Map();
    }

    static async #load(lsc) {
        return await LocalCache.func(
            "clubs/" + lsc,
            async () => {
                let bodyObj = {
                    metadata: [
                        {
                            title: "clubName",
                            dim: "[Persons.ClubName]",
                            datatype: "text",
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

                let values = await fetchSwimValues(bodyObj);
                if (!values) {
                    return;
                }

                console.log(`ClubDictionary.#load: First API call result for ${lsc}:`, {
                    hasValues: !!values,
                    isArray: Array.isArray(values),
                    length: values.length,
                    hasIdx: !!values.idx,
                    idxKeys: values.idx ? Object.keys(values.idx) : 'no idx'
                });

                if (!values.idx) {
                    console.error(`ClubDictionary.#load: Missing idx in first API response for ${lsc}`);
                    return;
                }

                let names = values.map((v) => v[values.idx.clubName]);

                bodyObj = {
                    metadata: [
                        {
                            title: "club",
                            dim: "[OrgUnit.Level4Code]",
                            datatype: "text",
                        },
                        {
                            title: "clubName",
                            dim: "[OrgUnit.Level4Name]",
                            datatype: "text",
                            filter: {
                                members: names,
                            },
                        },
                        {
                            dim: "[OrgUnit.Level3Code]",
                            datatype: "text",
                            filter: {
                                equals: lsc,
                            },
                            panel: "scope",
                        },
                    ],
                    count: names.length,
                };

                let clubCodes = await fetchSwimValues(bodyObj, "event");

                console.log(`ClubDictionary.#load: Second API call result for ${lsc}:`, {
                    hasClubCodes: !!clubCodes,
                    isArray: Array.isArray(clubCodes),
                    length: clubCodes?.length || 0,
                    hasIdx: !!clubCodes?.idx,
                    idxKeys: clubCodes?.idx ? Object.keys(clubCodes.idx) : 'no idx'
                });

                return clubCodes;
            },
            window._1WeekInSec || (7 * 24 * 60 * 60), // Fallback if _1WeekInSec not yet available
        );
    }

    async loadClubMap(lsc) {
        console.log(`ClubDictionary.loadClubMap: Loading club map for lsc="${lsc}"`);

        let map = this.#dict.get(lsc);
        if (map) {
            console.log(`ClubDictionary.loadClubMap: Using cached map for ${lsc}, size=${map.size}`);
            return map;
        }

        console.log(`ClubDictionary.loadClubMap: Cache miss, loading fresh club data for ${lsc}`);

        // Clear any corrupted cached data first
        let cacheKey = "clubs/" + lsc;
        console.log(`ClubDictionary.loadClubMap: Checking cache for key "${cacheKey}"`);
        let cachedData = await LocalCache.get(cacheKey);
        if (cachedData && (!cachedData.idx || !Array.isArray(cachedData))) {
            console.log(`ClubDictionary.loadClubMap: Found corrupted cache data, clearing for ${lsc}`, cachedData);
            localStorage.removeItem(cacheKey);
        }

        let data = await ClubDictinary.#load(lsc);

        console.log(`ClubDictionary.loadClubMap: API call completed for ${lsc}`, {
            hasData: !!data,
            isArray: Array.isArray(data),
            length: data?.length || 0,
            hasIdx: !!(data?.idx),
            dataType: typeof data
        });

        // If data exists but is missing idx, it's corrupted cache - clear and reload
        if (data && !data.idx && Array.isArray(data)) {
            console.log(`ClubDictionary.loadClubMap: Data missing idx, clearing cache and reloading for ${lsc}`);
            localStorage.removeItem(cacheKey);
            data = await ClubDictinary.#load(lsc);
            console.log(`ClubDictionary.loadClubMap: Reload completed for ${lsc}`, {
                hasData: !!data,
                hasIdx: !!(data?.idx)
            });
        }

        if (data && data.idx) {
            map = new Map();
            let idx = data.idx;
            console.log(`ClubDictionary.loadClubMap: Building club map from ${data.length} entries`);

            for (let row of data) {
                if (row[idx.club]) {
                    map.set(row[idx.club], row[idx.clubName]);
                }
            }

            console.log(`ClubDictionary.loadClubMap: Club map built for ${lsc} with ${map.size} entries`);

            // Show first few entries for debugging
            if (map.size > 0) {
                console.log(`ClubDictionary.loadClubMap: First few clubs in ${lsc}:`,
                    Array.from(map.entries()).slice(0, 5).map(([code, name]) => `${code}="${name}"`));
            }

            this.#dict.set(lsc, map);
        } else {
            console.warn(`ClubDictionary.loadClubMap: Failed to load club data for ${lsc}`);
        }

        return map;
    }

    async loadClubName(lsc, club) {
        console.log(`ClubDictionary.loadClubName: Looking up club="${club}" in lsc="${lsc}"`);

        let map = await this.loadClubMap(lsc);

        console.log(`ClubDictionary.loadClubName: loadClubMap returned:`, {
            hasMap: !!map,
            mapType: typeof map,
            mapSize: map?.size || 0
        });

        if (!map) {
            console.warn(`ClubDictionary.loadClubName: No club map available for lsc="${lsc}"`);
            return;
        }

        let clubName = map.get(club);
        console.log(`ClubDictionary.loadClubName: Club lookup result:`, {
            searchedFor: club,
            found: clubName,
            hasResult: !!clubName
        });

        // Show first few club entries for debugging if lookup failed
        if (!clubName && map.size > 0) {
            console.log(`ClubDictionary.loadClubName: Club "${club}" not found. Available clubs in ${lsc}:`,
                Array.from(map.entries()).slice(0, 10).map(([code, name]) => `${code}="${name}"`));
        }

        return clubName;
    }

    async loadClubCode(lsc, clubName) {
        let map = await this.loadClubMap(lsc);
        if (!map) {
            return;
        }

        for (let [code, name] of map) {
            if (name == clubName) {
                return code;
            }
        }
    }
}

// Export for global access
window.ClubDictinary = ClubDictinary;

