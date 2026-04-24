const SETTINGS_KEY = "reactionGameSettings";
const BEST_SCORE_KEY = "reactionGameBestScore";

const settingsForm = document.getElementById("settingsForm");
const soundToggle = document.getElementById("soundToggle");
const bestAverage = document.getElementById("bestAverage");
const bestDetails = document.getElementById("bestDetails");

function getSavedSettings() {
    const defaults = {
        difficulty: "easy",
        soundEnabled: true
    };

    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        return { ...defaults, ...saved };
    } catch {
        return defaults;
    }
}

function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadSettingsIntoForm() {
    const settings = getSavedSettings();

    const difficultyInput = document.querySelector(
        `input[name="difficulty"][value="${settings.difficulty}"]`
    );

    if (difficultyInput) {
        difficultyInput.checked = true;
    }

    soundToggle.checked = Boolean(settings.soundEnabled);
}

function updateBestScorePreview() {
    try {
        const best = JSON.parse(localStorage.getItem(BEST_SCORE_KEY));

        if (!best || typeof best.average !== "number") {
            bestAverage.textContent = "No score yet";
            bestDetails.textContent = "Complete a game to save your best average.";
            return;
        }

        bestAverage.textContent = `${best.average.toFixed(3)} s`;
        bestDetails.textContent = `Best: ${best.best.toFixed(3)} s • Misses: ${best.misses} • ${best.difficulty}`;
    } catch {
        bestAverage.textContent = "No score yet";
        bestDetails.textContent = "Complete a game to save your best average.";
    }
}

function handleFormSubmit(event) {
    event.preventDefault();

    const formData = new FormData(settingsForm);
    const settings = {
        difficulty: formData.get("difficulty"),
        soundEnabled: soundToggle.checked
    };

    saveSettings(settings);
    window.location.href = "game.html";
}

function handleKeyboardShortcut(event) {
    if (event.key === "Enter" && document.activeElement?.tagName !== "BUTTON") {
        event.preventDefault();

        const formData = new FormData(settingsForm);
        const settings = {
            difficulty: formData.get("difficulty"),
            soundEnabled: soundToggle.checked
        };

        saveSettings(settings);
        window.location.href = "game.html";
    }
}

loadSettingsIntoForm();
updateBestScorePreview();

settingsForm.addEventListener("submit", handleFormSubmit);
document.addEventListener("keydown", handleKeyboardShortcut);

document.querySelectorAll('input[name="difficulty"], #soundToggle').forEach((input) => {
    input.addEventListener("change", () => {
        const formData = new FormData(settingsForm);
        saveSettings({
            difficulty: formData.get("difficulty"),
            soundEnabled: soundToggle.checked
        });
    });
});