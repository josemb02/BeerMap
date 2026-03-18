# Seguridad - OWASP Top 10

En este proyecto se han tenido en cuenta diferentes aspectos de seguridad basados en OWASP Top 10 tanto para aplicaciones web como APIs.

## 1. Broken Authentication
- Se utiliza autenticación basada en tokens (JWT).
- Las contraseñas no se almacenan en texto plano.
- Se implementa login y registro con validación de credenciales.

## 2. Sensitive Data Exposure
- Las contraseñas se almacenan cifradas (hash).
- No se exponen datos sensibles en las respuestas de la API.

## 3. Injection (SQL Injection)
- Se utilizan consultas parametrizadas en la base de datos.
- No se concatenan strings directamente en consultas SQL.

## 4. Broken Access Control
- Se valida el acceso a rutas protegidas mediante token.
- Solo usuarios autenticados pueden acceder a endpoints privados.

## 5. Security Misconfiguration
- Uso de variables de entorno (.env) para configuración sensible.
- Separación de entorno desarrollo/producción.

## 6. Cross-Site Scripting (XSS)
- Validación de inputs en frontend y backend.
- No se renderiza HTML sin sanitizar.

## 7. Identification and Authentication Failures
- Se requiere autenticación para acciones críticas.
- Manejo de sesiones mediante tokens seguros.

## 8. Software and Data Integrity Failures
- Uso de dependencias controladas mediante requirements.txt.
- Uso de entornos virtuales para aislar dependencias.

## 9. Security Logging and Monitoring
- Se registran errores en backend.
- Posibilidad de auditar accesos mediante logs.

## 10. API Security
- Uso de tokens en cabeceras (Authorization).
- Endpoints protegidos con validación de usuario.
- Uso de herramientas como Postman para pruebas.

---

## Conclusión

Se han aplicado buenas prácticas de seguridad siguiendo OWASP Top 10 para proteger tanto la API como la autenticación de usuarios.