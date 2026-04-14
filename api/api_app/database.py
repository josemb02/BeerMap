from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import DATABASE_URL

# =========================================================
# BeerMap - BASE DE DATOS (Postgres + SQLAlchemy)
# =========================================================
# NOTA IMPORTANTE: esta es la configuración de la base de datos, no la definición de los modelos (User, Checkin, etc.) que va en models.py
# - Esta API va con Postgres (SQL).
# - No uso Mongo porque:
#   1) Rankings / relaciones / grupos / chat = SQL encaja perfecto
#   2) constraints e índices son clave para seguridad/calidad
#
# OJO:
# - DATABASE_URL viene del .env
# - Si falla: el .env está mal o Docker no lo está leyendo.
# =========================================================

if DATABASE_URL is None or DATABASE_URL.strip() == "":
    raise RuntimeError("DATABASE_URL no está definido. Revisa tu .env")

# Engine = conexión principal a la BD
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # evita conexiones muertas en Railway
    pool_size=10,         # conexiones permanentes en el pool
    max_overflow=20,      # conexiones extra permitidas en picos de carga
    pool_timeout=30,      # segundos máximos esperando una conexión libre
    pool_recycle=1800,    # reciclar conexiones cada 30 minutos
    future=True
)

# SessionLocal = fábrica de sesiones para cada request
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True
)

# Base = clase base para los modelos (User, Checkin, etc.)
Base = declarative_base()

# =========================================================
# get_db()
# =========================================================
# Esto se usa con Depends() en FastAPI
# - Crea una sesión (db = SessionLocal())
# - Abre sesión
# - La cierra siempre al terminar la request
# =========================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()