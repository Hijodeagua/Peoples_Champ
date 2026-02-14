/**
 * Google Analytics 4 event tracking utility.
 *
 * GA4 is loaded via gtag.js in index.html (property G-35Q23XX9Y3).
 * This module provides typed helpers for the funnel events:
 *   start_ranking -> vote_submitted -> ranking_completed -> share_completed
 */

/* global gtag declared in index.html */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function sendEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  try {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, params);
    }
  } catch {
    // Silently ignore — analytics should never break the app
  }
}

/** Fired when the daily game loads and the user sees the first matchup. */
export function trackStartRanking(dailySetId: number, playerCount: number) {
  sendEvent("start_ranking", {
    daily_set_id: dailySetId,
    player_count: playerCount,
  });
}

/** Fired each time the user submits a vote on a matchup. */
export function trackVoteSubmitted(matchupIndex: number, totalMatchups: number) {
  sendEvent("vote_submitted", {
    matchup_index: matchupIndex,
    total_matchups: totalMatchups,
    progress_pct: Math.round(((matchupIndex + 1) / totalMatchups) * 100),
  });
}

/** Fired when the user finishes all matchups for the day. */
export function trackRankingCompleted(dailySetId: number, totalMatchups: number) {
  sendEvent("ranking_completed", {
    daily_set_id: dailySetId,
    total_matchups: totalMatchups,
  });
}

/** Fired when the user successfully shares their results. */
export function trackShareCompleted(method: "native_share" | "clipboard" | "manual_copy") {
  sendEvent("share_completed", {
    share_method: method,
  });
}

/** Fired when the user views global rankings. */
export function trackViewRankings(totalVoters: number) {
  sendEvent("view_rankings", {
    total_voters: totalVoters,
  });
}
