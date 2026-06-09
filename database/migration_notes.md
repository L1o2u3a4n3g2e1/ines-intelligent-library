# Migration Notes

- Import `database.sql` into XAMPP/phpMyAdmin for a new installation.
- Import `seed_data.sql` after the schema.
- Existing installations should apply only the relevant idempotent files under
  `queries/`.
- Back up first with `scripts/backup_database.ps1`.
- Never drop a populated table without a reviewed migration and fresh backup.
- Application credentials are read from `.env`; schema files contain no runtime
  secrets.
