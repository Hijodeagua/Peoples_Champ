"""
GOAT preset player lists for the all-time ranking feature.
These presets provide curated lists of players for common ranking scenarios.
"""
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class GoatPreset:
    id: str
    name: str
    description: str
    player_ids: List[str]


# NBA Top 75 Anniversary Team (2021) + Recent MVPs
# This list includes the official NBA 75 players with Basketball Reference IDs
# Plus modern MVPs: SGA, Jokic, Giannis, Embiid (if not already included)
NBA_75_PLUS_MVPS_IDS = [
    # All-time greats from NBA 75 list
    "abdulka01",    # Kareem Abdul-Jabbar
    "barklch01",    # Charles Barkley
    "birdla01",     # Larry Bird
    "bryanko01",    # Kobe Bryant
    "chambwi01",    # Wilt Chamberlain (not in our CSV but iconic)
    "curryst01",    # Stephen Curry
    "duncati01",    # Tim Duncan
    "duranke01",    # Kevin Durant
    "ervinju01",    # Julius Erving
    "ewingpa01",    # Patrick Ewing
    "garneke01",    # Kevin Garnett
    "gervige01",    # George Gervin
    "hardeja01",    # James Harden
    "havlijo01",    # John Havlicek
    "hillgr01",     # Grant Hill
    "iveral01",     # Allen Iverson
    "jamesle01",    # LeBron James
    "johnsma02",    # Magic Johnson
    "jordami01",    # Michael Jordan
    "kiddja01",     # Jason Kidd
    "malonka01",    # Karl Malone
    "malonmo01",    # Moses Malone
    "mchalke01",    # Kevin McHale
    "millere01",    # Reggie Miller
    "mullich01",    # Chris Mullin
    "nashst01",     # Steve Nash
    "nowitdi01",    # Dirk Nowitzki
    "olajuha01",    # Hakeem Olajuwon
    "onealsh01",    # Shaquille O'Neal
    "parisro01",    # Robert Parish
    "paulch01",     # Chris Paul
    "paytoga01",    # Gary Payton
    "piercpa01",    # Paul Pierce
    "pippesc01",    # Scottie Pippen
    "allenra02",    # Ray Allen
    "robinda01",    # David Robinson
    "russewi01",    # Bill Russell (not in our CSV but iconic)
    "stockjo01",    # John Stockton
    "thomais01",    # Isiah Thomas
    "wadedw01",     # Dwyane Wade
    "westbru01",    # Russell Westbrook
    "wilkido01",    # Dominique Wilkins
    "worthja01",    # James Worthy
    # Modern legends and recent MVPs
    "antetgi01",    # Giannis Antetokounmpo (MVP 2019, 2020)
    "jokicni01",    # Nikola Jokic (MVP 2021, 2022, 2024)
    "embiijo01",    # Joel Embiid (MVP 2023)
    "gilgesh01",    # Shai Gilgeous-Alexander (MVP 2025)
    "leonaka01",    # Kawhi Leonard
    "lillada01",    # Damian Lillard
    "davisan02",    # Anthony Davis
    "irvinky01",    # Kyrie Irving
    "georgpa01",    # Paul George
    "townska01",    # Karl-Anthony Towns
    "butleji01",    # Jimmy Butler
    "lowryky01",    # Kyle Lowry
    "derozde01",    # DeMar DeRozan
    "westda01",     # David West
    "anthoca01",    # Carmelo Anthony
    "boshch01",     # Chris Bosh
    "howardw01",    # Dwight Howard
    # Additional legends
    "drexlcl01",    # Clyde Drexler
    "fraziwl01",    # Walt Frazier (alternate ID)
    "roberos01",    # Oscar Robertson
    "barryri01",    # Rick Barry
    "archibti01",   # Tiny Archibald
    "cowenda01",    # Dave Cowens
    "westje01",     # Jerry West
    "moncrsi01",    # Sidney Moncrief
    "richmmi01",    # Mitch Richmond
    "dantlad01",    # Adrian Dantley
    "englial01",    # Alex English
    "kingbe01",     # Bernard King
]

# Modern Superstars - Current top players
MODERN_SUPERSTARS_IDS = [
    "jokicni01",    # Nikola Jokic
    "gilgesh01",    # Shai Gilgeous-Alexander
    "antetgi01",    # Giannis Antetokounmpo
    "doncilu01",    # Luka Doncic
    "embiijo01",    # Joel Embiid
    "curryst01",    # Stephen Curry
    "duranke01",    # Kevin Durant
    "jamesle01",    # LeBron James
    "tatumja01",    # Jayson Tatum
    "leonaka01",    # Kawhi Leonard
    "davisan02",    # Anthony Davis
    "lillada01",    # Damian Lillard
    "mitchdo01",    # Donovan Mitchell
    "youngtr01",    # Trae Young
    "morantja01",   # Ja Morant
    "edwaran01",    # Anthony Edwards
    "irvinky01",    # Kyrie Irving
    "hardeja01",    # James Harden
    "paulch01",     # Chris Paul
    "butleji01",    # Jimmy Butler
    "georgpa01",    # Paul George
    "townska01",    # Karl-Anthony Towns
    "adebaba01",    # Bam Adebayo
    "bookede01",    # Devin Booker
    "brownma01",    # Jaylen Brown
]

# 90s Legends
NINETIES_LEGENDS_IDS = [
    "jordami01",    # Michael Jordan
    "pippesc01",    # Scottie Pippen
    "olajuha01",    # Hakeem Olajuwon
    "robinda01",    # David Robinson
    "ewingpa01",    # Patrick Ewing
    "malonka01",    # Karl Malone
    "stockjo01",    # John Stockton
    "barklch01",    # Charles Barkley
    "millere01",    # Reggie Miller
    "paytoga01",    # Gary Payton
    "kempsh01",     # Shawn Kemp
    "drexlcl01",    # Clyde Drexler
    "onealsh01",    # Shaquille O'Neal
    "richmmi01",    # Mitch Richmond
    "hillgr01",     # Grant Hill
    "hardati01",    # Tim Hardaway
    "johnske02",    # Kevin Johnson
    "mullich01",    # Chris Mullin
    "mournal01",    # Alonzo Mourning
    "webbech01",    # Chris Webber
]


# All available presets
GOAT_PRESETS: Dict[str, GoatPreset] = {
    "nba75_mvps": GoatPreset(
        id="nba75_mvps",
        name="NBA 75 + Modern MVPs",
        description="The NBA 75th Anniversary Team combined with recent MVP winners (Jokic, SGA, Giannis, Embiid)",
        player_ids=NBA_75_PLUS_MVPS_IDS,
    ),
    "modern_superstars": GoatPreset(
        id="modern_superstars",
        name="Modern Superstars",
        description="Today's top 25 NBA players",
        player_ids=MODERN_SUPERSTARS_IDS,
    ),
    "90s_legends": GoatPreset(
        id="90s_legends",
        name="90s Legends",
        description="The greatest players from the 1990s era",
        player_ids=NINETIES_LEGENDS_IDS,
    ),
}


def get_preset(preset_id: str) -> Optional[GoatPreset]:
    """Get a preset by ID."""
    return GOAT_PRESETS.get(preset_id)


def get_all_presets() -> List[GoatPreset]:
    """Get all available presets."""
    return list(GOAT_PRESETS.values())


def get_preset_player_ids(preset_id: str) -> Optional[List[str]]:
    """Get player IDs for a preset."""
    preset = get_preset(preset_id)
    return preset.player_ids if preset else None
