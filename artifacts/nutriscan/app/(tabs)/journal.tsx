import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeOutRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDate, todayString, useFoodLog } from "@/context/FoodLogContext";
import { FoodEntry } from "@/types/food";
import { useColors } from "@/hooks/useColors";

function shiftDate(base: string, delta: number): string {
  const [y, m, d] = base.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  date.setDate(date.getDate() + delta);
  return date.toISOString().split("T")[0]!;
}

function JournalEntry({
  entry,
  onDelete,
}: {
  entry: FoodEntry;
  onDelete: () => void;
}) {
  const colors = useColors();
  const cal = Math.round((entry.caloriesPer100g * entry.servingG) / 100);
  const prot = Math.round((entry.proteinPer100g * entry.servingG) / 100 * 10) / 10;
  const carbs = Math.round((entry.carbsPer100g * entry.servingG) / 100 * 10) / 10;
  const fat = Math.round((entry.fatPer100g * entry.servingG) / 100 * 10) / 10;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOutRight.springify()}
      style={[
        styles.entryCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.entryTop}>
        <View style={[styles.entryIconWrap, { backgroundColor: colors.accent }]}>
          <Ionicons name="nutrition" size={18} color={colors.accentForeground} />
        </View>
        <View style={styles.entryMain}>
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
              {entry.brand} · {entry.servingG}g
            </Text>
          ) : (
            <Text style={[styles.entryBrand, { color: colors.mutedForeground }]}>
              {entry.servingG}g
            </Text>
          )}
        </View>
        <View style={styles.entryRight}>
          <Text style={[styles.entryCal, { color: colors.foreground }]}>
            {cal}
          </Text>
          <Text style={[styles.entryCalUnit, { color: colors.mutedForeground }]}>
            kcal
          </Text>
        </View>
        <Pressable
          style={styles.deleteBtn}
          onPress={() => {
            Alert.alert(
              "Supprimer",
              `Supprimer "${entry.name}" du journal ?`,
              [
                { text: "Annuler", style: "cancel" },
                {
                  text: "Supprimer",
                  style: "destructive",
                  onPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onDelete();
                  },
                },
              ]
            );
          }}
        >
          <Ionicons
            name="trash-outline"
            size={16}
            color={colors.destructive}
          />
        </Pressable>
      </View>
      <View style={[styles.entryMacros, { borderTopColor: colors.border }]}>
        <MacroChip label="P" value={`${prot}g`} color="#3b82f6" />
        <MacroChip label="G" value={`${carbs}g`} color="#f59e0b" />
        <MacroChip label="L" value={`${fat}g`} color="#ef4444" />
      </View>
    </Animated.View>
  );
}

function MacroChip({
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
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.chipValue, { color: colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getEntriesForDate, getDailyTotals, removeEntry, goals } = useFoodLog();
  const [date, setDate] = useState(todayString());

  const entries = useMemo(
    () =>
      getEntriesForDate(date).sort((a, b) => b.addedAt - a.addedAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getEntriesForDate, date]
  );

  const totals = getDailyTotals(date);
  const isToday = date === todayString();
  const canGoForward = date < todayString();

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable
          style={styles.navBtn}
          onPress={() => setDate((d) => shiftDate(d, -1))}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.dateCenter}>
          <Text style={[styles.dateText, { color: colors.foreground }]}>
            {formatDate(date)}
          </Text>
          {isToday && (
            <View
              style={[styles.todayBadge, { backgroundColor: colors.accent }]}
            >
              <Text
                style={[styles.todayBadgeText, { color: colors.accentForeground }]}
              >
                Aujourd'hui
              </Text>
            </View>
          )}
        </View>
        <Pressable
          style={[styles.navBtn, !canGoForward && styles.navBtnDisabled]}
          onPress={() => {
            if (canGoForward) setDate((d) => shiftDate(d, 1));
          }}
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={canGoForward ? colors.foreground : colors.border}
          />
        </Pressable>
      </View>

      {entries.length > 0 && (
        <View
          style={[
            styles.totalsBar,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <TotalChip
            label="Kcal"
            value={Math.round(totals.calories)}
            goal={goals.calories}
            color={colors.primary}
          />
          <TotalChip
            label="Prot"
            value={Math.round(totals.protein)}
            goal={goals.protein}
            color="#3b82f6"
            unit="g"
          />
          <TotalChip
            label="Glu"
            value={Math.round(totals.carbs)}
            goal={goals.carbs}
            color="#f59e0b"
            unit="g"
          />
          <TotalChip
            label="Lip"
            value={Math.round(totals.fat)}
            goal={goals.fat}
            color="#ef4444"
            unit="g"
          />
        </View>
      )}

      <FlatList
        data={entries}
        keyExtractor={(item) => item.entryId}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 100 + insets.bottom,
          flexGrow: 1,
        }}
        renderItem={({ item }) => (
          <JournalEntry entry={item} onDelete={() => removeEntry(item.entryId)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="book-outline"
              size={44}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Aucun repas enregistré
            </Text>
            <Text
              style={[styles.emptyText, { color: colors.mutedForeground }]}
            >
              {isToday
                ? "Scannez un aliment pour l'ajouter"
                : "Aucun aliment ce jour-là"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function TotalChip({
  label,
  value,
  goal,
  color,
  unit = "",
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
  unit?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.totalChip}>
      <Text style={[styles.totalChipVal, { color }]}>
        {value}
        {unit}
      </Text>
      <Text style={[styles.totalChipLbl, { color: colors.mutedForeground }]}>
        {label} / {goal}{unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.3 },
  dateCenter: { flex: 1, alignItems: "center", gap: 4 },
  dateText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    textTransform: "capitalize",
  },
  todayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  totalsBar: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  totalChip: { flex: 1, alignItems: "center" },
  totalChipVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  totalChipLbl: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  entryCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  entryTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  entryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  entryMain: { flex: 1 },
  entryName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  entryBrand: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  entryRight: { alignItems: "flex-end" },
  entryCal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  entryCalUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  deleteBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  entryMacros: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 16,
  },
  chip: { flexDirection: "row", alignItems: "center", gap: 4 },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  chipValue: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
