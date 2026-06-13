import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDate, todayString, useFoodLog } from "@/context/FoodLogContext";
import { useColors } from "@/hooks/useColors";

function CalorieRing({
  current,
  goal,
  size,
}: {
  current: number;
  goal: number;
  size: number;
}) {
  const colors = useColors();
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / goal, 1);
  const offset = circumference * (1 - progress);
  const pct = Math.round(progress * 100);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ alignItems: "center" }}>
        <Text style={[styles.ringCalories, { color: colors.foreground }]}>
          {Math.round(current)}
        </Text>
        <Text style={[styles.ringUnit, { color: colors.mutedForeground }]}>
          kcal
        </Text>
        <Text style={[styles.ringGoal, { color: colors.mutedForeground }]}>
          / {goal}
        </Text>
      </View>
    </View>
  );
}

function MacroBar({
  label,
  current,
  goal,
  color,
  unit = "g",
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
}) {
  const colors = useColors();
  const pct = Math.min(current / goal, 1);

  return (
    <View style={styles.macroBarContainer}>
      <View style={styles.macroBarHeader}>
        <Text style={[styles.macroLabel, { color: colors.foreground }]}>
          {label}
        </Text>
        <Text style={[styles.macroValue, { color: colors.mutedForeground }]}>
          {Math.round(current)}<Text style={{ fontSize: 11 }}>{unit}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}> / {goal}{unit}</Text>
        </Text>
      </View>
      <View style={[styles.macroBarBg, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.macroBarFill,
            { backgroundColor: color, width: `${pct * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { goals, getDailyTotals, getEntriesForDate } = useFoodLog();
  const today = todayString();
  const totals = getDailyTotals(today);
  const todayEntries = getEntriesForDate(today);
  const recentEntries = useMemo(
    () => [...todayEntries].sort((a, b) => b.addedAt - a.addedAt).slice(0, 5),
    [todayEntries]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            {formatDate(today)}
          </Text>
          <Text style={[styles.subGreeting, { color: colors.mutedForeground }]}>
            Suivi nutritionnel
          </Text>
        </View>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(tabs)/scan");
          }}
        >
          <Ionicons name="add" size={22} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <Animated.View
        entering={FadeInDown.delay(50).springify()}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.ringSection}>
          <CalorieRing current={totals.calories} goal={goals.calories} size={160} />
          <View style={styles.macrosSection}>
            <MacroBar
              label="Protéines"
              current={totals.protein}
              goal={goals.protein}
              color="#3b82f6"
            />
            <MacroBar
              label="Glucides"
              current={totals.carbs}
              goal={goals.carbs}
              color="#f59e0b"
            />
            <MacroBar
              label="Lipides"
              current={totals.fat}
              goal={goals.fat}
              color="#ef4444"
            />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Repas du jour
        </Text>
        {recentEntries.length > 0 && (
          <Pressable onPress={() => router.push("/(tabs)/journal")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              Voir tout
            </Text>
          </Pressable>
        )}
      </Animated.View>

      {recentEntries.length === 0 ? (
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={[styles.emptyState, { borderColor: colors.border }]}
        >
          <Ionicons name="leaf-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Aucun aliment enregistré
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Scannez un aliment pour commencer
          </Text>
          <Pressable
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/scan")}
          >
            <Ionicons name="camera-outline" size={18} color={colors.primaryForeground} />
            <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>
              Scanner
            </Text>
          </Pressable>
        </Animated.View>
      ) : (
        recentEntries.map((entry, i) => {
          const cal = Math.round((entry.caloriesPer100g * entry.servingG) / 100);
          return (
            <Animated.View
              key={entry.entryId}
              entering={FadeInDown.delay(150 + i * 40).springify()}
              style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View
                style={[styles.entryIcon, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="nutrition-outline" size={18} color={colors.accentForeground} />
              </View>
              <View style={styles.entryInfo}>
                <Text
                  style={[styles.entryName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {entry.name}
                </Text>
                {entry.brand ? (
                  <Text
                    style={[styles.entryBrand, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {entry.brand}
                  </Text>
                ) : null}
              </View>
              <View style={styles.entryCals}>
                <Text style={[styles.entryCalNum, { color: colors.foreground }]}>
                  {cal}
                </Text>
                <Text style={[styles.entryCalUnit, { color: colors.mutedForeground }]}>
                  kcal
                </Text>
              </View>
            </Animated.View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subGreeting: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  ringSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  ringCalories: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  ringUnit: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: -4 },
  ringGoal: { fontSize: 11, fontFamily: "Inter_400Regular" },
  macrosSection: { flex: 1, gap: 10 },
  macroBarContainer: { gap: 4 },
  macroBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  macroLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  macroValue: { fontSize: 12, fontFamily: "Inter_400Regular" },
  macroBarBg: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  macroBarFill: { height: 5, borderRadius: 3 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
  emptyState: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  entryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  entryInfo: { flex: 1 },
  entryName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  entryBrand: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  entryCals: { alignItems: "flex-end" },
  entryCalNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  entryCalUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
