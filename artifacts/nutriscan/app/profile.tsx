import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ActivityLevel,
  GoalType,
  UserProfile,
  computeGoalsFromProfile,
  useFoodLog,
} from "@/context/FoodLogContext";
import { useColors } from "@/hooks/useColors";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; sub: string }[] =
  [
    { value: "sedentary", label: "Sédentaire", sub: "Bureau, peu ou pas de sport" },
    { value: "light", label: "Légèrement actif", sub: "Sport 1–3×/semaine" },
    { value: "moderate", label: "Modérément actif", sub: "Sport 3–5×/semaine" },
    { value: "active", label: "Très actif", sub: "Sport 6–7×/semaine" },
    {
      value: "very_active",
      label: "Extrêmement actif",
      sub: "Sport intense + travail physique",
    },
  ];

const GOAL_OPTIONS: { value: GoalType; label: string; sub: string; adj: string }[] =
  [
    { value: "lose", label: "Perte de poids", sub: "Déficit calorique", adj: "−500 kcal/j" },
    { value: "maintain", label: "Maintien", sub: "Équilibre calorique", adj: "±0 kcal/j" },
    { value: "gain", label: "Prise de masse", sub: "Surplus calorique", adj: "+300 kcal/j" },
  ];

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
      {title}
    </Text>
  );
}

function NumberField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
}) {
  const colors = useColors();
  const num = parseInt(value, 10);
  const dec = () => {
    const next = Math.max(num - 1, min);
    Haptics.selectionAsync();
    onChange(String(next));
  };
  const inc = () => {
    const next = Math.min(num + 1, max);
    Haptics.selectionAsync();
    onChange(String(next));
  };
  return (
    <View
      style={[
        styles.numberField,
        { backgroundColor: colors.secondary, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.numberLabel, { color: colors.foreground }]}>
        {label}
      </Text>
      <View style={styles.numberControl}>
        <Pressable
          style={[styles.stepBtn, { backgroundColor: colors.accent }]}
          onPress={dec}
        >
          <Ionicons name="remove" size={16} color={colors.foreground} />
        </Pressable>
        <View style={styles.numberInputWrap}>
          <TextInput
            style={[styles.numberInput, { color: colors.foreground }]}
            value={value}
            onChangeText={onChange}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
          />
          <Text style={[styles.numberUnit, { color: colors.mutedForeground }]}>
            {unit}
          </Text>
        </View>
        <Pressable
          style={[styles.stepBtn, { backgroundColor: colors.accent }]}
          onPress={inc}
        >
          <Ionicons name="add" size={16} color={colors.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, setProfile } = useFoodLog();

  const [sex, setSex] = useState<"male" | "female">(
    profile?.sex ?? "male"
  );
  const [age, setAge] = useState(String(profile?.age ?? 25));
  const [height, setHeight] = useState(String(profile?.heightCm ?? 175));
  const [weight, setWeight] = useState(String(profile?.weightKg ?? 70));
  const [activity, setActivity] = useState<ActivityLevel>(
    profile?.activityLevel ?? "moderate"
  );
  const [goal, setGoal] = useState<GoalType>(profile?.goal ?? "maintain");

  // Re-seed from profile if it loads after mount
  useEffect(() => {
    if (profile) {
      setSex(profile.sex);
      setAge(String(profile.age));
      setHeight(String(profile.heightCm));
      setWeight(String(profile.weightKg));
      setActivity(profile.activityLevel);
      setGoal(profile.goal);
    }
  }, [profile?.sex]);

  const previewProfile: UserProfile = {
    sex,
    age: Math.max(10, Math.min(120, parseInt(age, 10) || 25)),
    heightCm: Math.max(100, Math.min(250, parseInt(height, 10) || 175)),
    weightKg: Math.max(30, Math.min(300, parseInt(weight, 10) || 70)),
    activityLevel: activity,
    goal,
  };

  const computed = computeGoalsFromProfile(previewProfile);

  const handleSave = async () => {
    await setProfile(previewProfile);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const topPad = Platform.OS === "web" ? 20 : insets.top + 4;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>
            Retour
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Mon Profil
        </Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 40 + insets.bottom,
          gap: 8,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sex */}
        <SectionTitle title="SEXE" />
        <View style={styles.sexRow}>
          {(["male", "female"] as const).map((s) => (
            <Pressable
              key={s}
              style={[
                styles.sexBtn,
                {
                  backgroundColor:
                    sex === s ? colors.primary : colors.secondary,
                  borderColor: sex === s ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setSex(s);
              }}
            >
              <Ionicons
                name={s === "male" ? "male" : "female"}
                size={18}
                color={sex === s ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.sexLabel,
                  {
                    color:
                      sex === s
                        ? colors.primaryForeground
                        : colors.foreground,
                  },
                ]}
              >
                {s === "male" ? "Homme" : "Femme"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Numbers */}
        <SectionTitle title="MENSURATIONS" />
        <NumberField
          label="Âge"
          unit="ans"
          value={age}
          onChange={setAge}
          min={10}
          max={120}
        />
        <NumberField
          label="Taille"
          unit="cm"
          value={height}
          onChange={setHeight}
          min={100}
          max={250}
        />
        <NumberField
          label="Poids"
          unit="kg"
          value={weight}
          onChange={setWeight}
          min={30}
          max={300}
        />

        {/* Activity */}
        <SectionTitle title="NIVEAU D'ACTIVITÉ" />
        <View
          style={[
            styles.optionGroup,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {ACTIVITY_OPTIONS.map((opt, i) => (
            <Pressable
              key={opt.value}
              style={[
                styles.optionRow,
                i < ACTIVITY_OPTIONS.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setActivity(opt.value);
              }}
            >
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                  {opt.label}
                </Text>
                <Text
                  style={[styles.optionSub, { color: colors.mutedForeground }]}
                >
                  {opt.sub}
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor:
                      activity === opt.value
                        ? colors.primary
                        : colors.border,
                    backgroundColor:
                      activity === opt.value
                        ? colors.primary
                        : "transparent",
                  },
                ]}
              >
                {activity === opt.value && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: colors.primaryForeground },
                    ]}
                  />
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Goal */}
        <SectionTitle title="OBJECTIF" />
        <View
          style={[
            styles.optionGroup,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {GOAL_OPTIONS.map((opt, i) => (
            <Pressable
              key={opt.value}
              style={[
                styles.optionRow,
                i < GOAL_OPTIONS.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setGoal(opt.value);
              }}
            >
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                  {opt.label}
                </Text>
                <Text
                  style={[styles.optionSub, { color: colors.mutedForeground }]}
                >
                  {opt.sub}
                </Text>
              </View>
              <View style={styles.optionRight}>
                <Text
                  style={[
                    styles.adjLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {opt.adj}
                </Text>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor:
                        goal === opt.value ? colors.primary : colors.border,
                      backgroundColor:
                        goal === opt.value ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {goal === opt.value && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: colors.primaryForeground },
                      ]}
                    />
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Computed goals preview */}
        <SectionTitle title="OBJECTIFS CALCULÉS" />
        <View
          style={[
            styles.goalsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <GoalItem label="Calories" value={`${computed.calories}`} unit="kcal" colors={colors} accent />
          <View style={[styles.goalsDivider, { backgroundColor: colors.border }]} />
          <View style={styles.goalsRow}>
            <GoalItem label="Protéines" value={`${computed.protein}`} unit="g" colors={colors} />
            <View style={[styles.goalsDividerV, { backgroundColor: colors.border }]} />
            <GoalItem label="Glucides" value={`${computed.carbs}`} unit="g" colors={colors} />
            <View style={[styles.goalsDividerV, { backgroundColor: colors.border }]} />
            <GoalItem label="Lipides" value={`${computed.fat}`} unit="g" colors={colors} />
          </View>
        </View>

        {/* Save */}
        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark" size={20} color={colors.primaryForeground} />
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
            Sauvegarder
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GoalItem({
  label,
  value,
  unit,
  colors,
  accent = false,
}: {
  label: string;
  value: string;
  unit: string;
  colors: ReturnType<typeof useColors>;
  accent?: boolean;
}) {
  return (
    <View style={styles.goalItem}>
      <Text style={[styles.goalValue, { color: colors.foreground, fontSize: accent ? 26 : 20 }]}>
        {value}
        <Text style={[styles.goalUnit, { color: colors.mutedForeground, fontSize: accent ? 14 : 12 }]}>
          {" "}{unit}
        </Text>
      </Text>
      <Text style={[styles.goalLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    width: 80,
    gap: 2,
  },
  backLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 4,
  },
  sexRow: { flexDirection: "row", gap: 10 },
  sexBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  sexLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  numberField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  numberLabel: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },
  numberControl: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  numberInputWrap: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  numberInput: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    minWidth: 44,
  },
  numberUnit: { fontSize: 13, fontFamily: "Inter_400Regular" },
  optionGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  optionRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  adjLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  goalsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  goalItem: { flex: 1, alignItems: "center", paddingVertical: 14 },
  goalValue: { fontFamily: "Inter_700Bold" },
  goalUnit: { fontFamily: "Inter_400Regular" },
  goalLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  goalsDivider: { height: 1 },
  goalsDividerV: { width: 1, alignSelf: "stretch" },
  goalsRow: { flexDirection: "row" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
