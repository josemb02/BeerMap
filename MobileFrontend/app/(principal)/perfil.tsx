import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usarAuth } from "../../contexto/ContextoAuth";

// ─────────────────────────────────────────────────────────────────────────────

export default function Perfil() {
    const { usuario, cerrarSesion } = usarAuth();
    const router = useRouter();
    const [cerrando, setCerrando] = useState(false);

    async function handleCerrarSesion() {
        Alert.alert(
            "Cerrar sesión",
            "¿Seguro que quieres salir?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Salir",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setCerrando(true);
                            await cerrarSesion();
                            router.replace("/login");
                        } catch {
                            setCerrando(false);
                        }
                    }
                }
            ]
        );
    }

    if (!usuario) return null;

    const inicial = usuario.username.charAt(0).toUpperCase();

    return (
        <SafeAreaView style={s.root}>
            <ScrollView
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Avatar y nombre ── */}
                <View style={s.hero}>
                    <View style={s.avatar}>
                        <Text style={s.avatarTexto}>{inicial}</Text>
                    </View>
                    <Text style={s.nombre}>{usuario.username}</Text>
                    <Text style={s.email}>{usuario.email}</Text>
                </View>

                {/* ── Info de ubicación ── */}
                {(usuario.pais || usuario.ciudad) && (
                    <View style={s.ubicacion}>
                        <Ionicons name="location-outline" size={14} color="#9AAABB" />
                        <Text style={s.ubicacionTexto}>
                            {[usuario.ciudad, usuario.pais].filter(Boolean).join(", ")}
                        </Text>
                    </View>
                )}

                {/* ── Fecha nacimiento ── */}
                {usuario.fecha_nacimiento && (
                    <View style={s.ubicacion}>
                        <Ionicons name="calendar-outline" size={14} color="#9AAABB" />
                        <Text style={s.ubicacionTexto}>
                            {new Date(usuario.fecha_nacimiento).toLocaleDateString("es-ES", {
                                day: "numeric", month: "long", year: "numeric"
                            })}
                        </Text>
                    </View>
                )}

                <View style={s.divider} />

                {/* ── Sección cuenta ── */}
                <Text style={s.seccionLabel}>Cuenta</Text>

                <View style={s.card}>
                    <FilaInfo
                        icono="person-outline"
                        label="Usuario"
                        valor={usuario.username}
                    />
                    <View style={s.cardSep} />
                    <FilaInfo
                        icono="mail-outline"
                        label="Email"
                        valor={usuario.email}
                    />
                    {usuario.role && (
                        <>
                            <View style={s.cardSep} />
                            <FilaInfo
                                icono="shield-checkmark-outline"
                                label="Rol"
                                valor={usuario.role}
                            />
                        </>
                    )}
                </View>

                {/* ── Sección ubicación ── */}
                {(usuario.pais || usuario.ciudad) && (
                    <>
                        <Text style={s.seccionLabel}>Ubicación</Text>
                        <View style={s.card}>
                            {usuario.pais && (
                                <FilaInfo
                                    icono="earth-outline"
                                    label="País"
                                    valor={usuario.pais}
                                />
                            )}
                            {usuario.ciudad && usuario.pais && <View style={s.cardSep} />}
                            {usuario.ciudad && (
                                <FilaInfo
                                    icono="business-outline"
                                    label="Ciudad"
                                    valor={usuario.ciudad}
                                />
                            )}
                        </View>
                    </>
                )}

                {/* ── Cerrar sesión ── */}
                <Pressable
                    style={({ pressed }) => [s.btnSalir, pressed && s.btnSalirPress]}
                    onPress={handleCerrarSesion}
                    disabled={cerrando}
                >
                    {cerrando ? (
                        <ActivityIndicator color="#E53E3E" size="small" />
                    ) : (
                        <>
                            <Ionicons name="log-out-outline" size={18} color="#E53E3E" />
                            <Text style={s.btnSalirTexto}>Cerrar sesión</Text>
                        </>
                    )}
                </Pressable>

                <Text style={s.version}>BeerMap v1.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Subcomponente fila ───────────────────────────────────────────────────────

function FilaInfo({ icono, label, valor }: {
    icono: string;
    label: string;
    valor: string;
}) {
    return (
        <View style={s.filaInfo}>
            <View style={s.filaIcono}>
                <Ionicons name={icono as any} size={16} color="#6B85A8" />
            </View>
            <Text style={s.filaLabel}>{label}</Text>
            <Text style={s.filaValor} numberOfLines={1}>{valor}</Text>
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F7F4EC" },
    scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

    // Hero
    hero: { alignItems: "center", marginBottom: 10 },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#10233E",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 14,
        shadowColor: "#10233E",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    avatarTexto: { fontSize: 32, fontWeight: "700", color: "#FFFFFF" },
    nombre: { fontSize: 22, fontWeight: "700", color: "#10233E", letterSpacing: -0.5, marginBottom: 4 },
    email: { fontSize: 14, color: "#6B85A8" },

    // Ubicación pill
    ubicacion: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        marginTop: 8,
    },
    ubicacionTexto: { fontSize: 13, color: "#9AAABB" },

    divider: { height: 1, backgroundColor: "#E8E4DC", marginVertical: 24 },

    // Secciones
    seccionLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#9AAABB",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        marginBottom: 10,
        marginLeft: 4,
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        marginBottom: 20,
        shadowColor: "#10233E",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
    },
    cardSep: { height: 1, backgroundColor: "#F5F2EC", marginLeft: 48 },

    // Filas info
    filaInfo: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    filaIcono: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#F5F2EC",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    filaLabel: { fontSize: 14, color: "#6B85A8", flex: 1 },
    filaValor: { fontSize: 14, fontWeight: "600", color: "#10233E", maxWidth: "55%" },

    // Botón salir
    btnSalir: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 52,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: "#FECACA",
        backgroundColor: "#FFF5F5",
        marginBottom: 24,
    },
    btnSalirPress: { opacity: 0.7 },
    btnSalirTexto: { fontSize: 15, fontWeight: "600", color: "#E53E3E" },

    version: { fontSize: 12, color: "#C0BAB0", textAlign: "center" },
});