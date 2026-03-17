# api/app/exceptions.py
# -------------------------------------------------------------------
# Exception handlers globales
# -------------------------------------------------------------------
# Este archivo centraliza el tratamiento de errores de toda la API.
#
# Objetivo:
# - devolver siempre un formato uniforme
# - evitar 500 con trazas al cliente
# - dejar un request_id para poder localizar el error en logs
#
# Seguridad / calidad:
# - OWASP A05 Security Misconfiguration:
#   evitamos respuestas desordenadas o filtrado accidental de información
# - OWASP A09 Logging and Monitoring Failures:
#   registramos errores internos para poder investigarlos
# -------------------------------------------------------------------

import logging
from typing import Any

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger("beermap")


def _error_payload(request: Request, code: str, message: str) -> dict[str, Any]:
    """
    Construye el cuerpo estándar de error.

    Qué hace:
    - mete un código interno legible
    - mete un mensaje claro para cliente
    - añade request_id si el middleware ya lo ha generado

    Esto sirve para que todos los errores tengan el mismo formato
    y sea más fácil depurar y documentar la API.
    """
    request_id = getattr(request.state, "request_id", None)

    return {
        "error": {
            "code": code,
            "message": message,
            "request_id": request_id
        }
    }


async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Maneja errores HTTP controlados de FastAPI.

    Ejemplos:
    - 400 Bad Request
    - 401 Unauthorized
    - 403 Forbidden
    - 404 Not Found
    - 409 Conflict
    - 429 Too Many Requests

    Qué buscamos:
    - no devolver cada error con un formato distinto
    - mantener coherencia en toda la API
    """
    code = "HTTP_ERROR"

    if exc.status_code == 400:
        code = "BAD_REQUEST"
    elif exc.status_code == 401:
        code = "UNAUTHORIZED"
    elif exc.status_code == 403:
        code = "FORBIDDEN"
    elif exc.status_code == 404:
        code = "NOT_FOUND"
    elif exc.status_code == 409:
        code = "CONFLICT"
    elif exc.status_code == 422:
        code = "VALIDATION_ERROR"
    elif exc.status_code == 429:
        code = "TOO_MANY_REQUESTS"

    payload = _error_payload(request, code, str(exc.detail))
    return JSONResponse(status_code=exc.status_code, content=payload)


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Maneja errores de validación de entrada.

    Ejemplos:
    - falta un campo obligatorio
    - formato inválido
    - tipo incorrecto

    Nota:
    - devolvemos detalles de validación porque ayudan al frontend
      y no exponen secretos internos.
    """
    payload = _error_payload(request, "VALIDATION_ERROR", "Datos inválidos")
    payload["error"]["details"] = exc.errors()

    return JSONResponse(status_code=422, content=payload)


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    Maneja errores relacionados con base de datos.

    Qué hacemos:
    - registramos el error internamente con logger.exception
    - devolvemos un 500 genérico al cliente

    Seguridad:
    - no exponemos consultas SQL
    - no exponemos trazas internas
    - no exponemos detalles del motor o credenciales
    """
    logger.exception(
        "SQLAlchemyError request_id=%s path=%s",
        getattr(request.state, "request_id", None),
        request.url.path
    )

    payload = _error_payload(request, "DB_ERROR", "Error interno del servidor")
    return JSONResponse(status_code=500, content=payload)


async def generic_exception_handler(request: Request, exc: Exception):
    """
    Maneja cualquier error no controlado.

    Esto sirve como red de seguridad final para que la API:
    - no rompa devolviendo HTML raro
    - no filtre trazas internas al cliente
    - siempre responda en JSON consistente
    """
    logger.exception(
        "UnhandledException request_id=%s path=%s",
        getattr(request.state, "request_id", None),
        request.url.path
    )

    payload = _error_payload(request, "INTERNAL_ERROR", "Error interno del servidor")
    return JSONResponse(status_code=500, content=payload)