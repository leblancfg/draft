// Fantasy Football Draft Assistant - Advanced Statistical Model
let playersData = [];
let draftedPlayers = new Set();

// League configuration
let leagueSettings = {
    size: 12,                    // 8, 10, 12, 14
    scoringType: 'halfPPR',      // standard, halfPPR, PPR
    rosterPositions: {
        QB: 1,
        RB: 2,
        WR: 2,
        TE: 1,
        FLEX: 1,
        K: 1,
        DEF: 1,
        BENCH: 6
    }
};

// User preferences for the model
let modelSettings = {
    riskTolerance: 0.5,          // 0 = floor (safe), 1 = ceiling (risky)
    positionPriority: 'balanced', // balanced, RB-heavy, WR-heavy, elite-QB
    vorpWeight: 0.7,             // How much to weight VORP vs other factors
    consistencyWeight: 0.3,      // How much to value consistency
    injuryWeight: 0.5            // How much to penalize injury risk
};

// Calculate replacement level baselines based on league settings
function calculateReplacementLevels() {
    const starters = leagueSettings.rosterPositions;
    const benchDepth = Math.ceil(leagueSettings.rosterPositions.BENCH / 5); // Rough bench allocation
    
    const replacementRanks = {
        QB: leagueSettings.size * (starters.QB + Math.ceil(benchDepth * 0.5)),
        RB: leagueSettings.size * (starters.RB + starters.FLEX * 0.4 + benchDepth * 1.5),
        WR: leagueSettings.size * (starters.WR + starters.FLEX * 0.4 + benchDepth * 1.5),
        TE: leagueSettings.size * (starters.TE + starters.FLEX * 0.2 + benchDepth * 0.5),
        K: leagueSettings.size * starters.K,
        DEF: leagueSettings.size * starters.DEF
    };
    
    const replacementLevels = {};
    
    Object.keys(replacementRanks).forEach(position => {
        const positionPlayers = playersData
            .filter(p => p.position === position && !draftedPlayers.has(p.id))
            .sort((a, b) => b.stats.totalPoints - a.stats.totalPoints);
        
        const replacementRank = Math.min(replacementRanks[position] - 1, positionPlayers.length - 1);
        replacementLevels[position] = positionPlayers[replacementRank]?.stats.totalPoints || 0;
    });
    
    return replacementLevels;
}

// Calculate advanced statistics for each player
function calculateAdvancedStats(player) {
    const basePoints = player.stats.totalPoints;
    const avgPoints = player.stats.averagePoints;
    const consistency = player.stats.consistency;
    
    // Calculate floor and ceiling (simplified - in reality would use historical data)
    const volatility = 1 - consistency;
    const stdDev = avgPoints * volatility * 0.5; // Approximation
    
    const floor = Math.max(0, avgPoints - 1.5 * stdDev) * 17; // Season floor
    const ceiling = (avgPoints + 1.5 * stdDev) * 17; // Season ceiling
    
    // Adjust for injury risk
    const injuryAdjustment = 1 - (player.injury.riskScore * modelSettings.injuryWeight);
    
    return {
        floor: floor * injuryAdjustment,
        ceiling: ceiling * injuryAdjustment,
        volatility: volatility,
        adjustedProjection: basePoints * injuryAdjustment
    };
}

// Calculate VORP for a player
function calculateVORP(player, replacementLevels) {
    const advStats = calculateAdvancedStats(player);
    const replacementPoints = replacementLevels[player.position] || 0;
    
    // Calculate raw VORP
    const rawVORP = advStats.adjustedProjection - replacementPoints;
    
    // Calculate risk-adjusted value based on user preference
    const riskAdjustedProjection = advStats.floor + 
        (advStats.ceiling - advStats.floor) * modelSettings.riskTolerance;
    
    const riskAdjustedVORP = riskAdjustedProjection - replacementPoints;
    
    return {
        rawVORP: Math.max(0, rawVORP),
        riskAdjustedVORP: Math.max(0, riskAdjustedVORP),
        ...advStats
    };
}

// Calculate positional scarcity
function calculatePositionalScarcity() {
    const scarcity = {};
    
    ['QB', 'RB', 'WR', 'TE'].forEach(position => {
        const positionPlayers = playersData
            .filter(p => p.position === position && !draftedPlayers.has(p.id))
            .sort((a, b) => b.stats.totalPoints - a.stats.totalPoints)
            .slice(0, 20); // Top 20 undrafted
        
        if (positionPlayers.length >= 2) {
            // Calculate average drop-off between tiers
            let totalDropoff = 0;
            for (let i = 0; i < positionPlayers.length - 1; i++) {
                totalDropoff += positionPlayers[i].stats.totalPoints - positionPlayers[i + 1].stats.totalPoints;
            }
            scarcity[position] = totalDropoff / (positionPlayers.length - 1);
        } else {
            scarcity[position] = 0;
        }
    });
    
    // Normalize scarcity scores
    const maxScarcity = Math.max(...Object.values(scarcity));
    Object.keys(scarcity).forEach(pos => {
        scarcity[pos] = scarcity[pos] / maxScarcity;
    });
    
    scarcity['K'] = 0.1;  // Kickers have low scarcity
    scarcity['DEF'] = 0.2; // Defenses have low-medium scarcity
    
    return scarcity;
}

// Main ranking algorithm
function calculatePlayerScore(player, replacementLevels, positionalScarcity) {
    const vorpStats = calculateVORP(player, replacementLevels);
    
    // Base score from VORP
    let score = vorpStats.riskAdjustedVORP * modelSettings.vorpWeight;
    
    // Consistency bonus/penalty
    const consistencyFactor = player.stats.consistency * modelSettings.consistencyWeight;
    score += vorpStats.adjustedProjection * consistencyFactor * 0.1;
    
    // Positional scarcity multiplier
    const scarcityMultiplier = 1 + (positionalScarcity[player.position] || 0) * 0.3;
    score *= scarcityMultiplier;
    
    // Position priority adjustments
    if (modelSettings.positionPriority === 'RB-heavy' && player.position === 'RB') {
        score *= 1.15;
    } else if (modelSettings.positionPriority === 'WR-heavy' && player.position === 'WR') {
        score *= 1.15;
    } else if (modelSettings.positionPriority === 'elite-QB' && player.position === 'QB' && 
               vorpStats.rawVORP > 50) {
        score *= 1.2;
    }
    
    // Store calculated stats for display
    player.advancedStats = {
        vorp: vorpStats.rawVORP,
        riskAdjustedVORP: vorpStats.riskAdjustedVORP,
        floor: vorpStats.floor,
        ceiling: vorpStats.ceiling,
        volatility: vorpStats.volatility,
        scarcityFactor: scarcityMultiplier,
        finalScore: score
    };
    
    return score;
}

// Update all player rankings
function updateRankings() {
    const replacementLevels = calculateReplacementLevels();
    const positionalScarcity = calculatePositionalScarcity();
    
    playersData.forEach(player => {
        if (!draftedPlayers.has(player.id)) {
            player.score = calculatePlayerScore(player, replacementLevels, positionalScarcity);
        } else {
            player.score = -1; // Drafted players get negative score
        }
    });
    
    playersData.sort((a, b) => b.score - a.score);
    
    displayRankings();
    displayModelInfo();
    updateDraftDisplay(); // Also update draft tracker
}

// Display functions
function displayRankings(positionFilter = 'ALL') {
    const tbody = document.getElementById('rankings-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const filteredPlayers = playersData.filter(player => 
        !draftedPlayers.has(player.id) && 
        (positionFilter === 'ALL' || player.position === positionFilter)
    ).slice(0, 100); // Top 100 undrafted
    
    filteredPlayers.forEach((player, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${player.name}</td>
            <td>${player.position}</td>
            <td>${player.team}</td>
            <td>${player.advancedStats?.vorp?.toFixed(1) || '0'}</td>
            <td>${player.advancedStats?.floor?.toFixed(0) || '0'}</td>
            <td>${player.advancedStats?.ceiling?.toFixed(0) || '0'}</td>
            <td>${(player.stats.consistency * 100).toFixed(0)}%</td>
            <td>${(player.injury.riskScore * 100).toFixed(0)}%</td>
            <td>${player.score?.toFixed(1) || '0'}</td>
        `;
        
        if (player.injury.riskScore > 0.4) {
            row.classList.add('high-injury-risk');
        }
    });
}

function displayModelInfo() {
    const modelInfo = document.getElementById('model-info');
    if (!modelInfo) return;
    
    const replacementLevels = calculateReplacementLevels();
    
    modelInfo.innerHTML = `
        <h3>Model Configuration</h3>
        <p><strong>League Size:</strong> ${leagueSettings.size} teams</p>
        <p><strong>Scoring:</strong> ${leagueSettings.scoringType}</p>
        <p><strong>Risk Profile:</strong> ${modelSettings.riskTolerance < 0.3 ? 'Conservative (Floor)' : 
                                           modelSettings.riskTolerance > 0.7 ? 'Aggressive (Ceiling)' : 
                                           'Balanced'}</p>
        <h4>Replacement Levels (VORP Baseline)</h4>
        <ul>
            ${Object.entries(replacementLevels).map(([pos, points]) => 
                `<li>${pos}: ${points.toFixed(0)} points</li>`
            ).join('')}
        </ul>
    `;
}

// Draft tracker variables
let currentPositionFilter = 'ALL';
let recentPicks = [];

// Event listeners
function initializeEventListeners() {
    // League size (now number input)
    document.getElementById('league-size')?.addEventListener('input', (e) => {
        leagueSettings.size = parseInt(e.target.value) || 12;
        updateRankings();
        
        // Update draft board if it's active
        if (document.getElementById('draft-pick').classList.contains('active') && window.initializeDraftBoard) {
            window.initializeDraftBoard();
        }
    });
    
    // Scoring type
    document.getElementById('scoring-type')?.addEventListener('change', (e) => {
        leagueSettings.scoringType = e.target.value;
        updateRankings();
    });
    
    // Risk tolerance slider
    document.getElementById('risk-tolerance')?.addEventListener('input', (e) => {
        modelSettings.riskTolerance = parseFloat(e.target.value);
        document.getElementById('risk-value').textContent = e.target.value;
        updateRankings();
    });
    
    // Position priority
    document.getElementById('position-priority')?.addEventListener('change', (e) => {
        modelSettings.positionPriority = e.target.value;
        updateRankings();
    });
    
    // Weight sliders
    document.getElementById('vorp-weight')?.addEventListener('input', (e) => {
        modelSettings.vorpWeight = parseFloat(e.target.value);
        document.getElementById('vorp-weight-value').textContent = e.target.value;
        updateRankings();
    });
    
    document.getElementById('consistency-weight')?.addEventListener('input', (e) => {
        modelSettings.consistencyWeight = parseFloat(e.target.value);
        document.getElementById('consistency-weight-value').textContent = e.target.value;
        updateRankings();
    });
    
    document.getElementById('injury-weight')?.addEventListener('input', (e) => {
        modelSettings.injuryWeight = parseFloat(e.target.value);
        document.getElementById('injury-weight-value').textContent = e.target.value;
        updateRankings();
    });
    
    // Position filter
    document.getElementById('position-filter')?.addEventListener('change', (e) => {
        displayRankings(e.target.value);
    });
    
    // Draft pick tab - search removed in favor of drag-and-drop interface
}

// Search functionality with fuzzy matching
function searchPlayers(event) {
    const searchTerm = event.target.value.toLowerCase();
    const resultsDiv = document.getElementById('search-results');
    
    if (!searchTerm) {
        resultsDiv.innerHTML = '';
        return;
    }
    
    // Fuzzy search - match if search term appears anywhere in name
    const matches = playersData
        .filter(p => !draftedPlayers.has(p.id) && 
                     p.name.toLowerCase().includes(searchTerm))
        .sort((a, b) => {
            // Prioritize matches at start of name
            const aStart = a.name.toLowerCase().indexOf(searchTerm);
            const bStart = b.name.toLowerCase().indexOf(searchTerm);
            if (aStart === 0 && bStart !== 0) return -1;
            if (bStart === 0 && aStart !== 0) return 1;
            // Then by score
            return (b.score || 0) - (a.score || 0);
        })
        .slice(0, 8);
    
    resultsDiv.innerHTML = matches.map(player => `
        <div class="search-result" onclick="markPlayerDrafted(${player.id})">
            <div class="player-info">
                <strong>${player.name}</strong> - ${player.position} (${player.team})
                <div class="player-stats">
                    VORP: ${player.advancedStats?.vorp?.toFixed(0) || '0'} | 
                    Risk: ${(player.injury.riskScore * 100).toFixed(0)}%
                </div>
            </div>
        </div>
    `).join('');
}

// Mark player as drafted
function markPlayerDrafted(playerId) {
    const player = playersData.find(p => p.id === playerId);
    if (!player) return;
    
    draftedPlayers.add(playerId);
    
    // Add to recent picks
    const pickNumber = draftedPlayers.size;
    recentPicks.unshift({
        pick: pickNumber,
        player: player
    });
    
    // Keep only last 20 picks
    if (recentPicks.length > 20) {
        recentPicks = recentPicks.slice(0, 20);
    }
    
    updateRankings();
    updateDraftDisplay();
}

// Update draft display
function updateDraftDisplay() {
    // Update counts
    document.getElementById('drafted-count').textContent = draftedPlayers.size;
    document.getElementById('current-pick').textContent = draftedPlayers.size + 1;
    
    // Update recent picks
    const recentPicksList = document.getElementById('recent-picks-list');
    recentPicksList.innerHTML = recentPicks.map(pick => `
        <div class="recent-pick">
            <span class="pick-number">#${pick.pick}</span>
            ${pick.player.name} (${pick.player.position}, ${pick.player.team})
        </div>
    `).join('');
    
    // Update best available
    displayBestAvailable(currentPositionFilter);
}

// Display best available players
function displayBestAvailable(position = 'ALL') {
    const bestAvailableDiv = document.getElementById('best-available');
    
    const filteredPlayers = playersData
        .filter(p => !draftedPlayers.has(p.id) && 
                     (position === 'ALL' || p.position === position))
        .slice(0, 50);
    
    // Add header row
    let html = `
        <div class="best-available-header">
            <span>Rank</span>
            <span>Player</span>
            <span>Pos</span>
            <span>Team</span>
            <span>VORP</span>
            <span>Risk</span>
            <span>Score</span>
        </div>
    `;
    
    html += filteredPlayers.map((player, idx) => {
        const overallRank = position === 'ALL' ? idx + 1 : 
            playersData.filter(p => !draftedPlayers.has(p.id)).indexOf(player) + 1;
        
        return `
            <div class="player-row ${player.injury.riskScore > 0.4 ? 'high-risk' : ''}" 
                 onclick="markPlayerDrafted(${player.id})">
                <span class="rank">${overallRank}</span>
                <span class="player-name">${player.name}</span>
                <span class="player-position">${player.position}</span>
                <span class="player-team">${player.team}</span>
                <span class="player-vorp">${player.advancedStats?.vorp?.toFixed(0) || '0'}</span>
                <span class="player-risk">${(player.injury.riskScore * 100).toFixed(0)}%</span>
                <span class="player-score">${player.score?.toFixed(1) || '0'}</span>
            </div>
        `;
    }).join('');
    
    bestAvailableDiv.innerHTML = html;
}

// Position filter for draft tracker
function filterPosition(position) {
    currentPositionFilter = position;
    
    // Update active tab
    document.querySelectorAll('.pos-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent === position || 
                                       (position === 'ALL' && tab.textContent === 'All'));
    });
    
    displayBestAvailable(position);
}

// Tooltip functionality
function showTooltip(tooltipId, event) {
    // Prevent default and stop propagation
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const tooltip = document.getElementById(tooltipId);
    if (!tooltip) {
        console.error('Tooltip not found:', tooltipId);
        return;
    }
    
    // Get current state
    const isHidden = tooltip.classList.contains('hidden');
    
    // Hide all other tooltips
    document.querySelectorAll('.tooltip').forEach(t => {
        if (t.id !== tooltipId) {
            t.classList.add('hidden');
        }
    });
    
    // Toggle this tooltip
    if (isHidden) {
        tooltip.classList.remove('hidden');
    } else {
        tooltip.classList.add('hidden');
    }
}

// Make showTooltip available globally
window.showTooltip = showTooltip;

// Hide tooltips when clicking outside
document.addEventListener('click', (e) => {
    // Don't hide if clicking on icon or tooltip
    if (!e.target.classList.contains('info-icon') && !e.target.closest('.tooltip')) {
        document.querySelectorAll('.tooltip').forEach(t => t.classList.add('hidden'));
    }
});

// Tab functionality
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-button');
    
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.id === tabName);
    });
    
    buttons.forEach(button => {
        button.classList.toggle('active', 
            button.getAttribute('onclick').includes(tabName));
    });
}

// Load player data
async function loadPlayerData() {
    try {
        const response = await fetch('data/players.json');
        playersData = await response.json();
        updateRankings();
    } catch (error) {
        console.error('Error loading player data:', error);
        alert('Error loading player data. Please refresh the page.');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadPlayerData();
});