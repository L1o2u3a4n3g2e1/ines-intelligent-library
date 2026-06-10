# Book Covers Implementation Summary

Implemented real PDF cover extraction for INES Digital Library.

## Completed

- Added `scripts/extract_book_covers.php`.
- Added `scripts/extract_pdf_cover.py`.
- Patched Claude's original script so `--dry-run` is truly dry.
- Replaced the Ghostscript-only assumption with the working local renderer: Python `fitz` plus `Pillow`.
- Extracted first-page JPG covers for all active PDF books.
- Updated `books.cover_image` to point to `uploads/covers/book-{id}.jpg`.

## Actual Extraction Result

- Active PDF books found: 48
- JPG covers created: 48
- Failures: 0
- Total JPG size: about 1.76 MB
- Remaining generated SVG fallback covers: 6

## Why 48, Not 51

The current database has 48 active books with active PDF files. Books that are TXT-only, missing a PDF file, or not active keep their generated SVG covers.

## Frontend

The frontend already reads `books.cover_image`, so the new JPG covers display automatically in:

- book cards
- book details
- catalog/search results

## Re-run

```powershell
C:\xampp\php\php.exe scripts\extract_book_covers.php --force
```

Use `--force` only when you want to regenerate existing JPG covers.
