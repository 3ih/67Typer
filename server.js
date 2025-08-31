const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static('.')); // Serve files from current folder

function getScores() {
  if (!fs.existsSync('scores.json')) return [];
  return JSON.parse(fs.readFileSync('scores.json'));
}

function saveScores(scores) {
  fs.writeFileSync('scores.json', JSON.stringify(scores, null, 2));
}

app.get('/scores', (req, res) => {
  const scores = getScores().sort((a, b) => b.score - a.score).slice(0, 10);
  res.json(scores);
});

app.post('/scores', (req, res) => {
  const { name, score } = req.body;
  if (!name || typeof score !== 'number' || score > 200) return res.status(400).send('Invalid');
  let scores = getScores();
  const player = scores.find(p => p.name === name);
  if (player) {
    if (score > player.score) player.score = score;
  } else {
    scores.push({ name, score });
  }
  saveScores(scores);
  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));