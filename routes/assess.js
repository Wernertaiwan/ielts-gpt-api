const express = require('express');
const router = express.Router();
const { assessWriting } = require('../services/claude');

router.post('/', async (req, res) => {
  const { taskType, question, writingText, modelAnswer } = req.body;

  if (!writingText || writingText.trim().split(/\s+/).filter(Boolean).length < 10) {
    return res.status(400).json({ error: 'Please provide a writing sample of at least 10 words.' });
  }

  if (!taskType || !['task1', 'task2'].includes(taskType)) {
    return res.status(400).json({ error: 'Please specify a valid task type: task1 or task2.' });
  }

  try {
    const result = await assessWriting({ taskType, question, writingText, modelAnswer });
    res.json(result);
  } catch (err) {
    console.error('Assessment error:', err.message);
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: 'AI returned an unexpected response. Please try again.' });
    }
    res.status(500).json({ error: 'Assessment failed. Please try again.' });
  }
});

module.exports = router;
