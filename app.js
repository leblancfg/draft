let playersData = [];
let draftedPlayers = new Set();
let modelWeights = {
    injury: 1,
    performance: 1,
    consistency: 1
};

function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-button');
    
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.id === tabName);
    });
    
    buttons.forEach(button => {
        button.classList.toggle('active', 
            button.onclick.toString().includes(tabName));
    });
}

document.getElementById('injury-weight').addEventListener('input', (e) => {
    document.getElementById('injury-weight-value').textContent = e.target.value;
    modelWeights.injury = parseFloat(e.target.value);
});

document.getElementById('performance-weight').addEventListener('input', (e) => {
    document.getElementById('performance-weight-value').textContent = e.target.value;
    modelWeights.performance = parseFloat(e.target.value);
});

document.getElementById('consistency-weight').addEventListener('input', (e) => {
    document.getElementById('consistency-weight-value').textContent = e.target.value;
    modelWeights.consistency = parseFloat(e.target.value);
});

document.getElementById('update-model').addEventListener('click', updateModel);
document.getElementById('player-search').addEventListener('input', searchPlayers);

async function loadPlayerData() {
    try {
        const response = await fetch('data/players.json');
        playersData = await response.json();
        updateModel();
        displayModelInfo();
    } catch (error) {
        console.error('Error loading player data:', error);
        alert('Error loading player data. Please refresh the page.');
    }
}


function calculatePlayerScore(player) {
    const performanceScore = player.stats.averagePoints * 10;
    const consistencyScore = player.stats.consistency * 100;
    const injuryPenalty = player.injury.riskScore * 50;
    
    const score = (performanceScore * modelWeights.performance) +
                 (consistencyScore * modelWeights.consistency) -
                 (injuryPenalty * modelWeights.injury);
    
    return Math.max(0, score);
}

function updateModel() {
    const positionFilter = document.getElementById('position-filter').value;
    
    playersData.forEach(player => {
        player.score = calculatePlayerScore(player);
    });
    
    playersData.sort((a, b) => b.score - a.score);
    
    displayRankings(positionFilter);
    displayModelInfo();
}

function displayModelInfo() {
    const modelInfo = document.getElementById('model-info');
    modelInfo.innerHTML = `
        <p><strong>Total Players:</strong> ${playersData.length}</p>
        <p><strong>Model Weights:</strong></p>
        <ul>
            <li>Injury Risk: ${modelWeights.injury}</li>
            <li>Performance: ${modelWeights.performance}</li>
            <li>Consistency: ${modelWeights.consistency}</li>
        </ul>
        <p><strong>Last Updated:</strong> ${new Date().toLocaleString()}</p>
    `;
}

function displayRankings(positionFilter = 'all') {
    const rankingsDiv = document.getElementById('player-rankings');
    const availablePlayers = playersData.filter(player => 
        !draftedPlayers.has(player.id) && 
        (positionFilter === 'all' || player.position === positionFilter)
    );
    
    const topPlayers = availablePlayers.slice(0, 10);
    
    rankingsDiv.innerHTML = topPlayers.map((player, index) => `
        <div class="player-card">
            <div class="player-name">${index + 1}. ${player.name} (${player.position} - ${player.team})</div>
            <div class="player-stats">
                <div class="stat-item">
                    <span class="stat-label">Score:</span>
                    <span class="stat-value">${player.score.toFixed(1)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Avg Points:</span>
                    <span class="stat-value">${player.stats.averagePoints.toFixed(1)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Consistency:</span>
                    <span class="stat-value">${(player.stats.consistency * 100).toFixed(0)}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Injury Risk:</span>
                    <span class="stat-value">${(player.injury.riskScore * 100).toFixed(0)}%</span>
                </div>
            </div>
        </div>
    `).join('');
}

function searchPlayers(e) {
    const searchTerm = e.target.value.toLowerCase();
    const searchResults = document.getElementById('search-results');
    
    if (searchTerm.length < 2) {
        searchResults.innerHTML = '';
        return;
    }
    
    const matches = playersData.filter(player => 
        player.name.toLowerCase().includes(searchTerm) &&
        !draftedPlayers.has(player.id)
    ).slice(0, 10);
    
    searchResults.innerHTML = matches.map(player => `
        <div class="search-result-item" onclick="markPlayerDrafted(${player.id})">
            ${player.name} (${player.position} - ${player.team})
        </div>
    `).join('');
}

function markPlayerDrafted(playerId) {
    const player = playersData.find(p => p.id === playerId);
    if (player && !draftedPlayers.has(playerId)) {
        draftedPlayers.add(playerId);
        updateDraftedList();
        updateModel();
        document.getElementById('player-search').value = '';
        document.getElementById('search-results').innerHTML = '';
    }
}

function updateDraftedList() {
    const draftedList = document.getElementById('drafted-players-list');
    const draftedPlayersList = Array.from(draftedPlayers).map(id => 
        playersData.find(p => p.id === id)
    ).filter(Boolean);
    
    draftedList.innerHTML = draftedPlayersList.map(player => `
        <li>${player.name} (${player.position} - ${player.team})</li>
    `).join('');
}

window.onload = () => {
    loadPlayerData();
};