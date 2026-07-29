-- Deploy only after the application version that no longer reads or writes
-- roles.permissions has been released and external API consumers have been verified.
-- Take a database backup before applying this migration.

ALTER TABLE roles
  DROP COLUMN permissions;
