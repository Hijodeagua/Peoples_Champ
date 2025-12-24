import { api } from "./client";

export interface PlayerStats {
  // Core per-game stats
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  // Shooting percentages
  three_pct: number | null;
  ft_pct: number | null;
  efg_pct: number | null;
  // Other
  tov: number | null;
  mpg: number | null;
  games: number | null;
  pos_count: number | null;  // Total players at this position
  // Percentiles (0-100)
  pts_pctl: number | null;
  reb_pctl: number | null;
  ast_pctl: number | null;
  stl_pctl: number | null;
  blk_pctl: number | null;
  three_pctl: number | null;
  ft_pctl: number | null;
  efg_pctl: number | null;
  tov_pctl: number | null;
  // Position ranks (1 = best at position)
  pts_pos_rank: number | null;
  reb_pos_rank: number | null;
  ast_pos_rank: number | null;
  stl_pos_rank: number | null;
  blk_pos_rank: number | null;
  three_pos_rank: number | null;
  ft_pos_rank: number | null;
  efg_pos_rank: number | null;
  tov_pos_rank: number | null;
  // Position-based top stats to highlight
  top_stats: string[] | null;
}

export interface AdvancedStats {
  // Advanced metrics from BBRef
  per: number | null;           // Player Efficiency Rating
  ts_pct: number | null;        // True Shooting %
  usg_pct: number | null;       // Usage %
  ws: number | null;            // Win Shares
  ws_48: number | null;         // Win Shares per 48
  ows: number | null;           // Offensive Win Shares
  dws: number | null;           // Defensive Win Shares
  obpm: number | null;          // Offensive Box Plus/Minus
  dbpm: number | null;          // Defensive Box Plus/Minus
  bpm: number | null;           // Box Plus/Minus
  vorp: number | null;          // Value Over Replacement Player
  tov_pct: number | null;       // Turnover %
  games: number | null;
  minutes: number | null;
  // Percentiles
  per_pctl: number | null;
  ts_pctl: number | null;
  ws_pctl: number | null;
  ws_48_pctl: number | null;
  bpm_pctl: number | null;
  vorp_pctl: number | null;
  usg_pctl: number | null;
  obpm_pctl: number | null;
  dbpm_pctl: number | null;
  tov_pct_pctl: number | null;
}

export interface Player {
  id: string;
  name: string;
  team: string | null;
  position: string | null;
  stats: PlayerStats | null;
  advanced: AdvancedStats | null;  // Advanced stats (PER, WS, BPM, VORP)
  season: string | null;
}

export interface Matchup {
  id: number;
  player_a_id: string;
  player_b_id: string;
  order_index: number;
}

export type SeasonOption = "current" | "combined";

export interface GameTodayResponse {
  daily_set_id: number;
  date: string;
  mode_options: string[];
  season_options: SeasonOption[];
  current_season: SeasonOption;
  players: Player[];
  matchups: Matchup[];
}

export interface AnswerPayload {
  matchup_id: number;
  winner_id: string;
}

export type GameMode = "GUESS" | "OWN";

export interface GameSubmitRequest {
  daily_set_id: number;
  mode: GameMode;
  answers: AnswerPayload[];
}

export interface RankingEntry {
  id: string;
  name: string;
  team: string | null;
  position: number;
}

export interface Score {
  mode: GameMode;
  points: number | null;
  max_points: number | null;
  explanation: string | null;
}

export interface CrowdAlignment {
  similarity_percentile: number | null;
  note: string | null;
}

export interface GameSubmitResponse {
  submission_id: number;
  share_slug: string;
  final_ranking: RankingEntry[];
  score: Score;
  crowd_alignment: CrowdAlignment;
}

export interface SharedResultResponse {
  date: string;
  mode: GameMode;
  final_ranking: RankingEntry[];
  score_summary: string | null;
}

export async function getTodayGame(season: SeasonOption = "current"): Promise<GameTodayResponse> {
  const response = await api.get<GameTodayResponse>("/game/today", {
    params: { season }
  });
  return response.data;
}

export async function submitGame(
  payload: GameSubmitRequest,
): Promise<GameSubmitResponse> {
  const response = await api.post<GameSubmitResponse>("/game/submit", payload);
  return response.data;
}

export async function getSharedResult(
  shareSlug: string,
): Promise<SharedResultResponse> {
  const response = await api.get<SharedResultResponse>(`/game/share/${shareSlug}`);
  return response.data;
}

export async function getDayGame(targetDate: string, season: SeasonOption = "current"): Promise<GameTodayResponse> {
  const response = await api.get<GameTodayResponse>(`/game/day/${targetDate}`, {
    params: { season }
  });
  return response.data;
}

export interface MyVotesResponse {
  votes_today: number;
  total_matchups: number;
  completed: boolean;
  votes: Record<number, string>;  // matchup_id -> winner_player_id
}

export async function getMyVotes(): Promise<MyVotesResponse> {
  const response = await api.get<MyVotesResponse>('/voting/my-votes');
  return response.data;
}