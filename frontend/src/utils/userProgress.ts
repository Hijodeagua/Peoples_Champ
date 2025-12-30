/**
 * User progress persistence using localStorage
 * Tracks agreement results, streaks, and completion history
 */

const STORAGE_KEY = "whosyurgoat_user_progress";

export interface UserProgress {
  lastAgreementPercentage: number | null;
  lastBenchmarkUsed: string | null;
  lastCompletionDate: string | null; // ISO date string (YYYY-MM-DD)
  streak: number;
  topPlayers: string[]; // Names of user's top 5 players
}

const DEFAULT_PROGRESS: UserProgress = {
  lastAgreementPercentage: null,
  lastBenchmarkUsed: null,
  lastCompletionDate: null,
  streak: 0,
  topPlayers: [],
};

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

/**
 * Check if a date string is yesterday
 */
export function isYesterday(dateString: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  return dateString === yesterdayStr;
}

/**
 * Check if a date string is today
 */
export function isToday(dateString: string): boolean {
  return dateString === getTodayDateString();
}

/**
 * Load user progress from localStorage
 */
export function loadUserProgress(): UserProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PROGRESS, ...parsed };
    }
  } catch (err) {
    console.error("Failed to load user progress:", err);
  }
  return { ...DEFAULT_PROGRESS };
}

/**
 * Save user progress to localStorage
 */
export function saveUserProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error("Failed to save user progress:", err);
  }
}

/**
 * Record a completed daily set
 * Updates streak logic: increment if yesterday, reset to 1 otherwise
 */
export function recordCompletion(
  agreementPercentage: number,
  benchmarkUsed: string,
  topPlayers: string[]
): UserProgress {
  const current = loadUserProgress();
  const today = getTodayDateString();

  // Don't update if already completed today
  if (current.lastCompletionDate === today) {
    return current;
  }

  let newStreak = 1;
  if (current.lastCompletionDate && isYesterday(current.lastCompletionDate)) {
    // Consecutive day - increment streak
    newStreak = current.streak + 1;
  }

  const updated: UserProgress = {
    lastAgreementPercentage: agreementPercentage,
    lastBenchmarkUsed: benchmarkUsed,
    lastCompletionDate: today,
    streak: newStreak,
    topPlayers: topPlayers.slice(0, 5),
  };

  saveUserProgress(updated);
  return updated;
}

/**
 * Get the user's current streak status
 * Returns 0 if streak is broken (last completion was not today or yesterday)
 */
export function getCurrentStreak(): number {
  const progress = loadUserProgress();
  
  if (!progress.lastCompletionDate) {
    return 0;
  }

  // If completed today, return current streak
  if (isToday(progress.lastCompletionDate)) {
    return progress.streak;
  }

  // If completed yesterday, streak is still valid but not incremented yet
  if (isYesterday(progress.lastCompletionDate)) {
    return progress.streak;
  }

  // Streak is broken
  return 0;
}

/**
 * Check if user has completed today's set
 */
export function hasCompletedToday(): boolean {
  const progress = loadUserProgress();
  return progress.lastCompletionDate === getTodayDateString();
}
