-- =========================================================
-- BeerMap - Migration 002: Tabla refresh_tokens
-- =========================================================
-- Esta migración añade soporte para refresh tokens.
--
-- Por qué:
-- - El access token JWT es stateless y de corta duración.
-- - El refresh token permite renovarlo sin pedir contraseña de nuevo.
-- - Solo se guarda el hash SHA-256 del token, nunca el valor en claro.
-- - El campo revoked permite invalidar un token antes de que expire.
--
-- Ejecutar después de 001_init.sql
-- =========================================================

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- FK a users con CASCADE para limpiar automáticamente
    -- los tokens cuando se elimine un usuario.
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Hash SHA-256 del token (64 caracteres hex).
    -- Se indexa para búsquedas rápidas al verificar el token.
    token_hash VARCHAR(64) NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,

    -- false = válido, true = ya usado o cerrado sesión
    revoked BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para la verificación del token (la operación más frecuente)
CREATE INDEX idx_refresh_tokens_token_hash
    ON refresh_tokens(token_hash);

-- Índice para consultar/limpiar tokens por usuario
CREATE INDEX idx_refresh_tokens_user_id
    ON refresh_tokens(user_id);
