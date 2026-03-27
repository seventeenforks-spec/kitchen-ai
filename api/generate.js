js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' }); 
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { profile, pantry } = req.body;

  if (!pantry) {
    return res.status(400).json({ error: 'Pantry is required' });
  }

  const prompt = [
    'You are Chef JP, a professional chef with 20+ years of culinary experience specializing in practical, waste-conscious family meal planning.',
    '',
    'Family: ' + (profile.adults || '2') + ' adults, ' + (profile.kids || '0') + ' kids.',
    'Dietary restrictions: ' + (profile.restrictions || 'none') + '.',
    'Allergies (STRICT — never include): ' + (profile.allergies || 'none') + '.',
    'Preferred proteins: ' + (profile.proteins || 'chicken, fish') + '.',
    'Dislikes: ' + (profile.dislikes || 'none') + '.',
    'Kitchen inventory: ' + pantry,
    '',
    'Build a full weekly meal plan using this exact framework:',
    '- 2 hearty no-wilt salads (meal-worthy, great prepped ahead)',
    '- 4 dinners: 2 chicken breast dishes, 1 fish dish, 1 plant-based dish',
    '- 1 breakfast prep item (egg white bites or similar)',
    '- 1 snack or kids item',
    '',
    'Strict rules:',
    '- No one-off specialty ingredients — use versatile pantry staples that repeat across dishes',
    '- Cross-utilize ingredients across multiple meals to minimize waste',
    '- Chicken breast only, baked preparations preferred, olive oil focused',
    '- More vegetables than starch in every dish',
    '- Honor ALL allergies and restrictions with zero exceptions',
    '',
    'Return ONLY valid compact JSON. No markdown, no code fences, no explanation:',
    '{"weekTheme":"evocative 4-6 word theme","meals":[{"category":"string","name":"string","description":"1-2 sentence description","prepTime":"X mins","servings":"X","chefNote":"practical chef tip"}],"shoppingList":{"Produce":["item"],"Proteins":["item"],"Pantry":["item"],"Dairy & Eggs":["item"],"Other":["item"]},"chefSummary":"2-3 sentences from Chef JP about this week\'s plan philosophy"}'
  ].join('\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'API error ' + response.status);
    }

    const data = await response.json();
    const raw = data.content.map(b => b.text || '').join('').trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();

    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No valid JSON in response');

    const plan = JSON.parse(raw.slice(start, end + 1));
    return res.status(200).json(plan);

  } catch (err) {
    console.error('Generate error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate plan' });
  }
}
