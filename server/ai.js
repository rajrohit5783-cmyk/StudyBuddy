const PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function aiStatus() {
  return { provider: PROVIDER, model: MODEL, configured: PROVIDER === 'groq' && Boolean(process.env.GROQ_API_KEY) };
}

export async function generateChat(messages, { json = false } = {}) {
  if (PROVIDER !== 'groq') throw new Error(`Unsupported AI_PROVIDER: ${PROVIDER}`);
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured.');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_completion_tokens: 2048,
      ...(json ? { response_format: { type: 'json_object' } } : {})
    }),
    signal: AbortSignal.timeout(25000)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Groq API ${response.status}: ${detail.slice(0, 300)}`);
  }

  const completion = await response.json();
  const content = completion.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('Groq returned an empty response.');
  return content;
}
