/**
 * Utility for getting NBA player headshot images
 * 
 * Uses NBA.com CDN for player headshots. Falls back to placeholder if not available.
 * NBA.com headshots use a specific format with player IDs from their system.
 */

// Mapping of common player names to NBA.com player IDs
// This is a subset - add more as needed
export const NBA_PLAYER_IDS: Record<string, string> = {
  // Top players
  "Nikola Jokić": "203999",
  "Shai Gilgeous-Alexander": "1628983",
  "Giannis Antetokounmpo": "203507",
  "Luka Dončić": "1629029",
  "Jayson Tatum": "1628369",
  "Anthony Edwards": "1630162",
  "Kevin Durant": "201142",
  "LeBron James": "2544",
  "Stephen Curry": "201939",
  "Joel Embiid": "203954",
  "Jaylen Brown": "1627759",
  "Donovan Mitchell": "1628378",
  "Tyrese Maxey": "1630178",
  "Devin Booker": "1626164",
  "Trae Young": "1629027",
  "Damian Lillard": "203081",
  "Anthony Davis": "203076",
  "Bam Adebayo": "1628389",
  "De'Aaron Fox": "1628368",
  "Jalen Brunson": "1628973",
  "Kyrie Irving": "202681",
  "Kawhi Leonard": "202695",
  "Paul George": "202331",
  "Jimmy Butler": "202710",
  "Karl-Anthony Towns": "1626157",
  "Domantas Sabonis": "1627734",
  "Tyrese Haliburton": "1630169",
  "Ja Morant": "1629630",
  "Zion Williamson": "1629627",
  "Chet Holmgren": "1631096",
  "Victor Wembanyama": "1641705",
  "Paolo Banchero": "1631094",
  "Scottie Barnes": "1630567",
  "Franz Wagner": "1630532",
  "Evan Mobley": "1630596",
  "Desmond Bane": "1630217",
  "Lauri Markkanen": "1628374",
  "Brandon Ingram": "1627742",
  "DeMar DeRozan": "201565",
  "Pascal Siakam": "1627783",
  "OG Anunoby": "1628384",
  "Mikal Bridges": "1628969",
  "Jalen Williams": "1631114",
  "Alperen Sengun": "1630578",
  "Cade Cunningham": "1630595",
  "LaMelo Ball": "1630163",
  "Jaren Jackson Jr.": "1628991",
  "Rudy Gobert": "203497",
  "Draymond Green": "203110",
  "Chris Paul": "101108",
  "James Harden": "201935",
  "Russell Westbrook": "201566",
  "Khris Middleton": "203114",
  "Jrue Holiday": "201950",
  "Derrick White": "1628401",
  "Fred VanVleet": "1627832",
  "Dejounte Murray": "1627749",
  "CJ McCollum": "203468",
  "Zach LaVine": "203897",
  "Bradley Beal": "203078",
  "Trey Murphy III": "1630530",
  "Deni Avdija": "1630166",
  "Miles Bridges": "1628970",
  "Dyson Daniels": "1631100",
  "Keyonte George": "1641706",
  "Cooper Flagg": "1642268",
  "Toumani Camara": "1641724",
  // Additional players
  "Julius Randle": "203944",
  "Jamal Murray": "1627750",
  "Austin Reaves": "1630559",
  "Immanuel Quickley": "1630193",
  "RJ Barrett": "1629628",
  "Josh Giddey": "1630581",
  "Jalen Duren": "1631105",
  "Nic Claxton": "1629651",
  "Ivica Zubac": "1627826",
  "Isaiah Hartenstein": "1628392",
  "Myles Turner": "1626167",
  "Wendell Carter Jr.": "1628976",
  "Deandre Ayton": "1629028",
  "Jarrett Allen": "1628386",
  "Donte DiVincenzo": "1628978",
  "Andrew Wiggins": "203952",
  "Norman Powell": "1626181",
  "Kelly Oubre Jr.": "1626162",
  "Anfernee Simons": "1629014",
  "Payton Pritchard": "1630202",
  "Amen Thompson": "1641709",
  "Jabari Smith Jr.": "1631095",
  "Jalen Johnson": "1630552",
  "Jaime Jaquez Jr.": "1641708",
  "Kel'el Ware": "1642267",
  "Donovan Clingan": "1642259",
  "Alex Sarr": "1642258",
  "Reed Sheppard": "1642260",
  "Zaccharie Risacher": "1642257",
  "Dalton Knecht": "1642261",
  "Rob Dillingham": "1642262",
  "Nikola Vučević": "202696",
  "Harrison Barnes": "203084",
  "Jerami Grant": "203924",
  "Michael Porter Jr.": "1629008",
  "Kyle Kuzma": "1628398",
  "John Collins": "1628381",
  "Rui Hachimura": "1629060",
  "P.J. Washington": "1629023",
  "Naji Marshall": "1630230",
  "Jaden McDaniels": "1630183",
  "De'Andre Hunter": "1629631",
  "Cameron Johnson": "1629661",
  "Saddiq Bey": "1630180",
  "Royce O'Neale": "1626220",
  "Gary Trent Jr.": "1629018",
  "Quentin Grimes": "1630194",
  "Max Christie": "1631108",
  "Brandin Podziemski": "1641710",
  "Moses Moody": "1630541",
  "Davion Mitchell": "1630558",
  "Anthony Black": "1641707",
  "Cason Wallace": "1641711",
  "Ajay Mitchell": "1642263",
  "Tristan Da Silva": "1642264",
  "Peyton Watson": "1631210",
  "Collin Sexton": "1629012",
  "Dennis Schröder": "203471",
  "Duncan Robinson": "1629130",
  "Terance Mann": "1629611",
  "Noah Clowney": "1641712",
  "Onyeka Okongwu": "1630168",
  "Jake LaRavia": "1631209",
  "Ben Sheppard": "1641713",
  "Santi Aldama": "1630583",
  "Jarace Walker": "1641714",
  "Julian Champagnie": "1630551",
  "A.J. Green": "1630182",
  "Kris Dunn": "1627739",
  "Pelle Larsson": "1641715",
  "Jusuf Nurkić": "203994",
  "Svi Mykhailiuk": "1629004",
  "Collin Gillespie": "1631107",
  // Fixes for missing headshots (exact-name keys from CSV)
  "Alperen Şengün": "1630578",
  "Kristaps Porziņģis": "204001",
  "Jalen Suggs": "1630591",
  "Neemias Queta": "1629674",
  "Grayson Allen": "1628960",
  "Paul Reed": "1630194",
  "Aaron Gordon": "203932",
  "Mark Williams": "1631109",
  "Goga Bitadze": "1629048",
  "Jakob Poeltl": "1627751",
  "Daniel Gafford": "1629655",
  "Ryan Rollins": "1631157",
  "Stephon Castle": "1642264",
  "Ryan Kalkbrenner": "1641750",
  "Ausar Thompson": "1641709",
  "Kon Knueppel": "1642851",
  "Josh Minott": "1631169",
  "Sandro Mamukelashvili": "1630572",
  "Jaylon Tyson": "1642281",
  "Josh Okogie": "1629006",
  "Cedric Coward": "1642907",
  "Tre Jones": "1630200",
  "Sam Merrill": "1630241",
  "Nickeil Alexander-Walker": "1629638",
  "Jock Landale": "1629111",
  "Dillon Brooks": "1628415",
};

/**
 * Get NBA.com headshot URL for a player
 * @param playerName - Full player name
 * @returns URL to player headshot or placeholder
 */
export function getPlayerImageUrl(playerName: string): string {
  const nbaId = NBA_PLAYER_IDS[playerName];
  
  if (nbaId) {
    // NBA.com CDN headshot URL format
    return `https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png`;
  }
  
  // Fallback placeholder - using a generic basketball silhouette
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png`;
}

/**
 * Get a smaller version of the player headshot
 * @param playerName - Full player name
 * @returns URL to smaller player headshot
 */
export function getPlayerThumbnailUrl(playerName: string): string {
  const nbaId = NBA_PLAYER_IDS[playerName];
  
  if (nbaId) {
    // NBA.com CDN smaller headshot
    return `https://cdn.nba.com/headshots/nba/latest/260x190/${nbaId}.png`;
  }
  
  return `https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png`;
}

/**
 * Check if we have an NBA ID for a player
 */
export function hasPlayerImage(playerName: string): boolean {
  return playerName in NBA_PLAYER_IDS;
}
