import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { usarAuth } from "../../contexto/ContextoAuth";
import { hacerPeticion } from "../../servicios/api";
import { AvatarCirculo } from "../../componentes/AvatarCirculo";

type EntradaRanking = {
    user_id: string;
    username: string;
    points: number;
};

// Ámbito: colectivo del ranking
type Ambito = "global" | "pais" | "ciudad";

// Período: ventana de tiempo
type Periodo = "historico" | "semana" | "mes";

// ─────────────────────────────────────────────────────────────────────────────

export default function Ranking() {
    const { token, usuario } = usarAuth();

    const [ambito,  setAmbito]  = useState<Ambito>("global");
    const [periodo, setPeriodo] = useState<Periodo>("historico");
    const [ranking, setRanking] = useState<EntradaRanking[]>([]);
    const [cargando, setCargando] = useState(true);

    useFocusEffect(
        useCallback(() => {
            cargarRanking("global", "historico");
        }, [token])
    );

    /*
     * Construye la URL del endpoint combinando ámbito y período.
     * Todas las combinaciones tienen endpoint propio en el backend.
     */
    function calcularRuta(a: Ambito, p: Periodo): string {
        const sufijo = p === "semana" ? "/weekly" : p === "mes" ? "/monthly" : "";

        if (a === "pais" && usuario?.pais) {
            return `/rankings/country/${encodeURIComponent(usuario.pais)}${sufijo}`;
        }
        if (a === "ciudad" && usuario?.ciudad) {
            return `/rankings/city/${encodeURIComponent(usuario.ciudad)}${sufijo}`;
        }
        return `/rankings/global${sufijo}`;
    }

    async function cargarRanking(a: Ambito, p: Periodo) {
        if (!token) return;
        try {
            setCargando(true);
            const datos = await hacerPeticion(calcularRuta(a, p), { metodo: "GET", token });
            setRanking(datos);
        } catch (e: any) {
            console.error("[Ranking] Error:", e?.message ?? e);
            setRanking([]);
        } finally {
            setCargando(false);
        }
    }

    function cambiarAmbito(a: Ambito) {
        setAmbito(a);
        cargarRanking(a, periodo);
    }

    function cambiarPeriodo(p: Periodo) {
        setPeriodo(p);
        cargarRanking(ambito, p);
    }

    const miPosicion = ranking.findIndex(r => r.user_id === usuario?.id);
    // "Fuera del top 100" solo cuando el período no es histórico y hay datos pero el usuario no aparece
    const fueraDelTop = miPosicion < 0 && ranking.length > 0 && periodo !== "historico";

    // Tabs de ámbito: siempre Global, más País y Ciudad si el usuario los tiene
    const tabsAmbito: { key: Ambito; label: string }[] = [
        { key: "global", label: "Global" },
        ...(usuario?.pais   ? [{ key: "pais"   as Ambito, label: usuario.pais }]   : []),
        ...(usuario?.ciudad ? [{ key: "ciudad" as Ambito, label: usuario.ciudad }] : []),
    ];

    return (
        <SafeAreaView style={s.root}>

            {/* Cabecera */}
            <View style={s.header}>
                <Text style={s.headerTitulo}>Ranking</Text>
                {miPosicion >= 0 ? (
                    <View style={s.miPosicionBadge}>
                        <Text style={s.miPosicionTexto}>#{miPosicion + 1}</Text>
                    </View>
                ) : fueraDelTop ? (
                    <View style={s.fueraBadge}>
                        <Text style={s.fueraBadgeTexto}>Fuera del top 100</Text>
                    </View>
                ) : null}
            </View>

            {/* Fila 1 — Ámbito centrado */}
            <View style={s.ambitoFila}>
                {tabsAmbito.map(({ key, label }) => (
                    <Pressable
                        key={key}
                        style={[s.ambitoTab, ambito === key && s.ambitoTabActivo]}
                        onPress={() => cambiarAmbito(key)}
                    >
                        <Text style={[s.ambitoLabel, ambito === key && s.ambitoLabelActivo]}>
                            {label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Fila 2 — Período (segmentado, siempre visible) */}
            <View style={s.periodoContenedor}>
                <PeriodoBtn label="Histórico"   activo={periodo === "historico"} onPress={() => cambiarPeriodo("historico")} />
                <PeriodoBtn label="Esta semana" activo={periodo === "semana"}    onPress={() => cambiarPeriodo("semana")} />
                <PeriodoBtn label="Este mes"    activo={periodo === "mes"}       onPress={() => cambiarPeriodo("mes")} />
            </View>

            {/* Podio top 3 */}
            {!cargando && ranking.length >= 3 && (
                <Podio top3={ranking.slice(0, 3)} miId={usuario?.id} avatarUri={usuario?.avatar_url} />
            )}

            {/* Lista */}
            {cargando ? (
                <View style={s.centrado}>
                    <ActivityIndicator color="#10233E" />
                </View>
            ) : ranking.length === 0 ? (
                <View style={s.centrado}>
                    <Text style={s.emptyTitulo}>Sin datos aún</Text>
                    <Text style={s.emptyTexto}>Registra cervezas para aparecer aquí</Text>
                </View>
            ) : (
                <FlatList
                    data={ranking.length >= 3 ? ranking.slice(3) : ranking}
                    keyExtractor={item => item.user_id}
                    contentContainerStyle={s.lista}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }) => (
                        <FilaRanking
                            entrada={item}
                            posicion={index + (ranking.length >= 3 ? 4 : 1)}
                            esMio={item.user_id === usuario?.id}
                            avatarUri={usuario?.avatar_url}
                        />
                    )}
                    ItemSeparatorComponent={() => <View style={s.separador} />}
                />
            )}
        </SafeAreaView>
    );
}

// ─── Podio ────────────────────────────────────────────────────────────────────

function Podio({ top3, miId, avatarUri }: {
    top3: EntradaRanking[];
    miId?: string;
    avatarUri?: string | null;
}) {
    const orden = [top3[1], top3[0], top3[2]]; // 2º - 1º - 3º
    const alturas = [72, 96, 56];
    const medallas = ["🥈", "🥇", "🥉"];
    const posiciones = [2, 1, 3];

    return (
        <View style={s.podio}>
            {orden.map((entrada, i) => {
                const esMio = entrada.user_id === miId;
                return (
                    <View key={entrada.user_id} style={s.podioColumna}>
                        <Text style={s.podioMedalla}>{medallas[i]}</Text>
                        <AvatarCirculo
                            uri={esMio ? avatarUri : null}
                            username={entrada.username}
                            size={44}
                            colorFondo={esMio ? "#10233E" : "#E2E8F0"}
                            colorTexto={esMio ? "#FFFFFF" : "#10233E"}
                        />
                        <Text style={s.podioNombre} numberOfLines={1}>{entrada.username}</Text>
                        <Text style={s.podioPuntos}>{entrada.points} pts</Text>
                        <View style={[s.podioBase, { height: alturas[i] }]}>
                            <Text style={s.podioPos}>#{posiciones[i]}</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

// ─── Fila ranking ─────────────────────────────────────────────────────────────

function FilaRanking({ entrada, posicion, esMio, avatarUri }: {
    entrada: EntradaRanking;
    posicion: number;
    esMio: boolean;
    avatarUri?: string | null;
}) {
    return (
        <View style={[s.fila, esMio && s.filaMia]}>
            <Text style={s.filaPosicion}>{String(posicion).padStart(2, "0")}</Text>
            <AvatarCirculo
                uri={esMio ? avatarUri : null}
                username={entrada.username}
                size={36}
                colorFondo={esMio ? "#10233E" : "#E2E8F0"}
                colorTexto={esMio ? "#FFFFFF" : "#10233E"}
                style={{ marginRight: 12 }}
            />
            <Text style={[s.filaUsername, esMio && s.filaUsernameMio]} numberOfLines={1}>
                {entrada.username}
            </Text>
            <Text style={[s.filaPuntos, esMio && s.filaPuntosMios]}>
                {entrada.points} <Text style={s.filaPtsSuffix}>pts</Text>
            </Text>
        </View>
    );
}

// ─── Botón período (segmentado) ───────────────────────────────────────────────

function PeriodoBtn({ label, activo, onPress }: {
    label: string; activo: boolean; onPress: () => void;
}) {
    return (
        <Pressable style={[s.periodoTab, activo && s.periodoTabActivo]} onPress={onPress}>
            <Text style={[s.periodoLabel, activo && s.periodoLabelActivo]}>{label}</Text>
        </Pressable>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F7F4EC" },

    // Cabecera
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 14,
    },
    headerTitulo: { fontSize: 22, fontWeight: "700", color: "#10233E", letterSpacing: -0.5 },
    miPosicionBadge: {
        backgroundColor: "#10233E",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    miPosicionTexto: { fontSize: 13, fontWeight: "700", color: "#F7C948" },
    fueraBadge: {
        backgroundColor: "#F0EDE6",
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    fueraBadgeTexto: { fontSize: 11, fontWeight: "600", color: "#9AAABB" },

    // Fila ámbito — centrada horizontalmente
    ambitoFila: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 24,
        marginBottom: 10,
    },
    ambitoTab: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#FFFFFF",
    },
    ambitoTabActivo: { backgroundColor: "#10233E", borderColor: "#10233E" },
    ambitoLabel: { fontSize: 13, fontWeight: "600", color: "#6B85A8" },
    ambitoLabelActivo: { color: "#FFFFFF" },

    // Control segmentado de período
    periodoContenedor: {
        flexDirection: "row",
        marginHorizontal: 24,
        marginBottom: 16,
        backgroundColor: "#EEEBE3",
        borderRadius: 12,
        padding: 3,
    },
    periodoTab: {
        flex: 1,
        paddingVertical: 7,
        borderRadius: 10,
        alignItems: "center",
    },
    periodoTabActivo: {
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    periodoLabel: { fontSize: 12, fontWeight: "600", color: "#9AAABB" },
    periodoLabelActivo: { color: "#10233E" },

    // Podio
    podio: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end",
        paddingHorizontal: 24,
        marginBottom: 24,
        gap: 8,
    },
    podioColumna: { flex: 1, alignItems: "center" },
    podioMedalla: { fontSize: 20, marginBottom: 4 },
    podioNombre: { fontSize: 12, fontWeight: "600", color: "#10233E", marginBottom: 2, maxWidth: 80 },
    podioPuntos: { fontSize: 11, color: "#6B85A8", marginBottom: 6 },
    podioBase: {
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    podioPos: { fontSize: 13, fontWeight: "700", color: "#9AAABB" },

    // Lista
    centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyTitulo: { fontSize: 16, fontWeight: "600", color: "#10233E", marginBottom: 6 },
    emptyTexto: { fontSize: 13, color: "#6B85A8" },
    lista: { paddingHorizontal: 24, paddingBottom: 30 },
    separador: { height: 1, backgroundColor: "#F0EDE6", marginLeft: 52 },

    fila: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
    },
    filaMia: {
        backgroundColor: "#F0F4FF",
        marginHorizontal: -24,
        paddingHorizontal: 24,
        borderRadius: 10,
    },
    filaPosicion: { fontSize: 12, fontWeight: "600", color: "#B0BAC8", width: 28 },
    filaUsername: { flex: 1, fontSize: 15, fontWeight: "600", color: "#10233E" },
    filaUsernameMio: { color: "#10233E" },
    filaPuntos: { fontSize: 15, fontWeight: "700", color: "#10233E" },
    filaPuntosMios: { color: "#10233E" },
    filaPtsSuffix: { fontSize: 11, fontWeight: "400", color: "#9AAABB" },
});
