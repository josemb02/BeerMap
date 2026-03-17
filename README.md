# BeerMap API

Backend de una aplicación social orientada a registrar consumiciones, competir en rankings y gestionar grupos con comunicación en tiempo real.

El proyecto está diseñado siguiendo buenas prácticas de desarrollo backend, seguridad y organización de código, con una arquitectura preparada para entornos reales.

---

## Descripción

BeerMap es una API REST que permite a los usuarios:

* Registrar consumiciones (check-ins)
* Participar en rankings (globales, por grupo, país o ciudad)
* Crear y gestionar grupos
* Enviar y recibir mensajes en chats de grupo
* Autenticarse de forma segura mediante JWT

---

## Arquitectura del proyecto

El backend está organizado en módulos para separar responsabilidades:

```id="arch01"
app/
├── routers/        # Define los endpoints (lo que expone la API)
├── models.py       # Define las tablas de la base de datos (ORM)
├── schemas.py      # Define cómo entran y salen los datos (validación)
├── database.py     # Conexión a la base de datos
├── auth.py         # Lógica de autenticación (JWT)
├── middleware.py   # Intercepta peticiones (ej: logs, seguridad)
├── ratelimit.py    # Limita abusos (ej: login masivo)
├── audit.py        # Guarda acciones importantes (logs)
├── config.py       # Variables de entorno
├── exceptions.py   # Manejo de errores
└── main.py         # Punto de entrada de la aplicación
```

Esto permite:

* código más limpio
* fácil mantenimiento
* escalabilidad futura

---

## Tecnologías utilizadas

### Backend

* FastAPI → framework para crear APIs rápidas y tipadas
* SQLAlchemy → ORM para interactuar con la base de datos sin SQL manual
* Pydantic → validación de datos de entrada/salida

### Base de datos

* PostgreSQL → almacena usuarios, grupos, check-ins, mensajes, etc.

### Seguridad

* JWT → identifica al usuario en cada petición
* Bcrypt → encripta las contraseñas
* Rate limiting → evita ataques por fuerza bruta
* Audit logs → registra acciones importantes

### Infraestructura

* Docker → permite ejecutar todo el proyecto en contenedores
* Docker Compose → levanta todos los servicios juntos

---

## Seguridad (explicado fácil)

El sistema protege contra problemas comunes:

* Un usuario no puede acceder a datos de otro (control de acceso)
* No se guardan contraseñas en texto plano
* No se permite hacer muchas peticiones seguidas (anti ataques)
* Todas las acciones importantes quedan registradas

---

## Autenticación

Para usar la API:

1. El usuario se registra
2. Hace login
3. Recibe un token (JWT)
4. Usa ese token en cada petición protegida

Ejemplo:

```id="auth01"
Authorization: Bearer <token>
```

Este token identifica al usuario sin tener que enviar usuario/contraseña cada vez.

---

## Endpoints principales (explicados)

### Auth

* `/auth/register`
  Crea un usuario nuevo validando datos y evitando duplicados

* `/auth/login`
  Comprueba credenciales y devuelve un token

* `/auth/me`
  Devuelve los datos del usuario autenticado

---

### Check-ins

* `/checkins`
  Permite registrar una consumición

  Internamente:

  * controla que no se haga spam (cooldown)
  * valida los datos (ubicación, precio)
  * suma puntos al usuario

* `/checkins/my-map`
  Devuelve los check-ins del usuario para mostrarlos en un mapa

---

### Rankings

* `/rankings/global`
  Ranking de todos los usuarios

* `/rankings/group/{group_id}`
  Ranking solo dentro de un grupo

* `/rankings/country/{pais}`
  Ranking por país

* `/rankings/city/{ciudad}`
  Ranking por ciudad

Todos los rankings:

* están ordenados por puntos
* usan una tabla optimizada (`user_points_total`)

---

### Grupos

* `/groups` → crear grupo
* `/groups/join` → unirse con código
* `/groups/my` → listar grupos del usuario
* `/groups/{group_id}/members` → ver miembros

---

### Chat

* `/chat/group/{group_id}`
  Permite enviar y leer mensajes

  Seguridad:

  * solo miembros del grupo pueden acceder

---

## Sistema de puntos

Cada check-in suma:

* +1 punto al usuario
* se guarda en histórico
* se actualiza una tabla optimizada (`user_points_total`)

Esto mejora el rendimiento en rankings.

---

## Variables de entorno (explicadas)

```id="env01"
DATABASE_URL=postgresql://user:password@db:5432/beermap
```

➡️ Indica cómo conectarse a la base de datos
➡️ Incluye usuario, contraseña, host y nombre de la BD

```id="env02"
JWT_SECRET=clave_super_secreta
```

➡️ Se usa para firmar los tokens JWT
➡️ Evita que alguien falsifique identidades

```id="env03"
REDIS_URL=redis://redis:6379/0
```

➡️ Conexión a Redis
➡️ Se usa para limitar peticiones y mejorar rendimiento

```id="env04"
LOGIN_MAX_ATTEMPTS=5
```

➡️ Número máximo de intentos de login

```id="env05"
CHECKIN_COOLDOWN_SECONDS=300
```

➡️ Tiempo mínimo entre check-ins (5 minutos)
➡️ Evita spam

---

## Testing

Se incluye una colección de Postman para probar la API completa:

* registro
* login
* check-ins
* grupos
* rankings
* chat

---

## Despliegue

Para ejecutar el proyecto:

```bash id="run01"
docker-compose up --build
```

Esto levanta:

* API
* base de datos PostgreSQL
* Redis

---

## Escalabilidad

El sistema está preparado para:

* añadir frontend sin cambios en backend
* escalar base de datos
* añadir cache con Redis
* dividir en microservicios

---

## Estado del proyecto

* Backend completamente funcional
* Seguridad implementada
* Infraestructura operativa
* Frontend pendiente

---

## Autor

Proyecto orientado a demostrar conocimientos reales de desarrollo backend, seguridad y arquitectura de APIs.
