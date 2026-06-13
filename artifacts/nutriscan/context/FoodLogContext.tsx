import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { DailyTotals, FoodEntry } from "@/types/food";

const STORAGE_KEY = "@nutriscan_v1_log";
const PROFILE_KEY = "@nutriscan_v1_profile";

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type GoalType = "lose" | "maintain" | "gain";

export interface UserProfile {
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: GoalType;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENTS: Record<GoalType, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

export function computeGoalsFromProfile(p: UserProfile): DailyGoals {
  // Mifflin-St Jeor BMR
  const bmr =
    p.sex === "male"
      ? 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + 5
      : 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIERS[p.activityLevel];
  const calories = Math.round(tdee + GOAL_ADJUSTMENTS[p.goal]);

  // Protein: 2.2g/kg for gain, 1.8g/kg otherwise
  const protein = Math.round(p.weightKg * (p.goal === "gain" ? 2.2 : 1.8));
  // Fat: 0.9g/kg body weight
  const fat = Math.round(p.weightKg * 0.9);
  // Carbs: fill remaining calories
  const carbs = Math.max(
    Math.round((calories - protein * 4 - fat * 9) / 4),
    50
  );

  return { calories, protein, carbs, fat };
}

const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};

interface FoodLogContextValue {
  entries: FoodEntry[];
  goals: DailyGoals;
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => Promise<void>;
  addEntry: (entry: FoodEntry) => void;
  removeEntry: (entryId: string) => void;
  getEntriesForDate: (date: string) => FoodEntry[];
  getDailyTotals: (date: string) => DailyTotals;
}

const FoodLogContext = createContext<FoodLogContextValue | null>(null);

export function FoodLogProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [profile, setProfileState] = useState<UserProfile | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(PROFILE_KEY),
    ]).then(([rawLog, rawProfile]) => {
      if (rawLog) {
        try {
          setEntries(JSON.parse(rawLog));
        } catch {}
      }
      if (rawProfile) {
        try {
          setProfileState(JSON.parse(rawProfile));
        } catch {}
      }
    });
  }, []);

  const setProfile = useCallback(async (p: UserProfile) => {
    setProfileState(p);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  }, []);

  const goals = profile ? computeGoalsFromProfile(profile) : DEFAULT_GOALS;

  const addEntry = useCallback((entry: FoodEntry) => {
    setEntries((prev) => {
      const updated = [...prev, entry];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeEntry = useCallback((entryId: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.entryId !== entryId);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getEntriesForDate = useCallback(
    (date: string) => entries.filter((e) => e.date === date),
    [entries]
  );

  const getDailyTotals = useCallback(
    (date: string): DailyTotals => {
      return entries
        .filter((e) => e.date === date)
        .reduce(
          (acc, e) => {
            const f = e.servingG / 100;
            return {
              calories: acc.calories + e.caloriesPer100g * f,
              protein: acc.protein + e.proteinPer100g * f,
              carbs: acc.carbs + e.carbsPer100g * f,
              fat: acc.fat + e.fatPer100g * f,
            };
          },
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
    },
    [entries]
  );

  return (
    <FoodLogContext.Provider
      value={{
        entries,
        goals,
        profile,
        setProfile,
        addEntry,
        removeEntry,
        getEntriesForDate,
        getDailyTotals,
      }}
    >
      {children}
    </FoodLogContext.Provider>
  );
}

export function useFoodLog() {
  const ctx = useContext(FoodLogContext);
  if (!ctx) throw new Error("useFoodLog must be used within FoodLogProvider");
  return ctx;
}

export function todayString(): string {
  return new Date().toISOString().split("T")[0]!;
}

export function formatDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const date = new Date(y!, m! - 1, day!);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d === todayString()) return "Aujourd'hui";
  if (d === yesterday.toISOString().split("T")[0]) return "Hier";
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
