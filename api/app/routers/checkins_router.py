# app/routers/checkins_router.py
# -------------------------------------------------------------------
# Router de check-ins
# -------------------------------------------------------------------
# Este archivo concentra la lógica relacionada con los check-ins.
#
# Equivalencia mental con Spring Boot:
# - esto sería como tu CheckinController
#
# Qué vamos a gestionar aquí:
# - crear check-in
# - validar cooldown de 5 minutos
# - sumar puntos al usuario
# - devolver los check-ins del usuario para pintar su mapa
#
# Seguridad:
# - solo usuarios autenticados pueden hacer check-in
# - solo usuarios autenticados pueden ver su mapa
# - se registra auditoría en acciones importantes
# - se valida pertenencia al grupo si el check-in va asociado a grupo
# -------------------------------------------------------------------

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..audit import write_audit_log
from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models import Checkin, GroupMember, PointsLedger, User
from ..schemas import CreateCheckinRequest, CheckinResponse, MapCheckinResponse


# -------------------------------------------------------------------
# Router de check-ins
# -------------------------------------------------------------------
router = APIRouter(
    prefix="/checkins",
    tags=["Checkins"]
)


@router.post("", response_model=CheckinResponse, status_code=status.HTTP_201_CREATED)
def crear_checkin(
    payload: CreateCheckinRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Crea un check-in nuevo para el usuario autenticado.

    Flujo:
    1) comprueba cooldown de 5 minutos
    2) si viene group_id, valida que el usuario pertenezca al grupo
    3) crea el check-in
    4) suma +1 punto en el ledger
    5) guarda audit log
    6) devuelve el check-in creado

    Seguridad:
    - OWASP A01 Broken Access Control:
      solo usuarios autenticados pueden hacer check-in
    - OWASP A03 Injection:
      se usa SQLAlchemy ORM y no SQL manual
    - OWASP A09 Logging and Monitoring Failures:
      se registra la acción en audit_logs
    """
    # ---------------------------------------------------------------
    # 1) Se busca el último check-in del usuario para aplicar cooldown
    # ---------------------------------------------------------------
    ultimo_checkin = db.query(Checkin).filter(
        Checkin.user_id == current_user.id
    ).order_by(
        desc(Checkin.created_at)
    ).first()

    if ultimo_checkin is not None:
        ahora = datetime.utcnow()
        limite = ahora - timedelta(seconds=settings.CHECKIN_COOLDOWN_SECONDS)

        # created_at viene con zona horaria desde PostgreSQL.
        # Para comparar de forma simple aquí, quitamos tzinfo.
        if ultimo_checkin.created_at.replace(tzinfo=None) > limite:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Debes esperar antes de hacer otro check-in",
            )

    # ---------------------------------------------------------------
    # 2) Si viene group_id, se comprueba que el usuario pertenezca
    #    a ese grupo
    #
    # OWASP A01 Broken Access Control
    # Evita que un usuario meta un check-in en un grupo ajeno.
    # ---------------------------------------------------------------
    if payload.group_id is not None:
        pertenece = db.query(GroupMember).filter(
            GroupMember.group_id == payload.group_id,
            GroupMember.user_id == current_user.id
        ).first()

        if pertenece is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No perteneces al grupo indicado",
            )

    # ---------------------------------------------------------------
    # 3) Se crea el check-in
    # ---------------------------------------------------------------
    checkin = Checkin(
        user_id=current_user.id,
        group_id=payload.group_id,
        icon_id=payload.icon_id,
        lat=payload.lat,
        lng=payload.lng,
        note=payload.note,
    )

    db.add(checkin)

    # flush() fuerza el INSERT para que ya exista checkin.id
    # antes de crear el movimiento en points_ledger.
    db.flush()

    # ---------------------------------------------------------------
    # 4) Se suma +1 punto en el ledger
    # ---------------------------------------------------------------
    movimiento_puntos = PointsLedger(
        user_id=current_user.id,
        delta=1,
        reason="checkin",
        ref_type="checkin",
        ref_id=checkin.id,
    )

    db.add(movimiento_puntos)
    db.commit()
    db.refresh(checkin)

    # ---------------------------------------------------------------
    # 5) Se guarda auditoría
    # ---------------------------------------------------------------
    write_audit_log(
        db=db,
        action="checkin_create",
        request=request,
        user_id=current_user.id
    )

    # ---------------------------------------------------------------
    # 6) Se devuelve respuesta
    # ---------------------------------------------------------------
    return CheckinResponse(
        id=checkin.id,
        lat=checkin.lat,
        lng=checkin.lng,
        note=checkin.note,
    )


@router.get("/my-map", response_model=list[MapCheckinResponse])
def obtener_mi_mapa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve todos los check-ins del usuario autenticado para pintar
    su mapa personal.

    Qué hace:
    - busca todos los check-ins del usuario actual
    - los ordena del más reciente al más antiguo
    - devuelve solo los datos mínimos para colocar chinchetas

    Seguridad:
    - OWASP A01 Broken Access Control:
      cada usuario solo puede ver su propio mapa
    - OWASP A03 Injection:
      se usa SQLAlchemy ORM y no SQL manual
    """
    checkins = db.query(Checkin).filter(
        Checkin.user_id == current_user.id
    ).order_by(
        desc(Checkin.created_at)
    ).all()

    respuesta = []

    for checkin in checkins:
        respuesta.append(
            MapCheckinResponse(
                id=checkin.id,
                lat=checkin.lat,
                lng=checkin.lng,
            )
        )

    return respuesta