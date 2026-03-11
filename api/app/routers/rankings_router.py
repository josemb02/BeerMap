# app/routers/rankings_router.py
# -------------------------------------------------------------------
# Router de rankings
# -------------------------------------------------------------------
# Este archivo contiene los endpoints relacionados con el ranking
# de puntos dentro de los grupos.
#
# El ranking se calcula usando la tabla points_ledger, donde se
# registran todos los movimientos de puntos de los usuarios.
#
# Este endpoint permite:
# - ver quién lidera el grupo
# - mostrar competición entre amigos
# - construir la mecánica principal de BeerMap
#
# Seguridad OWASP aplicada:
#
# - OWASP A01 Broken Access Control
#     * se comprueba que el usuario autenticado pertenece al grupo
#     * si no pertenece, no puede ver el ranking
#
# - OWASP A03 Injection
#     * uso de SQLAlchemy ORM para evitar concatenar SQL manual
#
# - OWASP A09 Logging and Monitoring Failures
#     * el sistema ya tiene audit logs para registrar acciones
# -------------------------------------------------------------------

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Group, GroupMember, PointsLedger, User
from ..schemas import RankingEntry
from ..auth import get_current_user


# -------------------------------------------------------------------
# Creación del router
# -------------------------------------------------------------------
# prefix:
# todas las rutas de este archivo empezarán por /rankings
#
# tags:
# sirve para organizar Swagger / OpenAPI
# -------------------------------------------------------------------
router = APIRouter(
    prefix="/rankings",
    tags=["Rankings"]
)


# -------------------------------------------------------------------
# ENDPOINT: ranking de un grupo
# -------------------------------------------------------------------
@router.get("/group/{group_id}", response_model=list[RankingEntry])
def obtener_ranking_grupo(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve el ranking de puntos de un grupo.

    Flujo del endpoint:
    1) comprobar que el grupo existe
    2) comprobar que el usuario pertenece al grupo
    3) obtener los miembros del grupo
    4) sumar los puntos de cada usuario
    5) ordenar de mayor a menor
    6) devolver la lista final
    """

    # ---------------------------------------------------------------
    # 1) Comprobar que el grupo exista
    # ---------------------------------------------------------------
    grupo = db.query(Group).filter(Group.id == group_id).first()

    if grupo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grupo no encontrado",
        )

    # ---------------------------------------------------------------
    # 2) Seguridad: comprobar que el usuario pertenece al grupo
    #
    # OWASP A01 Broken Access Control
    # Evita que un usuario pueda consultar el ranking de un grupo
    # al que no pertenece.
    # ---------------------------------------------------------------
    pertenencia = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if pertenencia is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No perteneces a este grupo",
        )

    # ---------------------------------------------------------------
    # 3) Obtener miembros del grupo junto con sus puntos
    #
    # OWASP A03 Injection
    # Uso de SQLAlchemy ORM para construir consultas seguras
    # sin concatenar SQL manualmente.
    # ---------------------------------------------------------------
    filas = db.query(
        User.id.label("user_id"),
        User.username.label("username"),
        func.coalesce(func.sum(PointsLedger.delta), 0).label("points")
    ).join(
        GroupMember,
        GroupMember.user_id == User.id
    ).outerjoin(
        PointsLedger,
        PointsLedger.user_id == User.id
    ).filter(
        GroupMember.group_id == group_id
    ).group_by(
        User.id,
        User.username
    ).order_by(
        func.coalesce(func.sum(PointsLedger.delta), 0).desc()
    ).all()

    # ---------------------------------------------------------------
    # 4) Construir la respuesta final
    # ---------------------------------------------------------------
    resultado = []

    for fila in filas:
        resultado.append(
            RankingEntry(
                user_id=fila.user_id,
                username=fila.username,
                points=int(fila.points)
            )
        )

    return resultado