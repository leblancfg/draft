// Draft Board functionality with drag-and-drop
let teamBoards = [];
let draggedPlayer = null;

// Initialize draft board
function initializeDraftBoard() {
    // Update position limits display
    updatePositionLimits();
    
    // Initialize team boards
    initializeTeamBoards();
    
    // Display available players
    displayAvailablePlayers(currentPositionFilter);
}

// Update position limits display
function updatePositionLimits() {
    document.getElementById('qb-limit').textContent = leagueSettings.rosterPositions.QB;
    document.getElementById('rb-limit').textContent = leagueSettings.rosterPositions.RB;
    document.getElementById('wr-limit').textContent = leagueSettings.rosterPositions.WR;
    document.getElementById('te-limit').textContent = leagueSettings.rosterPositions.TE;
    document.getElementById('flex-limit').textContent = leagueSettings.rosterPositions.FLEX;
    document.getElementById('k-limit').textContent = leagueSettings.rosterPositions.K;
    document.getElementById('def-limit').textContent = leagueSettings.rosterPositions.DEF;
    document.getElementById('bench-limit').textContent = leagueSettings.rosterPositions.BENCH;
}

// Initialize team boards
function initializeTeamBoards() {
    const teamsContainer = document.getElementById('teams-container');
    teamsContainer.innerHTML = '';
    teamBoards = [];
    
    for (let i = 0; i < leagueSettings.size; i++) {
        const teamId = `team-${i + 1}`;
        const teamBoard = {
            id: teamId,
            name: `Team ${i + 1}`,
            roster: {
                QB: [],
                RB: [],
                WR: [],
                TE: [],
                FLEX: [],
                K: [],
                DEF: [],
                BENCH: []
            }
        };
        teamBoards.push(teamBoard);
        
        const teamElement = createTeamBoardElement(teamBoard);
        teamsContainer.appendChild(teamElement);
    }
    
    // Add drag listeners to roster slots
    addDropListeners();
}

// Create team board HTML element
function createTeamBoardElement(team) {
    const div = document.createElement('div');
    div.className = 'team-board';
    div.id = team.id;
    
    div.innerHTML = `
        <h4>${team.name}</h4>
        <div class="team-roster">
            ${createRosterSlots('QB', leagueSettings.rosterPositions.QB)}
            ${createRosterSlots('RB', leagueSettings.rosterPositions.RB)}
            ${createRosterSlots('WR', leagueSettings.rosterPositions.WR)}
            ${createRosterSlots('TE', leagueSettings.rosterPositions.TE)}
            ${createRosterSlots('FLEX', leagueSettings.rosterPositions.FLEX)}
            ${createRosterSlots('K', leagueSettings.rosterPositions.K)}
            ${createRosterSlots('DEF', leagueSettings.rosterPositions.DEF)}
            ${createRosterSlots('BENCH', leagueSettings.rosterPositions.BENCH)}
        </div>
    `;
    
    return div;
}

// Create roster slots HTML
function createRosterSlots(position, count) {
    let slots = '';
    for (let i = 0; i < count; i++) {
        slots += `
            <div class="roster-slot" data-position="${position}" data-slot="${i}">
                <div class="slot-label">${position}${count > 1 ? ` ${i + 1}` : ''}</div>
            </div>
        `;
    }
    return slots;
}

// Display available players
function displayAvailablePlayers(position = 'ALL') {
    const playerPool = document.getElementById('player-pool');
    
    const filteredPlayers = playersData
        .filter(p => !draftedPlayers.has(p.id) && 
                     (position === 'ALL' || p.position === position))
        .slice(0, 50);
    
    playerPool.innerHTML = filteredPlayers.map((player, index) => {
        const overallRank = playersData.findIndex(p => p.id === player.id) + 1;
        return `
            <div class="player-card" draggable="true" data-player-id="${player.id}">
                <div class="player-name">
                    <span>${player.name}</span>
                    <a href="https://www.nfl.com/players/${player.name.toLowerCase().replace(/[\s']/g, '-')}/" 
                       target="_blank" class="player-link">NFL ↗</a>
                </div>
                <div class="player-info">
                    <span>${player.position} - ${player.team}</span>
                    <span class="player-rank">#${overallRank}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Add drag event listeners
    addDragListeners();
}

// Add drag event listeners to player cards
function addDragListeners() {
    document.querySelectorAll('.player-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
}

// Add drop event listeners to roster slots
function addDropListeners() {
    document.querySelectorAll('.roster-slot').forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);
        slot.addEventListener('dragleave', handleDragLeave);
    });
}

// Drag event handlers
function handleDragStart(e) {
    draggedPlayer = e.target.closest('.player-card');
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.roster-slot').forEach(slot => {
        slot.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const slot = e.target.closest('.roster-slot');
    if (slot && !slot.classList.contains('filled') && !slot.classList.contains('disabled')) {
        slot.classList.add('drag-over');
    }
    
    return false;
}

function handleDragLeave(e) {
    const slot = e.target.closest('.roster-slot');
    if (slot) {
        slot.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const slot = e.target.closest('.roster-slot');
    if (!slot || slot.classList.contains('filled') || slot.classList.contains('disabled')) {
        return false;
    }
    
    const playerId = draggedPlayer.dataset.playerId;
    const player = playersData.find(p => p.id === playerId);
    const position = slot.dataset.position;
    const teamBoard = slot.closest('.team-board');
    const teamId = teamBoard.id;
    
    // Check if player can be placed in this slot
    if (!canPlacePlayer(player, position)) {
        alert(`${player.name} (${player.position}) cannot be placed in ${position} slot`);
        slot.classList.remove('drag-over');
        return false;
    }
    
    // Draft the player
    draftPlayerToTeam(player, teamId, position, slot);
    
    return false;
}

// Check if player can be placed in position
function canPlacePlayer(player, slotPosition) {
    if (slotPosition === 'BENCH') return true;
    if (slotPosition === player.position) return true;
    if (slotPosition === 'FLEX' && ['RB', 'WR', 'TE'].includes(player.position)) return true;
    return false;
}

// Draft player to specific team and slot
function draftPlayerToTeam(player, teamId, position, slot) {
    // Mark as drafted
    draftedPlayers.add(player.id);
    
    // Update slot UI
    slot.classList.add('filled');
    slot.classList.remove('drag-over');
    slot.innerHTML = `
        <div class="slot-label">${position}</div>
        <div class="player-name">${player.name}</div>
        <div class="player-info">${player.position} - ${player.team}</div>
    `;
    
    // Update team roster
    const team = teamBoards.find(t => t.id === teamId);
    if (team) {
        team.roster[position].push(player);
    }
    
    // Update displays
    updateRankings();
    checkPositionLimits(teamId);
}

// Check and update position limits for a team
function checkPositionLimits(teamId) {
    const team = teamBoards.find(t => t.id === teamId);
    if (!team) return;
    
    const teamElement = document.getElementById(teamId);
    
    // Check each position
    Object.keys(leagueSettings.rosterPositions).forEach(position => {
        const limit = leagueSettings.rosterPositions[position];
        const filled = team.roster[position].length;
        
        if (filled >= limit) {
            // Disable remaining slots for this position
            teamElement.querySelectorAll(`.roster-slot[data-position="${position}"]`).forEach(slot => {
                if (!slot.classList.contains('filled')) {
                    slot.classList.add('disabled');
                }
            });
        }
    });
}

// Override the existing position filter function
window.filterPosition = function(position) {
    currentPositionFilter = position;
    
    // Update active tab
    document.querySelectorAll('.pos-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent === position || 
                                       (position === 'ALL' && tab.textContent === 'All'));
    });
    
    displayAvailablePlayers(position);
};

// Override updateDraftDisplay to use new functionality
window.updateDraftDisplay = function() {
    displayAvailablePlayers(currentPositionFilter);
};

// Initialize draft board when tab is shown
const originalShowTab = window.showTab;
window.showTab = function(tabName) {
    originalShowTab(tabName);
    if (tabName === 'draft-pick' && teamBoards.length === 0) {
        initializeDraftBoard();
    }
};

// Initialize on first load if draft tab is active
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (document.getElementById('draft-pick').classList.contains('active')) {
            initializeDraftBoard();
        }
    }, 100);
});