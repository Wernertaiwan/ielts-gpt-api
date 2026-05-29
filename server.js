require('dotenv').config();
const express = require('express');
const path = require('path');

const assessRouter = require('./routes/assess');
const sentenceRouter = require('./routes/sentence');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/assess', assessRouter);
app.use('/api/sentence', sentenceRouter);

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`IELTS Assessment Tool running on http://localhost:${PORT}`);
});
