# api/app/config.py
import os

# =========================================================
# BeerMap - CONFIG CENTRAL DE LA APLICACIÓN
# =========================================================
# Objetivo:
# - Centralizar configuración por variables de entorno (.env)
# - Evitar secretos en el código (OWASP 2025 A05: Security Misconfiguration)
# - Permitir despliegue en distintos entornos sin tocar código (dev/staging/prod)
#
# Nota:
# - Creamos un objeto "settings" para que el resto del código haga:
#     from .config import settings
# =========================================================


def _get_env(name: str, default: str = "") -> str:
    """
    Lee una variable de entorno de forma segura.
    Si no existe, devuelve un valor por defecto.
    """
    value = os.getenv(name, default)
    if value is None:
        return default
    return value


class Settings:
    """
    Contenedor de configuración de la aplicación.

    Seguridad (OWASP Top 10 2025):
    - A05 Security Misconfiguration: configuración externa y controlada.
    - A02 Cryptographic Failures: secret JWT configurable por entorno.
    """

    def __init__(self):
        # -------------------------------------------------
        # Entorno de ejecución
        # dev | staging | prod
        # -------------------------------------------------
        self.ENV = _get_env("ENV", "dev").strip().lower()

        # Base de datos
        self.DATABASE_URL = _get_env("DATABASE_URL")

        # JWT
        self.JWT_SECRET = _get_env("JWT_SECRET", "CAMBIA_ESTE_SECRET_EN_ENV")
        self.JWT_ALGORITHM = _get_env("JWT_ALGORITHM", "HS256")
        self.JWT_EXPIRE_MINUTES = int(_get_env("JWT_EXPIRE_MINUTES", "60"))

        # Reglas de negocio (cooldown de check-in)
        self.CHECKIN_COOLDOWN_SECONDS = int(_get_env("CHECKIN_COOLDOWN_SECONDS", "300"))

        # CORS
        # En desarrollo puede ser "*", pero en producción se recomienda lista de dominios.
        self.CORS_ORIGINS = _get_env("CORS_ORIGINS", "*")

        # -------------------------------------------------
        # Anti-fuerza bruta (login)
        # -------------------------------------------------
        # Ejemplo: 5 intentos fallidos en 10 min -> bloqueo 15 min
        self.LOGIN_MAX_ATTEMPTS = int(_get_env("LOGIN_MAX_ATTEMPTS", "5"))
        self.LOGIN_WINDOW_SECONDS = int(_get_env("LOGIN_WINDOW_SECONDS", "600"))
        self.LOGIN_BLOCK_SECONDS = int(_get_env("LOGIN_BLOCK_SECONDS", "900"))


# Objeto único de configuración para toda la app
settings = Settings()


# ------------------------------------------------------------------
# Compatibilidad hacia atrás:
# Si en otros ficheros ya usabas constantes directas, las exponemos.
# ------------------------------------------------------------------
ENV = settings.ENV

DATABASE_URL = settings.DATABASE_URL
JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = settings.JWT_ALGORITHM
JWT_EXPIRE_MINUTES = settings.JWT_EXPIRE_MINUTES

CHECKIN_COOLDOWN_SECONDS = settings.CHECKIN_COOLDOWN_SECONDS
CORS_ORIGINS = settings.CORS_ORIGINS

LOGIN_MAX_ATTEMPTS = settings.LOGIN_MAX_ATTEMPTS
LOGIN_WINDOW_SECONDS = settings.LOGIN_WINDOW_SECONDS
LOGIN_BLOCK_SECONDS = settings.LOGIN_BLOCK_SECONDS