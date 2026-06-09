# INES Intelligent Library Backend

PHP 8.1+ REST API for the `ines_intelligent_library` MySQL/MariaDB database.

## XAMPP Setup

1. Start Apache and MySQL.
2. Import `../database/database.sql` in phpMyAdmin.
3. Import `../database/seed_data.sql`.
4. Open:

```text
http://localhost/digital-library/backend/health
```

The frontend API base URL is:

```text
http://localhost/digital-library/backend
```

## Optional Environment Settings

Copy values from `../.env.example` into `.env` when non-default credentials are needed:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ines_intelligent_library
DB_USER=root
DB_PASSWORD=
DB_CHARSET=utf8mb4
```

Do not store real passwords, SMTP credentials, or API keys in documentation or source control.

## Built-In Server

From the project root:

```powershell
C:\xampp\php\php.exe -S localhost:8080 -t backend backend/router.php
```

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Student | `student@ines.ac.rw` | `password` |
| Lecturer | `lecturer@ines.ac.rw` | `password` |
| Librarian/Admin | `admin@ines.ac.rw` | `password` |

Change demo passwords before any non-local deployment.

## API Groups

- `/auth`
- `/users`
- `/books`, `/book-files`, `/search/books`
- `/faculties`, `/departments`, `/courses`, `/academic`
- `/borrow`
- `/progress`, `/favorites`, `/bookmarks`
- `/ratings`, `/reviews`, `/recommendations`
- `/reading-lists`, `/lecture-notes`
- `/notifications`
- `/logs`, `/voice-search`, `/tts`
- `/analytics`, `/reports`, `/settings`

Protected routes use:

```http
Authorization: Bearer <token>
```

All database input is sent through PDO prepared statements. Deletes of business records use status fields where preservation is required.

## Validation

```powershell
C:\xampp\php\php.exe -l backend\routes\api.php
```

Database details and migration results are documented in:

- `../database/DATABASE_REPORT.md`
- `../database/migration_notes.md`
- `../database/queries/sql_queries.sql`
