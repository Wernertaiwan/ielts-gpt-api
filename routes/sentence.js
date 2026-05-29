const express = require('express');
const router = express.Router();
const { checkSentence } = require('../services/claude');

router.post('/', async (req, res) => {
  const { sentence } = req.body;

  if (!sentence || sentence.trim().length < 5) {
    return res.status(400).json({ error: 'Please enter a sentence to check (at least 5 characters).' });
  }

  try {
    const result = await checkSentence({ sentence: sentence.trim() });
    res.json(result);
  } catch (err) {
    console.error('Sentence check error:', err.message);
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: 'AI returned an unexpected response. Please try again.' });
    }
    res.status(500).json({ error: 'Sentence check failed. Please try again.' });
  }
});

module.exports = router;
