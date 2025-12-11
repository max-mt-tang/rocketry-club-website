/**
 * ================================================================================
 * SWIM TRACKER - BCST ROSTER MODULE
 * ================================================================================
 *
 * Bellevue Club Swim Team roster management and group navigation.
 * Handles loading team roster data and providing group/swimmer dropdowns.
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

            // Embedded roster data - no more JSON file dependencies!
            const rosterData = {
                "Bronze": [
                    { "name": "Leila Chou", "id": "", "gender": "Female", "age": 7 },
                    { "name": "Rayni Deng", "id": "", "gender": "Female", "age": 6 },
                    { "name": "Jaimee Dong", "id": "", "gender": "Female", "age": 7 },
                    { "name": "Tiffany Gao", "id": "", "gender": "Female", "age": 6 },
                    { "name": "Ellie Geng", "id": "", "gender": "Female", "age": 7 },
                    { "name": "Eloise Lally", "id": "", "gender": "Female", "age": 6 },
                    { "name": "Ian Lee", "id": "", "gender": "Male", "age": 7 },
                    { "name": "Piper Li", "id": "", "gender": "Female", "age": 6 },
                    { "name": "Jillian Riener", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Elizabeth Ryndin", "id": "", "gender": "Female", "age": 6 },
                    { "name": "Victoria Staley", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Ryder Tang", "id": "", "gender": "Male", "age": 7 },
                    { "name": "Ava Thurogood", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Alessia Wang", "id": "", "gender": "Female", "age": 7 },
                    { "name": "Terrance Wu", "id": "", "gender": "Male", "age": 7 },
                    { "name": "Leo Yin", "id": "", "gender": "Male", "age": 6 },
                    { "name": "Jeremy Yoo", "id": "", "gender": "Male", "age": 7 },
                    { "name": "Eva Zamora-Kapoor", "id": "", "gender": "Female", "age": 7 },
                    { "name": "Alicia Zhao", "id": "", "gender": "Female", "age": 8 }
                ],
                "Champs": [
                    { "name": "Advika Belur", "id": "", "gender": "Female", "age": 11 },
                    { "name": "Ayush Belur", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Anita Chang", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Alan Chen", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Sinne Collin", "id": "", "gender": "Female", "age": 11 },
                    { "name": "Mia Deng", "id": "", "gender": "Female", "age": 11 },
                    { "name": "David Fan", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Ryan Forrest", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Tanya Gupta", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Dean Hollenbeck", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Elliot Lei", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Archie Li", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Ray Liu", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Landon Rourke", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Emerson Switaj", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Ray Tang", "id": "500281", "gender": "Male", "age": 13 },
                    { "name": "Mia Tseng", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Mia Tuntikanokporn", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Charlotte Walsh", "id": "", "gender": "Female", "age": 13 },
                    { "name": "JiaQi Wang", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Leyton Wolf", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Tate Wong", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Jasper Wu", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Brian Zhang", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Ivy Zheng", "id": "", "gender": "Female", "age": 13 }
                ],
                "Divisional": [
                    { "name": "Zegen Brink", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Aiden Broderick", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Lexton Huai En Chang", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Daniel Chen", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Kevin Chen", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Austin Chen", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Karys Fan", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Jenna Bunn Fowler", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Hunter Franck", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Alexander Gao", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Alex Han", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Martin Hernandez", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Nathan Jiao", "id": "", "gender": "Male", "age": 11 },
                    { "name": "YUNA KIM", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Ian Kim", "id": "", "gender": "Male", "age": 13 },
                    { "name": "James Lee", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Brennan Lester", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Vincent Liu", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Lucia Ross", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Sadie Schimmelbusch", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Bodhi Shanbhag", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Camilla Shultz", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Matthew Solari", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Michelle Sun", "id": "", "gender": "Female", "age": 11 },
                    { "name": "Iris Tang", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Arnold Tanto", "id": "", "gender": "Male", "age": 12 },
                    { "name": "David Vielbig", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Ted Wang", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Kathryn Xiao", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Ethan Xu", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Annabel Yao", "id": "", "gender": "Female", "age": 11 }
                ],
                "Gold": [
                    { "name": "Abigail Broderick", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Benjamin Bull", "id": "", "gender": "Male", "age": 9 },
                    { "name": "Keira Chan", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Kandice Chen", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Joshua Chen", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Bella Chen", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Su Cimren", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Luna Dong", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Raihan Echevarria", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Hudson Franck", "id": "", "gender": "Male", "age": 9 },
                    { "name": "Alyson Gao", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Leo Gazzard", "id": "", "gender": "Male", "age": 8 },
                    { "name": "Qifan Gong", "id": "", "gender": "Male", "age": 8 },
                    { "name": "Lucas Hernandez", "id": "", "gender": "Male", "age": 9 },
                    { "name": "Ellie Hsu", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Jayke Hung", "id": "", "gender": "Male", "age": 9 },
                    { "name": "Julie Kim", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Jonathan Lan", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Evelyn Lang", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Paige Larkin", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Nicholas Lemker", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Raina Lester", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Anya Liu", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Jake McNair", "id": "", "gender": "Male", "age": 8 },
                    { "name": "Charlotte Muller", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Alexandra Muller", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Clara Neal", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Laurel Parris", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Iris Peng", "id": "", "gender": "Female", "age": 7 },
                    { "name": "Lucas Shamshurin", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Watson She", "id": "", "gender": "Male", "age": 9 },
                    { "name": "Lianna Shubin", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Alexander Stepania", "id": "", "gender": "Male", "age": 8 },
                    { "name": "Brooks Switaj", "id": "", "gender": "Male", "age": 8 },
                    { "name": "Larson Switaj", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Indira Thatcher", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Elsa Wang", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Cameron Watrous", "id": "", "gender": "Male", "age": 8 },
                    { "name": "Kaia Webb", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Lili Wei", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Esther Wei", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Saien Wu", "id": "", "gender": "Male", "age": 9 },
                    { "name": "Anna Wu", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Kailin Yang", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Geoffrey Yu", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Kelly Zhang", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Shayne Zhang", "id": "", "gender": "Male", "age": 8 },
                    { "name": "Alexander Zhurid", "id": "", "gender": "Male", "age": 8 }
                ],
                "National": [
                    { "name": "Nikolas Brusilovski", "id": "", "gender": "Male", "age": 17 },
                    { "name": "Meg Dahlin", "id": "", "gender": "Female", "age": 17 },
                    { "name": "Tatum Enge", "id": "", "gender": "Female", "age": 15 },
                    { "name": "Sutton Forbis", "id": "", "gender": "Female", "age": 16 },
                    { "name": "Gracyn Kehoe", "id": "", "gender": "Female", "age": 17 },
                    { "name": "Maximus Kim", "id": "", "gender": "Male", "age": 15 },
                    { "name": "Brooklyn Lang", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Jacob Lee", "id": "", "gender": "Male", "age": 16 },
                    { "name": "Daniel Lee", "id": "", "gender": "Male", "age": 17 },
                    { "name": "Samuel Mok", "id": "", "gender": "Male", "age": 15 },
                    { "name": "Alexander Nemirovsky", "id": "", "gender": "Male", "age": 17 },
                    { "name": "Eliza Seibert", "id": "", "gender": "Female", "age": 15 },
                    { "name": "Jackson Tidwell", "id": "", "gender": "Male", "age": 15 },
                    { "name": "Brandon Wang", "id": "", "gender": "Male", "age": 15 },
                    { "name": "Clare Watson", "id": "", "gender": "Female", "age": 17 },
                    { "name": "Hailey Weiler", "id": "", "gender": "Female", "age": 17 },
                    { "name": "Christian Wong", "id": "", "gender": "Male", "age": 17 },
                    { "name": "Sofia Wyzga", "id": "", "gender": "Female", "age": 17 },
                    { "name": "Isaac Yeung", "id": "", "gender": "Male", "age": 15 },
                    { "name": "Alexander Zhao", "id": "", "gender": "Male", "age": 16 }
                ],
                "Orange": [
                    { "name": "Brandon Bai", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Yushi Chong", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Kamran Clapp", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Haoran Cong", "id": "", "gender": "Male", "age": 9 },
                    { "name": "Olivia Covey", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Grace Farmer", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Blakely Garcia", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Brennan Garr", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Ashley Gao", "id": "", "gender": "Female", "age": 10 },
                    { "name": "David Goldenberg", "id": "", "gender": "Male", "age": 9 },
                    { "name": "Sheela Gupta", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Alexandra Havril", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Sophie Ji", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Elliot Johnson", "id": "", "gender": "Male", "age": 9 },
                    { "name": "Melody Li", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Andrew Lin", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Andrew Liu", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Ryley Robinson", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Fedor Ryndin", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Victoria Su", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Sadie Van horn", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Alessandra Watrous", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Eunice Wei", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Jacqueline Wu", "id": "", "gender": "Female", "age": 9 },
                    { "name": "Madeline Yurchak", "id": "", "gender": "Female", "age": 10 }
                ],
                "Performance": [
                    { "name": "Vansea Barnett", "id": "", "gender": "Female", "age": 15 },
                    { "name": "Blakely Biege", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Weiran Chen", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Stella Chen", "id": "", "gender": "Female", "age": 15 },
                    { "name": "Hope Enge", "id": "", "gender": "Female", "age": 17 },
                    { "name": "Ge Gao", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Jayden Han", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Tian Ze He", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Leon Huang", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Julia Kim", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Jessica Li", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Ellen Lu", "id": "", "gender": "Female", "age": 16 },
                    { "name": "Quinn McCullough", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Carter Neal", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Daniel Pegushin", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Kiki Pfeiffer", "id": "", "gender": "Female", "age": 15 },
                    { "name": "Camille Pruner", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Navya Sainani", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Leo Sato", "id": "", "gender": "Male", "age": 17 },
                    { "name": "Wiktor Schabowski", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Julia Shang", "id": "", "gender": "Female", "age": 16 },
                    { "name": "Ryan Shaw", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Joshua Tang", "id": "", "gender": "Male", "age": 16 },
                    { "name": "Ava Tuntikanokporn", "id": "", "gender": "Female", "age": 15 },
                    { "name": "Stella Wang", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Eleanor Wang", "id": "", "gender": "Female", "age": 17 },
                    { "name": "Clairey Wang", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Isabella Wong", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Chelsea Wong", "id": "", "gender": "Female", "age": 15 },
                    { "name": "Mila Zhang", "id": "", "gender": "Female", "age": 14 }
                ],
                "Prep": [
                    { "name": "Mila Alkhazov", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Noah Arthiabah", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Stella Arthiabah", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Bimuhammed Beibit", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Elyssa Hung", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Emily Jensen", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Edward Li", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Fitzhugh McCullough", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Tiya More", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Michelle Morton", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Claire Tan", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Elizabeth Tangyang", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Anderson Tseng", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Sasha Shestakov", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Damjan Vukadinovic", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Hanjun Wang", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Lucia White", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Gabrielle Wojdak", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Derek Wu", "id": "", "gender": "Male", "age": 13 },
                    { "name": "Olivia Yen", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Jacob Yeung", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Xinran Zhang", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Chelsea Zhu", "id": "", "gender": "Female", "age": 13 }
                ],
                "Regional": [
                    { "name": "Adiljan Beibit", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Caroline Arthur", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Aiden Brown", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Shauna Chen", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Aiden Dong", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Yichen Fei", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Feifan Gong", "id": "", "gender": "Male", "age": 10 },
                    { "name": "Alexander Han", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Luke Han", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Joy Huang", "id": "", "gender": "Female", "age": 10 },
                    { "name": "SYLENA HUANG", "id": "", "gender": "Female", "age": 11 },
                    { "name": "Carly Johnson", "id": "", "gender": "Female", "age": 11 },
                    { "name": "Jada Jumani", "id": "", "gender": "Female", "age": 11 },
                    { "name": "Madeline Longenecker-Webel", "id": "", "gender": "Female", "age": 11 },
                    { "name": "Kiyomi Matsuno", "id": "", "gender": "Female", "age": 11 },
                    { "name": "Frances McCullough", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Ava McNair", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Vivienne Merza", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Vivian Miao", "id": "", "gender": "Female", "age": 11 },
                    { "name": "Daniela Posada", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Isabella Qu", "id": "", "gender": "Female", "age": 11 },
                    { "name": "Josephine Riener", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Nikolai Ryndin", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Daniel Shamshurin", "id": "", "gender": "Male", "age": 12 },
                    { "name": "Zara Suri", "id": "", "gender": "Female", "age": 11 },
                    { "name": "Grayson Switaj", "id": "", "gender": "Female", "age": 10 },
                    { "name": "Zoe Tolzmann", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Alexander Wang", "id": "", "gender": "Male", "age": 11 },
                    { "name": "Charlotte Yamamoto", "id": "", "gender": "Female", "age": 12 },
                    { "name": "Ziqing Zhao", "id": "", "gender": "Male", "age": 12 }
                ],
                "Senior 1": [
                    { "name": "Rachael Cohen", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Mia Davis", "id": "", "gender": "Female", "age": 14 },
                    { "name": "William Han", "id": "", "gender": "Male", "age": 15 },
                    { "name": "Olivia Huang", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Megan Huang", "id": "", "gender": "Female", "age": 17 },
                    { "name": "Lauren Huddy", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Xiaoyi Jiang", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Olivia Lee", "id": "", "gender": "Female", "age": 15 },
                    { "name": "Colin Lemker", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Joseph Lin", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Sehaam Mankotia", "id": "", "gender": "Male", "age": 15 },
                    { "name": "Miyako Matsuno", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Aksel Mejlaender", "id": "", "gender": "Male", "age": 16 },
                    { "name": "Anja Mejlaender", "id": "", "gender": "Female", "age": 16 },
                    { "name": "Marie Morkos", "id": "", "gender": "Female", "age": 17 },
                    { "name": "Mira Pawar", "id": "", "gender": "Female", "age": 16 },
                    { "name": "Magdalena Seibert", "id": "", "gender": "Female", "age": 16 },
                    { "name": "Rhys Sullivan", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Max Tang", "id": "1320806", "gender": "Male", "age": 15 },
                    { "name": "Nicole Tanto", "id": "", "gender": "Female", "age": 15 },
                    { "name": "AnLac Tran", "id": "", "gender": "Female", "age": 15 },
                    { "name": "Teneya Villanueva", "id": "", "gender": "Female", "age": 14 },
                    { "name": "Reagan Wang", "id": "", "gender": "Male", "age": 15 },
                    { "name": "Jenson Wu", "id": "", "gender": "Male", "age": 16 }
                ],
                "Senior 2": [
                    { "name": "Miles Ahmadi", "id": "", "gender": "Male", "age": 15 },
                    { "name": "Nicholas Becciu", "id": "", "gender": "Male", "age": 15 },
                    { "name": "Jordan Chan", "id": "", "gender": "Male", "age": 16 },
                    { "name": "Guang Chen", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Ella Chiulli", "id": "", "gender": "Female", "age": 15 },
                    { "name": "Gabriella Cox", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Avis Deng", "id": "", "gender": "Female", "age": 16 },
                    { "name": "Pia Gupta", "id": "", "gender": "Female", "age": 15 },
                    { "name": "Aria Lele", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Ava Lele", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Hannah Li", "id": "", "gender": "Female", "age": 14 },
                    { "name": "William Liu", "id": "", "gender": "Male", "age": 15 },
                    { "name": "Matteo Mastrandrea", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Leo Moshenskiy", "id": "", "gender": "Male", "age": 16 },
                    { "name": "Mili Pawar", "id": "", "gender": "Female", "age": 13 },
                    { "name": "Woojin Shin", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Constantino Soroor", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Hanbin Wang", "id": "", "gender": "Male", "age": 14 },
                    { "name": "Niel Yeh", "id": "", "gender": "Male", "age": 16 },
                    { "name": "Jinghao Zhang", "id": "", "gender": "Male", "age": 14 }
                ],
                "Silver": [
                    { "name": "Liana Chen", "id": "", "gender": "Female", "age": 7 },
                    { "name": "James Covey", "id": "", "gender": "Male", "age": 7 },
                    { "name": "Nora Deng", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Gabriel Dom", "id": "", "gender": "Male", "age": 9 },
                    { "name": "Brendan Gao", "id": "", "gender": "Male", "age": 9 },
                    { "name": "Summer Gao", "id": "", "gender": "Female", "age": 7 },
                    { "name": "Rylan Garcia", "id": "", "gender": "Female", "age": 7 },
                    { "name": "Elina Jumani", "id": "", "gender": "Female", "age": 7 },
                    { "name": "Emma Jun", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Sebastian Lam", "id": "", "gender": "Male", "age": 7 },
                    { "name": "Peter Lemker", "id": "", "gender": "Male", "age": 8 },
                    { "name": "George Li", "id": "", "gender": "Male", "age": 7 },
                    { "name": "Lucas Liu", "id": "", "gender": "Male", "age": 8 },
                    { "name": "Alexander Malcomson", "id": "", "gender": "Male", "age": 7 },
                    { "name": "Zoie Peng", "id": "", "gender": "Female", "age": 7 },
                    { "name": "Alicia Tan", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Esme Thatcher", "id": "", "gender": "Female", "age": 7 },
                    { "name": "Adar Van horn", "id": "", "gender": "Female", "age": 7 },
                    { "name": "Lucy Wei", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Mina Yin", "id": "", "gender": "Female", "age": 8 },
                    { "name": "Eric Yu", "id": "", "gender": "Male", "age": 8 },
                    { "name": "Georgia Yurchak", "id": "", "gender": "Female", "age": 7 }
                ]
            };

            console.log("✅ BCST roster loaded from embedded data");
            console.log("📊 Groups found:", Object.keys(rosterData).length);
            console.log("📝 Groups:", Object.keys(rosterData).join(', '));

            // Calculate total swimmers
            let totalSwimmers = 0;
            for (const [group, swimmers] of Object.entries(rosterData)) {
                totalSwimmers += swimmers.length;
                this.roster.set(group, swimmers);
            }
            console.log(`👥 Total swimmers loaded: ${totalSwimmers}`);

            this.isLoaded = true;
            console.log("🎉 BCST roster initialization complete!");
            return this.roster;

        } catch (error) {
            console.error("Error loading BCST roster:", error);
            return new Map();
        }
    }


    /**
     * Get all group names
     */
    getGroups() {
        console.log("getGroups called, roster.keys():", Array.from(this.roster.keys()));
        console.log("roster size:", this.roster.size);
        console.log("roster contents:", this.roster);
        return Array.from(this.roster.keys());
    }

    /**
     * Get swimmers in a specific group
     */
    getSwimmersInGroup(groupName) {
        return this.roster.get(groupName) || [];
    }

    /**
     * Find swimmer by name across all groups
     */
    findSwimmer(name) {
        for (const [group, swimmers] of this.roster.entries()) {
            const swimmer = swimmers.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
            if (swimmer) {
                return { ...swimmer, group };
            }
        }
        return null;
    }

    /**
     * Import roster data and save to localStorage
     * Expected format: { "Group Name": [{ name: "Swimmer Name", id: "ID" }] }
     */
    importRosterData(rosterData) {
        try {
            // Validate the data structure
            if (typeof rosterData !== 'object' || !rosterData) {
                throw new Error('Invalid roster data format');
            }

            // Save to localStorage for persistence
            localStorage.setItem('bcst-roster', JSON.stringify(rosterData));

            // Clear current roster and reload
            this.roster.clear();
            this.isLoaded = false;

            console.log("Roster data imported successfully");
            return this.loadRoster();
        } catch (error) {
            console.error("Error importing roster data:", error);
            throw error;
        }
    }

    /**
     * Export current roster data
     */
    exportRosterData() {
        const data = {};
        for (const [group, swimmers] of this.roster.entries()) {
            data[group] = swimmers;
        }
        return data;
    }
}

// ================================================================================
// DROPDOWN CREATION FUNCTIONS
// ================================================================================

// Store current selections
let currentSelectedGroup = "";
let currentSelectedGender = "";

/**
 * Create the BCST group dropdown
 */
function createGroupDropdown() {
    console.log("createGroupDropdown called");
    console.log("window.bcstRoster:", window.bcstRoster);

    if (!window.bcstRoster) {
        console.error("BCST roster not initialized!");
        return '<select disabled><option>Loading...</option></select>';
    }

    if (!window.bcstRoster.isLoaded) {
        console.warn("BCST roster not fully loaded yet!");
        return '<select disabled><option>Loading roster...</option></select>';
    }

    // Hardcoded group options in the desired order
    const options = [
        ["Select Group", ""],
        ["Champs", "Champs"],
        ["Senior 1", "Senior 1"],
        ["Prep", "Prep"],
        ["Senior 2", "Senior 2"],
        ["Performance", "Performance"],
        ["National", "National"],
        ["Regional", "Regional"],
        ["Divisional", "Divisional"],
        ["Gold", "Gold"],
        ["Silver", "Silver"],
        ["Orange", "Orange"],
        ["Bronze", "Bronze"]
    ];

    console.log("Using hardcoded group dropdown options:", options);

    const groupSelect = new Select(
        "bcst-group-select",
        options,
        "",
        (value) => onGroupChange(value)
    );
    groupSelect.class = "";

    const html = groupSelect.render();
    console.log("Group dropdown HTML:", html);
    return html;
}

/**
 * Create the BCST gender dropdown for selected group
 */
function createGenderDropdown(groupName = "") {
    console.log("createGenderDropdown called with groupName:", groupName);

    const options = [["Select Gender", ""]];

    // Always show both Female and Male options for any selected group
    if (groupName) {
        console.log("Creating gender options for group:", groupName);

        // Always provide both gender options in consistent order
        options.push(["Male", "Male"]);
        options.push(["Female", "Female"]);
    }

    console.log("Gender dropdown options:", options);

    const genderSelect = new Select(
        "bcst-gender-select",
        options,
        "Male",
        (value) => onGenderChange(value)
    );
    genderSelect.class = "";

    return genderSelect.render();
}

/**
 * Create empty gender dropdown (disabled state)
 */
function createEmptyGenderDropdown() {
    const options = [["Select Gender", ""]];

    const genderSelect = new Select(
        "bcst-gender-select-disabled",
        options,
        "",
        () => {} // No action since it's disabled
    );
    genderSelect.class = "";

    // Create a disabled select element
    return `<select disabled style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; color: #999; cursor: not-allowed;">
        <option>Select Gender</option>
    </select>`;
}

/**
 * Create empty swimmer dropdown (disabled state)
 */
function createEmptySwimmerDropdown() {
    return `<select disabled style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; color: #999; cursor: not-allowed;">
        <option>Select Swimmer</option>
    </select>`;
}

/**
 * Create the BCST swimmer dropdown for selected group and gender
 */
function createSwimmerDropdown(groupName = "", selectedGender = "") {
    console.log("createSwimmerDropdown called with:", { groupName, selectedGender });

    let swimmers = [];
    if (groupName) {
        swimmers = window.bcstRoster.getSwimmersInGroup(groupName);
        console.log(`Swimmers retrieved for group "${groupName}":`, swimmers);

        // Filter by gender if specified
        if (selectedGender) {
            swimmers = swimmers.filter(swimmer => swimmer.gender === selectedGender);
            console.log(`After filtering by ${selectedGender} in ${groupName}:`, swimmers);
        }
    }

    const options = [["Select Swimmer", ""]];

        if (swimmers.length > 0) {
            swimmers.forEach(swimmer => {
                // Use swimmer ID if available, otherwise use the name as fallback
                const value = swimmer.id && swimmer.id.trim() ? swimmer.id : swimmer.name;
                // Display name only (no age)
                const displayName = swimmer.name;
                options.push([displayName, value]);
            });
        console.log("Added swimmers to options:", options);
    } else if (groupName && selectedGender) {
        // No swimmers found for this gender/group combination
        options.push([`No ${selectedGender} swimmers in ${groupName}`, ""]);
        console.log("No swimmers found for gender/group combination:", { groupName, selectedGender });
    } else if (groupName) {
        // If group is selected but no gender yet
        options.push(["Select gender", ""]);
    }

    console.log("Final swimmer dropdown options:", options);

    const swimmerSelect = new Select(
        "bcst-swimmer-select",
        options,
        "",
        (value) => onSwimmerChange(value)
    );
    swimmerSelect.class = "";

    const html = swimmerSelect.render();
    console.log("Swimmer dropdown HTML generated:", html);
    return html;
}

/**
 * Handle group selection change
 */
async function onGroupChange(groupName) {
    console.log("onGroupChange called - Group selected:", groupName);

    // Store the selected group
    currentSelectedGroup = groupName;
    currentSelectedGender = "";

    const groupSelect = document.getElementById("bcst-group-select");
    const genderSelect = document.getElementById("bcst-gender-select");
    const swimmerSelect = document.getElementById("bcst-swimmer-select");

    const mobileGroupSelect = document.getElementById("mobile-bcst-group-select");
    const mobileGenderSelect = document.getElementById("mobile-bcst-gender-select");
    const mobileSwimmerSelect = document.getElementById("mobile-bcst-swimmer-select");

    // Update group dropdown visual state
    if (groupName) {
        groupSelect.setAttribute("data-selected", "true");
        mobileGroupSelect.setAttribute("data-selected", "true");
    } else {
        groupSelect.removeAttribute("data-selected");
        mobileGroupSelect.removeAttribute("data-selected");
    }

    if (groupName) {
        // Enable and populate gender dropdown
        genderSelect.disabled = false;
        genderSelect.style.background = "#ffffff";
        genderSelect.style.color = "#0C2340";
        genderSelect.style.cursor = "pointer";

        mobileGenderSelect.disabled = false;
        mobileGenderSelect.style.background = "#ffffff";
        mobileGenderSelect.style.color = "#0C2340";
        mobileGenderSelect.style.cursor = "pointer";

        // Clear and add gender options
        genderSelect.innerHTML = `
            <option value="">Gender</option>
            <option value="Male" selected>Male</option>
            <option value="Female">Female</option>
        `;

        mobileGenderSelect.innerHTML = `
            <option value="">Gender</option>
            <option value="Male" selected>Male</option>
            <option value="Female">Female</option>
        `;

        // Set the current gender and trigger swimmer population
        currentSelectedGender = "Male";
        genderSelect.value = "Male";
        genderSelect.setAttribute("data-selected", "true");

        mobileGenderSelect.value = "Male";
        mobileGenderSelect.setAttribute("data-selected", "true");

        // Auto-populate swimmer dropdown with Male swimmers
        onGenderChange("Male");
    } else {
        // Reset both dropdowns to disabled state
        genderSelect.disabled = true;
        genderSelect.style.background = "#f5f5f5";
        genderSelect.style.color = "#999";
        genderSelect.style.cursor = "not-allowed";
        genderSelect.innerHTML = '<option value="">Gender</option>';
        genderSelect.removeAttribute("data-selected");

        mobileGenderSelect.disabled = true;
        mobileGenderSelect.style.background = "#f5f5f5";
        mobileGenderSelect.style.color = "#999";
        mobileGenderSelect.style.cursor = "not-allowed";
        mobileGenderSelect.innerHTML = '<option value="">Gender</option>';
        mobileGenderSelect.removeAttribute("data-selected");

        swimmerSelect.disabled = true;
        swimmerSelect.style.background = "#f5f5f5";
        swimmerSelect.style.color = "#999";
        swimmerSelect.style.cursor = "not-allowed";
        swimmerSelect.innerHTML = '<option value="">Swimmer</option>';
        swimmerSelect.removeAttribute("data-selected");

        mobileSwimmerSelect.disabled = true;
        mobileSwimmerSelect.style.background = "#f5f5f5";
        mobileSwimmerSelect.style.color = "#999";
        mobileSwimmerSelect.style.cursor = "not-allowed";
        mobileSwimmerSelect.innerHTML = '<option value="">Swimmer</option>';
        mobileSwimmerSelect.removeAttribute("data-selected");
    }
}

/**
 * Handle gender selection change
 */
async function onGenderChange(selectedGender) {
    console.log("onGenderChange called - Gender selected:", selectedGender);

    // Store the selected gender
    currentSelectedGender = selectedGender;
    const selectedGroup = currentSelectedGroup;

    const genderSelect = document.getElementById("bcst-gender-select");
    const swimmerSelect = document.getElementById("bcst-swimmer-select");

    const mobileGenderSelect = document.getElementById("mobile-bcst-gender-select");
    const mobileSwimmerSelect = document.getElementById("mobile-bcst-swimmer-select");

    // Update gender dropdown visual state
    if (selectedGender) {
        genderSelect.setAttribute("data-selected", "true");
        mobileGenderSelect.setAttribute("data-selected", "true");
    } else {
        genderSelect.removeAttribute("data-selected");
        mobileGenderSelect.removeAttribute("data-selected");
    }

    if (selectedGender && selectedGroup) {
        // Enable swimmer dropdown and populate with swimmers
        swimmerSelect.disabled = false;
        swimmerSelect.style.background = "#ffffff";
        swimmerSelect.style.color = "#0C2340";
        swimmerSelect.style.cursor = "pointer";

        mobileSwimmerSelect.disabled = false;
        mobileSwimmerSelect.style.background = "#ffffff";
        mobileSwimmerSelect.style.color = "#0C2340";
        mobileSwimmerSelect.style.cursor = "pointer";

        // Check if roster is loaded
        if (!window.bcstRoster || !window.bcstRoster.isLoaded) {
            console.warn('BCST roster not loaded yet, showing loading message');
            swimmerSelect.innerHTML = '<option value="">Loading swimmers...</option>';
            if (mobileSwimmerSelect) {
                mobileSwimmerSelect.innerHTML = '<option value="">Loading swimmers...</option>';
            }
            return;
        }

        // Get swimmers for this group and gender
        const allSwimmersInGroup = window.bcstRoster.getSwimmersInGroup(selectedGroup);
        console.log(`Found ${allSwimmersInGroup.length} swimmers in group "${selectedGroup}"`);
        const filteredSwimmers = allSwimmersInGroup.filter(swimmer => swimmer.gender === selectedGender);
        console.log(`After filtering by ${selectedGender}: ${filteredSwimmers.length} swimmers`);

        // Build options HTML
        let optionsHtml = '<option value="">Swimmer</option>';

        if (filteredSwimmers.length > 0) {
            filteredSwimmers.forEach(swimmer => {
                const value = swimmer.id && swimmer.id.trim() ? swimmer.id : swimmer.name;
                const displayName = swimmer.name;
                optionsHtml += `<option value="${value}">${displayName}</option>`;
            });
        } else {
            optionsHtml += `<option value="">No ${selectedGender} swimmers in ${selectedGroup}</option>`;
        }

        console.log('Setting swimmer dropdown options:', optionsHtml.substring(0, 100));
        swimmerSelect.innerHTML = optionsHtml;
        if (mobileSwimmerSelect) {
            mobileSwimmerSelect.innerHTML = optionsHtml;
        }
    } else {
        // Reset swimmer dropdown to disabled state
        swimmerSelect.disabled = true;
        swimmerSelect.style.background = "#f5f5f5";
        swimmerSelect.style.color = "#999";
        swimmerSelect.style.cursor = "not-allowed";
        swimmerSelect.innerHTML = '<option value="">Swimmer</option>';
        swimmerSelect.removeAttribute("data-selected");

        mobileSwimmerSelect.disabled = true;
        mobileSwimmerSelect.style.background = "#f5f5f5";
        mobileSwimmerSelect.style.color = "#999";
        mobileSwimmerSelect.style.cursor = "not-allowed";
        mobileSwimmerSelect.innerHTML = '<option value="">Swimmer</option>';
        mobileSwimmerSelect.removeAttribute("data-selected");
    }
}

/**
 * Handle swimmer selection change
 */
function onSwimmerChange(swimmerValue) {
    console.log("Swimmer selected:", swimmerValue);

    const swimmerSelect = document.getElementById("bcst-swimmer-select");

    // Update swimmer dropdown visual state
    if (swimmerValue) {
        swimmerSelect.setAttribute("data-selected", "true");

        // Check if the value looks like an ID (numeric) or a name
        const isNumericId = /^\d+$/.test(swimmerValue);

        if (isNumericId) {
            console.log("Using swimmer ID:", swimmerValue);
            go("swimmer", swimmerValue);
        } else {
            console.log("Using swimmer name for search:", swimmerValue);
            // Strip age parentheses from name if present (e.g., "John Doe (15)" -> "John Doe")
            const cleanName = swimmerValue.replace(/\s*\(\d+\)$/, '');
            console.log("Cleaned name:", cleanName);
            // If it's a name, use the search function instead
            go("search", cleanName);
        }
    } else {
        swimmerSelect.removeAttribute("data-selected");
    }
}

/**
 * Initialize BCST roster system
 */
async function initializeBCSTRoster() {
    console.log("Initializing BCST roster system...");

    // Create global roster instance
    window.bcstRoster = new BCSTRoster();

    // Load roster data
    await window.bcstRoster.loadRoster();

    // Update dropdowns if they exist in the DOM
    updateBCSTDropdowns();
}

/**
 * Update BCST dropdowns in the navigation
 */
function updateBCSTDropdowns() {
    const groupContainer = document.getElementById("bcst-group-container");
    const genderContainer = document.getElementById("bcst-gender-container");
    const swimmerContainer = document.getElementById("bcst-swimmer-container");

    if (groupContainer) {
        groupContainer.innerHTML = createGroupDropdown();
    }

    if (genderContainer) {
        // Start with empty gender dropdown until group is selected
        genderContainer.innerHTML = createEmptyGenderDropdown();
    }

    if (swimmerContainer) {
        // Start with empty swimmer dropdown until group and gender are selected
        swimmerContainer.innerHTML = createEmptySwimmerDropdown();
    }
}

// ================================================================================
// UTILITY FUNCTIONS FOR DATA IMPORT
// ================================================================================

/**
 * Helper function to import BCST roster data from JSON
 * Usage: importBCSTRoster({ "Senior 1": [{ name: "Swimmer Name", id: "12345" }] })
 */
function importBCSTRoster(rosterData) {
    if (!window.bcstRoster) {
        console.error("BCST roster not initialized yet. Please wait for page load.");
        return;
    }
    return window.bcstRoster.importRosterData(rosterData);
}

/**
 * Helper function to export current BCST roster data
 */
function exportBCSTRoster() {
    if (!window.bcstRoster) {
        console.error("BCST roster not initialized yet.");
        return {};
    }
    return window.bcstRoster.exportRosterData();
}

/**
 * Helper function to show instructions for importing Excel data
 */
function showBCSTImportInstructions() {
    console.log(`
=== BCST Roster Import Instructions ===

To import your Excel roster data:

1. Convert your Excel file to JSON format with this structure:
   {
     "Group Name": [
       { "name": "Swimmer Name", "id": "swimmer_id_or_pkey" },
       { "name": "Another Swimmer", "id": "another_id" }
     ]
   }

2. Use the import function:
   importBCSTRoster(yourRosterData)

Example:
importBCSTRoster({
  "Senior 1": [
    { "name": "Ray Tang", "id": "500281" },
    { "name": "Another Swimmer", "id": "12345" }
  ],
  "Senior 2": [
    { "name": "Max Tang", "id": "1320806" }
  ]
})

The data will be saved in browser storage and persist across sessions.
    `);
}

// ================================================================================
// GLOBAL EXPORTS
// ================================================================================

window.initializeBCSTRoster = initializeBCSTRoster;
window.onGroupChange = onGroupChange;
window.onGenderChange = onGenderChange;
window.onSwimmerChange = onSwimmerChange;
window.createGroupDropdown = createGroupDropdown;
window.createGenderDropdown = createGenderDropdown;
window.createEmptyGenderDropdown = createEmptyGenderDropdown;
window.createSwimmerDropdown = createSwimmerDropdown;
window.createEmptySwimmerDropdown = createEmptySwimmerDropdown;
window.updateBCSTDropdowns = updateBCSTDropdowns;

// Export utility functions
window.importBCSTRoster = importBCSTRoster;
window.exportBCSTRoster = exportBCSTRoster;
window.showBCSTImportInstructions = showBCSTImportInstructions;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeBCSTRoster();
        // Auto-select Champs group on page load
        setTimeout(() => {
            const groupSelect = document.getElementById('bcst-group-select');
            if (groupSelect && groupSelect.value === 'Champs') {
                onGroupChange('Champs');
            }
        }, 100);
    });
} else {
    initializeBCSTRoster();
    // Auto-select Champs group on page load
    setTimeout(() => {
        const groupSelect = document.getElementById('bcst-group-select');
        if (groupSelect && groupSelect.value === 'Champs') {
            onGroupChange('Champs');
        }
    }, 100);
}

console.log("BCST Roster module loaded");