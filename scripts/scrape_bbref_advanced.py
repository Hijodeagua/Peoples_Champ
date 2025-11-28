"""
Basketball Reference Advanced Stats Scraper

This script scrapes advanced stats from Basketball Reference for specified seasons.
Run this script to generate CSV files with BPM, VORP, PER, WS/48, etc.

Usage:
    python scrape_bbref_advanced.py

Output:
    - data/advanced_stats_2024-25.csv
    - data/advanced_stats_2023-24.csv
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import time

def scrape_advanced_stats(season_year):
    """
    Scrape advanced stats for a given season from Basketball Reference.
    
    Args:
        season_year: The ending year of the season (e.g., 2025 for 2024-25 season)
    
    Returns:
        DataFrame with advanced stats
    """
    url = f"https://www.basketball-reference.com/leagues/NBA_{season_year}_advanced.html"
    
    print(f"Scraping {url}...")
    
    # Add headers to avoid being blocked
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"Failed to fetch data: {response.status_code}")
        return None
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find the advanced stats table
    table = soup.find('table', {'id': 'advanced_stats'})
    
    if not table:
        print("Could not find advanced stats table")
        return None
    
    # Parse the table
    rows = []
    headers = []
    
    # Get headers
    thead = table.find('thead')
    if thead:
        header_row = thead.find_all('tr')[-1]  # Get last header row
        headers = [th.get_text() for th in header_row.find_all('th')]
    
    # Get data rows
    tbody = table.find('tbody')
    if tbody:
        for tr in tbody.find_all('tr', class_=lambda x: x != 'thead'):
            if tr.find('th', {'scope': 'row'}):  # Skip header rows within tbody
                row_data = []
                for td in tr.find_all(['th', 'td']):
                    row_data.append(td.get_text().strip())
                if row_data:
                    rows.append(row_data)
    
    # Create DataFrame
    df = pd.DataFrame(rows, columns=headers)
    
    # Add season column
    df['Season'] = f"{season_year-1}-{str(season_year)[-2:]}"
    
    return df

def main():
    """Main function to scrape multiple seasons and save to CSV."""
    
    seasons = [2025, 2024]  # 2024-25 and 2023-24 seasons
    
    for season in seasons:
        print(f"\nProcessing {season-1}-{str(season)[-2:]} season...")
        
        df = scrape_advanced_stats(season)
        
        if df is not None:
            # Select key columns
            key_columns = [
                'Player', 'Pos', 'Age', 'Tm', 'G', 'MP',
                'PER', 'TS%', '3PAr', 'FTr', 'ORB%', 'DRB%', 'TRB%',
                'AST%', 'STL%', 'BLK%', 'TOV%', 'USG%',
                'OWS', 'DWS', 'WS', 'WS/48',
                'OBPM', 'DBPM', 'BPM', 'VORP',
                'Season'
            ]
            
            # Filter to only existing columns
            available_columns = [col for col in key_columns if col in df.columns]
            df_filtered = df[available_columns]
            
            # Save to CSV
            output_file = f"../data/advanced_stats_{season-1}-{str(season)[-2:]}.csv"
            df_filtered.to_csv(output_file, index=False)
            print(f"Saved to {output_file}")
            print(f"Total players: {len(df_filtered)}")
        
        # Be respectful to the server
        time.sleep(3)
    
    print("\nDone!")

if __name__ == "__main__":
    # Check if required packages are installed
    try:
        import requests
        import bs4
        import pandas
    except ImportError as e:
        print("Missing required package. Please install:")
        print("pip install requests beautifulsoup4 pandas")
        exit(1)
    
    main()
