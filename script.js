import { dictionary, smallWords } from './dictionary.js';
import { sentenceBank } from './sentences.js';

document.addEventListener("DOMContentLoaded", () => {
  let currentIndex = 0;
  let timeLimit = 10;
  let timer;
  let startTime;
  let gameActive = false;

  // Session-wide keystroke results: 1 = correct, 0 = incorrect
  const grades = [];

  // Case-sensitivity toggle
  const CASE_SENSITIVE = true;

  const sentenceEl = document.getElementById('sentence');
  const timerEl = document.getElementById('timer');
  const timeProgress = document.getElementById('timeProgress');
  const finalStats = document.getElementById('finalStats');

  // ensure visible spacing/extras
  if (sentenceEl) sentenceEl.style.whiteSpace = 'pre-wrap';

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
    span.dataset.expected = isDisplaySpace ? ' ' : char; // exact expected key
    span.dataset.graded = "0"; // 0 = not graded yet, 1 = graded
    span.dataset.extra = "0";  // 1 = inserted extra char
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
    let sentence = "";
    if (mode === 'words') {
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
    setCaret();
  }

  function setTime(seconds) {
    timeLimit = seconds;
    if (timerEl) timerEl.textContent = `${timeLimit}`;
    updateTimeButtonsActive(seconds);
    updateModeButtonsActive();
    restartGame();
  }

  function startTimer() {
    let timeLeft = timeLimit;
    if (timerEl) timerEl.textContent = `${timeLeft}`;
    if (timeProgress) timeProgress.style.width = '100%';
    timer = setInterval(() => {
      if (!gameActive) return;
      timeLeft--;
      if (timeLeft < 0) timeLeft = 0;
      if (timerEl) timerEl.textContent = `${timeLeft}`;
      if (timeProgress) timeProgress.style.width = (timeLeft / timeLimit * 100) + '%';
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

    if (finalStats) finalStats.textContent = `You had ${wpm} WPM with ${accuracy}% accuracy!`;
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  function restartGame() {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
    gameActive = false;
    grades.length = 0;

    generateSentence();
    startTime = null;
    if (timeProgress) timeProgress.style.width = '100%';
    if (timerEl) timerEl.textContent = `${timeLimit}`;
    clearInterval(timer);
    updateModeButtonsActive();
  }

  function manualRestart() { restartGame(); }

  // ---------- Caret helper ----------
  function setCaret() {
    const spans = sentenceEl.querySelectorAll('span');
    spans.forEach(s => s.classList.remove('current'));
    if (spans[currentIndex]) spans[currentIndex].classList.add('current');
  }

  // ---------- Grading helpers ----------
  function applyGrade(span, isCorrect) {
    if (span.dataset.graded === "1") return;
    span.dataset.graded = "1";
    span.classList.add(isCorrect ? 'correct' : 'incorrect');
    grades.push(isCorrect ? 1 : 0);
  }

  function undoGrade(span) {
    if (span.dataset.graded !== "1") return;
    const wasExtra = span.dataset.extra === "1";
    span.dataset.graded = "0";
    span.classList.remove('correct', 'incorrect');
    if (grades.length > 0) grades.pop();
    if (wasExtra && span.parentNode) span.parentNode.removeChild(span);
  }

  // Always-visible extra (red) span inserted BEFORE the space.
  function insertExtraBefore(targetSpaceSpan, char) {
    const extra = document.createElement('span');
    extra.textContent = char;
    extra.dataset.expected = '';     // not part of expected string
    extra.dataset.graded = "1";      // immediately graded as incorrect
    extra.dataset.extra = "1";
    extra.classList.add('incorrect');
    // Force visibility regardless of site CSS:
    extra.style.color = 'red';
    extra.style.display = 'inline-block';
    extra.style.lineHeight = '1em';
    extra.style.margin = '0';
    extra.style.padding = '0';
    targetSpaceSpan.parentNode.insertBefore(extra, targetSpaceSpan);
    grades.push(0);
  }

  // ---------- Input handling ----------
  document.addEventListener('keydown', (e) => {
    // Start timer on first printable; still grade that key below.
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

    let spans = sentenceEl.querySelectorAll('span');
    let span = spans[currentIndex];
    if (!span) return;

    // Backspace: undo the node immediately before currentIndex.
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        const prev = spans[currentIndex - 1];
        undoGrade(prev);
        currentIndex--; // move caret one step left
        // Refresh snapshot after possible DOM removal
        setCaret();
      }
      return;
    }

    const key = normalizeKey(e);
    if (key === null) return; // ignore non-printables
    e.preventDefault();

    const expected = (span.dataset.expected || '').normalize('NFKC');

    // SPACE expected:
    if (expected === ' ') {
      if (key === ' ') {
        // Correct: grade & advance
        applyGrade(span, true);
        currentIndex++;
        setCaret();
      } else {
        // Wrong key at space => INSERT EXTRA BEFORE THE SPACE
        insertExtraBefore(span, key);
        // Keep caret on the SAME space: since we inserted a node BEFORE it,
        // the space moved right by +1 in the NodeList, so increment currentIndex.
        currentIndex++;
        setCaret();
        // Do not advance beyond the space
        return;
      }
    } else {
      // Normal character: grade (correct/incorrect) and advance
      const isCorrect = eqExpected(key, expected);
      applyGrade(span, isCorrect);
      currentIndex++;
      setCaret();
    }

    // If we finished all spans, load next sentence (if time remains)
    spans = sentenceEl.querySelectorAll('span');
    if (currentIndex >= spans.length) {
      const timeLeft = parseInt(timerEl?.textContent || '0', 10) || 0;
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
