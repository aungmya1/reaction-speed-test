const SETTINGS_KEY = "reactionGameSettings";
const RESULTS_KEY = "reactionGameLastResults";
const BEST_SCORE_KEY = "reactionGameBestScore";

const DEFAULT_SETTINGS = {
    difficulty: "easy",
    soundEnabled: true
};

const DIFFICULTY_CONFIG = {
    easy: {
        label: "Easy",
        rounds: 10,
        dotSize: 88,
        visibleTime: 1800,
        minDelay: 900,
        maxDelay: 1700
    },
    normal: {
        label: "Normal",
        rounds: 10,
        dotSize: 74,
        visibleTime: 1300,
        minDelay: 700,
        maxDelay: 1500
    },
    hard: {
        label: "Hard",
        rounds: 10,
        dotSize: 58,
        visibleTime: 900,
        minDelay: 500,
        maxDelay: 1200
    }
};

const roundDisplay = document.getElementById("roundDisplay");
const timeDisplay = document.getElementById("timeDisplay");
const missDisplay = document.getElementById("missDisplay");
const difficultyDisplay = document.getElementById("difficultyDisplay");
const instructionText = document.getElementById("instructionText");
const muteButton = document.getElementById("muteButton");
const gameArea = document.getElementById("gameArea");
const targetDot = document.getElementById("targetDot");
const startRoundButton = document.getElementById("startRoundButton");
const restartGameButton = document.getElementById("restartGameButton");
const quitButton = document.getElementById("quitButton");
const historyList = document.getElementById("historyList");
const centerMessage = document.getElementById("centerMessage");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownText = document.getElementById("countdownText");

let settings = getSavedSettings();
let difficulty = DIFFICULTY_CONFIG[settings.difficulty] || DIFFICULTY_CONFIG.easy;

let currentRound = 1;
let misses = 0;
let reactionTimes = [];
let historyEntries = [];

let roundInProgress = false;
let waitingForDot = false;
let dotVisible = false;
let gameFinished = false;

let roundStartTime = null;
let dotAppearTimeout = null;
let dotHideTimeout = null;
let penaltyTimeout = null;
let countdownTimeouts = [];
let soundEnabled = Boolean(settings.soundEnabled);

function getSavedSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function saveSettings() {
    localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
            difficulty: getDifficultyKey(),
            soundEnabled
        })
    );
}

function getDifficultyKey() {
    const entries = Object.entries(DIFFICULTY_CONFIG);
    const found = entries.find(([, value]) => value.label === difficulty.label);
    return found ? found[0] : "easy";
}

function updateStatus() {
    roundDisplay.textContent = `${Math.min(currentRound, difficulty.rounds)} / ${difficulty.rounds}`;
    missDisplay.textContent = String(misses);
    difficultyDisplay.textContent = difficulty.label;
    muteButton.textContent = `Sound: ${soundEnabled ? "On" : "Off"}`;
    muteButton.setAttribute("aria-pressed", String(!soundEnabled));

    if (reactionTimes.length === 0) {
        timeDisplay.textContent = "--";
    } else {
        const lastTime = reactionTimes[reactionTimes.length - 1];
        timeDisplay.textContent = `${lastTime.toFixed(3)} s`;
    }
}

function setInstruction(text) {
    instructionText.textContent = text;
}

function setCenterMessage(title, subtitle = "") {
    centerMessage.innerHTML = `
    <div>
      <span class="message-title">${title}</span>
      <span class="message-subtitle">${subtitle}</span>
    </div>
  `;
}

function setAreaState(state) {
    gameArea.classList.remove("ready", "waiting", "active", "penalty", "finished");
    gameArea.classList.add(state);
}

function clearTimers() {
    clearTimeout(dotAppearTimeout);
    clearTimeout(dotHideTimeout);
    clearTimeout(penaltyTimeout);

    countdownTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    countdownTimeouts = [];
}

function updateDotSize() {
    targetDot.style.width = `${difficulty.dotSize}px`;
    targetDot.style.height = `${difficulty.dotSize}px`;
}

function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function positionDotRandomly() {
    const areaRect = gameArea.getBoundingClientRect();
    const dotSize = difficulty.dotSize;
    const safePadding = 12;

    const maxX = areaRect.width - dotSize - safePadding;
    const maxY = areaRect.height - dotSize - safePadding;

    const left = randomNumber(safePadding, Math.max(safePadding, maxX));
    const top = randomNumber(safePadding, Math.max(safePadding, maxY));

    targetDot.style.left = `${left}px`;
    targetDot.style.top = `${top}px`;
}

function showDot() {
    dotVisible = true;
    waitingForDot = false;
    roundStartTime = performance.now();

    positionDotRandomly();
    targetDot.classList.remove("hidden");
    setAreaState("active");
    setCenterMessage("TARGET LIVE", "Click the dot now.");
    setInstruction("React now!");

    playTone(880, 0.06, "square");

    dotHideTimeout = setTimeout(() => {
        if (!dotVisible) return;
        registerMiss("Too slow! The target disappeared.");
    }, difficulty.visibleTime);
}

function hideDot() {
    dotVisible = false;
    targetDot.classList.add("hidden");
}

function startCountdown() {
    clearTimers();
    roundInProgress = true;
    waitingForDot = false;
    dotVisible = false;

    setAreaState("ready");
    hideDot();
    countdownOverlay.classList.add("show");
    setCenterMessage("Get Ready", "The round will begin shortly.");
    setInstruction(`Round ${currentRound}: prepare yourself.`);

    const steps = ["3", "2", "1"];

    steps.forEach((value, index) => {
        const timeoutId = setTimeout(() => {
            countdownText.textContent = value;
            playTone(520, 0.05, "triangle");
        }, index * 700);
        countdownTimeouts.push(timeoutId);
    });

    const finalTimeout = setTimeout(() => {
        countdownOverlay.classList.remove("show");
        beginWaitingPhase();
    }, steps.length * 700);

    countdownTimeouts.push(finalTimeout);
}

function beginWaitingPhase() {
    waitingForDot = true;
    setAreaState("waiting");
    setCenterMessage("Wait...", "Do not click until the dot appears.");
    setInstruction("Wait for the target.");

    const delay = randomNumber(difficulty.minDelay, difficulty.maxDelay);
    dotAppearTimeout = setTimeout(showDot, delay);
}

function startRound() {
    if (gameFinished || roundInProgress) return;
    gameArea.focus();
    startCountdown();
}

function registerReaction() {
    if (!dotVisible) return;

    const reactionTimeMs = performance.now() - roundStartTime;
    const reactionTimeSeconds = reactionTimeMs / 1000;

    clearTimeout(dotHideTimeout);
    hideDot();

    reactionTimes.push(reactionTimeSeconds);
    historyEntries.push({
        round: currentRound,
        result: `${reactionTimeSeconds.toFixed(3)} s`,
        success: true
    });

    updateHistory();
    updateStatus();

    playTone(1040, 0.08, "sine");

    currentRound += 1;
    roundInProgress = false;
    waitingForDot = false;
    dotVisible = false;

    if (currentRound > difficulty.rounds) {
        finishGame();
        return;
    }

    setAreaState("ready");
    setCenterMessage("Good!", "Start the next round when you are ready.");
    setInstruction("Reaction recorded. Start the next round.");
}

function registerMiss(message) {
    clearTimeout(dotHideTimeout);
    hideDot();

    misses += 1;
    historyEntries.push({
        round: currentRound,
        result: "Missed",
        success: false
    });

    updateHistory();
    updateStatus();

    playTone(220, 0.1, "sawtooth");

    currentRound += 1;
    roundInProgress = false;
    waitingForDot = false;
    dotVisible = false;

    if (currentRound > difficulty.rounds) {
        finishGame();
        return;
    }

    setAreaState("penalty");
    setCenterMessage("Miss", message);
    setInstruction("Miss recorded. Start the next round.");

    penaltyTimeout = setTimeout(() => {
        if (!gameFinished && !roundInProgress) {
            setAreaState("ready");
        }
    }, 500);
}

function registerEarlyClick() {
    if (!roundInProgress || dotVisible || gameFinished === true) return;
    if (!waitingForDot) return;

    clearTimeout(dotAppearTimeout);
    misses += 1;

    historyEntries.push({
        round: currentRound,
        result: "Too Early",
        success: false
    });

    updateHistory();
    updateStatus();

    roundInProgress = false;
    waitingForDot = false;
    dotVisible = false;

    playTone(180, 0.12, "sawtooth");

    setAreaState("penalty");
    setCenterMessage("Too Early!", "You clicked before the target appeared.");
    setInstruction("Early click penalty. Start the round again.");

    penaltyTimeout = setTimeout(() => {
        if (!gameFinished && !roundInProgress) {
            setAreaState("ready");
        }
    }, 700);
}

function updateHistory() {
    historyList.innerHTML = "";

    if (historyEntries.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No rounds completed yet.</div>';
        return;
    }

    historyEntries.forEach((entry) => {
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

function calculateAverage(values) {
    if (values.length === 0) return 0;
    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
}

function calculateBest(values) {
    if (values.length === 0) return 0;
    return Math.min(...values);
}

function saveResults() {
    const average = calculateAverage(reactionTimes);
    const best = calculateBest(reactionTimes);

    const results = {
        average,
        best,
        misses,
        difficulty: difficulty.label,
        totalRounds: difficulty.rounds,
        reactions: reactionTimes,
        history: historyEntries,
        completedAt: new Date().toISOString()
    };

    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));

    const existingBestRaw = localStorage.getItem(BEST_SCORE_KEY);
    let existingBest = null;

    try {
        existingBest = existingBestRaw ? JSON.parse(existingBestRaw) : null;
    } catch {
        existingBest = null;
    }

    if (!existingBest || average > 0 && average < existingBest.average) {
        localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(results));
    }
}

function finishGame() {
    clearTimers();
    gameFinished = true;
    roundInProgress = false;
    waitingForDot = false;
    dotVisible = false;

    setAreaState("finished");
    hideDot();

    const average = calculateAverage(reactionTimes);
    const best = calculateBest(reactionTimes);

    setCenterMessage(
        "Game Complete",
        `Average: ${average > 0 ? average.toFixed(3) : "--"} s • Best: ${best > 0 ? best.toFixed(3) : "--"} s`
    );
    setInstruction("Game finished. Moving to the score page.");

    saveResults();

    setTimeout(() => {
        window.location.href = "score.html";
    }, 1400);
}

function restartGame() {
    clearTimers();

    currentRound = 1;
    misses = 0;
    reactionTimes = [];
    historyEntries = [];

    roundInProgress = false;
    waitingForDot = false;
    dotVisible = false;
    gameFinished = false;
    roundStartTime = null;

    hideDot();
    setAreaState("ready");
    setCenterMessage("Ready?", "Start the round when you are prepared.");
    setInstruction("Press Start Round to begin.");

    updateStatus();
    updateHistory();
    gameArea.focus();
}

function safelyQuit() {
    const results = {
        average: calculateAverage(reactionTimes),
        best: calculateBest(reactionTimes),
        misses,
        difficulty: difficulty.label,
        totalRounds: difficulty.rounds,
        reactions: reactionTimes,
        history: historyEntries,
        completedAt: new Date().toISOString(),
        incomplete: true
    };

    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

function playTone(frequency, duration, type = "sine") {
    if (!soundEnabled) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = 0.02;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();

    gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + duration
    );

    oscillator.stop(audioContext.currentTime + duration);

    oscillator.onended = () => {
        audioContext.close();
    };
}

function handleGameAreaClick(event) {
    if (event.target === targetDot) return;

    if (dotVisible) {
        return;
    }

    if (waitingForDot) {
        registerEarlyClick();
    }
}

function handleKeyboardControls(event) {
    const key = event.key.toLowerCase();

    if (key === " " || key === "spacebar") {
        event.preventDefault();
        if (!roundInProgress && !gameFinished) {
            startRound();
        } else if (waitingForDot) {
            registerEarlyClick();
        }
    }

    if (key === "r") {
        event.preventDefault();
        restartGame();
    }

    if (key === "enter" && document.activeElement === gameArea) {
        event.preventDefault();
        if (dotVisible) {
            registerReaction();
        } else if (waitingForDot) {
            registerEarlyClick();
        } else if (!roundInProgress && !gameFinished) {
            startRound();
        }
    }
}

function initializeGame() {
    updateDotSize();
    updateStatus();
    updateHistory();
    setAreaState("ready");
    hideDot();
    setCenterMessage("Ready?", "Start the round when you are prepared.");
    setInstruction("Press Start Round to begin.");
    gameArea.focus();
}

startRoundButton.addEventListener("click", startRound);
restartGameButton.addEventListener("click", restartGame);

muteButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    saveSettings();
    updateStatus();
});

targetDot.addEventListener("click", (event) => {
    event.stopPropagation();
    registerReaction();
});

gameArea.addEventListener("click", handleGameAreaClick);
gameArea.addEventListener("keydown", handleKeyboardControls);
document.addEventListener("keydown", handleKeyboardControls);

quitButton.addEventListener("click", safelyQuit);

window.addEventListener("resize", () => {
    if (dotVisible) {
        positionDotRandomly();
    }
});

initializeGame();