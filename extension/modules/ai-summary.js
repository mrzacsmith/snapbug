const MAX_INPUT_LENGTH = 8000
const MODEL = 'openai/gpt-4o-mini'
const SYSTEM_PROMPT = 'Summarize these browser console messages for a bug report. Focus on errors and warnings. Be concise. Ignore routine logs and noise. Output a short bulleted list.'

export async function summarizeConsole(consoleText, apiKey) {
  if (!apiKey || !consoleText) return null

  const truncated = consoleText.length > MAX_INPUT_LENGTH
    ? consoleText.slice(0, MAX_INPUT_LENGTH) + '\n...(truncated)'
    : consoleText

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: truncated },
        ],
        max_tokens: 300,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.choices?.[0]?.message?.content || null
  } catch {
    return null
  }
}
