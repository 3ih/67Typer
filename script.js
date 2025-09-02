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

  // ---------- Rendering helpers ----------
  function createCharSpan(char, isCurrent = false) {
    const span = document.createElement('span');
    // Display NBSP for layout, but expect a REAL space when typing
    const isSpaceDisplay = (char === '\u00A0');
    span.textContent = isSpaceDisplay ? '\u00A0' : char;

    // Store the EXACT key the user must press
    span.dataset.expected = isSpaceDisplay ? ' ' : char; // <- canonical expected key
    span.dataset.graded = "0";
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
        lineContainer.appendChild(createCharSpan('\u00A0')); // display NBSP, expect ' '
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

  // ---------- Grading helpers ----------
  function applyGrade(span, isCorrect) {
    if (span.dataset.graded === "1") return; // already counted for this char
    span.dataset.graded = "1";
    span.classList.add(isCorrect ? 'correct' : 'incorrect');
    grades.push(isCorrect ? 1 : 0);
  }

  function undoGrade(span) {
    if (span.dataset.graded !== "1") return;
    span.dataset.graded = "0";
    span.classList.remove('correct', 'incorrect');
    if (grades.length > 0) grades.pop();
  }

  // Normalize key for comparison
  function normalizeKey(e) {
    if (e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar') return ' ';
    // ignore modifier keys etc.
    if (e.key && e.key.length === 1) return e.key;
    return null; // not a printable we care about
  }

  // ---------- Input handling ----------
  document.addEventListener('keydown', (e) => {
    // Start timer on first printable
    if (!gameActive && !startTime && e.key && e.key.length === 1) {
      gameActive = true;
      startTime = Date.now();
      startTimer();
    } else if (!gameActive && e.key !== 'Backspace') {
      return;
    }

    const spans = sentenceEl.querySelectorAll('span');
    const span = spans[currentIndex];
    if (!span) return;

    // Backspace
    if (e.key === "Backspace") {
      e.preventDefault();
      if (currentIndex > 0) {
        const prev = spans[currentIndex - 1];
        undoGrade(prev);
        currentIndex--;
        spans.forEach(s => s.classList.remove('current'));
        spans[currentIndex].classList.add('current');
      }
      return;
    }

    const key = normalizeKey(e);
    if (key === null) return; // ignore non-printables
    e.preventDefault();

    const expected = span.dataset.expected; // EXACT key required (' ' for space, 'a'.. etc.)

    const isSpaceExpected = expected === ' ';
    const isCorrect = key === expected;

    // If the expected is a space and they typed NOT a space:
    // mark incorrect but DO NOT advance (makes spaces "sticky")
    if (isSpaceExpected && !isCorrect) {
      applyGrade(span, false);
      // keep caret on this same span
      spans.forEach(s => s.classList.remove('current'));
      span.classList.add('current');
      return;
    }

    // Otherwise grade and advance (letters advance whether correct or not)
    applyGrade(span, isCorrect);
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
