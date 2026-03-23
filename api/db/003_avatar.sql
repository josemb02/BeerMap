-- =========================================================
-- BeerMap - Migration 003: Avatar de usuario
-- =========================================================
-- Esta migración añade soporte para foto de perfil.
--
-- Por qué:
-- - El frontend sube la imagen directamente a Cloudinary.
-- - El backend solo guarda la URL pública resultante.
-- - Se usa VARCHAR(500) porque las URLs de Cloudinary
--   pueden ser largas al incluir transformaciones.
-- - La columna es nullable para no romper usuarios existentes.
--
-- Ejecutar después de 002_refresh_tokens.sql
-- =========================================================

ALTER TABLE users
    ADD COLUMN avatar_url VARCHAR(500) NULL;

-- Comentario descriptivo en el catálogo de PostgreSQL
COMMENT ON COLUMN users.avatar_url IS
    'URL pública de Cloudinary con la foto de perfil. NULL si el usuario no ha subido foto.';
