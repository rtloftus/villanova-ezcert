const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");

const dbPath = path.join(app.getPath("userData"), "students.db");

console.log("Database location:", dbPath);

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS students (

    unique_id TEXT PRIMARY KEY,

    vuid TEXT,
    last_name TEXT,
    first_name TEXT,

    clas TEXT,
    catalog_term TEXT,
    exp_grad_date TEXT,

    program TEXT,
    dept TEXT,

    major1 TEXT,
    major2 TEXT,
    major3 TEXT,
    major4 TEXT,

    minor1 TEXT,
    minor2 TEXT,
    minor3 TEXT,
    minor4 TEXT,

    conc1 TEXT,
    conc2 TEXT,
    conc3 TEXT,
    conc4 TEXT,

    overall_hours TEXT,

    core_humanities INTEGER,
    core_philosophy INTEGER,
    core_ethics INTEGER,
    core_math INTEGER,
    core_nat_sci INTEGER,
    core_lit INTEGER,
    core_history INTEGER,
    core_soc_sci INTEGER,
    core_fine_arts INTEGER,
    core_theology INTEGER,
    core_language INTEGER,
    core_diversity INTEGER,

    first_major INTEGER,
    free_electives INTEGER,

    total INTEGER,

    status TEXT,
    review_status TEXT,
    notes TEXT,
    missing_requirements TEXT,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

const insertStudent = db.prepare(`
INSERT INTO students (
    unique_id,
    vuid,
    last_name,
    first_name,
    clas,
    catalog_term,
    exp_grad_date,
    program,
    dept,
    major1,
    major2,
    major3,
    major4,
    minor1,
    minor2,
    minor3,
    minor4,
    conc1,
    conc2,
    conc3,
    conc4,
    overall_hours,
    core_humanities,
    core_philosophy,
    core_ethics,
    core_math,
    core_nat_sci,
    core_lit,
    core_history,
    core_soc_sci,
    core_fine_arts,
    core_theology,
    core_language,
    core_diversity,
    first_major,
    free_electives,
    total,
    status,
    review_status,
    notes,
    missing_requirements
)
VALUES (
    @unique_id,
    @vuid,
    @last_name,
    @first_name,
    @clas,
    @catalog_term,
    @exp_grad_date,
    @program,
    @dept,
    @major1,
    @major2,
    @major3,
    @major4,
    @minor1,
    @minor2,
    @minor3,
    @minor4,
    @conc1,
    @conc2,
    @conc3,
    @conc4,
    @overall_hours,
    @core_humanities,
    @core_philosophy,
    @core_ethics,
    @core_math,
    @core_nat_sci,
    @core_lit,
    @core_history,
    @core_soc_sci,
    @core_fine_arts,
    @core_theology,
    @core_language,
    @core_diversity,
    @first_major,
    @free_electives,
    @total,
    @status,
    @review_status,
    @notes,
    @missing_requirements
)
ON CONFLICT(unique_id)
DO UPDATE SET

    clas=excluded.clas,
    catalog_term=excluded.catalog_term,
    exp_grad_date=excluded.exp_grad_date,

    overall_hours=excluded.overall_hours,

    core_humanities=excluded.core_humanities,
    core_philosophy=excluded.core_philosophy,
    core_ethics=excluded.core_ethics,
    core_math=excluded.core_math,
    core_nat_sci=excluded.core_nat_sci,
    core_lit=excluded.core_lit,
    core_history=excluded.core_history,
    core_soc_sci=excluded.core_soc_sci,
    core_fine_arts=excluded.core_fine_arts,
    core_theology=excluded.core_theology,
    core_language=excluded.core_language,
    core_diversity=excluded.core_diversity,

    first_major=excluded.first_major,
    free_electives=excluded.free_electives,

    total=excluded.total,

    status=excluded.status,
    review_status=excluded.review_status,
    notes=excluded.notes,
    missing_requirements=excluded.missing_requirements,

    updated_at=CURRENT_TIMESTAMP;
`);

function saveStudents(students) {

    const insertMany = db.transaction((list) => {

        for (const student of list) {
            insertStudent.run(student);
        }

    });

    insertMany(Object.values(students));
}

function getStudents() {
    return db.prepare(`
        SELECT *
        FROM students
        ORDER BY last_name, first_name
    `).all();
}

function updateReview(unique_id, review_status, status, notes) {

    db.prepare(`
        UPDATE students
        SET

            review_status=?,
            status=?,
            notes=?,
            updated_at=CURRENT_TIMESTAMP

        WHERE unique_id=?
    `).run(
        review_status,
        status,
        notes,
        unique_id
    );



}

function updateStudent(student) {
    const stmt = db.prepare(`
        UPDATE students
        SET
            status = ?,
            review_status = ?,
            notes = ?,
            overall_hours = ?,
            core_humanities = ?,
            core_philosophy = ?,
            core_ethics = ?,
            core_math = ?,
            core_nat_sci = ?,
            core_lit = ?,
            core_history = ?,
            core_soc_sci = ?,
            core_fine_arts = ?,
            core_theology = ?,
            core_language = ?,
            core_diversity = ?,
            first_major = ?,
            free_electives = ?,
            total = ?,
            missing_requirements = ?
        WHERE unique_id = ?
    `);

    stmt.run(
        student.status,
        student.review_status,
        student.notes,
        student.overall_hours,
        student.core_humanities,
        student.core_philosophy,
        student.core_ethics,
        student.core_math,
        student.core_nat_sci,
        student.core_lit,
        student.core_history,
        student.core_soc_sci,
        student.core_fine_arts,
        student.core_theology,
        student.core_language,
        student.core_diversity,
        student.first_major,
        student.free_electives,
        student.total,
        student.missing_requirements,
        student.unique_id
    );
}

function clearDatabase() {
    db.exec("DELETE FROM students");
    return { success: true };
}

function closeDatabase() {
    db.close();
}

module.exports = {
    saveStudents,
    getStudents,
    updateReview,
    closeDatabase,
    updateStudent,
    clearDatabase
};