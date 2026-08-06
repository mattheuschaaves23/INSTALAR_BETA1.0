-- A validaÃ§Ã£o na aplicaÃ§Ã£o evita a maior parte dos conflitos, mas somente uma
-- restriÃ§Ã£o no PostgreSQL impede duas aceitaÃ§Ãµes simultÃ¢neas de ocuparem o mesmo horÃ¡rio.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_bookings_installer_time_no_overlap'
  ) THEN
    ALTER TABLE service_bookings
      ADD CONSTRAINT service_bookings_installer_time_no_overlap
      EXCLUDE USING gist (
        installer_id WITH =,
        tsrange(scheduled_start, scheduled_end, '[)') WITH &&
      )
      WHERE (status IN ('scheduled', 'in_progress'));
  END IF;
END $$;
