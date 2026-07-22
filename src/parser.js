const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

const DEBUG = false;

// --- DEPARTMENT MAPPING ---
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

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

function ensureArray(val) {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
}

function cleanString(str) {
    if (!str) return str;
    return str
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/''/g, "'");
}

// ============================================================================
// MAIN ORCHESTRATION
// ============================================================================

async function processDirectory(directory) {
    const students = {};
    const files = fs.readdirSync(directory).filter(file => file.toLowerCase().endsWith(".xml"));

    for (const file of files) {
        const fullPath = path.join(directory, file);
        try {
            const xmlData = fs.readFileSync(fullPath, "utf8");
            const parsed = parser.parse(xmlData);

            if (!parsed.Report || !parsed.Report.Audit) continue;

            const audits = ensureArray(parsed.Report.Audit);

            for (const audit of audits) {
                const studentData = parseAuditXML(audit);
                if (studentData.vuid) {
                    students[studentData.unique_id] = studentData;
                }
            }
        } catch (e) {
            console.error(`Failed - ${file}:`, e);
        }
    }
    return students;
}

// ============================================================================
// CORE XML PARSING LOGIC
// ============================================================================

function parseAuditXML(auditObj) {
    const header = auditObj.AuditHeader || {};
    const rawName = header["@_Stu_name"] || "Unknown Student";
    const fullName = cleanString(rawName);

    let lastName = "";
    let firstName = "";
    if (fullName) {
        const parts = fullName.split(",");
        lastName = parts[0] ? parts[0].trim() : "";
        firstName = parts[1] ? parts[1].trim() : "";
    }

    const vuid = header["@_Stu_id"] || null;
    if (!vuid) return { vuid: null };

    // --- Demographics & Program Info ---
    const degData = auditObj.Deginfo && auditObj.Deginfo.DegreeData ? auditObj.Deginfo.DegreeData : {};
    const reports = auditObj.Deginfo && auditObj.Deginfo.Report ? ensureArray(auditObj.Deginfo.Report) : [];

    const degCodeReport = reports.find(r => r["@_Code"] === "DEGCODE");
    const isAwarded = degCodeReport && degCodeReport["@_Value"] === "Awarded";

    let clas = degData["@_Stu_level"] ? degData["@_Stu_level"].trim() : "-";
    if (isAwarded) clas = "SR";
    else if (clas === "") clas = "-";

    const goals = auditObj.Deginfo && auditObj.Deginfo.Goal ? ensureArray(auditObj.Deginfo.Goal) : [];
    const progGoal = goals.find(g => g["@_Code"] === "PROGRAM");
    const program = progGoal ? cleanString(progGoal["@_Value"]) : "-";

    let dept = "-";
    if (program !== "-") {
        const progParts = program.split("-");
        const progCode = progParts.pop();
        dept = DEPT_MAPPING[progCode] || progCode;
    }

    const unique_id = `${vuid}-${program}`;

    // --- Catalog Term, Study Abroad & Affiliate Check ---
    let minTerm = "999999";
    const clsInfo = auditObj.Clsinfo && auditObj.Clsinfo.Class ? ensureArray(auditObj.Clsinfo.Class) : [];

    let isStudyAbroad = false;
    let isAffiliate = false;

    clsInfo.forEach(c => {
        if (c["@_Term"] && c["@_Term"] < minTerm) {
            minTerm = c["@_Term"];
        }
        if (c["@_Discipline"] === "VAB" && c["@_Number"] === "1000" && c["@_In_progress"] === "Y") {
            isStudyAbroad = true;
        }
        if (c["@_Discipline"] === "BIO" && c["@_Number"] === "6100") {
            isAffiliate = true;
        }
    });
    const catalogTerm = minTerm === "999999" ? "-" : minTerm;

    // --- Blocks (Majors, Minors, Concs, Reqs) ---
    const blocks = ensureArray(auditObj.Block);

    const majors = blocks.filter(b => b["@_Req_type"] === "MAJOR").map(b => cleanString(b["@_Req_value"]));
    const minors = blocks.filter(b => b["@_Req_type"] === "MINOR").map(b => cleanString(b["@_Req_value"]));
    const concs = blocks.filter(b => b["@_Req_type"] === "CONC").map(b => cleanString(b["@_Req_value"]));

    const majorBlock = blocks.find(b => b["@_Req_type"] === "MAJOR");
    const primaryMajorLabel = majorBlock ? majorBlock["@_Title"] : "";

    const coreBlock = blocks.find(b => b["@_Title"] && b["@_Title"].includes("Core Curriculum"));
    const langBlock = blocks.find(b => b["@_Title"] && b["@_Title"].includes("Core Language"));
    const divBlock = blocks.find(b => b["@_Title"] && b["@_Title"].includes("Core Diversity"));
    const elecBlock = blocks.find(b => b["@_Title"] && b["@_Title"].includes("Free Electives"));

    let overallHours = "-";
    const degreeBlock = blocks.find(b => b["@_Req_type"] === "DEGREE");
    if (degreeBlock && degreeBlock.Header && degreeBlock.Header.Qualifier) {
        const quals = ensureArray(degreeBlock.Header.Qualifier);
        const checkElec = quals.find(q => q["@_Name"] === "CHECKELECTIVES");
        if (checkElec && checkElec.CREDITSAPPLIEDTOWARDSDEGREE) {
            overallHours = checkElec.CREDITSAPPLIEDTOWARDSDEGREE["@_Credits"] || "-";
        }
    }

    // --- Detailed Core Counts & Note Tracking ---
    let notesArr = []; // Define early to catch credit remainders!

    const coreReqs = { Humanities: 0, Philosophy: 0, Ethics: 0, Math: 0, NaturalScience: 0, Literature: 0, History: 0, SocialScience: 0, FineArts: 0, Theology: 0 };

    if (coreBlock && isBlockIncomplete(coreBlock)) {
        coreReqs.Humanities = countMissingRules(coreBlock.Rule, ["Ancients", "Moderns"]);
        coreReqs.Philosophy = countMissingRules(coreBlock.Rule, ["Knowledge"]);
        coreReqs.Ethics = countMissingRules(coreBlock.Rule, ["Good Life"]);
        coreReqs.Math = countMissingRules(coreBlock.Rule, ["MATHEMATICS"]);
        coreReqs.NaturalScience = countMissingRules(coreBlock.Rule, ["NATURAL SCIENCES"]);
        coreReqs.Literature = countMissingRules(coreBlock.Rule, ["LITERATURE"]);
        coreReqs.History = countMissingRules(coreBlock.Rule, ["HISTORY"]);
        coreReqs.SocialScience = countMissingRules(coreBlock.Rule, ["SOCIAL SCIENCE"]);
        coreReqs.FineArts = countMissingRules(coreBlock.Rule, ["FINE ARTS"]);
        coreReqs.Theology = countMissingRules(coreBlock.Rule, ["Faith", "THEOLOGY"]);
    }

    let langCount = (langBlock && isBlockIncomplete(langBlock)) ? 1 : 0;
    let divCount = (divBlock && isBlockIncomplete(divBlock)) ? countMissingRules(divBlock.Rule) : 0;

    // Major Count + Credit Remainder Logic
    let majorCount = 0;
    if (majorBlock && isBlockIncomplete(majorBlock)) {
        const qualifiers = majorBlock.Header ? ensureArray(majorBlock.Header.Qualifier) : [];
        const neededQual = qualifiers.find(q => q["@_Needed"] && q["@_Name"] === "CLASSESCREDITS");
        if (neededQual) {
            const creditsNeeded = parseInt(neededQual["@_Needed"], 10);
            majorCount = Math.floor(creditsNeeded / 3);
            const remainder = creditsNeeded % 3;

            if (remainder === 2) majorCount += 1;
            if (remainder > 0) notesArr.push(`Major: +${remainder} cr.`);
        } else {
            majorCount = countMissingRules(majorBlock.Rule);
        }
    }

    // Electives Count + Credit Remainder Logic
    let elecCount = 0;
    if (elecBlock && isBlockIncomplete(elecBlock)) {
        const qualifiers = elecBlock.Header ? ensureArray(elecBlock.Header.Qualifier) : [];
        const neededQual = qualifiers.find(q => q["@_Needed"]);
        if (neededQual) {
            const creditsNeeded = parseInt(neededQual["@_Needed"], 10);
            elecCount = Math.floor(creditsNeeded / 3);
            const remainder = creditsNeeded % 3;

            if (remainder === 2) elecCount += 1;
            if (remainder > 0) notesArr.push(`Electives: +${remainder} cr.`);
        } else {
            elecCount = countMissingRules(elecBlock.Rule);
        }
    }

    // --- Status & Totals ---
    const totalCore = Object.values(coreReqs).reduce((a, b) => a + b, 0);
    const totalCourses = totalCore + langCount + divCount + majorCount + elecCount;

    const hasInProgress = auditObj.In_progress && (parseInt(auditObj.In_progress["@_Classes"], 10) > 0);
    const isDecGrad = (totalCourses === 0 && hasInProgress);

    let status = totalCourses > 7 ? "DELETE" : "ON TRACK";

    // --- OVERRIDE LOGIC ---
    if (isAwarded) {
        status = "OK";
        notesArr.push("Degree awarded.");
    } else if (isDecGrad) {
        status = "ON TRACK";
        notesArr.push("DEC grad.");
    } else {
        const customs = auditObj.Deginfo && auditObj.Deginfo.Custom
            ? ensureArray(auditObj.Deginfo.Custom)
            : [];

        const hasScipTag = customs.some(
            c => c["@_Code"] === "ATTRIBUTE" && c["@_Value"] === "SCIP"
        );

        if (hasScipTag) {
            status = "HOLD";
            notesArr.push("SCIP student detected.");
        }

        if (isAffiliate) {
            status = "HOLD";
            notesArr.push("Affiliate program (BIO 6100) detected.");
        }

        if (status === "ON TRACK" && langCount > 0) {
            status = "HOLD";
            notesArr.push("Outstanding language req detected.");
        }

        if (isStudyAbroad) {
            status = "HOLD";
            notesArr.push("Study abroad (VAB 1000 in progress) detected.");
        }
    }

    const notes = notesArr.join(" ");
    const nextYear = new Date().getFullYear() + 1;
    const expGradDate = status === "ON TRACK" ? `5/31/${nextYear}` : "-";

    const missingArr = [];
    if (coreReqs.Humanities > 0) missingArr.push(`${coreReqs.Humanities} Humanities`);
    if (coreReqs.Philosophy > 0) missingArr.push(`${coreReqs.Philosophy} Philosophy`);
    if (coreReqs.Ethics > 0) missingArr.push(`${coreReqs.Ethics} Ethics`);
    if (coreReqs.Math > 0) missingArr.push(`${coreReqs.Math} Math`);
    if (coreReqs.NaturalScience > 0) missingArr.push(`${coreReqs.NaturalScience} Nat Sci`);
    if (coreReqs.Literature > 0) missingArr.push(`${coreReqs.Literature} Lit`);
    if (coreReqs.History > 0) missingArr.push(`${coreReqs.History} History`);
    if (coreReqs.SocialScience > 0) missingArr.push(`${coreReqs.SocialScience} Soc Sci`);
    if (coreReqs.FineArts > 0) missingArr.push(`${coreReqs.FineArts} Fine Arts`);
    if (coreReqs.Theology > 0) missingArr.push(`${coreReqs.Theology} Theology`);
    if (langCount > 0) missingArr.push(`${langCount} Language`);
    if (divCount > 0) missingArr.push(`${divCount} Diversity`);
    if (majorCount > 0) missingArr.push(`${majorCount} Major`);
    if (elecCount > 0) missingArr.push(`${elecCount} Electives`);

    return {
        unique_id,
        vuid,
        last_name: lastName,
        first_name: firstName,
        clas: clas,
        catalog_term: catalogTerm,
        exp_grad_date: expGradDate,
        program,
        dept,
        major1: majors[0] || "",
        major2: majors[1] || "",
        major3: majors[2] || "",
        major4: majors[3] || "",
        minor1: minors[0] || "",
        minor2: minors[1] || "",
        minor3: minors[2] || "",
        minor4: minors[3] || "",
        conc1: concs[0] || "",
        conc2: concs[1] || "",
        conc3: concs[2] || "",
        conc4: concs[3] || "",
        overall_hours: overallHours,
        core_humanities: coreReqs.Humanities,
        core_philosophy: coreReqs.Philosophy,
        core_ethics: coreReqs.Ethics,
        core_math: coreReqs.Math,
        core_nat_sci: coreReqs.NaturalScience,
        core_lit: coreReqs.Literature,
        core_history: coreReqs.History,
        core_soc_sci: coreReqs.SocialScience,
        core_fine_arts: coreReqs.FineArts,
        core_theology: coreReqs.Theology,
        core_language: langCount,
        core_diversity: divCount,
        first_major: majorCount,
        free_electives: elecCount,
        total: totalCourses,
        status: status,
        review_status: "Not Reviewed",
        notes: notes,
        missing_requirements: missingArr.join(", ")
    };
}

// Helpers
function isBlockIncomplete(block) {
    const percent = String(block["@_Per_complete"] || "");
    return !percent.startsWith("100") && !percent.startsWith("98");
}

function countMissingRules(rules, targetLabels = null) {
    let missing = 0;
    const ruleArray = ensureArray(rules);
    for (const rule of ruleArray) {
        if (rule.Rule) {
            missing += countMissingRules(rule.Rule, targetLabels);
        } else {
            const label = rule["@_Label"] || "";
            if (!targetLabels || targetLabels.some(t => label.toLowerCase().includes(t.toLowerCase()))) {
                missing += calculateMissingClassesForRule(rule);
            }
        }
    }
    return missing;
}

function calculateMissingClassesForRule(rule) {
    const percent = String(rule["@_Per_complete"] || "");
    if (percent.startsWith("100") || percent.startsWith("98")) return 0;

    let requiredClasses = 0;
    let appliedClasses = 0;

    if (rule.Requirement) {
        // Handle Class-based requirements
        if (rule.Requirement["@_Classes_begin"]) {
            requiredClasses = parseInt(rule.Requirement["@_Classes_begin"], 10);

            if (rule.Classes_applied !== undefined) appliedClasses = parseInt(rule.Classes_applied, 10);
            else if (rule["@_Classes_applied"] !== undefined) appliedClasses = parseInt(rule["@_Classes_applied"], 10);

            const missing = requiredClasses - appliedClasses;
            return missing > 0 ? missing : 0;
        }
        // Handle Credit-based requirements
        else if (rule.Requirement["@_Credits_begin"]) {
            const requiredCredits = parseInt(rule.Requirement["@_Credits_begin"], 10);
            let appliedCredits = 0;

            if (rule.Credits_applied !== undefined) appliedCredits = parseInt(rule.Credits_applied, 10);
            else if (rule["@_Credits_applied"] !== undefined) appliedCredits = parseInt(rule["@_Credits_applied"], 10);

            const missingCredits = requiredCredits - appliedCredits;
            if (missingCredits <= 0) return 0;

            // New Rounding Rule: Floor the division, but round up if remainder is 2
            const classes = Math.floor(missingCredits / 3);
            const remainder = missingCredits % 3;

            return classes + (remainder === 2 ? 1 : 0);
        }
    }

    // Fallback if no specific tag is found
    appliedClasses = rule["@_Classes_applied"] !== undefined ? parseInt(rule["@_Classes_applied"], 10) : 0;
    const missing = 1 - appliedClasses;
    return missing > 0 ? missing : 0;
}

module.exports = { processDirectory };