"""
Load all-time players from CSV for the all-time ranking feature.
Uses career stats from all_time_careers.csv.
"""
import csv
import os
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class AllTimePlayer:
    id: str  # Basketball Reference ID (e.g., "jordami01")
    name: str
    position: Optional[str]
    team: str  # Teams played for
    career_ws: float  # Career Win Shares
    career_from: str  # Career start year
    career_to: str  # Career end year
    games: int
    points: int
    rebounds: int  # TRB
    assists: int  # AST
    steals: int  # STL
    blocks: int  # BLK
    fg_pct: float  # FG%
    ts_pct: float  # TS% (True Shooting)
    jersey_number: Optional[int] = None  # Most iconic jersey number


# Famous jersey numbers for all-time greats (most iconic number)
JERSEY_NUMBERS: Dict[str, int] = {
    "jamesle01": 23,      # LeBron James
    "abdulka01": 33,      # Kareem Abdul-Jabbar
    "malonka01": 32,      # Karl Malone
    "paulch01": 3,        # Chris Paul
    "jordami01": 23,      # Michael Jordan
    "stockjo01": 12,      # John Stockton
    "duncati01": 21,      # Tim Duncan
    "nowitdi01": 41,      # Dirk Nowitzki
    "garneke01": 21,      # Kevin Garnett
    "bryanko01": 24,      # Kobe Bryant
    "onMDsha01": 34,      # Shaquille O'Neal
    "onealsh01": 34,      # Shaq alternate ID
    "duranke01": 35,      # Kevin Durant
    "curryst01": 30,      # Stephen Curry
    "hardeja01": 13,      # James Harden
    "westbru01": 0,       # Russell Westbrook
    "leonaka01": 2,       # Kawhi Leonard
    "anMDgi01": 34,       # Giannis Antetokounmpo
    "antetoMD01": 34,     # Giannis alternate
    "lillada01": 0,       # Damian Lillard
    "davisan02": 23,      # Anthony Davis
    "embiijo01": 21,      # Joel Embiid
    "jokicni01": 15,      # Nikola Jokic
    "tatumja01": 0,       # Jayson Tatum
    "doncilu01": 77,      # Luka Doncic
    "youngtr01": 11,      # Trae Young
    "moMDja01": 12,       # Ja Morant
    "willizi01": 1,       # Zion Williamson
    "edwaran01": 5,       # Anthony Edwards (changed from 1)
    "gilMDsh01": 2,       # Shai Gilgeous-Alexander
    "birdla01": 33,       # Larry Bird
    "magiMD01": 32,       # Magic Johnson
    "johnser01": 32,      # Magic Johnson alternate
    "ervinju01": 6,       # Julius Erving
    "chambwi01": 13,      # Wilt Chamberlain
    "russewi01": 6,       # Bill Russell
    "roberos01": 14,      # Oscar Robertson
    "westje01": 44,       # Jerry West
    "havlijo01": 17,      # John Havlicek
    "barklch01": 34,      # Charles Barkley
    "robinda01": 50,      # David Robinson
    "olajuha01": 34,      # Hakeem Olajuwon
    "ewingpa01": 33,      # Patrick Ewing
    "mloMDka01": 11,      # Karl-Anthony Towns
    "piercpa01": 34,      # Paul Pierce
    "allenra02": 20,      # Ray Allen
    "nashst01": 13,       # Steve Nash
    "kiddja01": 5,        # Jason Kidd
    "iveral01": 3,        # Allen Iverson
    "wadedw01": 3,        # Dwyane Wade
    "anthoca01": 15,      # Carmelo Anthony
    "boMDch01": 1,        # Chris Bosh
    "howardw01": 12,      # Dwight Howard
    "paulga01": 24,       # Paul George
    "butleji01": 22,      # Jimmy Butler
    "thomais02": 4,       # Isaiah Thomas
    "lowryky01": 7,       # Kyle Lowry
    "greendr01": 23,      # Draymond Green
    "thompkl01": 11,      # Klay Thompson
    "irviky01": 2,        # Kyrie Irving
    "loveke01": 0,        # Kevin Love
    "walljo01": 2,        # John Wall
    "bealMD01": 3,        # Bradley Beal
    "bookede01": 1,       # Devin Booker
    "mitchdo01": 45,      # Donovan Mitchell
    "adebaba01": 13,      # Bam Adebayo
    "brownma01": 7,       # Jaylen Brown
}
    

def parse_team_string(raw_team: str) -> str:
    """
    Parse concatenated 3-letter team abbreviations from BBRef CSV.
    e.g. 'GSWHOULACNOHNOKOKCPHOSAS' -> 'GSW | HOU | LAC | NOH | NOK | OKC | PHO | SAS'
    Returns the team with the most recent/last appearance (last in string)
    as the primary, but joins all with ' | '.
    """
    if not raw_team or len(raw_team) <= 3:
        return raw_team
    
    # Known 3-letter NBA team abbreviations (current + historical)
    KNOWN_TEAMS = {
        "ATL", "BOS", "BRK", "CHA", "CHI", "CLE", "DAL", "DEN", "DET",
        "GSW", "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN",
        "NOP", "NYK", "OKC", "ORL", "PHI", "PHO", "POR", "SAC", "SAS",
        "TOR", "UTA", "WAS",
        # Historical
        "SEA", "NJN", "VAN", "WSB", "NOH", "NOK", "KCK", "SDC", "CHH",
        "BUF", "CIN", "KCO", "SDR", "STL", "BAL", "CAP", "CHZ", "NYN",
        "SFW", "PHW", "SYR", "ROC", "FTW", "MNL", "TRI", "INO", "AND",
        "WAT", "SHE", "DNN", "MLH",
    }
    
    teams = []
    i = 0
    while i < len(raw_team):
        if i + 3 <= len(raw_team):
            chunk = raw_team[i:i+3]
            if chunk in KNOWN_TEAMS:
                if chunk not in teams:
                    teams.append(chunk)
                i += 3
                continue
        # Skip unknown character
        i += 1
    
    if not teams:
        return raw_team
    
    return " | ".join(teams)


def load_all_time_players() -> List[AllTimePlayer]:
    """
    Load all-time players from CSV file.
    Returns players sorted by career win shares (best first).
    """
    csv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "data",
        "all_time_careers.csv"
    )
    
    players: List[AllTimePlayer] = []
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                player_id = row.get('Player-additional', '').strip()
                if not player_id:
                    continue
                
                name = row.get('Player', '').strip()
                position = row.get('Pos', '').strip() or None
                raw_team = row.get('Team', '').strip()
                team = parse_team_string(raw_team)
                career_from = row.get('From', '').strip()
                career_to = row.get('To', '').strip()
                
                try:
                    ws_val = row.get('WS', '0').strip() or '0'
                    career_ws = float(ws_val)
                except (ValueError, TypeError):
                    career_ws = 0.0
                
                try:
                    g_val = row.get('G', '0').strip() or '0'
                    games = int(g_val)
                except (ValueError, TypeError):
                    games = 0
                
                try:
                    pts_val = row.get('PTS', '0').strip() or '0'
                    points = int(pts_val)
                except (ValueError, TypeError):
                    points = 0
                
                try:
                    trb_val = row.get('TRB', '0').strip() or '0'
                    rebounds = int(trb_val)
                except (ValueError, TypeError):
                    rebounds = 0
                
                try:
                    ast_val = row.get('AST', '0').strip() or '0'
                    assists = int(ast_val)
                except (ValueError, TypeError):
                    assists = 0
                
                try:
                    stl_val = row.get('STL', '0').strip() or '0'
                    steals = int(stl_val)
                except (ValueError, TypeError):
                    steals = 0
                
                try:
                    blk_val = row.get('BLK', '0').strip() or '0'
                    blocks = int(blk_val)
                except (ValueError, TypeError):
                    blocks = 0
                
                try:
                    fg_val = row.get('FG%', '0').strip() or '0'
                    fg_pct = float(fg_val)
                except (ValueError, TypeError):
                    fg_pct = 0.0
                
                try:
                    ts_val = row.get('TS%', '0').strip() or '0'
                    ts_pct = float(ts_val)
                except (ValueError, TypeError):
                    ts_pct = 0.0
                
                # Get jersey number from lookup
                jersey_num = JERSEY_NUMBERS.get(player_id)
                
                players.append(AllTimePlayer(
                    id=player_id,
                    name=name,
                    position=position,
                    team=team,
                    career_ws=career_ws,
                    career_from=career_from,
                    career_to=career_to,
                    games=games,
                    points=points,
                    rebounds=rebounds,
                    assists=assists,
                    steals=steals,
                    blocks=blocks,
                    fg_pct=fg_pct,
                    ts_pct=ts_pct,
                    jersey_number=jersey_num
                ))
    except FileNotFoundError:
        print(f"[AllTime] Warning: Could not find {csv_path}")
        return []
    except Exception as e:
        print(f"[AllTime] Error loading all-time players: {e}")
        return []
    
    # Already sorted by WS in CSV, but ensure it
    players.sort(key=lambda p: p.career_ws, reverse=True)
    print(f"[AllTime] Loaded {len(players)} all-time players")
    return players


def get_all_time_player_ids() -> List[str]:
    """Get list of all-time player IDs."""
    return [p.id for p in get_cached_all_time_players()]


def get_all_time_player_by_id(player_id: str) -> Optional[AllTimePlayer]:
    """Get a specific all-time player by ID."""
    players_dict = get_all_time_players_dict()
    return players_dict.get(player_id)


def get_all_time_players_dict() -> Dict[str, AllTimePlayer]:
    """Get all-time players as a dictionary keyed by ID."""
    return {p.id: p for p in get_cached_all_time_players()}


# Cache the loaded players
_cached_players: Optional[List[AllTimePlayer]] = None


def get_cached_all_time_players() -> List[AllTimePlayer]:
    """Get cached all-time players (loads once)."""
    global _cached_players
    if _cached_players is None:
        _cached_players = load_all_time_players()
    return _cached_players
