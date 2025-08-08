# Fantasy Football Draft Assistant

Your smart companion for winning your fantasy football draft! 🏈

## What is this?

This is a free tool that helps you make better picks during your fantasy football draft. It ranks players based on their past performance, how often they get injured, and how consistent they are. Think of it as having an expert sitting next to you during your draft, helping you decide who to pick next.

## How to Use It

### Getting Started
1. **Open the Tool**: Just click on the link to open the draft assistant in your web browser (like Chrome, Safari, or Firefox)
2. **Two Main Sections**: You'll see two tabs at the top - "Control Panel" and "Draft Pick"

### Using the Control Panel
This is where you tell the tool what's important to you:
- **Injury Risk**: Move the slider to decide how much you care about players staying healthy
- **Performance**: Adjust how much you value high-scoring players  
- **Consistency**: Set how important it is that players score points every week (not just occasionally)

Don't worry about getting these perfect - you can change them anytime!

### Making Your Draft Picks
1. Click on the "Draft Pick" tab
2. You'll see a list of all available players ranked from best to worst
3. **Filter by Position**: Use the buttons to see only quarterbacks, running backs, etc.
4. **When Someone Gets Drafted**: Click the "Draft" button next to their name to remove them from your list
5. **Your Pick**: Look at the top players remaining - these are your best options!

## Why Use This Tool?

- **No Math Required**: The tool does all the calculations for you
- **Stay Organized**: Keep track of who's been drafted without pen and paper
- **Make Smart Picks**: Based on real player data, not just gut feelings
- **Completely Free**: No sign-ups, no payments, just open and use

## Need Help?

If something isn't working, try refreshing your browser. The tool works best on a computer or tablet (phones work too, but the screen is small).

---

### Technical Details
#### Data Update

To update player data:

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 scrape_nfl_data.py
```

#### Technologies Used

- HTML5, CSS3, Vanilla JavaScript
- JSON for data storage
- GitHub Pages compatible

#### Model Parameters

- Injury Risk Weight: 0-2 scale
- Performance Weight: 0-2 scale  
- Consistency Weight: 0-2 scale


