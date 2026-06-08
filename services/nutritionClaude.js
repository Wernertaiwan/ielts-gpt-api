const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

async function scanNutritionLabel(imageBase64, mimeType) {
  const systemPrompt = `You are an expert at reading food nutrition labels, specializing in Taiwan nutrition labels (台灣營養標示) written in Traditional Chinese (繁體中文).

Extract all nutrition information and translate Chinese text to English. Taiwan labels use these terms:
- 熱量 = Calories (kcal)
- 蛋白質 = Protein (g)
- 脂肪 / 總脂肪 = Total Fat (g)
- 飽和脂肪 = Saturated Fat (g)
- 反式脂肪 = Trans Fat (g)
- 碳水化合物 = Total Carbohydrate (g)
- 糖 = Sugar (g)
- 膳食纖維 = Dietary Fiber (g)
- 鈉 = Sodium (mg)
- 每份量 / 每份 = Serving Size
- 本包裝含 X 份 = X Servings per Package

Respond ONLY with valid JSON in this exact shape (no markdown, no extra text):
{
  "productName": "<English product name, translate if Chinese>",
  "originalName": "<Chinese name as written on label, or null>",
  "servingSize": "<e.g. 30g or 1 packet (50g)>",
  "servingsPerPackage": <number or null>,
  "perServing": {
    "calories": <number>,
    "protein": <number>,
    "totalFat": <number>,
    "saturatedFat": <number or null>,
    "transFat": <number or null>,
    "totalCarbohydrate": <number>,
    "sugar": <number or null>,
    "dietaryFiber": <number or null>,
    "sodium": <number or null>
  },
  "confidence": "high" | "medium" | "low",
  "notes": "<any notes about readability or assumptions>"
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: 'Scan this nutrition label and extract all values. Translate from Traditional Chinese (繁體中文) to English if needed.',
        },
      ],
    }],
  });

  const text = response.content[0].text.trim();
  return JSON.parse(text);
}

module.exports = { scanNutritionLabel };
