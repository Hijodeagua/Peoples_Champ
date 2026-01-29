"""
Stats loader service for loading per-game stats from BBRef CSV files.
Supports loading from current season (25-26) or combined seasons (24-25 + 25-26).
"""
import csv
import os
from typing import Dict, List, Optional
from dataclasses import dataclass

# Path to data directories (resolved to absolute paths for security)
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data"))
# Historical/advanced stats are in the root data folder
ROOT_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data"))


def is_safe_path(base_dir: str, file_path: str) -> bool:
    """
    Validate that a file path is within the expected base directory.
    Prevents path traversal attacks (e.g., ../../../etc/passwd).
    """
    # Resolve both paths to absolute paths
    base_dir = os.path.abspath(base_dir)
    file_path = os.path.abspath(file_path)
    # Check if the file path starts with the base directory
    return file_path.startswith(base_dir + os.sep) or file_path == base_dir


def validate_csv_filename(filename: str) -> bool:
    """
    Validate that a filename is a safe CSV filename.
    Only allows alphanumeric characters, underscores, hyphens, and the .csv extension.
    """
    import re
    pattern = re.compile(r'^[a-zA-Z0-9_\-]+\.csv$')
    return bool(pattern.match(filename))


@dataclass
class RingerRankedPlayer:
    """A player from the Ringer Top 100 list"""
    rank: int
    name: str
    team: str

@dataclass
class PlayerPerGameStats:
    """Per-game stats for a player"""
    player_id: str
    name: str
    team: str
    position: str
    games: int
    pts: float
    reb: float
    ast: float
    stl: float
    blk: float
    fg_pct: float
    three_pct: float
    ft_pct: float
    efg_pct: float
    tov: float
    mpg: float  # minutes per game


@dataclass
class PlayerAdvancedStats:
    """Advanced stats for a player (from BBRef Advanced)"""
    player_id: str
    name: str
    team: str
    position: str
    games: int
    minutes: int         # May be 0 if not in CSV
    per: float          # Player Efficiency Rating
    ts_pct: float       # True Shooting % (may be 0 if not in CSV)
    three_ar: float     # 3-Point Attempt Rate (may be 0 if not in CSV)
    ftr: float          # Free Throw Rate (may be 0 if not in CSV)
    orb_pct: float      # Offensive Rebound %
    drb_pct: float      # Defensive Rebound %
    trb_pct: float      # Total Rebound %
    ast_pct: float      # Assist %
    stl_pct: float      # Steal %
    blk_pct: float      # Block %
    tov_pct: float      # Turnover %
    usg_pct: float      # Usage %
    ows: float          # Offensive Win Shares
    dws: float          # Defensive Win Shares
    ws: float           # Win Shares
    ws_48: float        # Win Shares per 48
    obpm: float         # Offensive Box Plus/Minus
    dbpm: float         # Defensive Box Plus/Minus
    bpm: float          # Box Plus/Minus
    vorp: float         # Value Over Replacement Player
    ortg: float = 0.0   # Offensive Rating (new)
    drtg: float = 0.0   # Defensive Rating (new)


def safe_float(value: str, default: float = 0.0) -> float:
    """Safely convert string to float"""
    try:
        if value == '' or value is None:
            return default
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int(value: str, default: int = 0) -> int:
    """Safely convert string to int"""
    try:
        if value == '' or value is None:
            return default
        return int(value)
    except (ValueError, TypeError):
        return default


def load_pergame_csv(csv_path: str) -> Dict[str, PlayerPerGameStats]:
    """Load per-game stats from a BBRef CSV file"""
    players = {}
    
    if not os.path.exists(csv_path):
        print(f"Warning: CSV file not found: {csv_path}")
        return players
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # Skip empty rows or league average row
            player_name = row.get('Player', '').strip()
            if not player_name or player_name == 'League Average':
                continue
            
            # Get player ID from '-9999' column (BBRef export format) or 'Player-additional'
            player_id = row.get('-9999', row.get('Player-additional', '')).strip()
            if not player_id:
                continue
            
            stats = PlayerPerGameStats(
                player_id=player_id,
                name=player_name,
                team=row.get('Team', row.get('Tm', '')).strip() or '',
                position=row.get('Pos', '').strip() or '',
                games=safe_int(row.get('G', '0')),
                pts=safe_float(row.get('PTS', '0')),
                reb=safe_float(row.get('TRB', '0')),
                ast=safe_float(row.get('AST', '0')),
                stl=safe_float(row.get('STL', '0')),
                blk=safe_float(row.get('BLK', '0')),
                fg_pct=safe_float(row.get('FG%', '0')),
                three_pct=safe_float(row.get('3P%', '0')),
                ft_pct=safe_float(row.get('FT%', '0')),
                efg_pct=safe_float(row.get('eFG%', '0')),
                tov=safe_float(row.get('TOV', '0')),
                mpg=safe_float(row.get('MP', '0')),
            )
            
            players[player_id] = stats
    
    return players


def combine_season_stats(
    current_stats: Dict[str, PlayerPerGameStats],
    previous_stats: Dict[str, PlayerPerGameStats]
) -> Dict[str, PlayerPerGameStats]:
    """
    Combine stats from two seasons using weighted averages based on games played.
    Returns combined stats for all players who appear in either season.
    """
    combined = {}
    all_player_ids = set(current_stats.keys()) | set(previous_stats.keys())
    
    for player_id in all_player_ids:
        curr = current_stats.get(player_id)
        prev = previous_stats.get(player_id)
        
        if curr and prev:
            # Weighted average based on games played
            total_games = curr.games + prev.games
            if total_games == 0:
                continue
            
            curr_weight = curr.games / total_games
            prev_weight = prev.games / total_games
            
            combined[player_id] = PlayerPerGameStats(
                player_id=player_id,
                name=curr.name,  # Use current name
                team=curr.team,  # Use current team
                position=curr.position or prev.position,
                games=total_games,
                pts=round(curr.pts * curr_weight + prev.pts * prev_weight, 1),
                reb=round(curr.reb * curr_weight + prev.reb * prev_weight, 1),
                ast=round(curr.ast * curr_weight + prev.ast * prev_weight, 1),
                stl=round(curr.stl * curr_weight + prev.stl * prev_weight, 1),
                blk=round(curr.blk * curr_weight + prev.blk * prev_weight, 1),
                fg_pct=round(curr.fg_pct * curr_weight + prev.fg_pct * prev_weight, 3),
                three_pct=round(curr.three_pct * curr_weight + prev.three_pct * prev_weight, 3),
                ft_pct=round(curr.ft_pct * curr_weight + prev.ft_pct * prev_weight, 3),
                efg_pct=round(curr.efg_pct * curr_weight + prev.efg_pct * prev_weight, 3),
                tov=round(curr.tov * curr_weight + prev.tov * prev_weight, 1),
                mpg=round(curr.mpg * curr_weight + prev.mpg * prev_weight, 1),
            )
        elif curr:
            combined[player_id] = curr
        elif prev:
            combined[player_id] = prev
    
    return combined


# Cache for loaded stats
_stats_cache: Dict[str, Dict[str, PlayerPerGameStats]] = {}


def get_all_player_stats(season: str = "current") -> Dict[str, PlayerPerGameStats]:
    """
    Get all player stats for the specified season.
    
    Args:
        season: "current" for 25-26 only, "combined" for both 24-25 and 25-26
    
    Returns:
        Dictionary mapping player_id to PlayerPerGameStats
    """
    cache_key = season
    
    if cache_key in _stats_cache:
        return _stats_cache[cache_key]
    
    current_csv = os.path.join(DATA_DIR, "Bbref_pergame_25-26.csv")
    current_stats = load_pergame_csv(current_csv)
    
    if season == "current":
        _stats_cache[cache_key] = current_stats
        return current_stats
    
    # Combined stats
    previous_csv = os.path.join(DATA_DIR, "Bbref_pergame_24-25.csv")
    previous_stats = load_pergame_csv(previous_csv)
    combined = combine_season_stats(current_stats, previous_stats)
    
    _stats_cache[cache_key] = combined
    return combined


def get_player_stats(player_id: str, season: str = "current") -> Optional[PlayerPerGameStats]:
    """Get stats for a specific player"""
    all_stats = get_all_player_stats(season)
    return all_stats.get(player_id)


def calculate_percentile(value: float, all_values: List[float]) -> float:
    """Calculate percentile rank (0-100) for a value within a list"""
    if not all_values or value is None:
        return 0.0
    sorted_values = sorted([v for v in all_values if v is not None and v > 0])
    if not sorted_values:
        return 0.0
    count_below = sum(1 for v in sorted_values if v < value)
    return round((count_below / len(sorted_values)) * 100, 1)


def calculate_position_rank(value: float, all_values: List[float], higher_is_better: bool = True) -> int:
    """Calculate rank among position (1 = best)"""
    if not all_values or value is None:
        return 0
    valid_values = [v for v in all_values if v is not None and v > 0]
    if not valid_values:
        return 0
    if higher_is_better:
        sorted_values = sorted(valid_values, reverse=True)
    else:
        sorted_values = sorted(valid_values)
    try:
        return sorted_values.index(value) + 1
    except ValueError:
        # Value not in list, find where it would rank
        for i, v in enumerate(sorted_values):
            if (higher_is_better and value >= v) or (not higher_is_better and value <= v):
                return i + 1
        return len(sorted_values) + 1


def get_stats_with_percentiles(
    player_id: str,
    season: str = "current"
) -> Optional[Dict]:
    """
    Get player stats with league-wide percentiles and position ranks.
    
    Returns dict with stats, percentiles, and position ranks.
    """
    all_stats = get_all_player_stats(season)
    player_stats = all_stats.get(player_id)
    
    if not player_stats:
        return None
    
    # Get player's primary position
    player_pos = player_stats.position.split('-')[0].strip().upper() if player_stats.position else None
    
    # Filter stats by position for position rank
    pos_stats = [s for s in all_stats.values() if s.position and s.position.split('-')[0].strip().upper() == player_pos] if player_pos else []
    pos_count = len(pos_stats)
    
    # Calculate percentiles against all players
    all_pts = [s.pts for s in all_stats.values()]
    all_reb = [s.reb for s in all_stats.values()]
    all_ast = [s.ast for s in all_stats.values()]
    all_stl = [s.stl for s in all_stats.values()]
    all_blk = [s.blk for s in all_stats.values()]
    all_efg = [s.efg_pct for s in all_stats.values()]
    all_three = [s.three_pct for s in all_stats.values()]
    all_ft = [s.ft_pct for s in all_stats.values()]
    all_tov = [s.tov for s in all_stats.values()]
    
    # Position-specific stats for ranking
    pos_pts = [s.pts for s in pos_stats]
    pos_reb = [s.reb for s in pos_stats]
    pos_ast = [s.ast for s in pos_stats]
    pos_stl = [s.stl for s in pos_stats]
    pos_blk = [s.blk for s in pos_stats]
    pos_efg = [s.efg_pct for s in pos_stats]
    pos_three = [s.three_pct for s in pos_stats]
    pos_ft = [s.ft_pct for s in pos_stats]
    pos_tov = [s.tov for s in pos_stats]
    
    return {
        "pts": player_stats.pts,
        "reb": player_stats.reb,
        "ast": player_stats.ast,
        "stl": player_stats.stl,
        "blk": player_stats.blk,
        "three_pct": round(player_stats.three_pct * 100, 1) if player_stats.three_pct else None,
        "ft_pct": round(player_stats.ft_pct * 100, 1) if player_stats.ft_pct else None,
        "efg_pct": round(player_stats.efg_pct * 100, 1) if player_stats.efg_pct else None,
        "tov": player_stats.tov,
        "mpg": player_stats.mpg,
        "games": player_stats.games,
        "position": player_stats.position,
        "pos_count": pos_count,  # Total players at this position
        # Percentiles (league-wide)
        "pts_pctl": calculate_percentile(player_stats.pts, all_pts),
        "reb_pctl": calculate_percentile(player_stats.reb, all_reb),
        "ast_pctl": calculate_percentile(player_stats.ast, all_ast),
        "stl_pctl": calculate_percentile(player_stats.stl, all_stl),
        "blk_pctl": calculate_percentile(player_stats.blk, all_blk),
        "efg_pctl": calculate_percentile(player_stats.efg_pct, all_efg),
        "three_pctl": calculate_percentile(player_stats.three_pct, all_three),
        "ft_pctl": calculate_percentile(player_stats.ft_pct, all_ft),
        "tov_pctl": 100 - calculate_percentile(player_stats.tov, all_tov),
        # Position ranks (1 = best at position)
        "pts_pos_rank": calculate_position_rank(player_stats.pts, pos_pts),
        "reb_pos_rank": calculate_position_rank(player_stats.reb, pos_reb),
        "ast_pos_rank": calculate_position_rank(player_stats.ast, pos_ast),
        "stl_pos_rank": calculate_position_rank(player_stats.stl, pos_stl),
        "blk_pos_rank": calculate_position_rank(player_stats.blk, pos_blk),
        "efg_pos_rank": calculate_position_rank(player_stats.efg_pct, pos_efg),
        "three_pos_rank": calculate_position_rank(player_stats.three_pct, pos_three),
        "ft_pos_rank": calculate_position_rank(player_stats.ft_pct, pos_ft),
        "tov_pos_rank": calculate_position_rank(player_stats.tov, pos_tov, higher_is_better=False),
    }


# Position-based top stats mapping
POSITION_TOP_STATS = {
    "PG": ["pts", "ast", "stl", "three_pct"],  # Point guards: scoring, assists, steals, 3pt
    "SG": ["pts", "ast", "stl", "three_pct"],  # Shooting guards: similar to PG
    "SF": ["pts", "reb", "stl", "ast"],        # Small forwards: versatile
    "PF": ["pts", "reb", "blk", "efg_pct"],     # Power forwards: scoring, rebounding, blocks
    "C": ["pts", "reb", "blk", "efg_pct"],      # Centers: rebounding, blocks, efficiency
}

# Default stats if position not found
DEFAULT_TOP_STATS = ["pts", "reb", "ast", "stl"]


def get_top_stats_for_position(position: str) -> List[str]:
    """Get the top 4 stats to display for a given position"""
    if not position:
        return DEFAULT_TOP_STATS
    
    # Handle multi-position players (e.g., "PG-SG" or "SF-PF")
    primary_pos = position.split('-')[0].strip().upper()
    
    return POSITION_TOP_STATS.get(primary_pos, DEFAULT_TOP_STATS)


def clear_stats_cache():
    """Clear the stats cache (useful for testing or when data is updated)"""
    global _stats_cache, _adv_stats_cache
    _stats_cache = {}
    _adv_stats_cache = {}


# ============== ADVANCED STATS LOADING ==============

def load_advanced_csv(csv_path: str) -> Dict[str, PlayerAdvancedStats]:
    """Load advanced stats from a BBRef Advanced CSV file"""
    players = {}
    
    if not os.path.exists(csv_path):
        print(f"Warning: Advanced CSV file not found: {csv_path}")
        return players
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            player_name = row.get('Player', '').strip()
            if not player_name or player_name == 'League Average':
                continue
            
            # Get player ID from 'Player-additional' or '-9999' column (BBRef export formats)
            player_id = row.get('Player-additional', row.get('-9999', '')).strip()
            if not player_id:
                continue
            
            stats = PlayerAdvancedStats(
                player_id=player_id,
                name=player_name,
                team=row.get('Team', row.get('Tm', '')).strip() or '',
                position=row.get('Pos', '').strip() or '',
                games=safe_int(row.get('G', '0')),
                minutes=safe_int(row.get('MP', '0')),  # May be 0 in new CSV format
                per=safe_float(row.get('PER', '0')),
                ts_pct=safe_float(row.get('TS%', '0')),  # May be 0 in new CSV format
                three_ar=safe_float(row.get('3PAr', '0')),  # May be 0 in new CSV format
                ftr=safe_float(row.get('FTr', '0')),  # May be 0 in new CSV format
                orb_pct=safe_float(row.get('ORB%', '0')),
                drb_pct=safe_float(row.get('DRB%', '0')),
                trb_pct=safe_float(row.get('TRB%', '0')),
                ast_pct=safe_float(row.get('AST%', '0')),
                stl_pct=safe_float(row.get('STL%', '0')),
                blk_pct=safe_float(row.get('BLK%', '0')),
                tov_pct=safe_float(row.get('TOV%', '0')),
                usg_pct=safe_float(row.get('USG%', '0')),
                ows=safe_float(row.get('OWS', '0')),
                dws=safe_float(row.get('DWS', '0')),
                ws=safe_float(row.get('WS', '0')),
                ws_48=safe_float(row.get('WS/48', '0')),
                obpm=safe_float(row.get('OBPM', '0')),
                dbpm=safe_float(row.get('DBPM', '0')),
                bpm=safe_float(row.get('BPM', '0')),
                vorp=safe_float(row.get('VORP', '0')),
                ortg=safe_float(row.get('ORtg', '0')),  # New field
                drtg=safe_float(row.get('DRtg', '0')),  # New field
            )
            
            players[player_id] = stats
    
    return players


def combine_advanced_stats(
    current_stats: Dict[str, PlayerAdvancedStats],
    previous_stats: Dict[str, PlayerAdvancedStats]
) -> Dict[str, PlayerAdvancedStats]:
    """
    Combine advanced stats from two seasons using weighted averages based on minutes played.
    """
    combined = {}
    all_player_ids = set(current_stats.keys()) | set(previous_stats.keys())
    
    for player_id in all_player_ids:
        curr = current_stats.get(player_id)
        prev = previous_stats.get(player_id)
        
        if curr and prev:
            total_minutes = curr.minutes + prev.minutes
            if total_minutes == 0:
                continue
            
            curr_weight = curr.minutes / total_minutes
            prev_weight = prev.minutes / total_minutes
            
            combined[player_id] = PlayerAdvancedStats(
                player_id=player_id,
                name=curr.name,
                team=curr.team,
                position=curr.position or prev.position,
                games=curr.games + prev.games,
                minutes=total_minutes,
                per=round(curr.per * curr_weight + prev.per * prev_weight, 1),
                ts_pct=round(curr.ts_pct * curr_weight + prev.ts_pct * prev_weight, 3),
                three_ar=round(curr.three_ar * curr_weight + prev.three_ar * prev_weight, 3),
                ftr=round(curr.ftr * curr_weight + prev.ftr * prev_weight, 3),
                orb_pct=round(curr.orb_pct * curr_weight + prev.orb_pct * prev_weight, 1),
                drb_pct=round(curr.drb_pct * curr_weight + prev.drb_pct * prev_weight, 1),
                trb_pct=round(curr.trb_pct * curr_weight + prev.trb_pct * prev_weight, 1),
                ast_pct=round(curr.ast_pct * curr_weight + prev.ast_pct * prev_weight, 1),
                stl_pct=round(curr.stl_pct * curr_weight + prev.stl_pct * prev_weight, 1),
                blk_pct=round(curr.blk_pct * curr_weight + prev.blk_pct * prev_weight, 1),
                tov_pct=round(curr.tov_pct * curr_weight + prev.tov_pct * prev_weight, 1),
                usg_pct=round(curr.usg_pct * curr_weight + prev.usg_pct * prev_weight, 1),
                ows=round(curr.ows + prev.ows, 1),  # Cumulative
                dws=round(curr.dws + prev.dws, 1),  # Cumulative
                ws=round(curr.ws + prev.ws, 1),     # Cumulative
                ws_48=round(curr.ws_48 * curr_weight + prev.ws_48 * prev_weight, 3),
                obpm=round(curr.obpm * curr_weight + prev.obpm * prev_weight, 1),
                dbpm=round(curr.dbpm * curr_weight + prev.dbpm * prev_weight, 1),
                bpm=round(curr.bpm * curr_weight + prev.bpm * prev_weight, 1),
                vorp=round(curr.vorp + prev.vorp, 1),  # Cumulative
                ortg=round(curr.ortg * curr_weight + prev.ortg * prev_weight, 1),  # Weighted average
                drtg=round(curr.drtg * curr_weight + prev.drtg * prev_weight, 1),  # Weighted average
            )
        elif curr:
            combined[player_id] = curr
        elif prev:
            combined[player_id] = prev
    
    return combined


# Cache for advanced stats
_adv_stats_cache: Dict[str, Dict[str, PlayerAdvancedStats]] = {}


def get_all_advanced_stats(season: str = "current") -> Dict[str, PlayerAdvancedStats]:
    """
    Get all player advanced stats for the specified season.
    
    Args:
        season: "current" for 25-26 only, "combined" for both 24-25 and 25-26
    
    Returns:
        Dictionary mapping player_id to PlayerAdvancedStats
    """
    cache_key = f"adv_{season}"
    
    if cache_key in _adv_stats_cache:
        return _adv_stats_cache[cache_key]
    
    # Try backend/data first, then root data folder
    current_csv = os.path.join(DATA_DIR, "Bbref_Adv_25-26.csv")
    if not os.path.exists(current_csv):
        current_csv = os.path.join(ROOT_DATA_DIR, "Bbref_Adv_25-26.csv")
    
    current_stats = load_advanced_csv(current_csv)
    
    if season == "current":
        _adv_stats_cache[cache_key] = current_stats
        return current_stats
    
    # Combined stats - load 24-25 as well
    previous_csv = os.path.join(DATA_DIR, "Bbref_Adv_24-25.csv")
    if not os.path.exists(previous_csv):
        previous_csv = os.path.join(ROOT_DATA_DIR, "Bbref_Adv_24-25.csv")
    
    previous_stats = load_advanced_csv(previous_csv)
    combined = combine_advanced_stats(current_stats, previous_stats)
    
    _adv_stats_cache[cache_key] = combined
    return combined


def get_advanced_stats_with_percentiles(
    player_id: str,
    season: str = "current"
) -> Optional[Dict]:
    """
    Get player advanced stats with league-wide percentiles.
    """
    all_stats = get_all_advanced_stats(season)
    player_stats = all_stats.get(player_id)
    
    if not player_stats:
        return None
    
    # Calculate percentiles against all players
    all_per = [s.per for s in all_stats.values() if s.per > 0]
    all_ts = [s.ts_pct for s in all_stats.values() if s.ts_pct > 0]
    all_ws = [s.ws for s in all_stats.values()]
    all_ws48 = [s.ws_48 for s in all_stats.values() if s.ws_48 > 0]
    all_bpm = [s.bpm for s in all_stats.values()]
    all_vorp = [s.vorp for s in all_stats.values()]
    all_usg = [s.usg_pct for s in all_stats.values() if s.usg_pct > 0]
    all_obpm = [s.obpm for s in all_stats.values()]
    all_dbpm = [s.dbpm for s in all_stats.values()]
    all_tov_pct = [s.tov_pct for s in all_stats.values() if s.tov_pct > 0]
    
    return {
        "per": player_stats.per,
        "ts_pct": round(player_stats.ts_pct * 100, 1) if player_stats.ts_pct else None,
        "usg_pct": player_stats.usg_pct,
        "ws": player_stats.ws,
        "ws_48": player_stats.ws_48,
        "ows": player_stats.ows,
        "dws": player_stats.dws,
        "obpm": player_stats.obpm,
        "dbpm": player_stats.dbpm,
        "bpm": player_stats.bpm,
        "vorp": player_stats.vorp,
        "tov_pct": player_stats.tov_pct,
        "games": player_stats.games,
        "minutes": player_stats.minutes,
        # Percentiles
        "per_pctl": calculate_percentile(player_stats.per, all_per),
        "ts_pctl": calculate_percentile(player_stats.ts_pct, all_ts),
        "ws_pctl": calculate_percentile(player_stats.ws, all_ws),
        "ws_48_pctl": calculate_percentile(player_stats.ws_48, all_ws48),
        "bpm_pctl": calculate_percentile(player_stats.bpm, all_bpm),
        "vorp_pctl": calculate_percentile(player_stats.vorp, all_vorp),
        "usg_pctl": calculate_percentile(player_stats.usg_pct, all_usg),
        "obpm_pctl": calculate_percentile(player_stats.obpm, all_obpm),
        "dbpm_pctl": calculate_percentile(player_stats.dbpm, all_dbpm),
        # Lower TOV% is better
        "tov_pct_pctl": 100 - calculate_percentile(player_stats.tov_pct, all_tov_pct),
    }


# ============== RINGER RANKINGS LOADING ==============

_ringer_cache: Optional[List[RingerRankedPlayer]] = None


def load_ringer_rankings() -> List[RingerRankedPlayer]:
    """
    Load the Ringer Top 100 rankings from CSV.
    Returns a list of RingerRankedPlayer sorted by rank.
    """
    global _ringer_cache

    if _ringer_cache is not None:
        return _ringer_cache

    ringer_csv = os.path.join(ROOT_DATA_DIR, "ringer_top_100.csv")

    # Security: Validate the path is within expected directory
    if not is_safe_path(ROOT_DATA_DIR, ringer_csv):
        print(f"Security Warning: Invalid path for Ringer CSV: {ringer_csv}")
        return []

    if not os.path.exists(ringer_csv):
        print(f"Warning: Ringer rankings CSV not found: {ringer_csv}")
        return []

    players = []

    with open(ringer_csv, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)

        for row in reader:
            rank = safe_int(row.get('Rank', '0'))
            name = row.get('Player', '').strip()
            team = row.get('Team', '').strip()

            # Validate rank is within reasonable bounds
            if rank <= 0 or rank > 500:
                continue

            # Validate and sanitize name (allow letters, spaces, hyphens, apostrophes, periods)
            if not name or len(name) > 100:
                continue
            # Remove any potentially dangerous characters
            import re
            name = re.sub(r'[<>"\';\\]', '', name)

            # Sanitize team name as well
            if team:
                team = re.sub(r'[<>"\';\\]', '', team)[:100]

            players.append(RingerRankedPlayer(
                rank=rank,
                name=name,
                team=team,
            ))

    # Sort by rank
    players.sort(key=lambda p: p.rank)
    _ringer_cache = players

    print(f"[StatsLoader] Loaded {len(players)} Ringer ranked players")
    return players


def get_ringer_top_n(n: int = 50) -> List[RingerRankedPlayer]:
    """
    Get the top N players from the Ringer rankings.

    Args:
        n: Number of top players to return (default 50)

    Returns:
        List of top N RingerRankedPlayer objects
    """
    all_players = load_ringer_rankings()
    return all_players[:n]


def get_ringer_player_names(n: int = 50) -> List[str]:
    """
    Get just the names of the top N Ringer-ranked players.

    Args:
        n: Number of top players to return (default 50)

    Returns:
        List of player names
    """
    top_players = get_ringer_top_n(n)
    return [p.name for p in top_players]
