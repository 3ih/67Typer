import { dictionary, smallWords } from './dictionary.js';
import { sentenceBank } from './sentences.js';

document.addEventListener("DOMContentLoaded", () => {
  let sentence = "";
  let currentIndex = 0;
  let timeLimit = 10;
  let timer;
  let startTime;
  let gameActive = false;

  // Session-wide keystroke grades: 1 = correct, 0 = incorrect
  const grades = [];

  const sentenceEl = document.getElementById('sentence');
  const timerEl = document.getElementById('timer');
  const timeProgress = document.getElementById('timeProgress');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const finalStats = document.getElementById('finalStats');

  /* === MODE TOGGLE === */
  let mode = 'words'; // 'words' | 'sentences'

  function updateModeButtonsActive() {
    const w = document.getElementById('modeWordsBtn');
    const s = document.getElementById('modeSentencesBtn');
    if (w && s) {
      w.classList.toggle('active', mode === 'words');
      s.classList.toggle('active', mode === 'sentences');
    }
  }

  function setMode(next) {
    mode = next === 'sentences' ? 'sentences' : 'words';
    updateModeButtonsActive();
    restartGame();
  }
  /* === END MODE TOGGLE === */

  /* === Time buttons highlight === */
  const timeButtons = document.querySelectorAll('#settings button');
  function updateTimeButtonsActive(seconds) {
    timeButtons.forEach(btn => {
      const txt = (btn.textContent || "").replace(/\s+/g, '');
      btn.classList.toggle('active', txt.includes(String(seconds)));
    });
  }

  function generateSentence() {
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
          // mark not graded
          span.dataset.graded = "0";
          span.dataset.correct = "0";
          lineContainer.appendChild(span);
        });
        const isLastInThisLine = wIdx === lineWords.length - 1;
        const shouldAddSpace = isFirstLine ? true : !isLastInThisLine;
        if (shouldAddSpace) {
          const space = document.createElement('span');
          space.textContent = '\u00A0';
          space.dataset.graded = "0";
          space.dataset.correct = "0";
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
    updateTimeButtonsActive(seconds);
    updateModeButtonsActive();
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

  function endGame() {
    if (!gameActive) return;
    gameActive = false;
    clearInterval(timer);

    // WPM uses number of correct characters across the whole session
    const correctCount = grades.reduce((a, b) => a + b, 0);
    const wpm = Math.round((correctCount / 5) / ((Date.now() - startTime) / 60000));

    // Accuracy across the WHOLE session
    const totalKeystrokes = grades.length;
    const accuracy = totalKeystrokes ? Math.round((correctCount / totalKeystrokes) * 100) : 0;

    finalStats.textContent = `You had ${wpm} WPM with ${accuracy}% accuracy!`;
    document.getElementById('overlay').style.display = 'flex';
  }

  function restartGame() {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';

    gameActive = false;

    // Reset session counters ONLY when starting a new game
    grades.length = 0;

    generateSentence();
    startTime = null;
    timeProgress.style.width = '100%';
    timerEl.textContent = `${timeLimit}`;
    clearInterval(timer);

    updateModeButtonsActive();
  }

  function manualRestart() {
    restartGame();
  }

  // Helpers to grade/undo a single span safely + push/pop to grades[]
  function applyGrade(span, isCorrect) {
    if (span.dataset.graded === "1") return; // already counted
    span.dataset.graded = "1";
    span.dataset.correct = isCorrect ? "1" : "0";
    span.classList.add(isCorrect ? 'correct' : 'incorrect');
    grades.push(isCorrect ? 1 : 0);
  }

  function undoGrade(span) {
    if (span.dataset.graded !== "1") return; // nothing to undo
    span.dataset.graded = "0";
    span.classList.remove('correct', 'incorrect');
    span.dataset.correct = "0";
    // Remove last grade entry (corresponds to most recent keystroke)
    if (grades.length > 0) grades.pop();
  }

  document.addEventListener('keydown', (e) => {
    const spans = sentenceEl.querySelectorAll('span');

    if (!gameActive && !startTime && e.key.length === 1) {
      gameActive = true;
      startTime = Date.now();
      startTimer();
    } else if (!gameActive) return;

    if (e.key.length !== 1 && e.key !== 'Backspace' && e.key !== ' ') return;

    e.preventDefault();
    const currentChar = spans[currentIndex]?.textContent;
    if (currentChar === undefined) return;

    if (e.key === "Backspace") {
      if (currentIndex > 0) {
        const prev = spans[currentIndex - 1];
        undoGrade(prev);
        currentIndex--;
        spans.forEach(span => span.classList.remove('current'));
        spans[currentIndex].classList.add('current');
      }
      return;
    }

    // SPACE handling
    if (currentChar === '\u00A0') {
      if (e.key === ' ') {
        applyGrade(spans[currentIndex], true);
      } else {
        applyGrade(spans[currentIndex], false);
      }
      spans[currentIndex].classList.remove('current');
      currentIndex++;
      if (currentIndex < spans.length) {
        spans[currentIndex].classList.add('current');
      } else {
        const timeLeft = parseInt(timerEl.textContent, 10) || 0;
        if (gameActive && timeLeft > 0) generateSentence();
      }
      return;
    }

    // Regular character
    applyGrade(spans[currentIndex], e.key === currentChar);

    spans[currentIndex].classList.remove('current');
    currentIndex++;

    if (currentIndex < spans.length) {
      spans[currentIndex].classList.add('current');
    } else {
      const timeLeft = parseInt(timerEl.textContent, 10) || 0;
      if (gameActive && timeLeft > 0) generateSentence();
    }
  });

  generateSentence();

  updateTimeButtonsActive(timeLimit);
  updateModeButtonsActive();

  window.setTime = setTime;
  window.manualRestart = manualRestart;
  window.restartGame = restartGame;
  window.setMode = setMode;
});
