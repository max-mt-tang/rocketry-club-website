/**
 * ================================================================================
 * SWIM TRACKER - BCST ROSTER MODULE
 * ================================================================================
 *
 * Bellevue Club Swim Team roster management and group navigation.
 * Handles loading team roster data and providing group/swimmer dropdowns.
 * 
 * Updated from MemberDirectory.pdf - January 2026
 */

// ================================================================================
// BCST ROSTER DATA MANAGEMENT
// ================================================================================

class BCSTRoster {
    constructor() {
        this.roster = new Map(); // Map of group name -> swimmers array
        this.isLoaded = false;
    }

    /**
     * Load BCST roster data from embedded JavaScript object
     */
    async loadRoster() {
        if (this.isLoaded) {
            return this.roster;
        }

        try {
            console.log("Loading BCST roster from embedded data...");

            // Embedded roster data - Updated from MemberDirectory.pdf
            const rosterData = {
                "Senior 2": [
                                {
                                                "name": "Andrew Zhang",
                                                "id": "857120",
                                                "gender": "Male",
                                                "age": 15
                                },
                                {
                                                "name": "Ella Chiulli",
                                                "id": "1410846",
                                                "gender": "Female",
                                                "age": 15
                                },
                                {
                                                "name": "Hannah Li",
                                                "id": "680121",
                                                "gender": "Female",
                                                "age": 15
                                },
                                {
                                                "name": "Leo Chen",
                                                "id": "622638",
                                                "gender": "Male",
                                                "age": 15
                                },
                                {
                                                "name": "Leo Moshenskiy",
                                                "id": "698923",
                                                "gender": "Male",
                                                "age": 16
                                },
                                {
                                                "name": "Matthew Ma",
                                                "id": "3250955",
                                                "gender": "Male",
                                                "age": 34
                                },
                                {
                                                "name": "Miles Ahmadi",
                                                "id": "475441",
                                                "gender": "Male",
                                                "age": 15
                                },
                                {
                                                "name": "Natalia Latuskiewicz",
                                                "id": "1377722",
                                                "gender": "Female",
                                                "age": 16
                                },
                                {
                                                "name": "Nick Becciu",
                                                "id": "815215",
                                                "gender": "Male",
                                                "age": 15
                                },
                                {
                                                "name": "Niel Yeh",
                                                "id": "3661793",
                                                "gender": "Male",
                                                "age": 16
                                },
                                {
                                                "name": "Will Liu",
                                                "id": "922236",
                                                "gender": "Male",
                                                "age": 15
                                },
                                {
                                                "name": "Woojin Shin",
                                                "id": "3842837",
                                                "gender": "Male",
                                                "age": 14
                                }
                ],
                "Prep": [
                                {
                                                "name": "Anderson Tseng",
                                                "id": "1825242",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Anna Zhang",
                                                "id": "660785",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Bimu Beibit",
                                                "id": "865347",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Caroline Arthur",
                                                "id": "818970",
                                                "gender": "Female",
                                                "age": 12
                                },
                                {
                                                "name": "Charlotte Yamamoto",
                                                "id": "1356898",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Chelsea Zhu",
                                                "id": "3720164",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Claire Tan",
                                                "id": "922058",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Derek Wu",
                                                "id": "661223",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Edward Li",
                                                "id": "1446372",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Elyssa Hung",
                                                "id": "941127",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Emily Jensen",
                                                "id": "932229",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Fitz McCullough",
                                                "id": "1622709",
                                                "gender": "Male",
                                                "age": 14
                                },
                                {
                                                "name": "Gabby Wojdak",
                                                "id": "1347616",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Hanjun Wang",
                                                "id": "1704043",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Jacob Yeung",
                                                "id": "959068",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Jada Jumani",
                                                "id": "1196258",
                                                "gender": "Female",
                                                "age": 12
                                },
                                {
                                                "name": "Josie Riener",
                                                "id": "651729",
                                                "gender": "Female",
                                                "age": 12
                                },
                                {
                                                "name": "Livie Yen",
                                                "id": "833253",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Lizzy Tangyang",
                                                "id": "3915877",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Lulu White",
                                                "id": "3904788",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Michelle Morton",
                                                "id": "888767",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Mila Alkhazov",
                                                "id": "948855",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Noah Arthiabah",
                                                "id": "904718",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Sasha Shestakov",
                                                "id": "797518",
                                                "gender": "Male",
                                                "age": 14
                                },
                                {
                                                "name": "Siran Cao",
                                                "id": "768031",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Stella Arthiabah",
                                                "id": "904717",
                                                "gender": "Female",
                                                "age": 12
                                },
                                {
                                                "name": "Tiya More",
                                                "id": "736562",
                                                "gender": "Female",
                                                "age": 13
                                }
                ],
                "Senior Performance": [
                                {
                                                "name": "Annie Wang",
                                                "id": "1546634",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Ava Tuntikanokporn",
                                                "id": "1945267",
                                                "gender": "Female",
                                                "age": 15
                                },
                                {
                                                "name": "Bella Wong",
                                                "id": "1054047",
                                                "gender": "Female",
                                                "age": 15
                                },
                                {
                                                "name": "Blakely Biege",
                                                "id": "1622961",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Carter Neal",
                                                "id": "670460",
                                                "gender": "Male",
                                                "age": 14
                                },
                                {
                                                "name": "Chelsea Wong",
                                                "id": "923249",
                                                "gender": "Female",
                                                "age": 16
                                },
                                {
                                                "name": "Claire Gao",
                                                "id": "841597",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Clairey Wang",
                                                "id": "1723293",
                                                "gender": "Female",
                                                "age": 15
                                },
                                {
                                                "name": "Daniel Pegushin",
                                                "id": "698509",
                                                "gender": "Male",
                                                "age": 14
                                },
                                {
                                                "name": "Ellen Lu",
                                                "id": "1518616",
                                                "gender": "Female",
                                                "age": 16
                                },
                                {
                                                "name": "Ellie Wang",
                                                "id": "1807042",
                                                "gender": "Female",
                                                "age": 17
                                },
                                {
                                                "name": "Hope Enge",
                                                "id": "1054030",
                                                "gender": "Female",
                                                "age": 17
                                },
                                {
                                                "name": "Jessica Li",
                                                "id": "727045",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Joshua Tang",
                                                "id": "922399",
                                                "gender": "Male",
                                                "age": 16
                                },
                                {
                                                "name": "Julia Kim",
                                                "id": "854249",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Julia Shang",
                                                "id": "922545",
                                                "gender": "Female",
                                                "age": 17
                                },
                                {
                                                "name": "Kiki Pfeiffer",
                                                "id": "922413",
                                                "gender": "Female",
                                                "age": 15
                                },
                                {
                                                "name": "Leon Huang",
                                                "id": "922720",
                                                "gender": "Male",
                                                "age": 14
                                },
                                {
                                                "name": "Mila Zhang",
                                                "id": "763484",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Natalie Chang",
                                                "id": "1051536",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Navya Sainani",
                                                "id": "1062632",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Quinn McCullough",
                                                "id": "1570084",
                                                "gender": "Female",
                                                "age": 15
                                },
                                {
                                                "name": "Ryan Shaw",
                                                "id": "959491",
                                                "gender": "Male",
                                                "age": 14
                                },
                                {
                                                "name": "Stella Chen",
                                                "id": "841263",
                                                "gender": "Female",
                                                "age": 16
                                },
                                {
                                                "name": "Stella Wang",
                                                "id": "818846",
                                                "gender": "Female",
                                                "age": 15
                                },
                                {
                                                "name": "Vansea Barnett",
                                                "id": "1518084",
                                                "gender": "Female",
                                                "age": 15
                                },
                                {
                                                "name": "Weiran Chen",
                                                "id": "698411",
                                                "gender": "Male",
                                                "age": 14
                                },
                                {
                                                "name": "Wiktor Schabowski",
                                                "id": "1547307",
                                                "gender": "Male",
                                                "age": 14
                                }
                ],
                "Regional": [
                                {
                                                "name": "Adi Beibit",
                                                "id": "1050658",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Aiden Brown",
                                                "id": "2170083",
                                                "gender": "Male",
                                                "age": 11
                                },
                                {
                                                "name": "Alex Wang",
                                                "id": "1611568",
                                                "gender": "Female",
                                                "age": 12
                                },
                                {
                                                "name": "Ashley Gao",
                                                "id": "2405854",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Ava McNair",
                                                "id": "1170207",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Carly Johnson",
                                                "id": "1174713",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Caroline Cao",
                                                "id": "1178765",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Daniel Shamshurin",
                                                "id": "1732031",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Ethan Fei",
                                                "id": "1170171",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Feifan Gong",
                                                "id": "3686156",
                                                "gender": "Male",
                                                "age": 11
                                },
                                {
                                                "name": "Frances McCullough",
                                                "id": "1570085",
                                                "gender": "Female",
                                                "age": 12
                                },
                                {
                                                "name": "Gracie Switaj",
                                                "id": "1059101",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Isabella Qu",
                                                "id": "3750934",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Jasper Wu",
                                                "id": "2140982",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Joy Huang",
                                                "id": "1611562",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Kiyomi Matsuno",
                                                "id": "2082086",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Luke Han",
                                                "id": "1357353",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Nikolai Ryndin",
                                                "id": "1034947",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Shauna Chen",
                                                "id": "914151",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Sinne Collin",
                                                "id": "2051639",
                                                "gender": "Female",
                                                "age": 12
                                },
                                {
                                                "name": "Steve Zhao",
                                                "id": "4044947",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Sylena HUANG",
                                                "id": "1994405",
                                                "gender": "Female",
                                                "age": 12
                                },
                                {
                                                "name": "Theodor Ryndin",
                                                "id": "1034948",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Vivian Miao",
                                                "id": "2061121",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Vivienne Merza",
                                                "id": "842366",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Zara Suri",
                                                "id": "1169703",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Zoe Tolzmann",
                                                "id": "1102935",
                                                "gender": "Female",
                                                "age": 12
                                }
                ],
                "Champs": [
                                {
                                                "name": "Advika Belur",
                                                "id": "1075546",
                                                "gender": "Female",
                                                "age": 12
                                },
                                {
                                                "name": "Aiden Broderick",
                                                "id": "3920852",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Alan Chen",
                                                "id": "1054878",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Anita Chang",
                                                "id": "1695359",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Archie Li",
                                                "id": "1001066",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Ayush Belur",
                                                "id": "1075547",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Brian Zhang",
                                                "id": "661622",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Camilla Shultz",
                                                "id": "1824898",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Charlotte Walsh",
                                                "id": "893769",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Cindy Wang",
                                                "id": "3643165",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "David Fan",
                                                "id": "1741203",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Dean Hollenbeck",
                                                "id": "1145395",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Elliot Lei",
                                                "id": "932096",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Ethan Xu",
                                                "id": "1042402",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Ivy Zheng",
                                                "id": "1079353",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Landon Rourke",
                                                "id": "1641955",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Lexton Chang",
                                                "id": "3747737",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Leyton Wolf",
                                                "id": "1945748",
                                                "gender": "Male",
                                                "age": 14
                                },
                                {
                                                "name": "Maddie Wu",
                                                "id": "4117895",
                                                "gender": "Female",
                                                "age": 12
                                },
                                {
                                                "name": "Mia Deng",
                                                "id": "1226021",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Mia Tseng",
                                                "id": "1205192",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Mia Tuntikanokporn",
                                                "id": "1945268",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Ray Liu",
                                                "id": "1631334",
                                                "gender": "Male",
                                                "age": 11
                                },
                                {
                                                "name": "Ray Tang",
                                                "id": "500281",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Ryan Forrest",
                                                "id": "3745277",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Ryley Robinson",
                                                "id": "1058448",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Tanya Gupta",
                                                "id": "789323",
                                                "gender": "Female",
                                                "age": 12
                                },
                                {
                                                "name": "Tate Wong",
                                                "id": "923250",
                                                "gender": "Male",
                                                "age": 13
                                }
                ],
                "Divisional": [
                                {
                                                "name": "Alex Gao",
                                                "id": "3921378",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Alex Han",
                                                "id": "1732558",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Annabel Yao",
                                                "id": "1639735",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Arnold Tanto",
                                                "id": "1816121",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Austin Chen",
                                                "id": "1611588",
                                                "gender": "Male",
                                                "age": 11
                                },
                                {
                                                "name": "Bodhi Shanbhag",
                                                "id": "1590870",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Brennen Lester",
                                                "id": "4118157",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Bunny Fowler",
                                                "id": "978557",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Daniel Chen",
                                                "id": "833993",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Emerson Switaj",
                                                "id": "905713",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "George Liu",
                                                "id": "3995324",
                                                "gender": "Male",
                                                "age": 11
                                },
                                {
                                                "name": "Hunter Franck",
                                                "id": "1704143",
                                                "gender": "Male",
                                                "age": 14
                                },
                                {
                                                "name": "Iris Tang",
                                                "id": "1611538",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Karys Fan",
                                                "id": "745438",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Kathryn Xiao",
                                                "id": "1611533",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Kevin Chen",
                                                "id": "2217267",
                                                "gender": "Male",
                                                "age": 36
                                },
                                {
                                                "name": "Lucy Ross",
                                                "id": "3751294",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Matthew Solari",
                                                "id": "905385",
                                                "gender": "Male",
                                                "age": 13
                                },
                                {
                                                "name": "Nathan Jiao",
                                                "id": "1042351",
                                                "gender": "Male",
                                                "age": 11
                                },
                                {
                                                "name": "Sadie Schimmelbusch",
                                                "id": "1078900",
                                                "gender": "Female",
                                                "age": 13
                                },
                                {
                                                "name": "Ted Wang",
                                                "id": "1605077",
                                                "gender": "Male",
                                                "age": 12
                                },
                                {
                                                "name": "Vincent Liu",
                                                "id": "922237",
                                                "gender": "Male",
                                                "age": 14
                                },
                                {
                                                "name": "YUNA KIM",
                                                "id": "3777286",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Zegen Brink",
                                                "id": "2751208",
                                                "gender": "Male",
                                                "age": 12
                                }
                ],
                "Gold 1": [
                                {
                                                "name": "AJ Wanichek",
                                                "id": "4105524",
                                                "gender": "Male",
                                                "age": 9
                                },
                                {
                                                "name": "Abby Broderick",
                                                "id": "3920853",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Alex Muller",
                                                "id": "3743289",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Anna Wu",
                                                "id": "596226",
                                                "gender": "Female",
                                                "age": 16
                                },
                                {
                                                "name": "Brooks Switaj",
                                                "id": "3736150",
                                                "gender": "Male",
                                                "age": 8
                                },
                                {
                                                "name": "Cameron Watrous",
                                                "id": "2757271",
                                                "gender": "Male",
                                                "age": 8
                                },
                                {
                                                "name": "Charlie Muller",
                                                "id": "3743290",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Clara Neal",
                                                "id": "3941447",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Evelyn Lang",
                                                "id": "3872170",
                                                "gender": "Female",
                                                "age": 9
                                },
                                {
                                                "name": "Gabriel Dom",
                                                "id": "4048395",
                                                "gender": "Male",
                                                "age": 9
                                },
                                {
                                                "name": "Indie Thatcher",
                                                "id": "3706253",
                                                "gender": "Female",
                                                "age": 9
                                },
                                {
                                                "name": "Iris Peng",
                                                "id": "1597714",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Jayke Hung",
                                                "id": "3750871",
                                                "gender": "Male",
                                                "age": 9
                                },
                                {
                                                "name": "Julie Kim",
                                                "id": "3969019",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Kelly Zhang",
                                                "id": "2405947",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Kiki Chan",
                                                "id": "3915506",
                                                "gender": "Female",
                                                "age": 9
                                },
                                {
                                                "name": "Larson Switaj",
                                                "id": "3736152",
                                                "gender": "Male",
                                                "age": 8
                                },
                                {
                                                "name": "Leo Gazzard",
                                                "id": "3718195",
                                                "gender": "Male",
                                                "age": 8
                                },
                                {
                                                "name": "Lianna Shubin",
                                                "id": "3875113",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Lucas Hernandez",
                                                "id": "1605289",
                                                "gender": "Male",
                                                "age": 9
                                },
                                {
                                                "name": "Nick Lemker",
                                                "id": "3705826",
                                                "gender": "Male",
                                                "age": 11
                                },
                                {
                                                "name": "Shayne Zhang",
                                                "id": "3740699",
                                                "gender": "Male",
                                                "age": 8
                                },
                                {
                                                "name": "Su Cimren",
                                                "id": "4057918",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Terence Wu",
                                                "id": "2793002",
                                                "gender": "Male",
                                                "age": 9
                                },
                                {
                                                "name": "Watson She",
                                                "id": "3734513",
                                                "gender": "Male",
                                                "age": 9
                                }
                ],
                "National": [
                                {
                                                "name": "Alexander Zhao",
                                                "id": "",
                                                "gender": "Male",
                                                "age": 16
                                },
                                {
                                                "name": "Alex Nemirovsky",
                                                "id": "1945563",
                                                "gender": "Female",
                                                "age": 17
                                },
                                {
                                                "name": "Brooklyn Lang",
                                                "id": "680407",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Bruce Shen",
                                                "id": "799007",
                                                "gender": "Male",
                                                "age": 17
                                },
                                {
                                                "name": "Camille Pruner",
                                                "id": "1377721",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Christian Wong",
                                                "id": "1054045",
                                                "gender": "Male",
                                                "age": 18
                                },
                                {
                                                "name": "Clare Watson",
                                                "id": "1582097",
                                                "gender": "Female",
                                                "age": 18
                                },
                                {
                                                "name": "Daniel Lee",
                                                "id": "878094",
                                                "gender": "Male",
                                                "age": 18
                                },
                                {
                                                "name": "Eliza Seibert",
                                                "id": "1508017",
                                                "gender": "Female",
                                                "age": 16
                                },
                                {
                                                "name": "Gracyn Kehoe",
                                                "id": "1606558",
                                                "gender": "Female",
                                                "age": 18
                                },
                                {
                                                "name": "Hailey Weiler",
                                                "id": "1741083",
                                                "gender": "Female",
                                                "age": 18
                                },
                                {
                                                "name": "Jack Tidwell",
                                                "id": "932197",
                                                "gender": "Male",
                                                "age": 16
                                },
                                {
                                                "name": "Meg Dahlin",
                                                "id": "1484750",
                                                "gender": "Female",
                                                "age": 18
                                },
                                {
                                                "name": "Nik Brusilovski",
                                                "id": "1455652",
                                                "gender": "Male",
                                                "age": 17
                                },
                                {
                                                "name": "Samuel Mok",
                                                "id": "1067776",
                                                "gender": "Male",
                                                "age": 16
                                },
                                {
                                                "name": "Sofia Wyzga",
                                                "id": "1337618",
                                                "gender": "Female",
                                                "age": 17
                                },
                                {
                                                "name": "Sutton Forbis",
                                                "id": "1067502",
                                                "gender": "Female",
                                                "age": 16
                                },
                                {
                                                "name": "Tatum Enge",
                                                "id": "1054024",
                                                "gender": "Female",
                                                "age": 15
                                }
                ],
                "Gold 2": [
                                {
                                                "name": "Bella Chen",
                                                "id": "245802",
                                                "gender": "Female",
                                                "age": 20
                                },
                                {
                                                "name": "Ellie Hsu",
                                                "id": "3702132",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Elsa Wang",
                                                "id": "3915553",
                                                "gender": "Female",
                                                "age": 9
                                },
                                {
                                                "name": "Esther Wei",
                                                "id": "2150783",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Geoffrey Yu",
                                                "id": "1158039",
                                                "gender": "Male",
                                                "age": 11
                                },
                                {
                                                "name": "Hudson Franck",
                                                "id": "4119303",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Jake McNair",
                                                "id": "3861297",
                                                "gender": "Male",
                                                "age": 8
                                },
                                {
                                                "name": "Jonathan Lan",
                                                "id": "2122296",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Kaia Webb",
                                                "id": "4127301",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Kailin Yang",
                                                "id": "2645466",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Kandice Chen",
                                                "id": "3923268",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Laurel Parris",
                                                "id": "3749886",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Lili Wei",
                                                "id": "1026418",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Lucas Shamshurin",
                                                "id": "3719253",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Paige Larkin",
                                                "id": "3915404",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Qifan Gong",
                                                "id": "3686157",
                                                "gender": "Male",
                                                "age": 9
                                },
                                {
                                                "name": "Raihan Echevarria",
                                                "id": "1225257",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Saien Wu",
                                                "id": "1597180",
                                                "gender": "Male",
                                                "age": 10
                                }
                ],
                "Orange": [
                                {
                                                "name": "Alex Havril",
                                                "id": "3744270",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Alyson Gao",
                                                "id": "2806405",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Andrew Lin",
                                                "id": "1066601",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Andrew Liu",
                                                "id": "1611982",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Blakely Garcia",
                                                "id": "1050420",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Brennan Garr",
                                                "id": "1050753",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "David Goldenberg",
                                                "id": "3738558",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Elliott Johnson",
                                                "id": "4117561",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Grace Farmer",
                                                "id": "2180802",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Haoran Cong",
                                                "id": "2061487",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Jercey Zhao",
                                                "id": "3962658",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Joshua Chen",
                                                "id": "2208310",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Kamran Clapp",
                                                "id": "1042439",
                                                "gender": "Male",
                                                "age": 10
                                },
                                {
                                                "name": "Lexie Watrous",
                                                "id": "1621386",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Luna Dong",
                                                "id": "3640116",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Madeline Yurchak",
                                                "id": "2751526",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Melody Li",
                                                "id": "3733429",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Olivia Covey",
                                                "id": "2180251",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Sadie Vanhorn",
                                                "id": "2032225",
                                                "gender": "Female",
                                                "age": 9
                                },
                                {
                                                "name": "Sheela Gupta",
                                                "id": "3915366",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Sophie Ji",
                                                "id": "1986879",
                                                "gender": "Female",
                                                "age": 11
                                },
                                {
                                                "name": "Victoria Su",
                                                "id": "1144830",
                                                "gender": "Female",
                                                "age": 10
                                },
                                {
                                                "name": "Yushi Chong",
                                                "id": "2425156",
                                                "gender": "Male",
                                                "age": 10
                                }
                ],
                "Silver": [
                                {
                                                "name": "Adar Vanhorn",
                                                "id": "3943922",
                                                "gender": "Female",
                                                "age": 7
                                },
                                {
                                                "name": "Alex Malcomson",
                                                "id": "3917230",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Alicia Tan",
                                                "id": "3789687",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Brendan Gao",
                                                "id": "4045215",
                                                "gender": "Male",
                                                "age": 9
                                },
                                {
                                                "name": "Elina Jumani",
                                                "id": "4035217",
                                                "gender": "Female",
                                                "age": 7
                                },
                                {
                                                "name": "Emma Jun",
                                                "id": "4065155",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Eric Yu",
                                                "id": "3824523",
                                                "gender": "Male",
                                                "age": 8
                                },
                                {
                                                "name": "Esme Thatcher",
                                                "id": "3739775",
                                                "gender": "Female",
                                                "age": 7
                                },
                                {
                                                "name": "George Li",
                                                "id": "3995324",
                                                "gender": "Male",
                                                "age": 11
                                },
                                {
                                                "name": "Georgia Yurchak",
                                                "id": "3915591",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Ian Lee",
                                                "id": "3672240",
                                                "gender": "Male",
                                                "age": 22
                                },
                                {
                                                "name": "James Covey",
                                                "id": "4118450",
                                                "gender": "Male",
                                                "age": 7
                                },
                                {
                                                "name": "Liana Chen",
                                                "id": "3934695",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Lucas Liu",
                                                "id": "3867366",
                                                "gender": "Male",
                                                "age": 8
                                },
                                {
                                                "name": "Lucy Wei",
                                                "id": "3726517",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Mina Yin",
                                                "id": "3970797",
                                                "gender": "Female",
                                                "age": 9
                                },
                                {
                                                "name": "Peter Lemker",
                                                "id": "3952234",
                                                "gender": "Male",
                                                "age": 8
                                },
                                {
                                                "name": "Rylan Garcia",
                                                "id": "3945244",
                                                "gender": "Male",
                                                "age": 8
                                },
                                {
                                                "name": "Seb Lam",
                                                "id": "3945441",
                                                "gender": "Male",
                                                "age": 8
                                },
                                {
                                                "name": "Summer Gao",
                                                "id": "2031604",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Zoie Peng",
                                                "id": "3894419",
                                                "gender": "Female",
                                                "age": 7
                                }
                ],
                "Bronze": [
                                {
                                                "name": "Alessia Wang",
                                                "id": "4130463",
                                                "gender": "Female",
                                                "age": 7
                                },
                                {
                                                "name": "Alicia Zhao",
                                                "id": "4149580",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Ava Thurogood",
                                                "id": "4131362",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Ellie Geng",
                                                "id": "3987514",
                                                "gender": "Female",
                                                "age": 7
                                },
                                {
                                                "name": "Eloise Lally",
                                                "id": "4039558",
                                                "gender": "Female",
                                                "age": 7
                                },
                                {
                                                "name": "Eva Zamora-Kapoor",
                                                "id": "4067385",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Jeremy Yoo",
                                                "id": "4138825",
                                                "gender": "Male",
                                                "age": 7
                                },
                                {
                                                "name": "Jillian Riener",
                                                "id": "3856082",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Leila Chou",
                                                "id": "3914178",
                                                "gender": "Female",
                                                "age": 7
                                },
                                {
                                                "name": "Leo Yin",
                                                "id": "3970779",
                                                "gender": "Male",
                                                "age": 6
                                },
                                {
                                                "name": "Liza Ryndina",
                                                "id": "3953579",
                                                "gender": "Female",
                                                "age": 6
                                },
                                {
                                                "name": "Nora Deng",
                                                "id": "4034858",
                                                "gender": "Female",
                                                "age": 8
                                },
                                {
                                                "name": "Rayni Deng",
                                                "id": "3966108",
                                                "gender": "Female",
                                                "age": 6
                                },
                                {
                                                "name": "Ryder Tang",
                                                "id": "3969985",
                                                "gender": "Male",
                                                "age": 7
                                },
                                {
                                                "name": "Tiffany Gao",
                                                "id": "3963375",
                                                "gender": "Female",
                                                "age": 6
                                },
                                {
                                                "name": "Victoria Staley",
                                                "id": "4030173",
                                                "gender": "Female",
                                                "age": 8
                                }
                ],
                "Senior 1": [
                                {
                                                "name": "Colin Lemker",
                                                "id": "940975",
                                                "gender": "Male",
                                                "age": 15
                                },
                                {
                                                "name": "Gabbie Tran",
                                                "id": "1049359",
                                                "gender": "Female",
                                                "age": 16
                                },
                                {
                                                "name": "George Jiang",
                                                "id": "1070631",
                                                "gender": "Male",
                                                "age": 14
                                },
                                {
                                                "name": "Grace Helland",
                                                "id": "1133876",
                                                "gender": "Female",
                                                "age": 18
                                },
                                {
                                                "name": "Ian Tang",
                                                "id": "842113",
                                                "gender": "Male",
                                                "age": 15
                                },
                                {
                                                "name": "JoJo Lin",
                                                "id": "1703831",
                                                "gender": "Male",
                                                "age": 15
                                },
                                {
                                                "name": "Lauren Huddy",
                                                "id": "932107",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Maggie Seibert",
                                                "id": "1508016",
                                                "gender": "Female",
                                                "age": 17
                                },
                                {
                                                "name": "Marie Morkos",
                                                "id": "763654",
                                                "gender": "Female",
                                                "age": 17
                                },
                                {
                                                "name": "Max Tang",
                                                "id": "1320806",
                                                "gender": "Male",
                                                "age": 16
                                },
                                {
                                                "name": "Megan Huang",
                                                "id": "1337540",
                                                "gender": "Female",
                                                "age": 18
                                },
                                {
                                                "name": "Mia Davis",
                                                "id": "922582",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Mira Pawar",
                                                "id": "1598086",
                                                "gender": "Female",
                                                "age": 16
                                },
                                {
                                                "name": "Miyako Matsuno",
                                                "id": "932409",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Nicole Tanto",
                                                "id": "1816120",
                                                "gender": "Female",
                                                "age": 15
                                },
                                {
                                                "name": "Oli Huang",
                                                "id": "1337543",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Rachael Cohen",
                                                "id": "872777",
                                                "gender": "Female",
                                                "age": 14
                                },
                                {
                                                "name": "Reagan Wang",
                                                "id": "1807044",
                                                "gender": "Male",
                                                "age": 15
                                },
                                {
                                                "name": "Rhys Sullivan",
                                                "id": "932075",
                                                "gender": "Male",
                                                "age": 14
                                },
                                {
                                                "name": "Sehaam Mankotia",
                                                "id": "858009",
                                                "gender": "Male",
                                                "age": 15
                                },
                                {
                                                "name": "Teneya Villanueva",
                                                "id": "1258456",
                                                "gender": "Female",
                                                "age": 15
                                },
                                {
                                                "name": "William Han",
                                                "id": "1357352",
                                                "gender": "Male",
                                                "age": 15
                                }
                ]
};

            // Store in map
            for (const [groupName, swimmers] of Object.entries(rosterData)) {
                this.roster.set(groupName, swimmers);
            }

            this.isLoaded = true;
            console.log(`Loaded ${this.roster.size} groups from embedded roster data`);
            return this.roster;
        } catch (error) {
            console.error("Error loading BCST roster:", error);
            throw error;
        }
    }

    /**
     * Get all group names
     */
    getGroups() {
        return Array.from(this.roster.keys());
    }

    /**
     * Get swimmers for a specific group
     */
    getSwimmers(groupName) {
        return this.roster.get(groupName) || [];
    }

    /**
     * Get swimmers filtered by gender
     */
    getSwimmersByGender(groupName, gender) {
        const swimmers = this.getSwimmers(groupName);
        if (!gender) return swimmers;
        return swimmers.filter(s => s.gender === gender);
    }

    /**
     * Find a swimmer by name across all groups
     */
    findSwimmer(name) {
        for (const [group, swimmers] of this.roster) {
            const swimmer = swimmers.find(s => 
                s.name.toLowerCase().includes(name.toLowerCase())
            );
            if (swimmer) {
                return { ...swimmer, group };
            }
        }
        return null;
    }

    /**
     * Find a swimmer's group by their pkey/id
     */
    findSwimmerGroupById(pkey) {
        const pkeyStr = String(pkey);
        for (const [group, swimmers] of this.roster) {
            const swimmer = swimmers.find(s => String(s.id) === pkeyStr);
            if (swimmer) {
                return { swimmer: { ...swimmer, group }, group };
            }
        }
        return null;
    }

    /**
     * Get all groups in order (fastest to slowest)
     */
    getGroupHierarchy() {
        // Note: This is used for comparison. Groups are separated by age track:
        // HIGH SCHOOL (9th+): National > Senior Performance > Senior 1 > Senior 2
        // PRE-HS (8th & below): Prep > Regional > Champs > Divisional > Orange > Gold > Silver > Bronze
        // Senior groups are NOT necessarily faster than Prep - different age tracks!
        return [
            "National",
            "Senior Performance", 
            "Senior 1",
            "Senior 2",
            "Prep",
            "Regional",  // Regional = more potential than Champs
            "Champs",    // Champs = same age as Regional, different track
            "Divisional",
            "Orange",
            "Gold 1",
            "Gold 2",
            "Silver",
            "Bronze"
        ];
    }

    /**
     * Get adjacent groups (one above and one below)
     */
    getAdjacentGroups(currentGroup) {
        const hierarchy = this.getGroupHierarchy();
        const idx = hierarchy.indexOf(currentGroup);
        if (idx === -1) return { above: null, below: null };
        
        return {
            above: idx > 0 ? hierarchy[idx - 1] : null,
            below: idx < hierarchy.length - 1 ? hierarchy[idx + 1] : null
        };
    }

    /**
     * Get comparison swimmers from same and adjacent groups
     * @param {string} pkey - Current swimmer's pkey
     * @param {string} gender - Gender to filter by
     * @param {number} age - Age to filter by (±1 year)
     */
    getComparisonSwimmers(pkey, gender, age) {
        const result = this.findSwimmerGroupById(pkey);
        if (!result) return null;

        const currentGroup = result.group;
        const { above, below } = this.getAdjacentGroups(currentGroup);
        
        const comparison = {
            currentGroup: currentGroup,
            groupAbove: above,
            groupBelow: below,
            currentSwimmer: result.swimmer,
            sameGroupPeers: [],
            groupAbovePeers: [],
            groupBelowPeers: []
        };

        // Helper to filter by gender and age range
        const filterPeers = (swimmers, excludePkey) => {
            return swimmers.filter(s => 
                s.gender === gender && 
                Math.abs(s.age - age) <= 1 &&
                String(s.id) !== String(excludePkey)
            );
        };

        // Get peers from current group
        comparison.sameGroupPeers = filterPeers(this.getSwimmers(currentGroup), pkey);

        // Get peers from group above
        if (above) {
            comparison.groupAbovePeers = filterPeers(this.getSwimmers(above), pkey);
        }

        // Get peers from group below  
        if (below) {
            comparison.groupBelowPeers = filterPeers(this.getSwimmers(below), pkey);
        }

        return comparison;
    }

    /**
     * Get the track (HS or Pre-HS) for a group
     */
    getGroupTrack(groupName) {
        const hsGroups = ["National", "Senior Performance", "Senior 1", "Senior 2"];
        return hsGroups.includes(groupName) ? "HIGH_SCHOOL" : "PRE_HIGH_SCHOOL";
    }

    /**
     * Get hierarchy for a specific track
     */
    getTrackHierarchy(track) {
        if (track === "HIGH_SCHOOL") {
            // National is fastest, Senior 2 is slowest (winding down)
            return ["National", "Senior Performance", "Senior 1", "Senior 2"];
        } else {
            // Pre-HS: Prep is fastest/most potential
            return ["Prep", "Regional", "Champs", "Divisional", "Orange", "Gold 1", "Gold 2", "Silver", "Bronze"];
        }
    }

    /**
     * Get comparison swimmers from higher groups WITHIN SAME TRACK
     * Pre-HS swimmers compare with Pre-HS groups (Prep, Regional, etc.)
     * HS swimmers compare with HS groups (National, Performance, etc.)
     * @param {string} pkey - Current swimmer's pkey
     * @param {string} gender - Gender to filter by
     * @param {number} age - Age to filter by
     */
    getHigherGroupSwimmers(pkey, gender, age) {
        const result = this.findSwimmerGroupById(pkey);
        if (!result) return null;

        const currentGroup = result.group;
        const currentTrack = this.getGroupTrack(currentGroup);
        const trackHierarchy = this.getTrackHierarchy(currentTrack);
        const currentIdx = trackHierarchy.indexOf(currentGroup);
        
        if (currentIdx === -1) return null;

        // Get age group key (e.g., "13-14" for age 13 or 14)
        const ageGroupKey = this.getAgeGroupKey(age);
        
        const comparison = {
            currentGroup: currentGroup,
            currentSwimmer: result.swimmer,
            ageGroup: ageGroupKey,
            track: currentTrack,
            higherGroups: []
        };

        // Filter by gender and age group (13-14, 15-16, etc.)
        const filterByAgeGroup = (swimmers, excludePkey) => {
            return swimmers.filter(s => 
                s.gender === gender && 
                this.getAgeGroupKey(s.age) === ageGroupKey &&
                String(s.id) !== String(excludePkey)
            );
        };

        // Get peers from higher groups WITHIN SAME TRACK only
        // Skip Senior 2 for HS track (winding down, not a goal)
        for (let i = 0; i < currentIdx; i++) {
            const groupName = trackHierarchy[i];
            // Skip Senior 2 - not a developmental target
            if (groupName === "Senior 2") continue;
            
            const peers = filterByAgeGroup(this.getSwimmers(groupName), pkey);
            if (peers.length > 0) {
                comparison.higherGroups.push({
                    group: groupName,
                    peers: peers
                });
            }
        }

        // Also include same group peers for comparison
        comparison.sameGroupPeers = filterByAgeGroup(this.getSwimmers(currentGroup), pkey);

        return comparison;
    }

    /**
     * Get age group key (13-14, 15-16, 11-12, etc.)
     */
    getAgeGroupKey(age) {
        if (age <= 10) return "10U";
        if (age <= 12) return "11-12";
        if (age <= 14) return "13-14";
        if (age <= 16) return "15-16";
        return "17-18";
    }
}

// Export for use in AI insights
window.bcstRoster = null; // Will be set after class instantiation

// Global roster instance
const bcstRoster = new BCSTRoster();
window.bcstRoster = bcstRoster;

// ================================================================================
// GROUP NAVIGATION HANDLERS
// ================================================================================

/**
 * Handle group selection change
 */
async function onGroupChange(groupName) {
    console.log("Group changed to:", groupName);
    
    if (!groupName) {
        // Reset gender and swimmer dropdowns
        resetGenderDropdown();
        resetSwimmerDropdown();
        return;
    }

    // Enable gender dropdown
    enableGenderDropdown();
    
    // Load swimmers for selected group
    await loadSwimmersForGroup(groupName);
}

/**
 * Handle gender selection change
 */
function onGenderChange(gender) {
    console.log("Gender changed to:", gender);
    
    const groupSelect = document.getElementById('bcst-group-select');
    const groupName = groupSelect?.value;
    
    if (!groupName) return;
    
    filterSwimmersByGender(groupName, gender);
}

/**
 * Handle swimmer selection change
 */
function onSwimmerChange(swimmerId) {
    console.log("Swimmer changed to:", swimmerId);
    
    if (!swimmerId) return;
    
    // Navigate to swimmer page
    if (swimmerId) {
        window.location.hash = `swimmer/${swimmerId}`;
    }
}

// ================================================================================
// DROPDOWN MANAGEMENT
// ================================================================================

function resetGenderDropdown() {
    const genderSelect = document.getElementById('bcst-gender-select');
    if (genderSelect) {
        genderSelect.value = '';
        genderSelect.disabled = true;
        genderSelect.style.background = '#f5f5f5';
        genderSelect.style.color = '#999';
        genderSelect.style.cursor = 'not-allowed';
    }
}

function enableGenderDropdown() {
    const genderSelect = document.getElementById('bcst-gender-select');
    if (genderSelect) {
        genderSelect.disabled = false;
        genderSelect.style.background = '#ffffff';
        genderSelect.style.color = '#0C2340';
        genderSelect.style.cursor = 'pointer';
    }
}

function resetSwimmerDropdown() {
    const swimmerSelect = document.getElementById('bcst-swimmer-select');
    if (swimmerSelect) {
        swimmerSelect.innerHTML = '<option value="">Swimmer</option>';
        swimmerSelect.disabled = true;
        swimmerSelect.style.background = '#f5f5f5';
        swimmerSelect.style.color = '#999';
        swimmerSelect.style.cursor = 'not-allowed';
    }
}

function enableSwimmerDropdown() {
    const swimmerSelect = document.getElementById('bcst-swimmer-select');
    if (swimmerSelect) {
        swimmerSelect.disabled = false;
        swimmerSelect.style.background = '#ffffff';
        swimmerSelect.style.color = '#0C2340';
        swimmerSelect.style.cursor = 'pointer';
    }
}

async function loadSwimmersForGroup(groupName) {
    try {
        await bcstRoster.loadRoster();
        
        // Get current gender selection and apply filter
        const genderSelect = document.getElementById('bcst-gender-select');
        const gender = genderSelect?.value || '';
        
        const swimmers = gender 
            ? bcstRoster.getSwimmersByGender(groupName, gender)
            : bcstRoster.getSwimmers(groupName);
        
        const swimmerSelect = document.getElementById('bcst-swimmer-select');
        if (!swimmerSelect) return;
        
        swimmerSelect.innerHTML = '<option value="">Swimmer</option>';
        
        // Sort swimmers by name
        const sortedSwimmers = [...swimmers].sort((a, b) => 
            a.name.localeCompare(b.name)
        );
        
        for (const swimmer of sortedSwimmers) {
            const option = document.createElement('option');
            option.value = swimmer.id || swimmer.name;
            option.textContent = swimmer.name;
            swimmerSelect.appendChild(option);
        }
        
        enableSwimmerDropdown();
    } catch (error) {
        console.error("Error loading swimmers for group:", error);
    }
}

function filterSwimmersByGender(groupName, gender) {
    const swimmers = bcstRoster.getSwimmersByGender(groupName, gender);
    
    const swimmerSelect = document.getElementById('bcst-swimmer-select');
    if (!swimmerSelect) return;
    
    swimmerSelect.innerHTML = '<option value="">Swimmer</option>';
    
    const sortedSwimmers = [...swimmers].sort((a, b) => 
        a.name.localeCompare(b.name)
    );
    
    for (const swimmer of sortedSwimmers) {
        const option = document.createElement('option');
        option.value = swimmer.id || swimmer.name;
        option.textContent = swimmer.name;
        swimmerSelect.appendChild(option);
    }
}

// Initialize dropdowns on page load if a group is pre-selected
function initializeBCSTDropdowns() {
    const groupSelect = document.getElementById('bcst-group-select');
    if (groupSelect && groupSelect.value) {
        console.log("Initializing BCST dropdowns with pre-selected group:", groupSelect.value);
        onGroupChange(groupSelect.value);
    }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBCSTDropdowns);
} else {
    // DOM already loaded, run immediately
    initializeBCSTDropdowns();
}

// Export for global access
window.bcstRoster = bcstRoster;
window.onGroupChange = onGroupChange;
window.onGenderChange = onGenderChange;
window.onSwimmerChange = onSwimmerChange;
window.initializeBCSTDropdowns = initializeBCSTDropdowns;
