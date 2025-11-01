-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_reserva_quarto_periodo" ON "Reserva" ("quartoId", "checkin", "checkout");
CREATE INDEX IF NOT EXISTS "idx_reserva_email_criadoEm" ON "Reserva" ("email", "criadoEm" DESC);

