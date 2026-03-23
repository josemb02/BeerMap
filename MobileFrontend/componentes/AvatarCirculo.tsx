import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

/*
 * Componente reutilizable de avatar circular.
 *
 * Muestra la foto de perfil si existe, y si no,
 * la inicial del username con un fondo de color.
 *
 * Props:
 * - uri: URL pública de la imagen (Cloudinary). Null/undefined → inicial.
 * - username: se usa para calcular la inicial.
 * - size: tamaño en px del círculo (por defecto 36).
 * - colorFondo: color del círculo cuando no hay foto (por defecto gris claro).
 * - colorTexto: color de la inicial (por defecto azul oscuro).
 */
type Props = {
    uri?: string | null;
    username: string;
    size?: number;
    colorFondo?: string;
    colorTexto?: string;
};

export function AvatarCirculo({
    uri,
    username,
    size = 36,
    colorFondo = "#E2E8F0",
    colorTexto = "#10233E",
}: Props) {
    const radio = size / 2;
    const tamanoLetra = Math.round(size * 0.4);
    const inicial = username.charAt(0).toUpperCase();

    if (uri) {
        return (
            <Image
                source={{ uri }}
                style={[s.imagen, { width: size, height: size, borderRadius: radio }]}
                contentFit="cover"
            />
        );
    }

    return (
        <View
            style={[
                s.circulo,
                { width: size, height: size, borderRadius: radio, backgroundColor: colorFondo },
            ]}
        >
            <Text style={[s.letra, { fontSize: tamanoLetra, color: colorTexto }]}>
                {inicial}
            </Text>
        </View>
    );
}

const s = StyleSheet.create({
    imagen: { overflow: "hidden" },
    circulo: { justifyContent: "center", alignItems: "center" },
    letra: { fontWeight: "700" },
});
