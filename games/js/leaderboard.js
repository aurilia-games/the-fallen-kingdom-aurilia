
"use strict";

// THE FALLEN KINGDOM — ROYAL LEADERBOARD

const countdown = document.getElementById("countdown");
const leaderboardBody = document.getElementById("leaderboard-body");

function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map(value => String(value).padStart(2, "0"))
    .join(":");
}

function renderLeaderboard() {
  const system = window.AuriliaKnight;

  if (!system?.getLeaderboardData) {
    countdown.textContent = "--:--:--";
    leaderboardBody.innerHTML =
      '<tr><td colspan="3" class="empty">Royal Archive unavailable.</td></tr>';
    return;
  }

  const data = system.getLeaderboardData();

  countdown.textContent = formatTime(data.remainingMs);

  leaderboardBody.replaceChildren();

  if (!data.rankings.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 3;
    cell.className = "empty";
    cell.textContent = "Awaiting the Royal Knights...";

    row.appendChild(cell);
    leaderboardBody.appendChild(row);
    return;
  }

  data.rankings.forEach(player => {
    const row = document.createElement("tr");

    const rank = document.createElement("td");
    rank.textContent = player.position;

    const name = document.createElement("td");
    name.textContent = player.name;

    const xp = document.createElement("td");
    xp.textContent = `${player.xp} XP`;

    row.append(rank, name, xp);
    leaderboardBody.appendChild(row);
  });
}

// Update the countdown and ranking every second.
renderLeaderboard();
setInterval(renderLeaderboard, 1000);
