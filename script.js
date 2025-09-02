import { dictionary, smallWords } from './dictionary.js';
import { sentenceBank } from './sentences.js';

document.addEventListener("DOMContentLoaded", () => {
  let sentence = "";
  let currentIndex = 0;
  let timeLimit = 10;
  let timer;
  let startTime;
  let gameActive = false;

  // Session-wide keystroke results: 1 = correct, 0 = incorrect
  const grades = [];

  // Toggle to accept case-insensitive typing if you want
  const CASE_SENSITIVE = true;

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

  /* === Time buttons highlight === */
  const timeButtons = document.querySelectorAll('#settings button');
  function updateTimeButtonsActive(seconds) {
    timeButtons.forEach(btn => {
      const txt = (btn.textContent || "").replace(/\s+/g, '');
      btn.classList.toggle('active', txt.includes(String(seconds)));
    });
  }

  // ---------- Key normalization ----------
  const SPACE_CHARS = new Set([
    ' ', '\u00A0', '\u1680', '\u2000', '\u2001', '\u2002', '\u2003',
    '\u2004', '\u2005', '\u2006', '\u2007', '\u2008', '\u2009',
    '\u200A', '\u202F', '\u205F', '\u3000'
  ]);

  function isPrintableKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key === 'Dead' || e.key === 'Compose') return false;
    return true;
  }

  // Return single normalized char or null to ignore
  function normalizeKey(e) {
    if (!isPrintableKey(e)) return null;
    if (e.code === 'Space' || e.key === 'Spacebar') return ' ';
    if (SPACE_CHARS.has(e.key)) return ' ';
    if (typeof e.key === 'string' && e.key.length === 1) {
      const nk = e.key.normalize('NFKC');
      if (nk.length === 1) return nk;
    }
    if (e.key === 'Unidentified') {
      if (e.code === 'NumpadDecimal') return '.';
      if (e.code === 'NumpadComma') return ',';
      const m = /^Numpad([0-9])$/.exec(e.code || '');
      if (m) return m[1];
    }
    return null;
  }

  function eqExpected(inputChar, expectedChar) {
    if (!CASE_SENSITIVE) {
      return inputChar.toLocaleLowerCase() === expectedChar.toLocaleLowerCase();
    }
    return inputChar === expectedChar;
  }

  // ---------- Rendering ----------
  function createCharSpan(char, isCurrent = false) {
    const span = document.createElement('span');
    const isDisplaySpace = (char === '\u00A0');
    span.textContent = isDisplaySpace ? '\u00A0' : char;
    // Store the *actual* expected key (space = ' ')
    span.dataset.expected = isDisplaySpace ? ' ' : char;
    span.dataset.graded = "0";
    span.dataset.extra = "0"; // extras we insert will set this to "1"
    if (isCurrent) span.classList.add('current');
    return span;
  }

  function createLine(lineWords, isFirstLine) {
    const line = document.createElement('div');
    lineWords.forEach((word, wIdx) => {
      word.split('').forEach((ch, i) => {
        const first = (isFirstLine && wIdx === 0 && i === 0);
        line.appendChild(createCharSpan(ch, first));
      });
      const isLastInThisLine = wIdx === lineWords.length - 1;
      const shouldAddSpace = isFirstLine ? true : !isLastInThisLine;
      if (shouldAddSpace) line.appendChild(createCharSpan('\u00A0'));
    });
    return line;
  }

  function generateSentence() {
    if (mode === 'words') {
      sentence = "";
      let lastWord = "";
      while (sentence.replace(/\s/g, '').length < 75) {
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
    grades.length = 0;

    generateSentence();
    startTime = null;
    timeProgress.style.width = '100%';
    timerEl.textContent = `${timeLimit}`;
    clearInterval(timer);
    updateModeButtonsActive();
  }

  function manualRestart() { restartGame(); }

  // ---------- Grading helpers ----------
  function applyGrade(span, isCorrect) {
    if (span.dataset.graded === "1") return;
    span.dataset.graded = "1";
    if (isCorrect) {
      span.classList.add('correct');
    } else {
      span.classList.add('incorrect');
    }
    grades.push(isCorrect ? 1 : 0);
  }

  function undoGrade(span) {
    if (span.dataset.graded !== "1") return;
    // If it's an extra char we created, remove it from DOM entirely
    const wasExtra = span.dataset.extra === "1";
    span.dataset.graded = "0";
    span.classList.remove('correct', 'incorrect');

    if (grades.length > 0) grades.pop();

    if (wasExtra && span.parentNode) {
      span.parentNode.removeChild(span);
    }
  }

  // Create an inline red "extra" span (wrong char typed when space expected)
  function insertExtraBefore(targetSpan, char) {
    const extra = document.createElement('span');
    extra.textContent = char;
    extra.dataset.expected = '';     // not an expected char
    extra.dataset.graded = "1";
    extra.dataset.extra = "1";
    extra.classList.add('incorrect');
    // force visible red in case there's no CSS
    extra.style.color = 'red';
    // insert just before the space so it appears at end of the word
    targetSpan.parentNode.insertBefore(extra, targetSpan);
    grades.push(0);
    return extra;
  }

  // ---------- Input handling ----------
  document.addEventListener('keydown', (e) => {
    // Start timer on first printable
    if (!gameActive && !startTime && isPrintableKey(e)) {
      const k = normalizeKey(e);
      if (k !== null) {
        gameActive = true;
        startTime = Date.now();
        startTimer();
      }
    } else if (!gameActive && e.key !== 'Backspace') {
      return;
    }

    const spans = sentenceEl.querySelectorAll('span');
    const span = spans[currentIndex];
    if (!span) return;

    // Backspace removes last graded char; if it's an extra, we delete the node
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        const prev = spans[currentIndex - 1];
        undoGrade(prev);
        currentIndex--;
        // Caret on new current
        Array.from(sentenceEl.querySelectorAll('span')).forEach(s => s.classList.remove('current'));
        const fresh = sentenceEl.querySelectorAll('span');
        if (fresh[currentIndex]) fresh[currentIndex].classList.add('current');
      }
      return;
    }

    const key = normalizeKey(e);
    if (key === null) return; // ignore non-printables
    e.preventDefault();

    const expected = (span.dataset.expected || '').normalize('NFKC');

    // If the expected is a space:
    // - Real space: grade correct & advance
    // - Any other printable: insert a red "extra" letter before the space (incorrect) and DO NOT advance
    if (expected === ' ') {
      if (key === ' ') {
        applyGrade(span, true);
        span.classList.remove('current');
        currentIndex++;
      } else {
        // Insert red extra letter before the space and keep caret on the space
        insertExtraBefore(span, key);
        // Keep caret on the space (no advance). Refresh current class.
        Array.from(sentenceEl.querySelectorAll('span')).forEach(s => s.classList.remove('current'));
        span.classList.add('current');
        return;
      }
    } else {
      // Regular character: grade (correct/incorrect) and advance
      const isCorrect = eqExpected(key, expected);
      applyGrade(span, isCorrect);
      span.classList.remove('current');
      currentIndex++;
    }

    // Move caret / possibly load new sentence
    const fresh = sentenceEl.querySelectorAll('span');
    if (currentIndex < fresh.length) {
      fresh[currentIndex].classList.add('current');
    } else {
      const timeLeft = parseInt(timerEl.textContent, 10) || 0;
      if (gameActive && timeLeft > 0) generateSentence();
    }
  });

  // Initial render
  generateSentence();
  updateTimeButtonsActive(timeLimit);
  updateModeButtonsActive();

  // Expose controls
  window.setTime = setTime;
  window.manualRestart = manualRestart;
  window.restartGame = restartGame;
  window.setMode = setMode;
});
