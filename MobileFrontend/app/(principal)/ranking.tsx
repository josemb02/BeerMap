import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usarAuth } from "../../contexto/ContextoAuth";
import { hacerPeticion } from "../../servicios/api";
import { AvatarCirculo } from "../../componentes/AvatarCirculo";

type EntradaRanking = {
    user_id: string;
    username: string;
    points: number;
};

type Grupo = {
    id: string;
    name: string;
    join_code: string;
};

type TabRanking = "global" | "grupo" | "pais" | "ciudad";

// ─────────────────────────────────────────────────────────────────────────────

export default function Ranking() {
    const { token, usuario } = usarAuth();

    const [tab, setTab] = useState<TabRanking>("global");
    const [ranking, setRanking] = useState<EntradaRanking[]>([]);
    const [grupos, setGrupos] = useState<Grupo[]>([]);
    const [grupoActivo, setGrupoActivo] = useState<Grupo | null>(null);
    const [cargando, setCargando] = useState(true);

    useFocusEffect(
        useCallback(() => {
            cargarGrupos();
            cargarRanking("global", null);
        }, [token])
    );

    async function cargarGrupos() {
        if (!token) return;
        try {
            const datos = await hacerPeticion("/groups/my", { metodo: "GET", token });
            setGrupos(datos);
        } catch { setGrupos([]); }
    }

    async function cargarRanking(tipo: TabRanking, grupo: Grupo | null) {
        if (!token) return;
        try {
            setCargando(true);
            let ruta = "/rankings/global";

            if (tipo === "grupo" && grupo) {
                ruta = `/rankings/group/${grupo.id}`;
            } else if (tipo === "pais" && usuario?.pais) {
                ruta = `/rankings/country/${encodeURIComponent(usuario.pais)}`;
            } else if (tipo === "ciudad" && usuario?.ciudad) {
                ruta = `/rankings/city/${encodeURIComponent(usuario.ciudad)}`;
            }

            const datos = await hacerPeticion(ruta, { metodo: "GET", token });
            setRanking(datos);
        } catch { setRanking([]); }
        finally { setCargando(false); }
    }

    function cambiarTab(nuevoTab: TabRanking, grupo?: Grupo) {
        setTab(nuevoTab);
        if (nuevoTab === "grupo" && grupo) setGrupoActivo(grupo);
        cargarRanking(nuevoTab, grupo || grupoActivo);
    }

    const miPosicion = ranking.findIndex(r => r.user_id === usuario?.id);

    return (
        <SafeAreaView style={s.root}>

            {/* Cabecera */}
            <View style={s.header}>
                <Text style={s.headerTitulo}>Ranking</Text>
                {miPosicion >= 0 && (
                    <View style={s.miPosicionBadge}>
                        <Text style={s.miPosicionTexto}>#{miPosicion + 1}</Text>
                    </View>
                )}
            </View>

            {/* Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.tabsScroll}
                style={s.tabsWrapper}
            >
                <TabBtn label="Global" activo={tab === "global"} onPress={() => cambiarTab("global")} />
                {usuario?.pais && (
                    <TabBtn label={usuario.pais} activo={tab === "pais"} onPress={() => cambiarTab("pais")} />
                )}
                {usuario?.ciudad && (
                    <TabBtn label={usuario.ciudad} activo={tab === "ciudad"} onPress={() => cambiarTab("ciudad")} />
                )}
                {grupos.map(g => (
                    <TabBtn
                        key={g.id}
                        label={g.name}
                        activo={tab === "grupo" && grupoActivo?.id === g.id}
                        onPress={() => cambiarTab("grupo", g)}
                        icono="people-outline"
                    />
                ))}
            </ScrollView>

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
                    data={ranking.slice(3)}
                    keyExtractor={item => item.user_id}
                    contentContainerStyle={s.lista}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }) => (
                        <FilaRanking
                            entrada={item}
                            posicion={index + 4}
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

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({ label, activo, onPress, icono }: {
    label: string;
    activo: boolean;
    onPress: () => void;
    icono?: string;
}) {
    return (
        <Pressable
            style={[s.tab, activo && s.tabActivo]}
            onPress={onPress}
        >
            {icono && (
                <Ionicons
                    name={icono as any}
                    size={12}
                    color={activo ? "#FFFFFF" : "#6B85A8"}
                    style={{ marginRight: 4 }}
                />
            )}
            <Text style={[s.tabLabel, activo && s.tabLabelActivo]}>{label}</Text>
        </Pressable>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F7F4EC" },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
    },
    headerTitulo: { fontSize: 22, fontWeight: "700", color: "#10233E", letterSpacing: -0.5 },
    miPosicionBadge: {
        backgroundColor: "#10233E",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    miPosicionTexto: { fontSize: 13, fontWeight: "700", color: "#F7C948" },

    tabsWrapper: { maxHeight: 44, marginBottom: 16 },
    tabsScroll: { paddingHorizontal: 24, gap: 8 },
    tab: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#FFFFFF",
    },
    tabActivo: { backgroundColor: "#10233E", borderColor: "#10233E" },
    tabLabel: { fontSize: 13, fontWeight: "600", color: "#6B85A8" },
    tabLabelActivo: { color: "#FFFFFF" },

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
    podioAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#E2E8F0",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 6,
    },
    podioAvatarMio: { backgroundColor: "#10233E" },
    podioAvatarTexto: { fontSize: 18, fontWeight: "700", color: "#10233E" },
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
    filaAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#E2E8F0",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    filaAvatarMio: { backgroundColor: "#10233E" },
    filaAvatarTexto: { fontSize: 14, fontWeight: "700", color: "#10233E" },
    filaAvatarTextoMio: { color: "#FFFFFF" },
    filaUsername: { flex: 1, fontSize: 15, fontWeight: "600", color: "#10233E" },
    filaUsernameMio: { color: "#10233E" },
    filaPuntos: { fontSize: 15, fontWeight: "700", color: "#10233E" },
    filaPuntosMios: { color: "#10233E" },
    filaPtsSuffix: { fontSize: 11, fontWeight: "400", color: "#9AAABB" },
});