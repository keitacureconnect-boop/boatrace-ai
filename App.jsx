// api/chat.js
// Claude APIキーをサーバー側で管理し、安全にAI予想を提供する

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { messages, systemPrompt } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages配列が必要です' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'tools-2024-04-04',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt || 'あなたはボートレース予想の専門家です。',
        messages,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
        }],
      }),
    });

    const data = await response.json();
    const text = (data.content || [])
      .map(c => c.type === 'text' ? c.text : '')
      .filter(Boolean)
      .join('\n');

    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).json({ success: true, reply: text });

  } catch (err) {
    console.error('Claude API error:', err);
    return res.status(500).json({ error: 'AI応答の取得に失敗しました', detail: err.message });
  }
}
