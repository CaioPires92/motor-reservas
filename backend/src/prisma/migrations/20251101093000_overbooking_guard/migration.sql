-- Enable gist equality for int4 in exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Generated range column for [checkin, checkout)
ALTER TABLE "Reserva"
  ADD COLUMN IF NOT EXISTS "periodo" tsrange
  GENERATED ALWAYS AS (tsrange("checkin", "checkout", '[)')) STORED;

-- Prevent overlapping reservations for the same room when status != 'cancelada'
ALTER TABLE "Reserva"
  ADD CONSTRAINT "reserva_no_overlap"
  EXCLUDE USING gist (
    "quartoId" WITH =,
    "periodo" WITH &&
  )
  WHERE (status <> 'cancelada');

