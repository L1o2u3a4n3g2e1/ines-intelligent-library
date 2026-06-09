# Database Report

Database: `ines_intelligent_library`

Live inspection on 2026-06-09:

- 35 tables
- 350 columns
- 62 foreign-key relationships
- InnoDB storage
- `utf8mb4` character set

The PHP backend connects through PDO with native prepared statements and
exception mode. See `database.sql` for the complete schema, `seed_data.sql` for
reference data, and `queries/` for migrations and query examples.

No cleanup operation in this repository audit dropped or modified a live
database table or user record.
