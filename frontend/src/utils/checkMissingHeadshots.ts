/**
 * Utility to check which players are missing headshots
 * Run this in the browser console or as a debug tool
 */

import { hasPlayerImage } from './playerImages';

/**
 * Check a list of player names and return those missing headshots
 */
export function findMissingHeadshots(playerNames: string[]): string[] {
  return playerNames.filter(name => !hasPlayerImage(name));
}

/**
 * Get coverage statistics
 */
export function getHeadshotCoverage(playerNames: string[]): {
  total: number;
  covered: number;
  missing: number;
  coveragePercent: number;
  missingPlayers: string[];
} {
  const missing = findMissingHeadshots(playerNames);
  const covered = playerNames.length - missing.length;
  
  return {
    total: playerNames.length,
    covered,
    missing: missing.length,
    coveragePercent: Math.round((covered / playerNames.length) * 100),
    missingPlayers: missing,
  };
}

/**
 * Log missing headshots to console (for debugging)
 */
export function logMissingHeadshots(playerNames: string[]): void {
  const stats = getHeadshotCoverage(playerNames);
  
  console.log('=== Headshot Coverage Report ===');
  console.log(`Total players: ${stats.total}`);
  console.log(`With headshots: ${stats.covered}`);
  console.log(`Missing headshots: ${stats.missing}`);
  console.log(`Coverage: ${stats.coveragePercent}%`);
  console.log('\nMissing players:');
  stats.missingPlayers.forEach(name => console.log(`  - "${name}"`));
}
