import Groq from 'groq-sdk';

const PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
let client;

function getClient() {
  if (PROVIDER !== 'groq') throw new Error(`Unsupported AI_PROVIDER: ${PROVIDER}`);
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured.');
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 25000, maxRetries: 1 });
  return client;
}

export function aiStatus() {
  return { provider: PROVIDER, model: MODEL, configured: PROVIDER === 'groq' && Boolean(process.env.GROQ_API_KEY) };
}

export async function generateChat(messages, { json = false } = {}) {
  const completion = await getClient().chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.3,
    max_completion_tokens: 2048,
    ...(json ? { response_format: { type: 'json_object' } } : {})
  });
  const content = completion.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('Groq returned an empty response.');
  return content;
}
