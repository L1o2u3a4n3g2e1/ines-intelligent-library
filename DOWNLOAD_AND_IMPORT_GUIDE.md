# INES Digital Library - Book Download & Import Complete Guide

**Status:** Ready for Download and Import
**Total Books:** 51 verified, legally redistributable
**Estimated Total Size:** ~1.8 GB

---

## Quick Start

### Step 1: Download All 51 Books

Run the provided download script:

```bash
cd C:\xampp\htdocs\digital-library
C:\xampp\php\php.exe book_imports/download_books.php
```

**This will:**
- Download all 51 books from their legal sources
- Save to `book_imports/books/` directory
- Verify file sizes (>50KB for PDFs, >1KB for TXT)
- Generate `book_imports/logs/download.log`

**Estimated time:** 10-30 minutes (depending on internet speed)

### Step 2: Verify Downloads

After download completes, verify files exist:

```bash
cd C:\xampp\htdocs\digital-library\book_imports\books
dir /s  REM (Shows all files and total count - should be 51)
```

### Step 3: Run Dry-Run Test

Test import without making database changes:

```bash
cd C:\xampp\htdocs\digital-library
C:\xampp\php\php.exe scripts/import_verified_books.php --dry-run
```

**Expected output:**
- Lists all 51 books being processed
- Shows "valid ready files" or "file missing" for each
- Summary showing expected import results
- Exits with status 0 (success)

### Step 4: Execute Real Import

**ONLY after dry-run passes successfully:**

```bash
cd C:\xampp\htdocs\digital-library
C:\xampp\php\php.exe scripts/import_verified_books.php --execute
```

This will:
- Insert 51 books into database
- Copy files to `backend/uploads/books/{book_id}/`
- Create file references in `book_files` table
- Generate import log with results

---

## File Locations

```
C:\xampp\htdocs\digital-library\
â”œâ”€â”€ book_imports/
â”‚   â”œâ”€â”€ verified_books.csv          (51 books metadata)
â”‚   â”œâ”€â”€ download_report.md          (verification report)
â”‚   â”œâ”€â”€ download_books.php          (download script)
â”‚   â”œâ”€â”€ books/                      (destination for PDFs/TXTs)
â”‚   â”‚   â”œâ”€â”€ Introduction_to_Computer_Science.pdf
â”‚   â”‚   â”œâ”€â”€ College_Algebra.pdf
â”‚   â”‚   â”œâ”€â”€ ... (49 more files)
â”‚   â”‚   â””â”€â”€ [51 total files after download]
â”‚   â””â”€â”€ logs/
â”‚       â”œâ”€â”€ download.log            (download results)
â”‚       â””â”€â”€ import.log              (import results)
â”œâ”€â”€ scripts/
â”‚   â””â”€â”€ import_verified_books.php   (import script)
â””â”€â”€ backend/
    â””â”€â”€ uploads/
        â””â”€â”€ books/
            â”œâ”€â”€ {book_id_1}/       (created during import)
            â”œâ”€â”€ {book_id_2}/
            â””â”€â”€ ... (51 total after import)
```

---

## Books Being Downloaded (51 Total)

### By License

**CC BY 4.0 (40 books):** OpenStax, MIT OCW, WHO, OTL
- Freely redistributable with attribution
- Allows modification and derivatives

**CC BY-SA 4.0 (1 book):** LibreTexts
- Freely redistributable with attribution
- Derivative works must use same license

**Public Domain (10 books):** Project Gutenberg classics
- No copyright restrictions
- Unrestricted use and modification

### By Faculty

| Faculty | Count | Examples |
|---------|-------|----------|
| Sciences & IT | 18 | CS, Math, Physics, Chemistry, Biology |
| Health Sciences | 10 | Nursing, Pharmacology, Public Health |
| Economics/Social Sciences/Management | 16 | Business, Economics, Psychology, History |
| Engineering & Technology | 4 | Engineering, Statics |
| Education | 2 | Writing, Academic |
| Law & Public Administration | 2 | Business Law, Government |

---

## Data Being Downloaded

### OpenStax Books (35 books)
Source: https://assets.openstax.org/
License: CC BY 4.0
Examples:
- Introduction to Computer Science
- College Algebra
- Introductory Statistics
- Physics 2e
- Chemistry 2e
- Biology 2e
- Nursing textbooks
- Business and Economics textbooks

### MIT OpenCourseWare (5 books)
Source: https://ocw.mit.edu/
License: CC BY 4.0
Examples:
- Mathematics for Computer Science
- Introduction to Algorithms
- Design and Analysis of Algorithms
- Calculus Full Textbook
- Classical Mechanics

### Project Gutenberg (4 books)
Source: https://www.gutenberg.org/
License: Public Domain
Examples:
- Principles of Economics (Fetter, 1904)
- Wealth of Nations (Smith, 1776)
- Progress and Poverty (George, 1879)
- Principles of Political Economy (Mill, 1848)

### World Health Organization (4 books)
Source: https://who.int/
License: CC BY 4.0 / Public Domain
Examples:
- Health Education: Theoretical Concepts
- School Health Education to Prevent AIDS/STD
- A Practical Guide for Health Researchers
- Primary Health Care: Closing the Gap

### Open Textbook Library (2 books)
Source: https://open.umn.edu/opentextbooks/
License: CC BY 4.0
Examples:
- Engineering Statics
- Basic Engineering Science

### LibreTexts (1 book)
Source: https://eng.libretexts.org/
License: CC BY-SA 4.0
Example:
- Introduction to Engineering

---

## Troubleshooting

### Problem: Download script fails with connection timeout

**Solution:**
```bash
REM Run with extended timeout
C:\xampp\php\php.exe -d default_socket_timeout=120 book_imports/download_books.php
```

### Problem: Some books fail to download

**Solution:**
1. Check `book_imports/logs/download.log` for details
2. Manually download failed book from source URL in `verified_books.csv`
3. Save to `book_imports/books/` with correct filename
4. Re-run download script (skips existing files)

### Problem: Dry-run shows files are missing

**Solution:**
1. Verify download completed successfully
2. Check `book_imports/books/` directory exists and has files
3. Verify file sizes are >50KB for PDFs
4. Check file extensions match actual content (.pdf, .txt)

### Problem: Import script cannot connect to database

**Solution:**
1. Edit `scripts/import_verified_books.php` lines 44-49
2. Update database credentials:
   ```php
   'host' => '127.0.0.1',      // Change if needed
   'user' => 'root',           // Your DB username
   'password' => '',           // Your DB password
   'database' => 'ines_intelligent_library'  // Your DB name
   ```
3. Verify MySQL is running
4. Test connection: `mysql -u root -p`

### Problem: Import fails with "table doesn't exist"

**Solution:**
1. Ensure database schema is imported from `database/database.sql`
2. Verify tables exist: `SHOW TABLES;` in MySQL
3. Check schema matches expected INES structure

---

## Safety & Verification

### Legal Compliance
âœ“ All books are CC BY, CC BY-SA, or Public Domain
âœ“ No copyrighted material
âœ“ No "educational use only" restrictions
âœ“ All sources verified and documented

### Data Safety
âœ“ Download script: Read-only (doesn't modify anything)
âœ“ Dry-run mode: Test without database changes
âœ“ Real import: Transactions + rollback on error
âœ“ File validation: Size, extension, integrity checks
âœ“ Duplicate detection: Skips existing books

### Post-Import Verification

After import completes:

```bash
REM Check import log
type book_imports\logs\import.log | findstr /C:"SUMMARY" -A 10

REM Query database
mysql -u root -e "SELECT COUNT(*) as total_books FROM ines_intelligent_library.books WHERE status='active';"

REM Check files were copied
dir backend\uploads\books

REM Verify total size
cd backend\uploads\books
for /r %A in (*) do @echo %~zA >> total.txt
REM (then view file)
```

---

## Import Process Explained

### What the Import Script Does

1. **Parse CSV** - Reads verified_books.csv metadata
2. **Find Faculty** - Locates faculty by name in database
3. **Find Department** - Locates department under faculty
4. **Find Course** - Locates course under department
5. **Get/Create Author** - Finds or creates author record
6. **Get/Create Category** - Finds or creates category record
7. **Check Duplicates** - Skips books already in database
8. **Validate File** - Confirms book file exists and has valid size
9. **Insert Book** - Creates book record in `books` table
10. **Copy File** - Copies file to `backend/uploads/books/{book_id}/`
11. **Insert File Reference** - Creates entry in `book_files` table

### Database Schema Used

```sql
-- Assumes INES schema with these tables:
CREATE TABLE faculties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    FOREIGN KEY (faculty_id) REFERENCES faculties(id)
);

CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department_id INT,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE authors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500),
    author_id INT,
    category_id INT,
    faculty_id INT,
    description TEXT,
    keywords VARCHAR(500),
    language VARCHAR(50),
    publication_year INT,
    source_url VARCHAR(500),
    license VARCHAR(100),
    license_url VARCHAR(500),
    file_size INT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES authors(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (faculty_id) REFERENCES faculties(id)
);

CREATE TABLE book_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    book_id INT,
    file_path VARCHAR(500),
    file_size INT,
    file_type VARCHAR(10),
    created_at TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id)
);
```

---

## Timeline

| Step | Command | Time | Status |
|------|---------|------|--------|
| 1. Download | `php book_imports/download_books.php` | 10-30 min | â³ Ready |
| 2. Verify | `dir book_imports\books` | 1 min | â³ Ready |
| 3. Dry-Run | `php scripts/import_verified_books.php --dry-run` | 2-5 min | â³ Ready |
| 4. Review Log | Check logs/import.log | 1 min | â³ Ready |
| 5. Real Import | `php scripts/import_verified_books.php --execute` | 5-10 min | â³ Pending |
| 6. Verify DB | Query books table | 1 min | â³ Pending |

**Total Time:** ~30-50 minutes from start to finish

---

## Logs Generated

### Download Log
**Location:** `book_imports/logs/download.log`

Contains:
- Each book download status
- File sizes
- Success/failure reasons
- Summary statistics

Example:
```
[2026-06-10 12:00:00] [INFO] === INES Book Downloader ===
[2026-06-10 12:00:01] [INFO] [0] Introduction to Computer Science
[2026-06-10 12:00:01] [INFO]   Downloading from: https://assets.openstax.org/...
[2026-06-10 12:00:15] [INFO]   âœ“ Downloaded (14.5 MB)
[2026-06-10 12:00:16] [INFO] [1] College Algebra
...
[2026-06-10 12:30:00] [INFO] === SUMMARY ===
[2026-06-10 12:30:00] [INFO] Total: 51
[2026-06-10 12:30:00] [INFO] Downloaded: 51
[2026-06-10 12:30:00] [INFO] Total Size: 1.8 GB
```

### Import Log
**Location:** `book_imports/logs/import.log`

Contains:
- Each book import status
- Author/category creation
- File copy operations
- Success/failure reasons
- Final summary

---

## FAQ

**Q: Can I run download and import at the same time?**
A: No. Complete download first, verify files exist, then import.

**Q: What if I want to add more books later?**
A: Add rows to `verified_books.csv`, download new files, run import again. Script skips duplicates.

**Q: Can I modify the CSV?**
A: Yes, but only change department/course names to match your actual database. Don't change file paths or URLs.

**Q: What if a book's license changes?**
A: Check the license_url column. If no longer legal, remove the row from verified_books.csv.

**Q: Do I need to manually create directories?**
A: No, the scripts create them automatically.

**Q: Can I run import multiple times safely?**
A: Yes, in dry-run mode unlimited times. Real import skips duplicates.

---

## Contact & Support

For issues, check logs:
- Download problems: `book_imports/logs/download.log`
- Import problems: `book_imports/logs/import.log`

For database errors, verify:
- MySQL is running
- Database credentials in import script
- Required tables exist
- Faculty/department/course names match your database

---

**Total Books Ready:** 51
**Total Legal Sources:** 7 (OpenStax, MIT OCW, Project Gutenberg, WHO, OTL, LibreTexts, IA)
**All Licenses:** CC BY 4.0, CC BY-SA 4.0, or Public Domain
**Status:** âœ“ Ready for Download and Import
