import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDate, todayString, useFoodLog } from "@/context/FoodLogContext";
import { FoodEntry } from "@/types/food";
import { useColors } from "@/hooks/useColors";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function dateToString(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday = 0 offset (French calendar)
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function DayCell({
  date,
  isSelected,
  isToday,
  hasEntries,
  totalCal,
  onPress,
}: {
  date: Date | null;
  isSelected: boolean;
  isToday: boolean;
  hasEntries: boolean;
  totalCal: number;
  onPress: () => void;
}) {
  const colors = useColors();

  if (!date) {
    return <View style={styles.dayCell} />;
  }

  return (
    <Pressable
      style={[
        styles.dayCell,
        isSelected && { backgroundColor: colors.primary, borderRadius: 12 },
        !isSelected && isToday && {
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: colors.primary,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.dayNum,
          { color: isSelected ? colors.primaryForeground : colors.foreground },
          isToday && !isSelected && { fontFamily: "Inter_700Bold" },
        ]}
      >
        {date.getDate()}
      </Text>
      {hasEntries ? (
        <View
          style={[
            styles.dayDot,
            {
              backgroundColor: isSelected
                ? colors.primaryForeground
                : colors.mutedForeground,
            },
          ]}
        />
      ) : (
        <View style={styles.dayDotEmpty} />
      )}
    </Pressable>
  );
}

function EntryRow({
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
      style={[styles.entryRow, { borderBottomColor: colors.border }]}
    >
      <View style={styles.entryMain}>
        <Text
          style={[styles.entryName, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {entry.name}
        </Text>
        <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>
          {entry.servingG}g
          {entry.brand ? ` · ${entry.brand}` : ""}
          {" · "}
          <Text style={{ color: colors.mutedForeground }}>
            P {prot}g · G {carbs}g · L {fat}g
          </Text>
        </Text>
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
        onPress={() =>
          Alert.alert("Supprimer", `Supprimer "${entry.name}" ?`, [
            { text: "Annuler", style: "cancel" },
            {
              text: "Supprimer",
              style: "destructive",
              onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onDelete();
              },
            },
          ])
        }
      >
        <Ionicons name="trash-outline" size={15} color={colors.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { entries, getDailyTotals, getEntriesForDate, removeEntry } = useFoodLog();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayString());

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const daysWithEntries = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.date));
    return set;
  }, [entries]);

  const selectedEntries = useMemo(
    () =>
      getEntriesForDate(selectedDate).sort((a, b) => b.addedAt - a.addedAt),
    [getEntriesForDate, selectedDate]
  );
  const selectedTotals = getDailyTotals(selectedDate);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth()) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }
  const canGoForward = !(year === today.getFullYear() && month === today.getMonth());

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable style={styles.navBtn} onPress={prevMonth}>
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.monthTitle, { color: colors.foreground }]}>
          {MONTHS_FR[month]} {year}
        </Text>
        <Pressable
          style={[styles.navBtn, !canGoForward && { opacity: 0.3 }]}
          onPress={nextMonth}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* Weekday headers */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <View key={i} style={styles.weekCell}>
              <Text style={[styles.weekLabel, { color: colors.mutedForeground }]}>
                {d}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={[styles.calGrid, { borderTopColor: colors.border }]}>
          {grid.map((date, i) => {
            const ds = date ? dateToString(date) : null;
            const isSelected = ds === selectedDate;
            const isToday = ds === todayString();
            const hasEntries = ds ? daysWithEntries.has(ds) : false;
            const cal = ds ? Math.round(getDailyTotals(ds).calories) : 0;

            return (
              <DayCell
                key={i}
                date={date}
                isSelected={isSelected}
                isToday={isToday}
                hasEntries={hasEntries}
                totalCal={cal}
                onPress={() => {
                  if (date) {
                    Haptics.selectionAsync();
                    setSelectedDate(dateToString(date));
                  }
                }}
              />
            );
          })}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Selected day entries */}
        <View style={styles.daySection}>
          <View style={styles.daySectionHeader}>
            <Text style={[styles.daySectionTitle, { color: colors.foreground }]}>
              {formatDate(selectedDate)}
            </Text>
            {selectedEntries.length > 0 && (
              <View
                style={[styles.calBadge, { backgroundColor: colors.secondary }]}
              >
                <Text style={[styles.calBadgeText, { color: colors.foreground }]}>
                  {Math.round(selectedTotals.calories)} kcal
                </Text>
              </View>
            )}
          </View>

          {selectedEntries.length > 0 ? (
            <View
              style={[
                styles.entriesCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {selectedEntries.map((entry) => (
                <EntryRow
                  key={entry.entryId}
                  entry={entry}
                  onDelete={() => removeEntry(entry.entryId)}
                />
              ))}

              {/* Macros summary */}
              <View
                style={[
                  styles.macroSummary,
                  { backgroundColor: colors.secondary },
                ]}
              >
                {[
                  { label: "Protéines", value: selectedTotals.protein },
                  { label: "Glucides", value: selectedTotals.carbs },
                  { label: "Lipides", value: selectedTotals.fat },
                ].map((m) => (
                  <View key={m.label} style={styles.macroSummaryItem}>
                    <Text
                      style={[styles.macroSumVal, { color: colors.foreground }]}
                    >
                      {Math.round(m.value)}g
                    </Text>
                    <Text
                      style={[
                        styles.macroSumLbl,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyDay}>
              <Ionicons
                name="calendar-outline"
                size={32}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Aucun repas enregistré ce jour
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  weekRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  weekCell: {
    flex: 1,
    alignItems: "center",
  },
  weekLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  dayNum: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  dayDotEmpty: {
    width: 5,
    height: 5,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 16,
  },
  daySection: {
    paddingHorizontal: 16,
  },
  daySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  daySectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textTransform: "capitalize",
  },
  calBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  calBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  entriesCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  entryMain: { flex: 1 },
  entryName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  entryMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  entryRight: { alignItems: "flex-end" },
  entryCal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  entryCalUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  deleteBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  macroSummary: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 0,
  },
  macroSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  macroSumVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  macroSumLbl: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyDay: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
