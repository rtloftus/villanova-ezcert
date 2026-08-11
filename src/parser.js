const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");
const { saveCourses } = require("./database");
const { app } = require("electron");
const {
    DEPT_MAPPING,
    REQUIREMENTS
} = require("../electron/constants");

const DEBUG = false;
const harvestedCourses = {};
const masterCourseCatalog = {}; 

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
    const masterCourseCatalog = {};

    const auditDir = path.join(app.getPath("userData"), "audits");
console.log("AUDIT FILES ARE SAVED HERE:", auditDir); 
    if (!fs.existsSync(auditDir)) {
        fs.mkdirSync(auditDir, { recursive: true });
    }

    const files = fs.readdirSync(directory).filter(file => file.toLowerCase().endsWith(".xml"));

    for (const file of files) {
        try {
            const xmlData = fs.readFileSync(path.join(directory, file), "utf8");
            const parsed = parser.parse(xmlData);

            if (!parsed.Report || !parsed.Report.Audit) continue;

            const audits = ensureArray(parsed.Report.Audit);

            for (const audit of audits) {
                const studentData = parseAuditXML(audit);
                if (studentData.vuid) {
                    const auditFile = `${studentData.unique_id}.json`;

                    fs.writeFileSync(
                        path.join(auditDir, auditFile),
                        JSON.stringify(audit, null, 2)
                    );

                    studentData.audit_file = auditFile;
                }
                if (studentData.vuid) {
                    students[studentData.unique_id] = studentData;

                    //harvest courses
                    if (studentData.harvested_courses) {
                        for (const [key, courseObj] of Object.entries(studentData.harvested_courses)) {
                            masterCourseCatalog[key] = courseObj;
                        }
                    }
                }
            }
        } catch (e) {
            console.error(`Failed - ${file}:`, e);
        }
    }

    
    
    saveCourses(Object.values(masterCourseCatalog));
    console.log("Harvested:", Object.keys(masterCourseCatalog).length, "unique courses");

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
    let upcomingFallCredits = 0;

    const classList = []; 
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
        if (
            (c["@_In_progress"] === "Y" || c["@_preregistered"] === "Y") &&
            c["@_Credits"]
        ) {
            upcomingFallCredits += Number(c["@_Credits"]);
        }

        
        const disc = c["@_Discipline"] || "";
        const num = c["@_Number"] || "";
        const title = c["@_Course_title"] || "";
        const credits = Number(c["@_Credits"] || 0);

        // Capture for the student's transcript
        if (c["@_Passed"] === "Y" || c["@_In_progress"] === "Y") {
            classList.push({
                discipline: disc,
                number: num,
                title: title,
                grade: c["@_Letter_grade"] || (c["@_In_progress"] === "Y" ? "IP" : ""),
                credits: credits,
                term: c["@_Term"] || ""
            });
        }

        // Capture for the MASTER COURSE CATALOG
        let attributes = [];
        if (c.Attribute) {
            const attrs = ensureArray(c.Attribute);
            // Filter out internal system keys, keep only actual curriculum attributes
            attributes = attrs
                .filter(a => a["@_Code"] === "ATTRIBUTE")
                .map(a => a["@_Value"]);
        }

        if (disc && num) {
            const courseKey = `${disc}-${num}`;
            if (!auditObj.masterCourses) auditObj.masterCourses = {};

            harvestedCourses[courseKey] = {
                discipline: disc,
                number: num,
                title: title,
                credits: credits,
                attributes: JSON.stringify(attributes)
            };
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
    let notesArr = []; 

    const requirementCounts = {};

    for (const req of REQUIREMENTS) {
        requirementCounts[req.field] = 0;
    }

    for (const req of REQUIREMENTS) {
        if (req.special || req.block !== "Core Curriculum") continue;

        requirementCounts[req.field] =
            coreBlock && isBlockIncomplete(coreBlock)
                ? countMissingRules(coreBlock.Rule, req.rules)
                : 0;
    }

    requirementCounts.core_language =
        langBlock && isBlockIncomplete(langBlock)
            ? 1
            : 0;
    requirementCounts.core_diversity =
        calculateMissingDiversity(divBlock);

    // Major Count + Credit Remainder Logic
    let majorCount = 0;
    if (majorBlock && isBlockIncomplete(majorBlock)) {
        majorCount = countMissingRules(majorBlock.Rule);
    }
    requirementCounts.first_major = majorCount;

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
    requirementCounts.free_electives = elecCount;

    // --- Status & Totals ---
    const totalCourses =
        Object.values(requirementCounts)
            .reduce((a, b) => a + b, 0);

    const hasInProgress = auditObj.In_progress && (parseInt(auditObj.In_progress["@_Classes"], 10) > 0);
    const isDecGrad = (totalCourses === 0 && hasInProgress);

    let status = totalCourses >= 7 ? "DELETE" : "ON TRACK";

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
            notesArr.push("SCIP student.");
        }

        if (isAffiliate) {
            status = "HOLD";
            notesArr.push("Affiliate program (BIO 6100).");
        }

        if (status === "ON TRACK" && requirementCounts.core_language > 0) {
            status = "HOLD";
            notesArr.push("Outstanding language req.");
        }

        if (isStudyAbroad) {
            status = "HOLD";
            notesArr.push("Study abroad (VAB 1000 in progress).");
        }
        if (upcomingFallCredits > 0 && upcomingFallCredits < 12) {
            status = "HOLD";
            notesArr.push(`Only registered for ${upcomingFallCredits} credits in upcoming semester.`);
        }
    }

    const notes = notesArr.join(" ");
    const nextYear = new Date().getFullYear() + 1;
    const expGradDate = status === "ON TRACK" ? `5/31/${nextYear}` : "-";

    const missingArr = [];

    for (const req of REQUIREMENTS) {

        const count = requirementCounts[req.field];

        if (count > 0)
            missingArr.push(`${count} ${req.label}`);
    }

    return {
        unique_id,
        vuid,
        last_name: lastName,
        first_name: firstName,
        clas,
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

        ...requirementCounts,

        total: totalCourses,
        status,
        review_status: "Not Reviewed",
        notes,
        missing_requirements: missingArr.join(", "),
        classes: classList,
        harvested_courses: harvestedCourses,
        audit_file: null
    };
}

// Helpers
function isBlockIncomplete(block) {
    const percent = String(block["@_Per_complete"] || "");
    return !percent.startsWith("100") && !percent.startsWith("98");
}
function calculateMissingGroup(rule) {
    const groupRequirement = rule.Requirement;
    const rules = ensureArray(rule.Rule);

    const groupsNeeded = parseInt(
        rule.Advice?.["@_NumGroupsNeeded"] ?? groupRequirement?.["@NumGroups"],
        10
    );
    if (!groupsNeeded || !rules.length) return 0;

    const missingByRule = rules.map(childRule=>
        calculateMissingClassesForRule(childRule)
    );
    missingByRule.sort((a, b) => a-b);

    return missingByRule
        .slice(0, groupsNeeded)
        .reduce((sum, missing) => sum + missing, 0);

}
function countMissingRules(rules, targetLabels = null) {
    let missing = 0;
    const ruleArray = ensureArray(rules);
    for (const rule of ruleArray) {
        const label = rule["@_Label"] || "";
        if (
            targetLabels &&
            !targetLabels.some(t =>
                label.toLowerCase().includes(t.toLowerCase())
            )
        ) {
            continue;
        }

        if (rule["@_RuleType"] === "Group") {
            missing += calculateMissingGroup(rule);
        } else if (rule.Rule) {
            missing += countMissingRules(rule.Rule, targetLabels);
        } else {
            missing += calculateMissingClassesForRule(rule);
        }

    }
    return missing;
}


function calculateMissingDiversity(divBlock) {
    if (!divBlock || !isBlockIncomplete(divBlock)) return 0;

    const rootRule = ensureArray(divBlock.Rule)[0];

    const groupsNeeded = parseInt(
        rootRule?.Advice?.["@_NumGroupsNeeded"] ?? "",
        10
    );

    if (!isNaN(groupsNeeded)) {
        return groupsNeeded;
    }

    return countMissingRules(rootRule.Rule);
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

            if (rule.Classes_applied !== undefined) {
                appliedClasses = parseInt(rule.Classes_applied, 10);
            } else if (rule["@_Classes_applied"] !== undefined) {
                appliedClasses = parseInt(rule["@_Classes_applied"], 10);
            }

            const missing = requiredClasses - appliedClasses;
            return missing > 0 ? missing : 0;
        }
        
        if (rule.Requirement["@_Credits_begin"]) {
            const requiredCredits = parseInt(rule.Requirement["@_Credits_begin"], 10);
            let appliedCredits = 0;

            if (rule.Credits_applied !== undefined) {
                appliedCredits = parseInt(rule.Credits_applied, 10);
            } else if (rule["@_Credits_applied"] !== undefined) {
                appliedCredits = parseInt(rule["@_Credits_applied"], 10);
            }

            const missingCredits = requiredCredits - appliedCredits;
            if (missingCredits <= 0) return 0;

            const adviceCourses = ensureArray(rule.Advice)
                .map(advice => ({
                    credits: parseInt(advice["@_Credits"], 10)
                }))
                .filter(course => !isNaN(course.credits) && course.credits > 0);
            
                if (adviceCourses.length > 0) {
                    const credits = adviceCourses
                        .map(course => course.credits)
                        .sort((a,b) => b - a);
                    let remaining = missingCredits;
                    let courseCount = 0;

                    for (const creditValue of credits) {
                        if (remaining <= 0) break;

                        remaining -= creditValue;
                        courseCount++;
                    }
                    if (remaining <=0) {
                        return courseCount;
                    }
                }
            const classes = Math.floor(missingCredits / 3);
            const remainder = missingCredits % 3;

            return classes + (remainder === 2 ? 1 : 0);
        }
    }

    // Fallback if no specific tag is found
    appliedClasses = rule["@_Classes_applied"] !== undefined 
        ? parseInt(rule["@_Classes_applied"], 10) 
        : 0;

    const missing = 1 - appliedClasses;
    return missing > 0 ? missing : 0;
}

module.exports = { processDirectory };