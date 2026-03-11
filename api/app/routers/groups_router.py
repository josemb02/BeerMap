# app/routers/groups_router.py
# -------------------------------------------------------------------
# Router de grupos
# -------------------------------------------------------------------
# Este archivo concentra toda la lógica de endpoints relacionada
# con grupos.
#
# Equivalencia mental con Spring Boot:
# - esto sería como tu GroupController
#
# Aquí vamos a gestionar:
# - crear grupo
# - unirse a grupo por código
# - listar mis grupos
#
# Seguridad:
# - solo usuarios autenticados pueden entrar
# - usamos JWT con get_current_user
# - registramos acciones importantes en audit_logs
# -------------------------------------------------------------------

import random
import string

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Group, GroupMember, User
from ..schemas import CreateGroupRequest, JoinGroupRequest, GroupResponse
from ..auth import get_current_user
from ..audit import write_audit_log


# -------------------------------------------------------------------
# Router de grupos
# -------------------------------------------------------------------
# prefix:
# - todas las rutas de este archivo empezarán por /groups
#
# tags:
# - sirve para organizar Swagger / OpenAPI
# -------------------------------------------------------------------
router = APIRouter(
    prefix="/groups",
    tags=["Groups"]
)


def generar_codigo_union(db: Session, longitud: int = 6) -> str:
    """
    Genera un código corto y único para que otros usuarios
    puedan unirse a un grupo.

    Qué hace:
    - crea una combinación aleatoria de letras mayúsculas y números
    - comprueba si ya existe en la base de datos
    - si existe, genera otro
    - si no existe, lo devuelve

    Esto sirve para:
    - no exponer IDs largos al usuario
    - permitir unirse a un grupo con un código cómodo
    """
    caracteres = string.ascii_uppercase + string.digits

    while True:
        codigo = "".join(random.choice(caracteres) for _ in range(longitud))

        grupo_existente = db.query(Group).filter(Group.join_code == codigo).first()

        if grupo_existente is None:
            return codigo


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def crear_grupo(
    payload: CreateGroupRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Crea un grupo nuevo.

    Flujo:
    1) comprueba que el usuario está autenticado
    2) genera un join_code único
    3) crea el grupo
    4) añade al creador como admin del grupo
    5) guarda audit log
    6) devuelve la información básica del grupo

    Seguridad:
    - OWASP A01 Broken Access Control:
      solo un usuario autenticado puede crear grupos
    - OWASP A09 Logging and Monitoring Failures:
      registramos la acción en audit_logs
    """
    # Se genera un código corto para que otros usuarios
    # puedan entrar al grupo.
    join_code = generar_codigo_union(db)

    # Se crea el grupo usando como owner al usuario autenticado.
    grupo = Group(
        name=payload.name,
        join_code=join_code,
        owner_id=current_user.id,
    )

    db.add(grupo)

    # flush() fuerza a SQLAlchemy a enviar el INSERT antes del commit
    # para que ya tengamos el id del grupo disponible.
    db.flush()

    # El usuario que crea el grupo entra automáticamente
    # como administrador del grupo.
    miembro_owner = GroupMember(
        group_id=grupo.id,
        user_id=current_user.id,
        role="admin",
    )

    db.add(miembro_owner)
    db.commit()
    db.refresh(grupo)

    # Se guarda traza de la acción en la tabla de auditoría.
    write_audit_log(
        db=db,
        action="group_create",
        request=request,
        user_id=current_user.id
    )

    return GroupResponse(
        id=grupo.id,
        name=grupo.name,
        join_code=grupo.join_code,
    )


@router.post("/join", response_model=GroupResponse)
def unirse_a_grupo(
    payload: JoinGroupRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Une al usuario autenticado a un grupo mediante su join_code.

    Flujo:
    1) comprueba que el usuario está autenticado
    2) busca el grupo por código
    3) comprueba que exista
    4) comprueba que el usuario no esté ya dentro
    5) crea la relación en group_members
    6) guarda audit log
    7) devuelve la información básica del grupo

    Seguridad:
    - OWASP A01 Broken Access Control:
      solo un usuario autenticado puede unirse
    """
    # Se busca el grupo usando el código de unión.
    grupo = db.query(Group).filter(Group.join_code == payload.join_code).first()

    if grupo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grupo no encontrado",
        )

    # Se comprueba si el usuario ya pertenece al grupo.
    relacion_existente = db.query(GroupMember).filter(
        GroupMember.group_id == grupo.id,
        GroupMember.user_id == current_user.id
    ).first()

    if relacion_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya perteneces a este grupo",
        )

    # Se crea la relación como miembro normal.
    miembro = GroupMember(
        group_id=grupo.id,
        user_id=current_user.id,
        role="member",
    )

    db.add(miembro)
    db.commit()

    # Se guarda traza en auditoría.
    write_audit_log(
        db=db,
        action="group_join",
        request=request,
        user_id=current_user.id
    )

    return GroupResponse(
        id=grupo.id,
        name=grupo.name,
        join_code=grupo.join_code,
    )


@router.get("/my", response_model=list[GroupResponse])
def listar_mis_grupos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve todos los grupos a los que pertenece el usuario autenticado.

    Esto sirve para:
    - mostrar los grupos del usuario en el frontend
    - poder entrar luego al ranking del grupo
    - poder entrar luego al chat del grupo
    - permitir asociar check-ins a un grupo concreto
    """
    # Se hace un join entre groups y group_members para traer
    # solo los grupos donde está metido el usuario actual.
    grupos = db.query(Group).join(
        GroupMember,
        GroupMember.group_id == Group.id
    ).filter(
        GroupMember.user_id == current_user.id
    ).all()

    respuesta = []

    # Se construye la lista de respuesta de forma clara.
    for grupo in grupos:
        respuesta.append(
            GroupResponse(
                id=grupo.id,
                name=grupo.name,
                join_code=grupo.join_code,
            )
        )

    return respuesta