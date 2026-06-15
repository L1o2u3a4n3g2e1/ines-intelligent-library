# APPENDIX: INES Intelligent Digital Library Technical Documentation

---

## Appendix A: REST API Endpoint Reference

The INES backend exposes a public REST API (PHP 8.2 on XAMPP) with authentication-based access control. All requests require Bearer token authentication in the Authorization header, except for public endpoints like `/auth/login` and `/auth/register`.

### A.1 Authentication Endpoints

| Method | Endpoint | Purpose | Input | Response |
|--------|----------|---------|-------|----------|
| POST | `/auth/register` | Create new user account | `full_name, email, password, role?` | `{ id, token }` |
| POST | `/auth/login` | User login with rate limiting (10/5min) | `email, password` | `{ token, user }` |
| GET | `/auth/me` | Get current authenticated user | — | User object |
| POST | `/auth/logout` | Logout and invalidate token | — | `{ ok }` |
| POST | `/auth/forgot-password` | Request password reset link | `email, email_confirmation` | Reset token (local env only) |
| POST | `/auth/reset-password/validate` | Validate reset token | `token, email` | `{ email, expires_at }` |
| POST | `/auth/reset-password` | Complete password reset | `token, email, password` | Success message |
| PATCH | `/auth/password` | Update current user's password | `current_password, password` | Success message |

**Token Management:**
- Token TTL: 12 hours (configurable in `backend/config/app.php`)
- Tokens are issued after successful login; hashed in database as `api_token_hash`
- Authenticated requests: `Authorization: Bearer {token}`

### A.2 Book Management Endpoints

#### Catalog Books (Public & Admin)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| GET | `/books` | Search and list books | Public (authenticated) |
| POST | `/books/upload` | Upload book to catalog | STUDENT, LECTURER, LIBRARIAN_ADMIN |
| GET | `/books/{id}` | Get single book details | Public |
| PUT | `/books/{id}` | Update book metadata | LIBRARIAN_ADMIN |
| DELETE | `/books/{id}` | Soft-delete book | LIBRARIAN_ADMIN |

**GET /books Query Parameters:**
- `q` — Search by title, author, ISBN, keywords
- `limit` — Results per page (default: 50, max: 100)
- `offset` — Pagination offset (default: 0)
- `availability` — Filter by "available" or "unavailable"
- `faculty_id, department_id, course_id, category_id` — Filter by academic structure

**Response Example:**
```json
{
  "id": 1,
  "title": "Introduction to Computer Science",
  "author": "Jane Doe",
  "isbn": "978-0-123456-78-9",
  "total_copies": 5,
  "available_copies": 3,
  "status": "active",
  "files": [
    {
      "id": 10,
      "file_type": "pdf",
      "file_path": "uploads/books/abc123.pdf",
      "original_name": "intro_cs.pdf",
      "mime_type": "application/pdf",
      "file_size": 2048000
    }
  ]
}
```

#### Book Submissions (Student Uploads)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| POST | `/book-submissions` | Submit book for librarian approval | STUDENT |
| GET | `/book-submissions/my` | List user's submissions | STUDENT |
| GET | `/book-submissions` | List all submissions (pending/approved/rejected) | LIBRARIAN_ADMIN |
| GET | `/book-submissions/{id}/download` | Download submission file | STUDENT (own), LIBRARIAN_ADMIN |
| PATCH | `/book-submissions/{id}/approve` | Approve submission → creates catalog book | LIBRARIAN_ADMIN |
| PATCH | `/book-submissions/{id}/reject` | Reject submission with optional note | LIBRARIAN_ADMIN |

**POST /book-submissions (Form Data):**
```
title: string (required)
isbn: string (optional)
publisher: string (optional)
publication_year: number (optional)
description: string (optional)
keywords: string (optional)
total_copies: number (default: 1, max: 1,000,000)
file: PDF, DOCX, TXT, or audio (MP3/WAV/M4A/OGG/WEBM)
```

**Status Flow:** `pending` → `approved` OR `rejected`

#### Personal Library (Private Books)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| GET | `/personal-books` | List user's private books | STUDENT, LECTURER |
| POST | `/personal-books` | Upload private book | STUDENT, LECTURER |
| GET | `/personal-books/{id}` | Get private book metadata | Owner only |
| GET | `/personal-books/{id}/content` | Extract & return book text | Owner only |
| GET | `/personal-books/{id}/download` | Download book file | Owner only |
| DELETE | `/personal-books/{id}` | Permanently delete private book | Owner only |

**Supported Formats:** PDF, DOCX, TXT (English only)

### A.3 Voice Search & STT Endpoints

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| POST | `/search/voice` | Transcribe audio, search catalog | Public (auth required) |
| POST | `/search/voice/action` | Interpret voice command (e.g., "open my borrowed books") | Public (auth required) |

**POST /search/voice (Form Data):**
```
audio: WebM/WAV audio file (max 60 seconds)
```

**Response:**
```json
{
  "transcript": "machine learning algorithms",
  "confidence": 0.92,
  "results": [ /* book search results */ ]
}
```

**Voice Action Examples:**
- "Open my borrowed books" → Navigate to `/student/borrowed`
- "Show my favorites" → Navigate to `/student/favorites`
- "Open recommendations" → Navigate to `/recommendations`

### A.4 Text-to-Speech / Narration Endpoints

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| POST | `/narration/generate` | Generate MP3 narration from text | Public (auth required) |

**POST /narration/generate (JSON):**
```json
{
  "text": "Chapter one begins with a journey across...",
  "language": "en"
}
```

**Response:**
```json
{
  "file_path": "uploads/tts/123/hash.mp3",
  "mime_type": "audio/mpeg",
  "file_size": 512000,
  "provider": "gtts"
}
```

**Constraints:**
- Max 3,500 characters per narration
- English only (via Google gTTS API)
- Output format: MP3

### A.5 Admin & User Management

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| GET | `/users` | List all users | LIBRARIAN_ADMIN |
| POST | `/users` | Create new user | LIBRARIAN_ADMIN |
| GET | `/users/{id}` | Get user profile | LIBRARIAN_ADMIN |
| PUT | `/users/{id}` | Update user | LIBRARIAN_ADMIN |
| DELETE | `/users/{id}` | Deactivate user | LIBRARIAN_ADMIN |
| PATCH | `/users/{id}/deactivate` | Change user status | LIBRARIAN_ADMIN |
| PATCH | `/users/{id}/role` | Change user role | LIBRARIAN_ADMIN |

### A.6 System Health

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | API health check (no auth required) |

**Response:**
```json
{
  "status": "ok",
  "service": "INES backend",
  "database": "connected",
  "uploads_writable": true,
  "timestamp": "2026-06-13T10:30:45Z"
}
```

---

## Appendix B: AI/ML Service Configuration & Metrics

The INES system integrates three AI services for audio and text processing, with automatic fallback chains and verified accuracy metrics.

### B.1 Speech-to-Text (STT) Pipeline

#### Architecture
The system implements a dual-model fallback strategy for robust transcription:

```
User uploads audio
         ↓
    Attempt PRIMARY:
  Wav2Vec2 Transformer (port 5006)
         ↓
    [Success?] → Return transcript
         ↓ [Failure or timeout]
    Attempt FALLBACK:
  Whisper tiny.en (port 5001)
         ↓
    [Success?] → Return transcript
         ↓ [Failure]
    Return error to user
```

#### B.1.1 Primary: Wav2Vec2 Transformer (Port 5006)

**Model Architecture:**
- Base: `facebook/wav2vec2-base-960h` (Meta pretrained weights)
- Fine-tuning: Local adaptation on LibriSpeech manifest samples
- Head: CTC (Connectionist Temporal Classification) decoder
- Training: 120 optimization steps, batch size 1, learning rate 1e-5
- Trainable parameters: 24,608 / 94,396,320 total (0.026%)

**Training Dataset:**
- Source: Real LibriSpeech audio (640 samples)
- Train manifest: `speech_datasets/manifests/train.jsonl`
- Dev manifest: `speech_datasets/manifests/dev.jsonl`
- Test manifest: `speech_datasets/manifests/test.jsonl`
- Languages: English only

**Verified Performance (Held-out evaluation):**

| Metric | Dev Set | Test Set | Overall |
|--------|---------|----------|---------|
| **Word Accuracy** | 88.56% | 93.20% | **90.88%** |
| **Word Error Rate (WER)** | 11.44% | 6.80% | 9.12% |
| **Sentence Exact Match** | 50.0% | 66.67% | **58.33%** |
| **Character Error Rate (CER)** | 9.02% | 4.60% | 6.85% |
| **Samples Tested** | 40 | 60 | 100 |
| **Inference Time** | 213.2s | 212.6s | — |

**Example Predictions (Test Set):**
- **Correct:** "WE BELIEVE IN A LITERAL RESURRECTION AND AN ACTUAL HEREAFTER..."
- **Correct:** "I WISH I HADN'T CRIED SO MUCH SAID ALICE AS SHE SWAM ABOUT..."
- **Minor error:** "ILLUSTRATED ITALIAN MILLET" → (fully correct match)

**Production Status:**
- ✅ Ready for deployment (`production_ready: true`)
- Model checkpoint: `transformer_model/`
- Promotion date: June 2026
- Warning: CPU-bounded fine-tuning (GPU recommended for full dataset)

#### B.1.2 Fallback: Whisper tiny.en (Port 5001)

**Model:**
- Source: OpenAI Whisper (tiny.en variant)
- Language: English only
- Use case: Arbitrary book titles and general library search

**Verified Performance (Smoke test):**
- 5-file LibriSpeech audit: **91.67% word accuracy**
- Note: Benchmark on limited subset; not full evaluation

**When Used:**
- Primary Transformer service offline or timeout (3-second limit)
- Fallback timeout: 90 seconds

#### B.1.3 Service Health Monitoring

**Health Check Endpoint:**
- Primary (port 5006): `GET http://127.0.0.1:5006/health` (2-second timeout)
- Fallback (port 5001): `GET http://127.0.0.1:5001/health` (2-second timeout)

**API Endpoint Configuration:**
```php
// File: backend/config/app.php
'stt_service_url' => 'http://localhost:5001/transcribe',
```

**Response when both services fail:**
```json
{
  "error": "Speech-to-text service unavailable. Please try again."
}
```

### B.2 Text-to-Speech (TTS): Google gTTS

**Provider:** Google Text-to-Speech API (gTTS Python library v2.5.1)

**Configuration:**
- Language: English only (`en`)
- Format: MP3 (streaming)
- Sample rate: Automatic (gTTS default ~22.05 kHz)
- Cache location: `backend/uploads/tts/{user_id}/`
- Filename: SHA-256 hash of language + text (deduplication)

**Text Constraints:**
- Maximum: 3,500 characters per request
- Minimum: Non-empty after trim
- Supported: ASCII + Unicode (auto-encoded)

**Script:** `scripts/gtts_synthesize.py`

**Error Handling:**
- Network error: "gTTS could not generate this narration. Check the internet connection and try again." (HTTP 503)
- Invalid text: 422 Bad Request

**Example Response:**
```json
{
  "filename": "a1b2c3d4e5f6.mp3",
  "file_path": "uploads/tts/123/a1b2c3d4e5f6.mp3",
  "absolute_path": "/xampp/htdocs/digital-library/backend/uploads/tts/123/a1b2c3d4e5f6.mp3",
  "mime_type": "audio/mpeg",
  "file_size": 45120,
  "provider": "gtts"
}
```

### B.3 Document Processing Pipeline

**Supported Formats:** PDF, DOCX (Word), TXT

**Processing Steps:**
1. File upload validation (max 50 MB)
2. DOCX → PDF conversion (if needed) via `scripts/document_pipeline.py`
3. Text extraction with caching (`.content.txt` sidecar)
4. Page-level extraction for reader (`.page-{n}.txt` + `.page-{n}.json`)
5. PDF → JPEG rendering for page preview (`.page-{n}.jpg`)

**Example: Extract Text from PDF (Page 1)**
```
POST /books/{id}/pages/1/content
```

Response caches as:
- `uploads/books/abc123.pdf.page-1.txt` — Raw text
- `uploads/books/abc123.pdf.page-1.json` — Metadata (`page`, `total_pages`, `is_blank`)
- `uploads/books/abc123.pdf.page-1.jpg` — Rendered image

---

## Appendix C: Database Schema (Core Tables)

The INES database (`ines_intelligent_library`) uses MySQL 8.0 with InnoDB engine, UTF-8MB4 collation, and foreign key constraints. Key relationships are outlined below.

### C.1 User & Role Management

#### Table: `roles`
Defines system roles and permissions.

```sql
CREATE TABLE roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,           -- 'STUDENT', 'LECTURER', 'LIBRARIAN_ADMIN'
  name VARCHAR(80) NOT NULL,                  -- Display name
  description TEXT NULL,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Built-in Roles:**
- `STUDENT` — Can search, borrow, submit books, upload personal library
- `LECTURER` — Can create reading lists, view student engagement
- `LIBRARIAN_ADMIN` — Full catalog management, user administration, submission review

#### Table: `users`
Core user account table.

```sql
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id INT UNSIGNED NOT NULL,              -- FK to roles.id
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(40) NULL,
  gender ENUM('male','female','other','prefer_not_to_say') NULL,
  password_hash VARCHAR(255) NOT NULL,        -- bcrypt hash
  api_token_hash CHAR(64) NULL,               -- SHA-256 of login token
  token_expires_at DATETIME NULL,
  email_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  status ENUM('active','inactive','suspended','pending_verification') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_token (api_token_hash),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

**Auth Columns:**
- `api_token_hash`: Populated on login; checked on every API request
- `token_expires_at`: 12 hours from login (configurable)
- Password never stored plaintext; verified with `password_verify()`

#### Table: `user_profiles`
Extended user information (academic affiliation).

```sql
CREATE TABLE user_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,   -- FK to users.id
  faculty_id INT UNSIGNED NULL,              -- FK to faculties.id
  department_id INT UNSIGNED NULL,           -- FK to departments.id
  course_id INT UNSIGNED NULL,               -- FK to courses.id
  address VARCHAR(255) NULL,
  avatar_path VARCHAR(255) NULL,
  bio TEXT NULL,
  status ENUM('active','archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### C.2 Academic Structure

#### Tables: `faculties`, `departments`, `courses`

Hierarchical academic organization.

```sql
CREATE TABLE faculties (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  code VARCHAR(40) NULL UNIQUE,
  description TEXT NULL,
  status ENUM('active','archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE departments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT UNSIGNED NOT NULL,          -- FK to faculties.id
  name VARCHAR(150) NOT NULL,
  code VARCHAR(40) NULL,
  description TEXT NULL,
  status ENUM('active','archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_departments_faculty_name (faculty_id, name),
  CONSTRAINT fk_departments_faculty FOREIGN KEY (faculty_id) REFERENCES faculties(id)
);

CREATE TABLE courses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department_id INT UNSIGNED NOT NULL,       -- FK to departments.id
  name VARCHAR(150) NOT NULL,
  code VARCHAR(40) NULL,
  description TEXT NULL,
  status ENUM('active','archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_courses_department_name (department_id, name),
  CONSTRAINT fk_courses_department FOREIGN KEY (department_id) REFERENCES departments(id)
);
```

### C.3 Books & Catalog

#### Table: `authors`
Unique author records.

```sql
CREATE TABLE authors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL UNIQUE,
  biography TEXT NULL,
  status ENUM('active','archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Table: `categories`
Book subject classifications.

```sql
CREATE TABLE categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NULL,
  status ENUM('active','archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Table: `books`
Main book catalog.

```sql
CREATE TABLE books (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  author_id INT UNSIGNED NULL,               -- FK to authors.id
  category_id INT UNSIGNED NULL,             -- FK to categories.id
  faculty_id INT UNSIGNED NULL,              -- FK to faculties.id
  department_id INT UNSIGNED NULL,           -- FK to departments.id
  course_id INT UNSIGNED NULL,               -- FK to courses.id
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255) NULL,
  isbn VARCHAR(80) NULL UNIQUE,
  publisher VARCHAR(160) NULL,
  publication_year YEAR NULL,
  description TEXT NULL,
  keywords TEXT NULL,
  shelf_location VARCHAR(80) NULL,
  cover_image VARCHAR(255) NULL,             -- Generated if null
  total_copies INT UNSIGNED NOT NULL DEFAULT 1,
  available_copies INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('active','archived','deleted') DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL,           -- FK to users.id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FULLTEXT KEY ft_books_search (title, subtitle, description, keywords),
  INDEX idx_books_availability (available_copies),
  CONSTRAINT fk_books_author FOREIGN KEY (author_id) REFERENCES authors(id),
  CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

**Availability Logic:**
- `total_copies - borrowed_count = available_copies`
- Borrowed count tracked in `borrowings` table
- Updated on every borrow/return transaction

#### Table: `book_files`
Stores actual book documents (PDF, DOCX, audio).

```sql
CREATE TABLE book_files (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id BIGINT UNSIGNED NOT NULL,          -- FK to books.id
  file_type ENUM('pdf','docx','txt','cover','audio','other') NOT NULL,
  file_path VARCHAR(255) NOT NULL,           -- Relative path: uploads/books/abc123.pdf
  original_name VARCHAR(255) NULL,           -- User-supplied filename
  mime_type VARCHAR(120) NULL,               -- application/pdf, etc.
  file_size BIGINT UNSIGNED NULL,
  uploaded_by BIGINT UNSIGNED NULL,          -- FK to users.id
  status ENUM('active','archived','deleted') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_book_files_book (book_id),
  CONSTRAINT fk_book_files_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

### C.4 Submissions & Personal Library

#### Table: `book_submissions`
Student book submissions pending librarian approval.

```sql
CREATE TABLE book_submissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submitted_by BIGINT UNSIGNED NOT NULL,     -- FK to users.id
  title VARCHAR(255) NOT NULL,
  isbn VARCHAR(80) NULL,
  publisher VARCHAR(160) NULL,
  publication_year YEAR NULL,
  description TEXT NULL,
  keywords TEXT NULL,
  total_copies INT UNSIGNED DEFAULT 1,
  file_type ENUM('pdf','txt','audio','other') NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  source_name VARCHAR(255) NULL,             -- Original filename before conversion
  mime_type VARCHAR(120) NULL,
  file_size BIGINT UNSIGNED NULL,
  converted_to_pdf TINYINT(1) DEFAULT 0,     -- DOCX → PDF conversion flag
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,          -- FK to users.id (librarian)
  reviewed_at DATETIME NULL,
  review_note TEXT NULL,                     -- Rejection reason
  approved_book_id BIGINT UNSIGNED NULL,     -- FK to books.id (created after approval)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_submissions_status (status),
  CONSTRAINT fk_submissions_user FOREIGN KEY (submitted_by) REFERENCES users(id)
);
```

**Status Flow:**
- `pending` → `approved` (creates new `books` record) OR `rejected`
- Cannot re-process after approved/rejected

#### Table: `personal_books`
User's private book library (not in catalog).

```sql
CREATE TABLE personal_books (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,          -- FK to users.id
  title VARCHAR(255) NOT NULL,
  author VARCHAR(160) NULL,
  description TEXT NULL,
  language_code VARCHAR(5) DEFAULT 'en',     -- ISO 639-1 (only 'en' supported)
  file_type ENUM('pdf','docx','txt') NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  source_name VARCHAR(255) NULL,
  mime_type VARCHAR(120) NULL,
  file_size BIGINT UNSIGNED NULL,
  converted_to_pdf TINYINT(1) DEFAULT 0,     -- DOCX → PDF conversion flag
  status ENUM('active','archived','deleted') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_personal_books_user (user_id),
  CONSTRAINT fk_personal_books_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### C.5 Activity Audit Trail

#### Table: `activity_logs`
Records all user actions for compliance and debugging.

```sql
CREATE TABLE activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(80) NOT NULL,               -- 'login', 'download_book', 'voice_search', etc.
  status ENUM('success','empty_transcript','failed') DEFAULT 'success',
  entity_type VARCHAR(40) NULL,              -- 'book', 'personal_book', 'book_submission'
  entity_id BIGINT UNSIGNED NULL,
  metadata JSON NULL,                        -- Additional context (search query, transcript, etc.)
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_user (user_id),
  INDEX idx_activity_action (action),
  INDEX idx_activity_created (created_at)
);
```

### C.6 Authentication & Security

#### Table: `login_logs`
Failed and successful login attempts.

```sql
CREATE TABLE login_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  email VARCHAR(190) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  status ENUM('success','failed') NOT NULL,
  failure_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_email (email),
  INDEX idx_login_status (status),
  INDEX idx_login_created (created_at)
);
```

**Rate Limiting:** Built-in rate limit of 10 failed login attempts per 300 seconds (5 minutes) per IP.

#### Table: `password_resets`
Password reset token lifecycle.

```sql
CREATE TABLE password_resets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,              -- SHA-256 of token
  expires_at DATETIME NOT NULL,
  status ENUM('active','used','expired') DEFAULT 'active',
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Token Lifecycle:**
1. User requests reset: `POST /auth/forgot-password` → Creates active token (1-hour expiry)
2. User validates token: `POST /auth/reset-password/validate`
3. User submits new password: `POST /auth/reset-password` → Marks as `used`, invalidates other active tokens

---

## Summary

This appendix provides a complete technical reference for:
- **API Design** — RESTful endpoints, authentication, error handling
- **AI Pipeline** — Speech-to-text fallback chain, verified accuracy metrics, TTS configuration
- **Database Architecture** — Schema, relationships, indexing strategy, audit trail

All components are production-ready and documented for maintenance and future extension.
