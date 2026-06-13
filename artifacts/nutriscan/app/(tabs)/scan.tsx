import { Ionicons } from "@expo/vector-icons";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { todayString, useFoodLog } from "@/context/FoodLogContext";
import { lookupBarcode, searchFood } from "@/services/openFoodFacts";
import { FoodNutrition } from "@/types/food";
import { useColors } from "@/hooks/useColors";

function MacroPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.macroPill, { backgroundColor: color + "22" }]}>
      <Text style={[styles.macroPillVal, { color }]}>{value}</Text>
      <Text style={[styles.macroPillLbl, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function FoodDetailModal({
  food,
  onClose,
  onAdd,
}: {
  food: FoodNutrition;
  onClose: () => void;
  onAdd: (servingG: number) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [serving, setServing] = useState(
    String(food.servingSizeG ?? 100)
  );

  const servingNum = parseFloat(serving) || 0;
  const factor = servingNum / 100;
  const cal = Math.round(food.caloriesPer100g * factor);
  const prot = Math.round(food.proteinPer100g * factor * 10) / 10;
  const carbs = Math.round(food.carbsPer100g * factor * 10) / 10;
  const fat = Math.round(food.fatPer100g * factor * 10) / 10;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalSheet}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.mutedForeground} />
          </Pressable>

          <Text
            style={[styles.foodName, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {food.name}
          </Text>
          {food.brand ? (
            <Text style={[styles.foodBrand, { color: colors.mutedForeground }]}>
              {food.brand}
            </Text>
          ) : null}

          <View style={[styles.calBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.calBadgeNum, { color: colors.accentForeground }]}>
              {cal}
            </Text>
            <Text
              style={[styles.calBadgeLbl, { color: colors.accentForeground }]}
            >
              kcal
            </Text>
          </View>

          <View style={styles.macroRow}>
            <MacroPill label="Prot" value={`${prot}g`} color="#3b82f6" />
            <MacroPill label="Glu" value={`${carbs}g`} color="#f59e0b" />
            <MacroPill label="Lip" value={`${fat}g`} color="#ef4444" />
            {food.fiberPer100g != null && (
              <MacroPill
                label="Fibres"
                value={`${Math.round(food.fiberPer100g * factor * 10) / 10}g`}
                color="#8b5cf6"
              />
            )}
          </View>

          <View
            style={[styles.servingRow, { borderTopColor: colors.border }]}
          >
            <Text
              style={[styles.servingLabel, { color: colors.foreground }]}
            >
              Portion (g)
            </Text>
            <View
              style={[
                styles.servingInput,
                { borderColor: colors.border, backgroundColor: colors.secondary },
              ]}
            >
              <TextInput
                value={serving}
                onChangeText={setServing}
                keyboardType="decimal-pad"
                style={[styles.servingInputText, { color: colors.foreground }]}
                selectTextOnFocus
              />
            </View>
          </View>

          <Pressable
            style={[styles.addFoodBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (servingNum > 0) {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                onAdd(servingNum);
              }
            }}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={colors.primaryForeground}
            />
            <Text
              style={[styles.addFoodBtnText, { color: colors.primaryForeground }]}
            >
              Ajouter au journal
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<"camera" | "search">("camera");
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodNutrition[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodNutrition | null>(null);
  const { addEntry } = useFoodLog();
  const scanTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBarcode = useCallback(
    async (result: BarcodeScanningResult) => {
      if (scanned) return;
      setScanned(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);
      const food = await lookupBarcode(result.data);
      setLoading(false);
      if (food) {
        setSelectedFood(food);
      } else {
        setMode("search");
        setQuery(result.data);
      }
      scanTimeout.current = setTimeout(() => setScanned(false), 3000);
    },
    [scanned]
  );

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    const res = await searchFood(q.trim());
    setResults(res);
    setLoading(false);
  }, []);

  const handleAdd = useCallback(
    (food: FoodNutrition, servingG: number) => {
      addEntry({
        entryId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        date: todayString(),
        name: food.name,
        brand: food.brand,
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
        fiberPer100g: food.fiberPer100g,
        servingG,
        addedAt: Date.now(),
      });
      setSelectedFood(null);
      setScanned(false);
    },
    [addEntry]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.center,
          styles.permissionContainer,
          { backgroundColor: colors.background, paddingTop: topPad },
        ]}
      >
        <Ionicons
          name="camera-outline"
          size={56}
          color={colors.mutedForeground}
        />
        <Text
          style={[styles.permissionTitle, { color: colors.foreground }]}
        >
          Accès à la caméra requis
        </Text>
        <Text
          style={[styles.permissionText, { color: colors.mutedForeground }]}
        >
          NutriScan a besoin de la caméra pour scanner les codes-barres des
          aliments.
        </Text>
        {!permission.canAskAgain ? (
          <Text
            style={[styles.permissionText, { color: colors.mutedForeground }]}
          >
            Veuillez autoriser l&apos;accès dans les Réglages de votre
            téléphone.
          </Text>
        ) : (
          <Pressable
            style={[styles.permBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text
              style={[styles.permBtnText, { color: colors.primaryForeground }]}
            >
              Autoriser la caméra
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.scanHeader, { paddingTop: topPad + 12 }]}>
        <View style={styles.modeToggle}>
          <Pressable
            style={[
              styles.modeBtn,
              mode === "camera" && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setMode("camera")}
          >
            <Ionicons
              name="barcode-outline"
              size={18}
              color={mode === "camera" ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.modeBtnText,
                {
                  color:
                    mode === "camera"
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                },
              ]}
            >
              Scanner
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.modeBtn,
              mode === "search" && { backgroundColor: colors.primary },
            ]}
            onPress={() => setMode("search")}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={mode === "search" ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.modeBtnText,
                {
                  color:
                    mode === "search"
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                },
              ]}
            >
              Rechercher
            </Text>
          </Pressable>
        </View>
      </View>

      {mode === "camera" ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: [
                "ean8",
                "ean13",
                "upc_a",
                "upc_e",
                "code128",
                "code39",
                "qr",
              ],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarcode}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame}>
              <View
                style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]}
              />
              <View
                style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]}
              />
              <View
                style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]}
              />
              <View
                style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]}
              />
            </View>
            <Text style={styles.scanHint}>
              Alignez le code-barres dans le cadre
            </Text>
          </View>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Recherche en cours...</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.mutedForeground}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Rechercher un aliment..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch(query)}
              returnKeyType="search"
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(""); setResults([]); }}>
                <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
          <Pressable
            style={[styles.searchBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleSearch(query)}
          >
            <Ionicons name="search" size={18} color={colors.primaryForeground} />
          </Pressable>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.resultItem,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedFood(item)}
                >
                  <View style={styles.resultMain}>
                    <Text
                      style={[styles.resultName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.brand ? (
                      <Text
                        style={[styles.resultBrand, { color: colors.mutedForeground }]}
                        numberOfLines={1}
                      >
                        {item.brand}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.resultCal}>
                    <Text
                      style={[styles.resultCalNum, { color: colors.primary }]}
                    >
                      {item.caloriesPer100g}
                    </Text>
                    <Text
                      style={[styles.resultCalUnit, { color: colors.mutedForeground }]}
                    >
                      kcal/100g
                    </Text>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                results.length === 0 && !loading ? (
                  <View style={styles.emptySearch}>
                    <Ionicons
                      name="search-outline"
                      size={40}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[styles.emptySearchText, { color: colors.mutedForeground }]}
                    >
                      {query.length === 0
                        ? "Tapez le nom d'un aliment"
                        : "Aucun résultat trouvé"}
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      )}

      {selectedFood && (
        <FoodDetailModal
          food={selectedFood}
          onClose={() => {
            setSelectedFood(null);
            setScanned(false);
          }}
          onAdd={(servingG) => handleAdd(selectedFood, servingG)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scanHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#00000010",
    borderRadius: 24,
    padding: 3,
    gap: 2,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cameraContainer: { flex: 1, position: "relative" },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  scanFrame: {
    width: 260,
    height: 160,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanHint: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    backgroundColor: "#00000060",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000066",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  searchContainer: { flex: 1, paddingHorizontal: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    flex: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  resultMain: { flex: 1 },
  resultName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  resultBrand: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  resultCal: { alignItems: "flex-end" },
  resultCalNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  resultCalUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  emptySearch: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptySearchText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  permissionContainer: {
    paddingHorizontal: 32,
    gap: 12,
    justifyContent: "center",
  },
  permissionTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 8,
  },
  permissionText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  permBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 8,
  },
  permBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000060",
  },
  modalSheet: {
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  foodName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
    paddingRight: 32,
  },
  foodBrand: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16 },
  calBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  calBadgeNum: { fontSize: 32, fontFamily: "Inter_700Bold" },
  calBadgeLbl: { fontSize: 14, fontFamily: "Inter_500Medium" },
  macroRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  macroPill: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
    gap: 2,
  },
  macroPillVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  macroPillLbl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  servingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 16,
    marginBottom: 16,
  },
  servingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  servingInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: "center",
  },
  servingInputText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    minWidth: 60,
  },
  addFoodBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    marginBottom: 4,
  },
  addFoodBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
