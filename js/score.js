const RESULTS_KEY = "reactionGameLastResults";
const BEST_SCORE_KEY = "reactionGameBestScore";

const averageReaction = document.getElementById("averageReaction");
const bestReaction = document.getElementById("bestReaction");
const totalMisses = document.getElementById("totalMisses");
const difficultyUsed = document.getElementById("difficultyUsed");
const successfulHits = document.getElementById("successfulHits");
const totalRounds = document.getElementById("totalRounds");
const personalBestAverage = document.getElementById("personalBestAverage");
const personalBestDetails = document.getElementById("personalBestDetails");
const performanceMessage = document.getElementById("performanceMessage");
const performanceHint = document.getElementById("performanceHint");
const historyList = document.getElementById("historyList");

function readStorage(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
}

function formatTime(value) {
    if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
        return "--";
    }
    return `${value.toFixed(3)} s`;
}

function getPerformanceText(average, misses) {
    if (!average || average <= 0) {
        return {
            title: "No completed hits yet",
            hint: "Play a full game and your measured reaction times will appear here."
        };
    }

    if (average < 0.25 && misses <= 1) {
        return {
            title: "Excellent reflexes",
            hint: "Fast and consistent performance. Try hard mode to push yourself further."
        };
    }

    if (average < 0.35 && misses <= 2) {
        return {
            title: "Strong performance",
            hint: "Good balance of speed and control. Aim for fewer misses next time."
        };
    }

    if (average < 0.5) {
        return {
            title: "Solid effort",
            hint: "You are building consistency. Focus on timing and avoid early penalties."
        };
    }

    return {
        title: "Keep practising",
        hint: "Take your time, wait for the target, and focus on cleaner reactions."
    };
}

function renderHistory(history) {
    historyList.innerHTML = "";

    if (!Array.isArray(history) || history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No result history available yet.</div>';
        return;
    }

    history.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "history-item";

        item.innerHTML = `
      <div class="history-round">Round ${entry.round}</div>
      <div class="history-result">${entry.result}</div>
      <div class="history-tag ${entry.success ? "good" : "bad"}">
        ${entry.success ? "Success" : "Penalty"}
      </div>
    `;

        historyList.appendChild(item);
    });
}

function populateLatestResults() {
    const results = readStorage(RESULTS_KEY);

    if (!results) {
        averageReaction.textContent = "--";
        bestReaction.textContent = "--";
        totalMisses.textContent = "0";
        difficultyUsed.textContent = "--";
        successfulHits.textContent = "0";
        totalRounds.textContent = "0";

        const performance = getPerformanceText(0, 0);
        performanceMessage.textContent = performance.title;
        performanceHint.textContent = performance.hint;

        renderHistory([]);
        return;
    }

    averageReaction.textContent = formatTime(results.average);
    bestReaction.textContent = formatTime(results.best);
    totalMisses.textContent = String(results.misses ?? 0);
    difficultyUsed.textContent = results.difficulty || "--";
    successfulHits.textContent = String(Array.isArray(results.reactions) ? results.reactions.length : 0);
    totalRounds.textContent = String(results.totalRounds ?? 0);

    const performance = getPerformanceText(results.average, results.misses ?? 0);
    performanceMessage.textContent = performance.title;
    performanceHint.textContent = performance.hint;

    renderHistory(results.history);
}

function populatePersonalBest() {
    const best = readStorage(BEST_SCORE_KEY);

    if (!best || typeof best.average !== "number" || best.average <= 0) {
        personalBestAverage.textContent = "No best score yet";
        personalBestDetails.textContent = "Finish a full game to save your best result.";
        return;
    }

    personalBestAverage.textContent = formatTime(best.average);
    personalBestDetails.textContent =
        `Best hit: ${formatTime(best.best)} • Misses: ${best.misses} • Difficulty: ${best.difficulty}`;
}

populateLatestResults();
populatePersonalBest();