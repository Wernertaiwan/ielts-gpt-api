const express = require('express');
const router = express.Router();
const { scanNutritionLabel } = require('../services/nutritionClaude');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

router.post('/scan', async (req, res) => {
  const { image, mimeType } = req.body;

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Please provide an image.' });
  }

  if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: 'Image must be JPEG, PNG, GIF, or WebP.' });
  }

  try {
    const result = await scanNutritionLabel(image, mimeType);
    res.json(result);
  } catch (err) {
    console.error('Nutrition scan error:', err.message);
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: 'AI returned an unexpected response. Please try again.' });
    }
    res.status(500).json({ error: 'Failed to scan nutrition label. Please try again.' });
  }
});

module.exports = router;
