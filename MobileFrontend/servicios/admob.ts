// servicios/admob.ts
// Gestiona la carga y visualización del anuncio recompensado de AdMob.
// En Expo Go se usa un mock que simula el comportamiento sin código nativo.

import { Platform } from "react-native";

// Detectar si estamos en Expo Go (no hay módulos nativos de AdMob)
// __DEV__ es true tanto en Expo Go como en development builds,
// pero en Expo Go el módulo nativo no existe.
const ADMOB_DISPONIBLE = (() => {
    try {
        // Intentar acceder al módulo — falla en Expo Go, funciona en build nativo
        require("react-native-google-mobile-ads");
        return true;
    } catch {
        return false;
    }
})();

// ID real según plataforma, ID de prueba en desarrollo
const AD_UNIT_ID_REAL = Platform.OS === "ios"
    ? "ca-app-pub-6211707002961230/6608941884"
    : "ca-app-pub-6211707002961230/8100940770";

let rewardedAd: any = null;

/**
 * Precarga el anuncio recompensado para que esté listo al instante.
 * En Expo Go no hace nada (AdMob no está disponible).
 * Devuelve función de limpieza para el useEffect.
 */
export function precargarAnuncioRecompensado(): () => void {
    if (!ADMOB_DISPONIBLE) {
        // En Expo Go no hay módulo nativo — no hacer nada
        return () => {};
    }

    try {
        const {
            RewardedAd,
            RewardedAdEventType,
            TestIds,
            AdEventType,
        } = require("react-native-google-mobile-ads");

        const adUnitId = __DEV__ ? TestIds.REWARDED : AD_UNIT_ID_REAL;

        rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
            requestNonPersonalizedAdsOnly: true,
        });

        const limpiarCargado = rewardedAd.addAdEventListener(
            RewardedAdEventType.LOADED,
            () => console.log("[AdMob] Anuncio recompensado listo")
        );

        const limpiarError = rewardedAd.addAdEventListener(
            AdEventType.ERROR,
            (error: any) => console.warn("[AdMob] Error cargando anuncio:", error)
        );

        rewardedAd.load();

        return () => {
            limpiarCargado();
            limpiarError();
        };
    } catch (e) {
        console.warn("[AdMob] No disponible en este entorno:", e);
        return () => {};
    }
}

/**
 * Muestra el anuncio recompensado.
 * En Expo Go devuelve false inmediatamente (no hay módulo nativo).
 * En build nativo AdMob llama al backend SSV automáticamente.
 */
export async function mostrarAnuncioRecompensado(): Promise<boolean> {
    if (!ADMOB_DISPONIBLE || !rewardedAd) {
        console.warn("[AdMob] No disponible — usando modo desarrollo");
        return false;
    }

    return new Promise((resolve, reject) => {
        try {
            const { RewardedAdEventType, AdEventType } = require("react-native-google-mobile-ads");

            // El usuario completó el vídeo — AdMob se encarga del SSV al backend
            const limpiarRecompensa = rewardedAd.addAdEventListener(
                RewardedAdEventType.EARNED_REWARD,
                () => {
                    limpiarRecompensa();
                    resolve(true);
                }
            );

            // El usuario cerró el anuncio sin completarlo
            const limpiarCerrado = rewardedAd.addAdEventListener(
                AdEventType.CLOSED,
                () => {
                    limpiarCerrado();
                    resolve(false);
                }
            );

            rewardedAd.show().catch(reject);
        } catch (e) {
            reject(e);
        }
    });
}
