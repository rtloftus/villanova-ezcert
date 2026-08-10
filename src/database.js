const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");
const fs = require("fs");

const dbPath = path.join(app.getPath("userData"), "students.db");
console.log("Database location:", dbPath);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON"); // foreign keys enabled for ON DELETE CASCADE

// Create the main students table
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
    audit_file TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// Create table for tracking classes
db.exec(`
CREATE TABLE IF NOT EXISTS student_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    discipline TEXT,
    number TEXT,
    title TEXT,
    grade TEXT,
    credits REAL,
    term TEXT,
    FOREIGN KEY(student_id) REFERENCES students(unique_id) ON DELETE CASCADE
);
`);


db.exec(`
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discipline TEXT,
    number TEXT,
    title TEXT,
    credits REAL,
    attributes TEXT,
    UNIQUE(discipline, number)
);
`);

const insertStudent = db.prepare(`
INSERT INTO students (
    unique_id, vuid, last_name, first_name, clas, catalog_term, exp_grad_date,
    program, dept, major1, major2, major3, major4, minor1, minor2, minor3, minor4,
    conc1, conc2, conc3, conc4, overall_hours, core_humanities, core_philosophy,
    core_ethics, core_math, core_nat_sci, core_lit, core_history, core_soc_sci,
    core_fine_arts, core_theology, core_language, core_diversity, first_major,
    free_electives, total, status, review_status, notes, missing_requirements, audit_file
)
VALUES (
    @unique_id, @vuid, @last_name, @first_name, @clas, @catalog_term, @exp_grad_date,
    @program, @dept, @major1, @major2, @major3, @major4, @minor1, @minor2, @minor3, @minor4,
    @conc1, @conc2, @conc3, @conc4, @overall_hours, @core_humanities, @core_philosophy,
    @core_ethics, @core_math, @core_nat_sci, @core_lit, @core_history, @core_soc_sci,
    @core_fine_arts, @core_theology, @core_language, @core_diversity, @first_major,
    @free_electives, @total, @status, @review_status, @notes, @missing_requirements, @audit_file
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
    audit_file=excluded.audit_file,
    updated_at=CURRENT_TIMESTAMP;
`);

const insertClass = db.prepare(`
    INSERT INTO student_classes (student_id, discipline, number, title, grade, credits, term)
    VALUES (@student_id, @discipline, @number, @title, @grade, @credits, @term)
`);

const deleteClasses = db.prepare(`DELETE FROM student_classes WHERE student_id = ?`);

const insertCourse = db.prepare(`
    INSERT INTO courses (discipline, number, title, credits, attributes)
    VALUES (@discipline, @number, @title, @credits, @attributes)
    ON CONFLICT(discipline, number) 
    DO UPDATE SET 
        title=excluded.title,
        credits=excluded.credits,
        attributes=excluded.attributes;
`);


function saveStudents(students) {
    const insertMany = db.transaction((list) => {
        for (const student of list) {
            insertStudent.run(student);
            
            // Wipe existing classes for this student to avoid duplicates on re-parse
            deleteClasses.run(student.unique_id);
            
            // Insert the fresh class list from the parser
            if (student.classes && student.classes.length > 0) {
                for (const cls of student.classes) {
                    insertClass.run({
                        student_id: student.unique_id,
                        discipline: cls.discipline,
                        number: cls.number,
                        title: cls.title,
                        grade: cls.grade,
                        credits: cls.credits,
                        term: cls.term
                    });
                }
            }
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

function getStudentClasses(student_id) {
    return db.prepare(`
        SELECT * FROM student_classes 
        WHERE student_id = ? 
        ORDER BY term DESC, discipline ASC
    `).all(student_id);
}

function saveCourses(courseList) {
    console.log("Saving", courseList.length, "courses");

    const insertMany = db.transaction((list) => {
        for (const course of list) {
            insertCourse.run(course);
        }
    });

    insertMany(courseList);
}

function getAllCourses() {
    return db.prepare(`SELECT * FROM courses ORDER BY discipline, number`).all();
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
            missing_requirements = ?,
            audit_file = ?,
            updated_at = CURRENT_TIMESTAMP
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
        student.audit_file,
        student.unique_id
    );
}

function addStudent(student) {
    const existing = db
        .prepare ('SELECT unique_id FROM students WHERE unique_id = ?')
        .get(student.unique_id);

    if (existing) {
        return {
            success: false,
            error: "A student with this ID already exists."
        }
    }
    insertStudent.run(student);
    return {success: true};
}

function deleteStudent(unique_id) {
    db.prepare('DELETE FROM students WHERE unique_id = @unique_id').run({unique_id});
    return {success: true};
}

function clearDatabase() {
    // clear relational data and main table
    db.exec("DELETE FROM student_classes"); 
    db.exec("DELETE FROM students");
    
    // clear courses catalog
    db.exec("DELETE FROM courses");
    
    // clear the physical audit files
    try {
        const auditDir = path.join(app.getPath("userData"), "audits");
        
       
        if (fs.existsSync(auditDir)) {
            fs.rmSync(auditDir, { recursive: true, force: true });
        }
        
    
        fs.mkdirSync(auditDir, { recursive: true });
        
    } catch (err) {
        console.error("Error clearing audit files:", err);
    }
    
    return { success: true };
}

function closeDatabase() {
    db.close();
}

module.exports = {
    saveStudents,
    getStudents,
    getStudentClasses,
    saveCourses,
    getAllCourses,
    updateReview,
    closeDatabase,
    updateStudent,
    addStudent,
    deleteStudent,
    clearDatabase
};