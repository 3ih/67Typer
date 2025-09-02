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
  const CASE_SENSITIVE = true;

  const sentenceEl = document.getElementById('sentence');
  const timerEl = document.getElementById('timer');
  const timeProgress = document.getElementById('timeProgress');
  const finalStats = document.getElementById('finalStats');

  // Make spacing/extras render predictably
  sentenceEl.style.whiteSpace = 'pre-wrap';

  /* ========= Mode ========= */
  let mode = 'words';
  function updateModeButtonsActive() {
    const w = document.getElementById('modeWordsBtn');
    const s = document.getElementById('modeSentencesBtn');
    if (w && s) {
      w.classList.toggle('active', mode === 'words');
      s.classList.toggle('active', mode === 'sentences');
    }
  }
  function setMode(next) { mode = next === 'sentences' ? 'sentences' : 'words'; updateModeButtonsActive(); restartGame(); }

  /* ========= Time buttons ========= */
  const timeButtons = document.querySelectorAll('#settings button');
  function updateTimeButtonsActive(seconds) {
    timeButtons.forEach(btn => {
      const txt = (btn.textContent || "").replace(/\s+/g, '');
      btn.classList.toggle('active', txt.includes(String(seconds)));
    });
  }

  /* ========= Key normalization ========= */
  const SPACE_CHARS = new Set([' ','\u00A0','\u1680','\u2000','\u2001','\u2002','\u2003','\u2004','\u2005','\u2006','\u2007','\u2008','\u2009','\u200A','\u202F','\u205F','\u3000']);
  function isPrintableKey(e){ if(e.ctrlKey||e.metaKey||e.altKey) return false; if(e.key==='Dead'||e.key==='Compose') return false; return true; }
  function normalizeKey(e){
    if(!isPrintableKey(e)) return null;
    if(e.code==='Space'||e.key==='Spacebar'||SPACE_CHARS.has(e.key)) return ' ';
    if(typeof e.key==='string' && e.key.length===1){ const nk=e.key.normalize('NFKC'); if(nk.length===1) return nk; }
    if(e.key==='Unidentified'){
      if(e.code==='NumpadDecimal') return '.';
      if(e.code==='NumpadComma') return ',';
      const m = /^Numpad([0-9])$/.exec(e.code||''); if(m) return m[1];
    }
    return null;
  }
  function eqExpected(inChar, expChar){ return CASE_SENSITIVE ? (inChar===expChar) : (inChar.toLowerCase()===expChar.toLowerCase()); }

  /* ========= Rendering ========= */
  function createCharSpan(char){
    const span=document.createElement('span');
    const isDisplaySpace=(char==='\u00A0');
    span.textContent=isDisplaySpace?'\u00A0':char;
    span.dataset.expected=isDisplaySpace?' ':char; // exact key required
    span.dataset.graded="0";
    span.dataset.extra="0";
    return span;
  }
  function createLine(lineWords, isFirstLine){
    const line=document.createElement('div');
    lineWords.forEach((word, wIdx) => {
      word.split('').forEach(ch => line.appendChild(createCharSpan(ch)));
      const isLast = wIdx === lineWords.length - 1;
      const addSpace = isFirstLine ? true : !isLast;
      if (addSpace) line.appendChild(createCharSpan('\u00A0'));
    });
    return line;
  }

  function generateSentence(){
    let s = "";
    if (mode === 'words') {
      let last = "";
      while (s.replace(/\s/g,'').length < 75) {
        const word = Math.random() < 0.25
          ? smallWords[Math.floor(Math.random() * smallWords.length)]
          : dictionary[Math.floor(Math.random() * dictionary.length)];
        if (word === last) continue;
        s += word + " ";
        last = word;
      }
      s = s.trim();
    } else {
      s = sentenceBank[Math.floor(Math.random() * sentenceBank.length)];
    }
    const words = s.split(' ');
    const mid = Math.floor(words.length / 2);
    sentenceEl.innerHTML = "";
    sentenceEl.appendChild(createLine(words.slice(0, mid), true));
    sentenceEl.appendChild(createLine(words.slice(mid), false));
    currentIndex = 0;
    placeCaretBeforeIndex(currentIndex);
  }

  /* ========= Timer / end ========= */
  function setTime(seconds){ timeLimit = seconds; timerEl.textContent = `${timeLimit}`; updateTimeButtonsActive(seconds); updateModeButtonsActive(); restartGame(); }
  function startTimer(){
    let timeLeft = timeLimit; timerEl.textContent = `${timeLeft}`; timeProgress.style.width = '100%';
    timer=setInterval(() => {
      if (!gameActive) return;
      timeLeft--; if (timeLeft < 0) timeLeft = 0;
      timerEl.textContent = `${timeLeft}`;
      timeProgress.style.width = (timeLeft / timeLimit * 100) + '%';
      if (timeLeft <= 0) { clearInterval(timer); endGame(); }
    }, 1000);
  }
  function endGame(){
    if (!gameActive) return;
    gameActive = false; clearInterval(timer);
    const correctCount = grades.reduce((a,b)=>a+b,0);
    const wpm = Math.round((correctCount/5)/((Date.now()-startTime)/60000));
    const total = grades.length;
    const acc = total ? Math.round((correctCount/total)*100) : 0;
    finalStats.textContent = `You had ${wpm} WPM with ${acc}% accuracy!`;
    const overlay = document.getElementById('overlay'); if (overlay) overlay.style.display = 'flex';
  }
  function restartGame(){
    const overlay = document.getElementById('overlay'); if (overlay) overlay.style.display = 'none';
    gameActive = false; grades.length = 0;
    generateSentence(); startTime = null;
    timeProgress.style.width = '100%'; timerEl.textContent = `${timeLimit}`;
    clearInterval(timer); updateModeButtonsActive();
  }
  function manualRestart(){ restartGame(); }

  /* ========= Caret shim ========= */
  const caret = document.createElement('span');
  Object.assign(caret.style, {
    display:'inline-block', width:'0', borderLeft:'2px solid currentColor', height:'1em', transform:'translateY(2px)'
  });
  function spansAll(){ return sentenceEl.querySelectorAll('span'); }
  function placeCaretBeforeIndex(idx){
    const spans = spansAll();
    if (idx >= spans.length) { sentenceEl.appendChild(caret); }
    else { spans[idx].parentNode.insertBefore(caret, spans[idx]); }
  }

  /* ========= Grading ========= */
  function applyGrade(span, ok){
    if (span.dataset.graded === "1") return;
    span.dataset.graded = "1";
    span.classList.add(ok ? 'correct' : 'incorrect');
    grades.push(ok ? 1 : 0);
  }
  function undoGrade(span){
    if (span.dataset.graded !== "1") return;
    const wasExtra = span.dataset.extra === "1";
    span.dataset.graded = "0";
    span.classList.remove('correct','incorrect');
    if (grades.length > 0) grades.pop();
    if (wasExtra && span.parentNode) span.parentNode.removeChild(span); // extras get removed
  }
  function insertExtraBefore(spaceSpan, char){
    const extra = document.createElement('span');
    extra.textContent = char;
    extra.dataset.expected = '';
    extra.dataset.graded = '1';     // count immediately as incorrect
    extra.dataset.extra = '1';
    extra.classList.add('incorrect');
    extra.style.color = 'red';
    extra.style.display = 'inline-block';
    extra.style.lineHeight = '1em';
    spaceSpan.parentNode.insertBefore(extra, spaceSpan);
    grades.push(0);
  }

  /* ========= Input handling ========= */
  document.addEventListener('keydown', (e) => {
    // Start timer on first printable (and still handle that key below)
    if (!gameActive && !startTime && isPrintableKey(e)) {
      const k = normalizeKey(e);
      if (k !== null) { gameActive = true; startTime = Date.now(); startTimer(); }
    } else if (!gameActive && e.key !== 'Backspace') {
      return;
    }

    let spans = spansAll();
    let span = spans[currentIndex];
    if (!span) return;

    // --- Backspace: ALWAYS move caret one slot left and keep it there ---
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        const targetIndex = currentIndex - 1;
        const prev = spans[targetIndex];
        undoGrade(prev);
        // After undo:
        // - if prev was a normal letter: it still exists (ungraded). Caret should sit BEFORE it.
        // - if prev was an extra: it was removed; caret should sit BEFORE whatever is now at targetIndex (usually the space).
        currentIndex = targetIndex;
        placeCaretBeforeIndex(currentIndex);
      }
      return;
    }

    const key = normalizeKey(e);
    if (key === null) return;
    e.preventDefault();

    const expected = (span.dataset.expected || '').normalize('NFKC');

    // --- Space expected ---
    if (expected === ' ') {
      if (key === ' ') {
        applyGrade(span, true);
        currentIndex++;
        placeCaretBeforeIndex(currentIndex);
      } else {
        // Insert extra and keep caret BETWEEN extras and the space
        insertExtraBefore(span, key);
        // The space just shifted right by +1 => recompute its index and pin caret before it
        spans = spansAll();
        const newSpaceIndex = Array.prototype.indexOf.call(spans, span);
        currentIndex = newSpaceIndex;            // sit before the space
        placeCaretBeforeIndex(currentIndex);
        return;
      }
    } else {
      // --- Normal character ---
      applyGrade(span, eqExpected(key, expected));
      currentIndex++;
      placeCaretBeforeIndex(currentIndex);
    }

    // Next sentence if finished
    if (currentIndex >= spansAll().length) {
      const timeLeft = parseInt(timerEl.textContent || '0', 10) || 0;
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
