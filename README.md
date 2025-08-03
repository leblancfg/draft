# Fantasy Football Draft Assistant

A static web application for fantasy football draft assistance with injury risk modeling and player rankings.

## Features

- **Control Panel Tab**: Adjust model weights for injury risk, performance, and consistency
- **Draft Pick Tab**: Real-time player rankings with ability to mark players as drafted
- **Statistical Model**: Combines player performance metrics with injury history
- **Position Filtering**: Filter players by position (QB, RB, WR, TE, K, DEF)
- **Live Updates**: Rankings update instantly as you adjust model parameters

## Setup

1. Clone this repository
2. Open `index.html` in a web browser
3. The app will load with mock NFL player data

## Data Update

To update player data:

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 scrape_nfl_data.py
```

## Model Parameters

- **Injury Risk Weight**: How much injury history affects player ranking (0-2)
- **Performance Weight**: How much average points affect ranking (0-2)
- **Consistency Weight**: How much scoring consistency affects ranking (0-2)

## GitHub Pages Deployment

This site is designed to work with GitHub Pages. Simply enable GitHub Pages in your repository settings and point it to the main branch.

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- JSON for data storage