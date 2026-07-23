// Department mapping
const DEPT_MAPPING = {
    "AST": "AST", "BIO": "BIO", "BIOC": "CHM", "BCHE": "CHM", "CHM": "CHM", "CHMB": "CHM",
    "COM": "COM", "CJRC": "COM", "CMPC": "COM", "CORC": "COM", "CPRC": "COM", "COUN": "COUN",
    "CSC": "CSC", "CYBS": "CSC", "DDS": "DDS", "ECA": "ECST", "EINT": "ECST", "EPP": "ECST",
    "EQB": "ECST", "EDU": "EDUC", "EBIO": "EDUC", "EENG": "EDUC", "EMAT": "EDUC", "ESS": "EDUC",
    "ENG": "ENG", "CRW": "ENG", "ETH": "ETH", "FFS": "FFS", "GEO": "GEV", "ENVS": "GEV",
    "ENVA": "GEV", "SUSS": "GEV", "ENV": "GEV", "GIS": "GISMa", "GIDS": "GISMa", "GAFR": "GISMa",
    "GAIS": "GISMa", "GASN": "GISMa", "GCHI": "GISMa", "GCST": "GISMa", "GISA": "GISMa",
    "GJPN": "GISMa", "GLAS": "GISMa", "GRAS": "GISMa", "AFR": "GISmi", "AIS": "GISmi",
    "ASIA": "GISmi", "ARB": "GISmi", "CHI": "GISmi", "IRS": "GISmi", "JPN": "GISmi",
    "RUS": "GISmi", "RAS": "GISmi", "GWS": "GWS", "HUM": "HAT", "CLA": "CLA", "HHMA": "HHMA",
    "AAH": "HIS", "HIS": "HIS", "LSM": "HIS", "PLAW": "HIS", "ITA": "ITA", "LAS": "LAS",
    "MAT": "MAT", "STA": "MAT", "MUS": "MUS", "PHI": "PHI", "PHY": "PHY", "PHYA": "PHY",
    "PJ": "PJ", "PA": "PSA", "PSA": "PSA", "PSC": "PSC", "CBN": "CBN", "CGS": "PSY",
    "PSY": "PSY", "PSYS": "PSY", "SAR": "SAR", "BSC": "SCI", "LSC": "SCI", "CRM": "SOC",
    "SOC": "SOC", "SPA": "SPA", "THE": "THE", "THL": "THL", "THL2": "THL", "RST": "THL",
    "TCSC": "THL", "TECS": "THL", "TFCS": "THL", "WRRH": "WRRH", "LA": "LA", "AA": "AA",
    "ABIO": "AA", "NS": "NS", "MS": "MS", "ARTE": "ARTE"
};

// Every editable requirement in the application
const REQUIREMENTS = [
    {
        label: "Humanities",
        field: "core_humanities",
        block: "Core Curriculum",
        rules: ["Ancients", "Moderns"]
    },
    {
        label: "Philosophy",
        field: "core_philosophy",
        block: "Core Curriculum",
        rules: ["Knowledge, Reality, Self"]
    },
    {
        label: "Ethics",
        field: "core_ethics",
        block: "Core Curriculum",
        rules: ["The Good Life:Eth & Cont Prob"]
    },
    {
        label: "Theology",
        field: "core_theology",
        block: "Core Curriculum",
        rules: ["Faith, Reason, and Culture", "THEOLOGY (UPPER-LEVEL)"]
    },
    {
        label: "Math",
        field: "core_math",
        block: "Core Curriculum",
        rules: ["MATHEMATICS AND STATISTICS"]
    },
    {
        label: "Science",
        field: "core_nat_sci", 
        block: "Core Curriculum",
        rules: ["NATURAL SCIENCES"]
    },
    {
        label: "Literature",
        field: "core_lit", 
        block: "Core Curriculum",
        rules: ["LITERATURE AND WRITING SEMINAR"]
    },
    {
        label: "History",
        field: "core_history",
        block: "Core Curriculum",
        rules: ["HISTORY (must be taken at Villanova)"]
    },
    {
        label: "Social Science",
        field: "core_soc_sci", // <-- FIXED: Matches your database schema
        block: "Core Curriculum",
        rules: ["SOCIAL SCIENCE"]
    },
    {
        label: "Fine Arts",
        field: "core_fine_arts",
        block: "Core Curriculum",
        rules: ["FINE ARTS"]
    },
    {
        label: "Language",
        field: "core_language",
        block: "Core Language",
        rules: ["Language Proficiency"],
        special: "language"
    },
    {
        label: "Diversity",
        field: "core_diversity",
        block: "Core Diversity (Unitas)",
        rules: [
            "Diversity 1-Unitas Division 1 ", 
            "Diversity 2-Unitas Division 2", 
            "Diversity 3-Unitas Division 3"
        ],
        special: "diversity"
    },
    {
        label: "Major",
        field: "first_major",
        block: "MAJOR",
        special: "major"
    },
    // Note: 'Minor' removed because 'first_minor' is not tracked as an integer in your SQLite schema!
    {
        label: "Free Electives",
        field: "free_electives",
        block: "Free Electives",
        rules: ["Free Electives"],
        special: "electives"
    }
];

// Numeric fields derived automatically
const NUMERIC_FIELDS = REQUIREMENTS.map(r => r.field);

// Statuses
const REVIEW_STATUSES = [
    "Not Reviewed",
    "Needs Attention",
    "Completed"
];

module.exports = {
    DEPT_MAPPING,
    REQUIREMENTS,
    NUMERIC_FIELDS,
    REVIEW_STATUSES
};