import uuid


def generar_ip_falsa(unique: str) -> str:
    """
    Genera una IP falsa para que los tests no choquen
    con el rate limit de register y login.
    """
    return f"10.0.1.{int(unique[:2], 16) % 200 + 1}"


def test_register_user(client):
    """
    Este test comprueba que un usuario se puede registrar correctamente.
    """
    unique = uuid.uuid4().hex[:8]
    ip_falsa = generar_ip_falsa(unique)

    response = client.post(
        "/auth/register",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "username": f"testuser_{unique}",
            "email": f"test_{unique}@test.com",
            "password": "12345678"
        }
    )

    assert response.status_code == 201
    data = response.json()

    assert "email" in data
    assert "username" in data
    assert data["email"] == f"test_{unique}@test.com"
    assert data["username"] == f"testuser_{unique}"


def test_register_user_with_profile_fields(client):
    """
    Este test comprueba que el registro guarda también
    los campos extra del perfil.
    """
    unique = uuid.uuid4().hex[:8]
    ip_falsa = generar_ip_falsa(unique)

    response = client.post(
        "/auth/register",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "username": f"profile_{unique}",
            "email": f"profile_{unique}@test.com",
            "password": "12345678",
            "fecha_nacimiento": "2000-05-10",
            "pais": "España",
            "ciudad": "Sevilla"
        }
    )

    assert response.status_code == 201
    data = response.json()

    assert data["username"] == f"profile_{unique}"
    assert data["email"] == f"profile_{unique}@test.com"
    assert data["fecha_nacimiento"] == "2000-05-10"
    assert data["pais"] == "España"
    assert data["ciudad"] == "Sevilla"


def test_register_duplicate_email(client):
    """
    Este test comprueba que no se puede registrar
    dos veces el mismo email.
    """
    unique = uuid.uuid4().hex[:8]
    email = f"duplicate_{unique}@test.com"
    ip_falsa = generar_ip_falsa(unique)

    first_response = client.post(
        "/auth/register",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "username": f"user1_{unique}",
            "email": email,
            "password": "12345678"
        }
    )

    assert first_response.status_code == 201, first_response.text

    response = client.post(
        "/auth/register",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "username": f"user2_{unique}",
            "email": email,
            "password": "12345678"
        }
    )

    assert response.status_code == 409


def test_register_duplicate_username(client):
    """
    Este test comprueba que no se puede registrar
    dos veces el mismo username.
    """
    unique = uuid.uuid4().hex[:8]
    username = f"sameuser_{unique}"
    ip_falsa = generar_ip_falsa(unique)

    first_response = client.post(
        "/auth/register",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "username": username,
            "email": f"first_{unique}@test.com",
            "password": "12345678"
        }
    )

    assert first_response.status_code == 201, first_response.text

    response = client.post(
        "/auth/register",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "username": username,
            "email": f"second_{unique}@test.com",
            "password": "12345678"
        }
    )

    assert response.status_code == 409


def test_login_user(client):
    """
    Este test comprueba que un usuario registrado
    puede hacer login y recibir un token.
    """
    unique = uuid.uuid4().hex[:8]
    email = f"login_{unique}@test.com"
    username = f"loginuser_{unique}"
    ip_falsa = generar_ip_falsa(unique)

    register_response = client.post(
        "/auth/register",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "username": username,
            "email": email,
            "password": "12345678"
        }
    )

    assert register_response.status_code == 201, register_response.text

    response = client.post(
        "/auth/login",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "email": email,
            "password": "12345678"
        }
    )

    assert response.status_code == 200, response.text
    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    """
    Este test comprueba que el login falla
    si la contraseña es incorrecta.
    """
    unique = uuid.uuid4().hex[:8]
    email = f"wrong_{unique}@test.com"
    username = f"wronguser_{unique}"
    ip_falsa = generar_ip_falsa(unique)

    register_response = client.post(
        "/auth/register",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "username": username,
            "email": email,
            "password": "12345678"
        }
    )

    assert register_response.status_code == 201, register_response.text

    response = client.post(
        "/auth/login",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "email": email,
            "password": "incorrecta"
        }
    )

    assert response.status_code == 401


def test_auth_me(client):
    """
    Este test comprueba que /auth/me devuelve
    el usuario autenticado a partir del token JWT.
    """
    unique = uuid.uuid4().hex[:8]
    email = f"me_{unique}@test.com"
    username = f"meuser_{unique}"
    ip_falsa = generar_ip_falsa(unique)

    register_response = client.post(
        "/auth/register",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "username": username,
            "email": email,
            "password": "12345678",
            "fecha_nacimiento": "1999-01-15",
            "pais": "España",
            "ciudad": "Sevilla"
        }
    )

    assert register_response.status_code == 201, register_response.text

    login_response = client.post(
        "/auth/login",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "email": email,
            "password": "12345678"
        }
    )

    assert login_response.status_code == 200, login_response.text

    token = login_response.json()["access_token"]

    response = client.get(
        "/auth/me",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 200
    data = response.json()

    assert data["email"] == email
    assert data["username"] == username
    assert data["fecha_nacimiento"] == "1999-01-15"
    assert data["pais"] == "España"
    assert data["ciudad"] == "Sevilla"


# =========================================================
# TESTS DE REFRESH TOKENS
# =========================================================

def _registrar_y_hacer_login(client, unique: str) -> dict:
    """
    Helper: registra un usuario y hace login.
    Devuelve la respuesta completa del login (access_token + refresh_token).
    """
    ip_falsa = generar_ip_falsa(unique)

    client.post(
        "/auth/register",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "username": f"rt_{unique}",
            "email": f"rt_{unique}@test.com",
            "password": "12345678"
        }
    )

    login = client.post(
        "/auth/login",
        headers={"X-Forwarded-For": ip_falsa},
        json={
            "email": f"rt_{unique}@test.com",
            "password": "12345678"
        }
    )

    return login.json()


def test_login_devuelve_refresh_token(client):
    """
    Comprueba que el login devuelve access_token y refresh_token.
    """
    unique = uuid.uuid4().hex[:8]
    data = _registrar_y_hacer_login(client, unique)

    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["refresh_token"]) > 20


def test_refresh_devuelve_nuevos_tokens(client):
    """
    Comprueba que /auth/refresh devuelve un nuevo access_token
    y un nuevo refresh_token.
    """
    unique = uuid.uuid4().hex[:8]
    login_data = _registrar_y_hacer_login(client, unique)

    respuesta = client.post(
        "/auth/refresh",
        json={"refresh_token": login_data["refresh_token"]}
    )

    assert respuesta.status_code == 200, respuesta.text
    data = respuesta.json()

    assert "access_token" in data
    assert "refresh_token" in data
    # El nuevo refresh token debe ser distinto al original
    assert data["refresh_token"] != login_data["refresh_token"]


def test_refresh_token_rotacion(client):
    """
    Comprueba que el refresh token original queda revocado
    después de usarlo (rotación de tokens).
    """
    unique = uuid.uuid4().hex[:8]
    login_data = _registrar_y_hacer_login(client, unique)

    token_original = login_data["refresh_token"]

    # Primer uso: debe funcionar
    primer_uso = client.post(
        "/auth/refresh",
        json={"refresh_token": token_original}
    )
    assert primer_uso.status_code == 200, primer_uso.text

    # Segundo uso del mismo token: debe fallar porque fue revocado
    segundo_uso = client.post(
        "/auth/refresh",
        json={"refresh_token": token_original}
    )
    assert segundo_uso.status_code == 401


def test_logout_revoca_refresh_token(client):
    """
    Comprueba que /auth/logout revoca el refresh token.
    Después del logout, el refresh token no debe poder usarse.
    """
    unique = uuid.uuid4().hex[:8]
    login_data = _registrar_y_hacer_login(client, unique)

    refresh_token = login_data["refresh_token"]

    # Logout
    logout_resp = client.post(
        "/auth/logout",
        json={"refresh_token": refresh_token}
    )
    assert logout_resp.status_code == 200

    # Intentar usar el refresh token después del logout: debe fallar
    refresh_resp = client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_resp.status_code == 401


def test_refresh_token_invalido(client):
    """
    Comprueba que un refresh token inventado devuelve 401.
    """
    respuesta = client.post(
        "/auth/refresh",
        json={"refresh_token": "este_token_no_existe_en_la_base_de_datos"}
    )

    assert respuesta.status_code == 401