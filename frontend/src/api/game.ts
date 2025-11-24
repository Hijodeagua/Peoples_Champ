import { api } from "./client";

export interface Player {
  id: string;
  name: string;
  team: string | null;
}

export interface Matchup {
  id: number;
  player_a_id: string;
  player_b_id: string;
  order_index: number;
}

export interface GameTodayResponse {
  daily_set_id: number;
  date: string;
  mode_options: string[];
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

export async function getTodayGame(): Promise<GameTodayResponse> {
  const response = await api.get<GameTodayResponse>("/game/today");
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