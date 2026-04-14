import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { usarAuth } from "../contexto/ContextoAuth";
import { CLAVE_ONBOARDING_VISTO } from "../utils/constantes";

/*
 * Pantalla de entrada de la app.
 *
 * Decide a dónde va el usuario:
 * 1. Si hay sesión activa → /(principal)/mapa
 * 2. Si no hay sesión pero ya vio el onboarding → /login
 * 3. Si nunca vio el onboarding → /onboarding
 *
 * Mientras carga la sesión y el estado del onboarding
 * muestra el logo como splash screen.
 */
export default function Index() {
    const { usuario, cargando } = usarAuth();
    const [onboardingVisto, setOnboardingVisto] = useState<boolean | null>(null);

    useEffect(() => {
        // Comprobar si el usuario ya vio el onboarding
        SecureStore.getItemAsync(CLAVE_ONBOARDING_VISTO).then((valor) => {
            setOnboardingVisto(valor === "true");
        });
    }, []);

    // Mostrar splash mientras carga la sesión o el estado del onboarding
    if (cargando || onboardingVisto === null) {
        return (
            <View style={styles.contenedor}>
                <Image
                    source={require("../assets/imagenes/BeerNow_marca_Logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>
        );
    }

    // Sesión activa → al mapa
    if (usuario) {
        return <Redirect href="/(principal)/mapa" />;
    }

    // Sin sesión pero onboarding ya visto → login
    if (onboardingVisto) {
        return <Redirect href="/login" />;
    }

    // Primera vez → onboarding
    return <Redirect href={"/onboarding" as never} />;
}

const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F7F4EC",
    },
    logo: {
        width: 240,
        height: 140,
    },
});
