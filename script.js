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

  // ---- Sentence rendering ----
  function createCharSpan(char, isCurrent = false) {
    const span = document.createElement('span');
    span.textContent = char;
    span.dataset.graded = "0";
    span.dataset.correct = "0";
    span.dataset.space = (char === '\u00A0') ? "1" : "0"; // explicit space flag
    if (isCurrent) span.classList.add('current');
    return span;
  }

  function createLine(lineWords, isFirstLine) {
    const lineContainer = document.createElement('div');
    lineWords.forEach((word, wIdx) => {
      word.split('').forEach((char, i) => {
        const isFirstChar = (isFirstLine && wIdx === 0 && i === 0);
        lineContainer.appendChild(createCharSpan(char, isFirstChar));
      });
      const isLastInThisLine = wIdx === lineWords.length - 1;
      const shouldAddSpace = isFirstLine ? true : !isLastInThisLine;
      if (shouldAddSpace) {
        lineContainer.appendChild(createCharSpan('\u00A0'));
      }
    });
    return lineContainer;
  }

  function generateSentence() {
    if (mode === 'words') {
      sentence = "";
      let lastWord = "";
      while (sentence.replace(/\s/g,'').length < 75) {
        const word = Math.random() < 0.25
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

    const correctCount = grades.reduce((a, b) => a + b, 0);
    const wpm = Math.round((correctCount / 5) / ((Date.now() - startTime) / 60000));
    const totalKeystrokes = grades.length;
    const accuracy = totalKeystrokes ? Math.round((correctCount / totalKeystrokes) * 100) : 0;

    finalStats.textContent = `You had ${wpm} WPM with ${accuracy}% accuracy!`;
    document.getElementById('overlay').style.display = 'flex';
  }

  function restartGame() {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';

    gameActive = false;
    grades.length = 0; // reset session grades

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

  // ---- Grading helpers ----
  function applyGrade(span, isCorrect) {
    if (span.dataset.graded === "1") return; // already counted
    span.dataset.graded = "1";
    span.dataset.correct = isCorrect ? "1" : "0";
    span.classList.add(isCorrect ? 'correct' : 'incorrect');
    grades.push(isCorrect ? 1 : 0);
  }

  function undoGrade(span) {
    if (span.dataset.graded !== "1") return;
    span.dataset.graded = "0";
    span.dataset.correct = "0";
    span.classList.remove('correct', 'incorrect');
    if (grades.length > 0) grades.pop();
  }

  // ---- Input handling ----
  document.addEventListener('keydown', (e) => {
    const spans = sentenceEl.querySelectorAll('span');

    if (!gameActive && !startTime && e.key.length === 1) {
      gameActive = true;
      startTime = Date.now();
      startTimer();
    } else if (!gameActive) return;

    if (e.key.length !== 1 && e.key !== 'Backspace') return; // allow all single chars; Backspace separately
    e.preventDefault();

    const span = spans[currentIndex];
    if (!span) return;

    // Backspace
    if (e.key === "Backspace") {
      if (currentIndex > 0) {
        const prev = spans[currentIndex - 1];
        undoGrade(prev);
        currentIndex--;
        spans.forEach(s => s.classList.remove('current'));
        spans[currentIndex].classList.add('current');
      }
      return;
    }

    const isSpaceSpan = span.dataset.space === "1";

    // Determine correctness
    let isCorrect = false;
    if (isSpaceSpan) {
      // Only correct if actual space typed
      isCorrect = (e.key === ' ');
    } else {
      // Letter/character must match exactly
      isCorrect = (e.key === span.textContent);
    }

    applyGrade(span, isCorrect);

    // Advance caret
    span.classList.remove('current');
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
