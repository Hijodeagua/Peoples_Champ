import { api } from "./client";

export interface VoteRequest {
  matchup_id: number;
  winner_player_id: string;
  session_id?: string;
}

export interface VoteResponse {
  success: boolean;
  message: string;
  session_id?: string;
}

export interface UserVotesResponse {
  votes_today: number;
  total_matchups: number;
  completed: boolean;
}

export interface MatchupResults {
  matchup_id: number;
  player1: {
    id: string;
    name: string;
    votes: number;
    percentage: number;
  };
  player2: {
    id: string;
    name: string;
    votes: number;
    percentage: number;
  };
  total_votes: number;
}

export async function submitVote(matchupId: number, playerId: string): Promise<VoteResponse> {
  const response = await api.post<VoteResponse>("/voting/vote", {
    matchup_id: matchupId,
    winner_player_id: playerId
  });
  return response.data;
}

export async function getVotingStatus(): Promise<UserVotesResponse> {
  const response = await api.get<UserVotesResponse>("/voting/status");
  return response.data;
}

export async function getMatchupResults(matchupId: number): Promise<MatchupResults> {
  const response = await api.get<MatchupResults>(`/voting/aggregate/${matchupId}`);
  return response.data;
}

export interface PlayerRanking {
  id: string;
  name: string;
  team: string | null;
  position: string | null;
  wins: number;
  total_matchups: number;
  win_percentage: number;
  total_votes_received: number;
}

export interface GlobalRankingsResponse {
  date: string;
  rankings: PlayerRanking[];
  total_voters: number;
  total_votes: number;
}

export async function getGlobalRankings(): Promise<GlobalRankingsResponse> {
  const response = await api.get<GlobalRankingsResponse>("/voting/global-rankings");
  return response.data;
}
