# api/app/ratelimit.py
# -------------------------------------------------------------------
# Rate limiting simple (anti fuerza bruta) - suficiente para práctica:
# - En memoria (por IP / clave)
# - Ventana deslizante por timestamps
# -------------------------------------------------------------------

import time
from typing import Dict, List

from fastapi import HTTPException, status

# { key: [timestamps] }
_BUCKETS: Dict[str, List[float]] = {}


def _now() -> float:
    return time.time()


def _cleanup(timestamps: List[float], window_seconds: int) -> List[float]:
    now = _now()
    keep = []
    for ts in timestamps:
        if (now - ts) <= window_seconds:
            keep.append(ts)
    return keep


def rate_limit(key: str, max_requests: int, window_seconds: int) -> None:
    """
    Aplica rate limit por clave.
    - key: por ejemplo "login:IP" o "register:IP"
    - max_requests: máximo en ventana
    - window_seconds: ventana temporal
    """
    timestamps = _BUCKETS.get(key)
    if timestamps is None:
        timestamps = []

    timestamps = _cleanup(timestamps, window_seconds)

    if len(timestamps) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Intenta más tarde."
        )

    timestamps.append(_now())
    _BUCKETS[key] = timestamps