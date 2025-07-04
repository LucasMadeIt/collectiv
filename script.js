let ideas = [];
let voteChart;
let TEAM_ID = null;
const votedMap = new Map();

function showCreateView() {
  toggleViews('create');
}
function showJoinView() {
  toggleViews('join');
}
function goBack() {
  toggleViews('start');
}

function toggleViews(state) {
  document.getElementById('start-page').style.display = state === 'start' ? 'flex' : 'none';
  document.getElementById('create-team-page').style.display = state === 'create' ? 'flex' : 'none';
  document.getElementById('join-team-page').style.display = state === 'join' ? 'flex' : 'none';
  document.getElementById('main-ui').style.display = state === 'main' ? 'block' : 'none';
}

function generateTeamId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getTeamIdFromURL() {
  return new URLSearchParams(window.location.search).get('team');
}

function updateURL(teamId) {
  history.replaceState(null, '', `${location.pathname}?team=${teamId}`);
}

function showTeamId() {
  const el = document.getElementById('team-id-display');
  el.textContent = `Team ID: ${TEAM_ID}`;
  el.style.display = 'block';
}

function copyTeamId() {
  navigator.clipboard.writeText(TEAM_ID).then(() => alert('Team ID copied!'));
}

function setUIForTeam() {
  toggleViews('main');
  showTeamId();
  updateVoteSection();
  updateChart();
}

function createTeam() {
  TEAM_ID = generateTeamId();
  updateURL(TEAM_ID);
  ideas = [];
  votedMap.clear();
  saveData();
  setUIForTeam();
  alert(`Team created! Your Team ID is ${TEAM_ID}`);
}

function joinTeam() {
  const id = document.getElementById('team-invite-link').value.trim();
  if (!id.match(/^[A-Z0-9]{6}$/)) {
    alert('Please enter a valid 6-character Team ID (letters and numbers only).');
    return;
  }
  TEAM_ID = id.toUpperCase();
  const data = JSON.parse(localStorage.getItem(`ideaBoard_${TEAM_ID}`) || '{}');
  ideas = data.ideas || [];
  votedMap.clear();
  if (data.votedMap) {
    for (const [key, value] of Object.entries(data.votedMap)) {
      votedMap.set(key, value);
    }
  }
  updateURL(TEAM_ID);
  setUIForTeam();
}

function saveData() {
  localStorage.setItem(`ideaBoard_${TEAM_ID}`, JSON.stringify({
    ideas,
    votedMap: Object.fromEntries(votedMap)
  }));
}

function addIdea() {
  const titleInput = document.getElementById('idea-title');
  const descInput = document.getElementById('idea-description');
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!TEAM_ID) return alert("Please create or join a team first!");
  if (!title) return alert("Idea title can't be empty.");
  ideas.push({ title, description });
  titleInput.value = '';
  descInput.value = '';
  updateVoteSection();
  updateChart();
  saveData();
}

function voteForIdea(index, type, weight) {
  const upKey = `${index}-up`;
  const downKey = `${index}-down`;

  const currentUp = votedMap.get(upKey) || 0;
  const currentDown = votedMap.get(downKey) || 0;

  if (type === 'up') {
    if (currentUp === weight) {
      votedMap.delete(upKey);
    } else {
      votedMap.set(upKey, weight);
      votedMap.delete(downKey);
    }
  } else {
    if (currentDown === weight) {
      votedMap.delete(downKey);
    } else {
      votedMap.set(downKey, weight);
      votedMap.delete(upKey);
    }
  }

  saveData();
  updateVoteSection();
  updateChart();
}

function removeIdea(index) {
  if (!confirm('Are you sure you want to delete this idea?')) return;
  ideas.splice(index, 1);

  const newMap = new Map();
  votedMap.forEach((value, key) => {
    const [i, dir] = key.split('-');
    const iNum = parseInt(i);
    if (iNum < index) {
      newMap.set(key, value);
    } else if (iNum > index) {
      newMap.set(`${iNum - 1}-${dir}`, value);
    }
  });
  votedMap.clear();
  newMap.forEach((v, k) => votedMap.set(k, v));

  saveData();
  updateVoteSection();
  updateChart();
}

function updateVoteSection() {
  const voteSection = document.getElementById('vote-section');
  const votingHeader = document.getElementById('voting-header');
  voteSection.innerHTML = '';

  if (ideas.length === 0) {
    votingHeader.style.display = 'none';  // Hide "Vote on Ideas" if no ideas
    return;
  } else {
    votingHeader.style.display = 'block'; // Show when at least one idea
  }

  ideas.forEach((idea, index) => {
    const card = document.createElement('div');
    card.className = 'idea-card';

    const upVotes = votedMap.get(`${index}-up`) || 0;
    const downVotes = votedMap.get(`${index}-down`) || 0;
    const netVotes = upVotes - downVotes;

    const votes = [
      { label: '❤️ +3', type: 'up', weight: 3 },
      { label: '👍 +2', type: 'up', weight: 2 },
      { label: '✔️ +1', type: 'up', weight: 1 },
      { label: '❌ -1', type: 'down', weight: 1 },
      { label: '👎 -2', type: 'down', weight: 2 },
      { label: '💔 -3', type: 'down', weight: 3 }
    ];

    card.innerHTML = `
      <button class="remove-x" onclick="removeIdea(${index})">✕</button>
      <h3>${escapeHtml(idea.title)}</h3>
      <p>${escapeHtml(idea.description)}</p>
      <p><strong>Votes:</strong> ${netVotes}</p>
      <div class="vote-buttons-row">
        ${votes.map(v => {
          const key = `${index}-${v.type}`;
          const active = (votedMap.get(key) === v.weight) ? 'active' : '';
          return `<button class="vote-btn ${active}" onclick="voteForIdea(${index}, '${v.type}', ${v.weight})">${v.label}</button>`;
        }).join('')}
      </div>
    `;

    voteSection.appendChild(card);
  });
}

function updateChart() {
  const ctx = document.getElementById('vote-chart').getContext('2d');
  const scores = ideas.map((_, index) => {
    const up = votedMap.get(`${index}-up`) || 0;
    const down = votedMap.get(`${index}-down`) || 0;
    return up - down;
  });

  const sorted = ideas.map((idea, i) => ({ title: idea.title, score: scores[i] }))
    .sort((a, b) => b.score - a.score);

  const labels = sorted.map(i => i.title);
  const data = sorted.map(i => Math.round(i.score));

  if (voteChart) voteChart.destroy();
  voteChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Votes',
        data,
        backgroundColor: 'rgba(0, 255, 255, 0.7)',
        borderColor: '#00ffff',
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#00ffff' }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { color: '#00ffff', stepSize: 1, precision: 0 },
          grid: { color: '#004040' }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#039;');
}

window.onload = () => {
  const id = getTeamIdFromURL();
  if (id) {
    TEAM_ID = id.toUpperCase();
    const data = JSON.parse(localStorage.getItem(`ideaBoard_${TEAM_ID}`) || '{}');
    ideas = data.ideas || [];
    votedMap.clear();
    if (data.votedMap) {
      for (const [key, value] of Object.entries(data.votedMap)) {
        votedMap.set(key, value);
      }
    }
    setUIForTeam();
    updateVoteSection();
    updateChart();
  }
};
