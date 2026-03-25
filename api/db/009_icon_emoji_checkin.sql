-- Migración 009: idempotente — asegura que icon_emoji existe en checkins.
-- Segura de ejecutar aunque 008 ya la haya añadido (IF NOT EXISTS lo evita).

ALTER TABLE checkins ADD COLUMN IF NOT EXISTS icon_emoji VARCHAR(10) NULL;
