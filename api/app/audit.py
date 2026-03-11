# api/app/audit.py
# -------------------------------------------------------------------
# Audit logs (trazabilidad pro):
# - Guarda acciones importantes en tabla audit_logs
# - OWASP: Logging & Monitoring
# -------------------------------------------------------------------

from fastapi import Request
from sqlalchemy.orm import Session

from .middleware import get_client_ip


def write_audit_log(
    db: Session,
    action: str,
    request: Request,
    user_id=None
) -> None:
    """
    Inserta un audit log. No debe romper la request si falla.
    - user_id puede ser UUID o None.
    """
    try:
        # Import local para no romper si el modelo aún no existe en algún momento
        from .models import AuditLog  # debes tener este modelo

        ip = getattr(request.state, "client_ip", None)
        if ip is None:
            ip = get_client_ip(request)

        ua = request.headers.get("user-agent")
        if ua is not None and len(ua) > 200:
            ua = ua[:200]

        row = AuditLog(
            user_id=user_id,
            action=action,
            ip=ip,
            user_agent=ua
        )
        db.add(row)
        db.commit()
    except Exception:
        # Importante: NUNCA romper la request por auditoría
        db.rollback()