import { API_URL } from "../utils/constantes";

/*
 * Este archivo centraliza la función base para hacer
 * peticiones HTTP al backend.
 *
 * Se deja aquí para:
 * - no repetir fetch en todos los servicios
 * - centralizar headers comunes
 * - gestionar el refresco automático de tokens al recibir un 401
 * - mantener una arquitectura más limpia
 */

type OpcionesPeticion = {
    metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    token?: string | null;
    body?: any;
    /*
     * Flag interno para evitar bucles infinitos.
     * Cuando hacerPeticion reintenta con un token renovado,
     * marca el reintento con este flag para no volver a intentar
     * el refresco si el nuevo token tampoco funciona.
     */
    _esReintento?: boolean;
};

// =========================================================
// CALLBACKS DE AUTENTICACIÓN
// =========================================================
// El contexto de autenticación (ContextoAuth) configura estos
// callbacks al montarse, de forma que hacerPeticion pueda
// renovar el token o cerrar sesión sin depender del contexto.
// =========================================================

/*
 * Callback que intenta renovar el access token usando el refresh token.
 * Devuelve el nuevo access token si tiene éxito, o null si falla.
 * Configurado por ProveedorAuth al montarse.
 */
let _callbackRefrescar: (() => Promise<string | null>) | null = null;

/*
 * Callback que cierra la sesión del usuario.
 * Se llama cuando el refresco falla (refresh token expirado o revocado).
 * Configurado por ProveedorAuth al montarse.
 */
let _callbackCerrarSesion: (() => Promise<void>) | null = null;

/*
 * Registra los callbacks de autenticación.
 * Debe llamarse desde ProveedorAuth antes de que el usuario
 * haga cualquier petición autenticada.
 */
export const configurarCallbacksAuth = (
    onRefrescar: () => Promise<string | null>,
    onCerrarSesion: () => Promise<void>
) => {
    _callbackRefrescar = onRefrescar;
    _callbackCerrarSesion = onCerrarSesion;
};

// =========================================================
// FUNCIÓN PRINCIPAL DE PETICIONES
// =========================================================

/*
 * Este método hace una petición genérica al backend.
 *
 * Parámetros:
 * - ruta: endpoint relativo, por ejemplo "/auth/login"
 * - metodo: GET, POST, PUT o DELETE
 * - token: JWT si la ruta necesita autorización
 * - body: datos a enviar en el cuerpo de la petición
 *
 * Qué hace:
 * - construye la URL final
 * - añade cabeceras necesarias
 * - añade token si existe
 * - convierte el body a JSON si hace falta
 * - intenta leer la respuesta del backend
 * - si hay un 401 y tenemos token y no es un reintento:
 *     intenta renovar el token con el refresh token
 *     y reintenta la petición original con el nuevo token
 * - si el refresco falla, cierra la sesión automáticamente
 * - si hay otro error, lanza un Error con mensaje claro
 */
export const hacerPeticion = async (
    ruta: string,
    opciones: OpcionesPeticion = {}
): Promise<any> => {
    const metodo = opciones.metodo || "GET";
    const token = opciones.token || null;
    const body = opciones.body;

    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    /*
     * Si la petición necesita autenticación,
     * se añade el token JWT en la cabecera Authorization.
     */
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const configuracion: RequestInit = {
        method: metodo,
        headers: headers
    };

    /*
     * Si hay body, se convierte a JSON.
     * En GET normalmente no se manda body.
     */
    if (body) {
        configuracion.body = JSON.stringify(body);
    }

    const respuesta = await fetch(`${API_URL}${ruta}`, configuracion);

    /*
     * Se intenta leer la respuesta como JSON.
     * Si el backend no devuelve JSON válido, se deja null.
     */
    let datos = null;

    try {
        datos = await respuesta.json();
    } catch (error) {
        datos = null;
    }

    /*
     * Si la respuesta es 401 y la petición tenía token y no es
     * un reintento, intentamos renovar el access token.
     *
     * Condiciones para intentar el refresco:
     * - código HTTP 401 (no autorizado)
     * - la petición incluía un token (evita intentar en login/register)
     * - no es ya un reintento (evita bucle infinito)
     * - los callbacks de auth están configurados
     */
    if (
        respuesta.status === 401 &&
        token &&
        !opciones._esReintento &&
        _callbackRefrescar
    ) {
        const nuevoToken = await _callbackRefrescar();

        if (nuevoToken) {
            /*
             * Tenemos un nuevo token. Reintentamos la petición original
             * con el nuevo access token. Marcamos _esReintento para no
             * volver a intentar el refresco si falla otra vez.
             */
            return hacerPeticion(ruta, {
                ...opciones,
                token: nuevoToken,
                _esReintento: true
            });
        }

        /*
         * El refresco falló (refresh token expirado o revocado).
         * Cerramos sesión automáticamente para forzar nuevo login.
         */
        if (_callbackCerrarSesion) {
            await _callbackCerrarSesion();
        }

        throw new Error("Sesión expirada. Por favor, inicia sesión de nuevo");
    }

    /*
     * Si la respuesta no ha ido bien, se intenta sacar
     * un mensaje útil del backend.
     */
    if (!respuesta.ok) {
        let mensajeError = "Ha ocurrido un error en la petición";

        if (datos) {
            if (datos.error) {
                if (datos.error.message) {
                    mensajeError = datos.error.message;
                }
            } else if (datos.detail) {
                // FastAPI puede devolver detail como string o como array de errores de validación.
                // Si es array (errores de validación Pydantic), extraemos los mensajes.
                if (Array.isArray(datos.detail)) {
                    mensajeError = datos.detail.map((d: any) => d.msg ?? d).join(", ");
                } else {
                    mensajeError = datos.detail;
                }
            }
        }

        throw new Error(mensajeError);
    }

    return datos;
};
