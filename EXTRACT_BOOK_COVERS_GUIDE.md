# Extract Book Covers Guide

This project now supports extracting real cover images from the first page of each active PDF book.

## What It Uses

The working extractor uses local Python libraries:

- `PyMuPDF` / `fitz` to render page 1 of each PDF
- `Pillow` to resize and save the image as JPG
- PHP to query MySQL, call the Python helper, and update `books.cover_image`

No external cover images are downloaded, so the cover comes from the same legal PDF already stored in the system.

## Files

- `scripts/extract_book_covers.php`
- `scripts/extract_pdf_cover.py`
- output: `backend/uploads/covers/book-{id}.jpg`
- log: `book_imports/logs/covers.log`

## Commands

Dry-run, no files or database changes:

```powershell
C:\xampp\php\php.exe scripts\extract_book_covers.php --dry-run
```

Real extraction:

```powershell
C:\xampp\php\php.exe scripts\extract_book_covers.php
```

Force refresh existing JPG covers:

```powershell
C:\xampp\php\php.exe scripts\extract_book_covers.php --force
```

## Actual Result On This Machine

The extractor found 48 active PDF books and created 48 JPG covers successfully.

Six non-PDF or missing-PDF books kept the generated SVG fallback covers.

## Verification

Database:

```sql
SELECT COUNT(*) FROM books WHERE cover_image LIKE 'uploads/covers/book-%.jpg';
SELECT COUNT(*) FROM books WHERE cover_image LIKE 'uploads/covers/generated/%';
```

HTTP check example:

```powershell
Invoke-WebRequest http://localhost/digital-library/backend/uploads/covers/book-26.jpg
```

Expected response: `200 image/jpeg`.

## Safety

- The script does not delete books.
- The script does not modify PDFs.
- `--dry-run` does not create files or update the database.
- If extraction fails for a book, the existing generated SVG cover remains.
