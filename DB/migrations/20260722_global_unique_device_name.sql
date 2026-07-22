-- Enforce the business rule that device names are globally unique.
-- The devices.name column uses utf8mb4_general_ci, so this index is case-insensitive.
-- This migration intentionally trims only leading/trailing spaces and preserves
-- repeated spaces inside a name.

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_global_unique_device_name$$

CREATE PROCEDURE migrate_global_unique_device_name()
BEGIN
  DECLARE invalid_name_count INT DEFAULT 0;
  DECLARE duplicate_name_count INT DEFAULT 0;
  DECLARE unique_index_count INT DEFAULT 0;

  SELECT COUNT(*)
    INTO invalid_name_count
    FROM devices
   WHERE CHAR_LENGTH(TRIM(name)) < 2
      OR CHAR_LENGTH(TRIM(name)) > 100;

  IF invalid_name_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration blocked: device names must be 2-100 characters after trimming';
  END IF;

  SELECT COUNT(*)
    INTO duplicate_name_count
    FROM (
      SELECT TRIM(name) COLLATE utf8mb4_general_ci AS normalized_name
        FROM devices
       GROUP BY TRIM(name) COLLATE utf8mb4_general_ci
      HAVING COUNT(*) > 1
    ) AS duplicate_names;

  IF duplicate_name_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration blocked: duplicate device names exist after case-insensitive trimming';
  END IF;

  UPDATE devices
     SET name = TRIM(name)
   WHERE name <> TRIM(name);

  SELECT COUNT(*)
    INTO unique_index_count
    FROM information_schema.statistics
   WHERE table_schema = DATABASE()
     AND table_name = 'devices'
     AND index_name = 'uq_devices_name'
     AND non_unique = 0;

  IF unique_index_count = 0 THEN
    ALTER TABLE devices
      ADD UNIQUE KEY uq_devices_name (name);
  END IF;
END$$

CALL migrate_global_unique_device_name()$$
DROP PROCEDURE migrate_global_unique_device_name$$

DELIMITER ;
