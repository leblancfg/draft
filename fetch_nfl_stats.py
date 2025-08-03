import json
import requests
from datetime import datetime

def fetch_nfl_stats():
    """Fetch NFL player stats from public APIs"""
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # Try ESPN's public API endpoints
    print("Attempting to fetch NFL data from ESPN public API...")
    
    try:
        # ESPN NFL scoreboard endpoint - this is public
        scoreboard_url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
        response = requests.get(scoreboard_url, headers=headers)
        
        if response.status_code == 200:
            print("Successfully connected to ESPN API")
            data = response.json()
            
            # Try to get team and player information
            teams_url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams"
            teams_response = requests.get(teams_url, headers=headers)
            
            if teams_response.status_code == 200:
                teams_data = teams_response.json()
                print(f"Found {len(teams_data.get('sports', [{}])[0].get('leagues', [{}])[0].get('teams', []))} teams")
                
                # Save raw data for inspection
                with open('data/espn_raw_data.json', 'w') as f:
                    json.dump({
                        'scoreboard': data,
                        'teams': teams_data,
                        'timestamp': datetime.now().isoformat()
                    }, f, indent=2)
                
                print("Saved raw ESPN data to data/espn_raw_data.json")
                return True
            
    except Exception as e:
        print(f"Error fetching ESPN data: {e}")
    
    # Try The Sports DB (free API)
    print("\nAttempting to fetch from The Sports DB...")
    try:
        # The Sports DB provides free sports data
        players_url = "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=Tom%20Brady"
        response = requests.get(players_url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("Successfully connected to The Sports DB")
            
            with open('data/sportsdb_sample.json', 'w') as f:
                json.dump(data, f, indent=2)
            
            return True
            
    except Exception as e:
        print(f"Error fetching from The Sports DB: {e}")
    
    return False

if __name__ == "__main__":
    success = fetch_nfl_stats()
    if success:
        print("\nSuccessfully fetched some NFL data. Check the data directory for raw files.")
    else:
        print("\nUnable to fetch live NFL data. The application will use the generated data with real player names.")