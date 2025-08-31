import { dictionary, smallWords } from './dictionary.js';
import { sentenceBank } from './sentences.js';
document.addEventListener("DOMContentLoaded", () => {

  let sentence = "";
  let currentIndex = 0;
  let timeLimit = 10;
  let timer;
  let startTime;
  let gameActive = false;
  let correctChars = 0;
  let totalTyped = 0;

  const sentenceEl = document.getElementById('sentence');
  const timerEl = document.getElementById('timer');
  const timeProgress = document.getElementById('timeProgress');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const finalStats = document.getElementById('finalStats');

  const modal = document.getElementById("usernameModal");
  const usernameInput = document.getElementById("usernameInput");
  let username = localStorage.getItem('username');

  /* === MODE TOGGLE === */
  let mode = 'words'; // 'words' | 'sentences'

  /* === Mode button highlight (NEW) === */
  function updateModeButtonsActive() {
    const w = document.getElementById('modeWordsBtn');
    const s = document.getElementById('modeSentencesBtn');
    if (w && s) {
      w.classList.toggle('active', mode === 'words');
      s.classList.toggle('active', mode === 'sentences');
    }
  }
  /* ================================== */

  function setMode(next) {
    mode = next === 'sentences' ? 'sentences' : 'words';
    updateModeButtonsActive();     // NEW: keep mode button highlighted
    restartGame();
  }
  /* === END MODE TOGGLE === */

  /* === create an overlay to blur the page behind the username modal === */
  const userOverlay = document.createElement('div');
  userOverlay.id = 'userOverlay';
  Object.assign(userOverlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.35)',
    backdropFilter: 'blur(6px)',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '2000'
  });
  document.body.appendChild(userOverlay);
  userOverlay.appendChild(modal);
  /* === END NEW === */

  if (!username) {
    userOverlay.style.display = "flex";
    modal.style.display = "flex";
    setTimeout(() => usernameInput.focus(), 50);
  } else {
    userOverlay.style.display = "none";
    modal.style.display = "none";
  }

function saveUsername() {
  const value = usernameInput.value.trim();

  if (!value) {
    alert("Please enter a username!");
    usernameInput.focus();
    return;
  }

  if (value.length > 12) {
    alert("Username must be 12 characters or fewer.");
    usernameInput.focus();
    return;
  }

  localStorage.setItem('username', value);
  username = value;
  modal.style.display = "none";
  userOverlay.style.display = "none";
}

  usernameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveUsername();
  });

  // make the modal's Submit button work on click
  const usernameSubmitBtn = modal.querySelector('button');
  if (usernameSubmitBtn) {
    usernameSubmitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      saveUsername();
    });
  }

  window.addEventListener("keydown", (e) => {
    const isModalVisible = modal.style.display !== "none";
    if (isModalVisible && document.activeElement !== usernameInput) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  /* === Time button highlight (NEW) === */
  const timeButtons = document.querySelectorAll('#settings button');
  function updateTimeButtonsActive(seconds) {
    timeButtons.forEach(btn => {
      const txt = (btn.textContent || "").replace(/\s+/g, '');
      btn.classList.toggle('active', txt.includes(String(seconds)));
    });
  }
  /* ================================== */

  function generateSentence() {
    // branch by mode
    if (mode === 'words') {
      sentence = "";
      let lastWord = "";
      while (sentence.replace(/\s/g,'').length < 75) {
        let word = Math.random() < 0.25
          ? smallWords[Math.floor(Math.random() * smallWords.length)]
          : dictionary[Math.floor(Math.random() * dictionary.length)];
        if (word === lastWord) continue;
        sentence += word + " ";
        lastWord = word;
      }
      sentence = sentence.trim();
    } else {
      // sentences mode
      sentence = sentenceBank[Math.floor(Math.random() * sentenceBank.length)];
    }

    const words = sentence.split(' ');
    const midpoint = Math.floor(words.length / 2);
    const line1Words = words.slice(0, midpoint);
    const line2Words = words.slice(midpoint);

    sentenceEl.innerHTML = "";
    function createLine(lineWords, isFirstLine) {
      const lineContainer = document.createElement('div');
      lineWords.forEach((word, wIdx) => {
        word.split('').forEach((char, i) => {
          const span = document.createElement('span');
          span.textContent = char;
          if (isFirstLine && wIdx === 0 && i === 0) span.classList.add('current');
          lineContainer.appendChild(span);
        });
        // add spaces between words EXCEPT the true last word of the whole sentence
        const isLastInThisLine = wIdx === lineWords.length - 1;
        const shouldAddSpace = isFirstLine ? true : !isLastInThisLine;
        if (shouldAddSpace) {
          const space = document.createElement('span');
          space.textContent = '\u00A0';
          lineContainer.appendChild(space);
        }
      });
      return lineContainer;
    }
    sentenceEl.appendChild(createLine(line1Words, true));
    sentenceEl.appendChild(createLine(line2Words, false));

    currentIndex = 0;
  }

  function setTime(seconds) {
    timeLimit = seconds;
    timerEl.textContent = `${timeLimit}`;
    updateTimeButtonsActive(seconds); // keep chosen time highlighted
    updateModeButtonsActive();        // NEW: keep mode button highlighted
    restartGame();
  }

  function startTimer() {
    let timeLeft = timeLimit;
    timerEl.textContent = `${timeLeft}`;
    timeProgress.style.width = '100%';

    timer = setInterval(() => {
      if (!gameActive) return;
      timeLeft--;
      if (timeLeft < 0) timeLeft = 0;
      timerEl.textContent = `${timeLeft}`;
      timeProgress.style.width = (timeLeft / timeLimit * 100) + '%';
      if (timeLeft <= 0) {
        clearInterval(timer);
        endGame();
      }
    }, 1000);
  }

  async function submitScore(wpm) {
    if (!username || wpm > 200) return;
    await fetch('/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: username, score: wpm })
    });
    loadScores();
  }

  async function loadScores() {
    try {
      const res = await fetch('/scores');
      if (!res.ok) throw new Error("Failed to fetch scores");

      let scores = await res.json();
      const tbody = document.getElementById('leaderboard');
      tbody.innerHTML = '';

      // sort highest first
      scores.sort((a, b) => b.score - a.score);

      // keep only top 10
      const topScores = scores.slice(0, 10);

      // build rows
      topScores.forEach(s => {
        const row = document.createElement("tr");
        const nameCell = document.createElement("td");
        const scoreCell = document.createElement("td");

        nameCell.textContent = s.name;
        scoreCell.textContent = s.score;

        row.appendChild(nameCell);
        row.appendChild(scoreCell);
        tbody.appendChild(row);
      });
    } catch (err) {
      console.error("Error loading scores:", err);
    }
  }

  function endGame() {
    if (!gameActive) return;
    gameActive = false;
    clearInterval(timer);

    const wpm = Math.round((correctChars/5)/((Date.now()-startTime)/60000));

    // compute accuracy safely from DOM to guarantee 0–100%
    const correctCount = sentenceEl.querySelectorAll('span.correct').length;
    const gradedCount  = sentenceEl.querySelectorAll('span.correct, span.incorrect').length;
    const accuracy = gradedCount ? Math.round((correctCount / gradedCount) * 100) : 0;

    finalStats.textContent = `You had ${wpm} WPM with ${accuracy}% accuracy!`;
    document.getElementById('overlay').style.display = 'flex'; // show blur/modal
    submitScore(wpm);
  }

  // hides overlay instead of gameOverScreen
  function restartGame() {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';

    gameActive = false;
    correctChars = 0;
    totalTyped = 0;
    generateSentence();
    startTime = null;
    timeProgress.style.width = '100%';
    timerEl.textContent = `${timeLimit}`;
    clearInterval(timer);

    updateModeButtonsActive();  // NEW: keep mode button highlighted after reset
  }

  // just delegates to restartGame
  function manualRestart() {
    restartGame();
  }

  document.addEventListener('keydown', (e) => {
    // block game typing while username modal is visible
    if (modal.style.display !== "none") return;

    const spans = sentenceEl.querySelectorAll('span');

    if (!gameActive && !startTime && e.key.length === 1) {
      gameActive = true;
      startTime = Date.now();
      startTimer();
    } else if (!gameActive) return;

    // ignore all non-character keys except Backspace and Space
    if (e.key.length !== 1 && e.key !== 'Backspace' && e.key !== ' ') return;

    e.preventDefault();
    const currentChar = spans[currentIndex]?.textContent;

    // safety: if we've somehow finished, bail
    if (currentChar === undefined) return;

    // backspace properly undoes counters so accuracy can't exceed 100%
    if (e.key === "Backspace") {
      if (currentIndex > 0) {
        const prev = spans[currentIndex - 1];

        if (prev.textContent !== '\u00A0') {
          if (prev.classList.contains('correct')) {
            correctChars = Math.max(0, correctChars - 1);
          }
          if (prev.classList.contains('correct') || prev.classList.contains('incorrect')) {
            totalTyped = Math.max(0, totalTyped - 1);
          }
        }

        currentIndex--;
        prev.classList.remove('correct', 'incorrect');
        spans.forEach(span => span.classList.remove('current'));
        spans[currentIndex].classList.add('current');
      }
      return;
    }

    // handle spaces
    if (currentChar === '\u00A0') {
      if (e.key === ' ') {
        spans[currentIndex].classList.add('correct');
        spans[currentIndex].classList.remove('current');
        currentIndex++;
        if (currentIndex < spans.length) {
          spans[currentIndex].classList.add('current');
        } else {
          // AUTO-ADVANCE on last character
          const timeLeft = parseInt(timerEl.textContent, 10) || 0;
          if (gameActive && timeLeft > 0) generateSentence();
        }
      }
      return;
    }

    // normal characters
    totalTyped++;
    if (e.key === currentChar) {
      spans[currentIndex].classList.add('correct');
      correctChars++;
    } else {
      spans[currentIndex].classList.add('incorrect');
    }
    spans[currentIndex].classList.remove('current');
    currentIndex++;

    if (currentIndex < spans.length) {
      spans[currentIndex].classList.add('current');
    } else {
      // AUTO-ADVANCE as soon as the final character is typed
      const timeLeft = parseInt(timerEl.textContent, 10) || 0;
      if (gameActive && timeLeft > 0) generateSentence();
    }
  });

  generateSentence();
  loadScores();

  // initialize selected button highlights on first load
  updateTimeButtonsActive(timeLimit);
  updateModeButtonsActive();        // NEW: set initial mode button state

  window.setTime = setTime;
  window.manualRestart = manualRestart;
  window.restartGame = restartGame;
  window.setMode = setMode; // expose for mode buttons
});