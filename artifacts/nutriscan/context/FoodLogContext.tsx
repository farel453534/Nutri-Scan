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

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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
  addEntry: (entry: FoodEntry) => void;
  removeEntry: (entryId: string) => void;
  getEntriesForDate: (date: string) => FoodEntry[];
  getDailyTotals: (date: string) => DailyTotals;
}

const FoodLogContext = createContext<FoodLogContextValue | null>(null);

export function FoodLogProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [goals] = useState<DailyGoals>(DEFAULT_GOALS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setEntries(JSON.parse(raw));
        } catch {
          // ignore
        }
      }
    });
  }, []);

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
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d === todayString()) return "Aujourd'hui";
  if (
    d ===
    yesterday.toISOString().split("T")[0]
  )
    return "Hier";
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
