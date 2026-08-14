# Villanova EzCert

Villanova EzCert is an Electron desktop application for processing student audit XML files, tracking graduation requirements, and reviewing student status. It reads XML audit exports, parses degree requirement information, stores the results in a local SQLite database, and presents the data in a React-based UI for review and export.

## UPDATE 1.1

- The app now allows for eight entries in minor and concentration, as opposed to the previous limit of 4.
- The app now allows for filtering by minor and concentration. The app will also now take non-primary majors into account when filtering.

## Overview

This app is designed for academic advising and certification workflows. The basic flow is:

1. User selects a folder containing student audit XML files.
2. The app parses each XML file.
3. Student and course data are saved to SQLite.
4. The UI shows students by department, program, review status, and graduation status.
5. Users can edit records, review notes, clear the database, and export data to Excel.

---

## Tech Stack

- Electron 43
- React 19
- Vite
- better-sqlite3 for local database storage
- fast-xml-parser for XML parsing
- xlsx / xlsx-js-style for spreadsheet export
- Node.js + npm

This is a desktop app, not a browser app. The main process runs Electron, while the UI runs in a bundled renderer process built with React and Vite.

---

## Architecture

### Main process

The main Electron process lives in:

- `src/main.js`

This file is responsible for:

- creating the application window
- handling IPC messages from the renderer
- opening the folder picker dialog
- invoking the XML parser
- reading/writing student database records
- exposing database and file operations to the UI

### Preload bridge

The secure bridge is defined in:

- `src/preload.js`

This exposes safe APIs to the renderer via `contextBridge`, such as:

- selecting audit folders
- processing audit XML data
- reading and updating students
- clearing the database
- reading saved audit JSON files

### Frontend UI

The React app is defined in:

- `src/App.jsx`
- `src/components/AuditProcessor.jsx`

The UI handles:

- folder selection
- running the XML processor
- filtering/sorting student records
- editing student details
- exporting to Excel
- opening audit detail views

### Parsing logic

Audit XML parsing is largely handled in:

- `src/parser.js`

This code:

- scans the chosen directory for `.xml` files
- parses each XML record
- extracts student names, degree data, major/minor/concentration info
- calculates missing core requirements
- tracks course data and audit results
- saves normalized records to the database

### Database layer

The SQLite database is defined in:

- `src/database.js`

This file creates the schema for:

- `students`
- `student_classes`
- `courses`

It also defines helper functions for inserts, updates, fetches, and deletes.

### Requirement mappings

The degree requirement labels and department mappings are in:

- `electron/constants.js`

This is one of the most important files for maintenance because the taxonomy for degree requirements, department names, and review logic is centralized here.

---

## Project Structure

```text
grad-cert-app/
├── electron/
│   └── constants.js
├── src/
│   ├── App.jsx
│   ├── components/
│   │   ├── AddStudentModal.jsx
│   │   ├── AuditProcessor.jsx
│   │   ├── PasswordModal.jsx
│   │   ├── StudentModal.jsx
│   │   └── ...
│   ├── database.js
│   ├── main.js
│   ├── parser.js
│   ├── preload.js
│   ├── renderer.jsx
│   └── index.css
├── forge.config.js
├── index.html
├── package.json
├── vite.main.config.mjs
├── vite.preload.config.mjs
├── vite.renderer.config.mjs
├── README.md
└── ...
```

---

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm
- macOS/Windows/Linux support as required by Electron

Check versions:

```bash
node -v
npm -v
```

### Install dependencies

```bash
cd grad-cert-app
npm install
```

### Run the app in development mode

```bash
npm run start
```

This launches Electron with the Vite development setup.

---

## Useful Scripts

From `package.json`:

```bash
npm run start
```
Runs the app in Electron dev mode.

```bash
npm run rebuild
```
Rebuilds the native `better-sqlite3` module against the local Electron version.

```bash
npm run package
```
Packages the app for local distribution without generating OS installers.

```bash
npm run make
```
Creates distributable application artifacts for the current platform.

```bash
npm run build:mac
```
Creates a macOS build.

```bash
npm run build:win
```
Creates a Windows build.

---

## Running the App Logic

The app expects a folder of XML audit files. Once selected, the parser reads every XML file and synthesizes a student record. The main data flow is:

```text
UI -> preload bridge -> ipcMain -> parser.js -> database.js -> SQLite -> UI refresh
```

The parsed data includes fields such as:

- student name and VUID
- program / department
- major, minor, concentration
- core requirement counts
- total missing requirements
- review status and notes
- classes and course history

---

## Common Maintenance Tasks

### 1) If the graduation rules or requirement labels need to change

Edit:

- `electron/constants.js`

This file defines:

- `DEPT_MAPPING`
- `REQUIREMENTS`
- `NUMERIC_FIELDS`
- `REVIEW_STATUSES`

If a new graduation category is added or a name changes, update the matching requirement label and the parser logic in `src/parser.js` to stay in sync with the stored database fields.

### 2) If parsing logic needs adjustment

Edit:

- `src/parser.js`

Typical changes include:

- handling new XML tags
- fixing department detection
- changing logic for “missing requirement” calculations
- adjusting how classes or audit blocks are counted

After editing, test using a small folder of XML files before running on the full set.

### 3) If database fields or saved student data need to change

Edit:

- `src/database.js`

This file contains:

- SQLite schema creation
- insert/update SQL
- fetch and delete logic
- course and student persistence rules

If a database schema changes, you may need to:

- update existing table creation statements
- back up the existing SQLite database
- delete/rebuild the database if data migration is not automated

### 4) If the UI needs a new button, filter, or view

Edit:

- `src/components/AuditProcessor.jsx`
- `src/preload.js`
- `src/main.js`

This is where the app state, filtering logic, modal windows, and export actions are managed.

### 5) If the clear-database password needs to be changed

Edit:

- `src/main.js`

Look for:

```js
const CLEAR_DATABASE_PASSWORD = 'confirm';
```

This is a hardcoded admin value, so update it carefully and communicate the new password to anyone who needs it.

---

## Troubleshooting

### App does not start

Try:

```bash
rm -rf node_modules package-lock.json
npm install
npm run start
```

### `better-sqlite3` native module errors

This usually happens after Electron or Node version changes.

Run:

```bash
npm run rebuild
```

If that still fails, remove `node_modules` and reinstall dependencies cleanly.

### XML files are not being processed

Check:

- the folder contains actual `.xml` files
- file names are valid
- the selected folder is not nested incorrectly
- the parser is not failing on a malformed audit file

### Student records look stale or duplicate

This app writes data back to SQLite by unique ID. If data seems stale:

- clear the database through the UI or via the admin password flow
- rerun the parser on the XML folder

### Export or spreadsheet viewing issues

Make sure the output file is opened in a spreadsheet program that supports XLSX. If the export fails, inspect the `handleExportXLSX` logic in `src/components/AuditProcessor.jsx` and the related dependencies in `package.json`.

---

## Data Storage Notes

The app stores the SQLite database in the Electron user data folder, not in the project repo itself. That means the database lives outside the app directory and is tied to the user profile on the machine.

This is set in `src/database.js` using Electron's `app.getPath("userData")`.

The audit files are saved under the same user-data area, typically in a folder called `audits`.

---

## Deployment / Packaging Notes

The application is configured for packaging through Electron Forge in:

- `forge.config.js`

Packaging targets include:

- Squirrel installer for Windows
- zip for macOS
- deb and rpm packages for Linux

For a Mac build, use:

```bash
npm run build:mac
```

For a Windows build:

```bash
npm run build:win
```

---

## Important Operational Notes

- There are no automated test suites configured in the current repo, so most validation is done manually by running the app and checking the parsed results.
- The app depends heavily on the exact structure of the XML audit exports from Villanova.
- If the university changes the audit XML format or requirement naming conventions, the parser and requirement mappings will need adjustments.
- If you need to make a change while the owner is away, the best places to inspect first are:
  1. `electron/constants.js` for requirement naming and mapping
  2. `src/parser.js` for parsing and counting logic
  3. `src/database.js` for saved records and SQLite schema
  4. `src/components/AuditProcessor.jsx` for user-facing behavior

---

## Quick Maintenance Checklist

When a bug or change request comes in, use this order:

1. Confirm whether the issue is in parsing, database logic, or UI behavior.
2. Check the relevant file in the list above.
3. Make the smallest change possible.
4. Run the app locally and test with a small set of XML files.
5. Recheck exports and saved data before deploying a new build.

---

## Summary

This project is a desktop-only data processing tool built around:

- Electron for desktop runtime
- React for the interface
- SQLite for local persistence
- XML parsing for academic audit ingestion
- Excel export for reporting

If someone needs to maintain it later, the most important files are `src/parser.js`, `src/database.js`, `electron/constants.js`, and `src/components/AuditProcessor.jsx`.

