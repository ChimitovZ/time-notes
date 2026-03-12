import OpenAI from 'openai'

const YANDEX_BASE_URL = process.env.YANDEX_BASE_URL ?? 'https://ai.api.cloud.yandex.net/v1'
const YANDEX_API_KEY = process.env.YANDEX_API_KEY ?? process.env.AI_API_KEY
const YANDEX_PROJECT_ID = process.env.YANDEX_PROJECT_ID
const YANDEX_PROMPT_ID = process.env.YANDEX_PROMPT_ID

function localImprove(text: string): string {
  const compact = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim()

  if (!compact) {
    return compact
  }

  return compact[0].toUpperCase() + compact.slice(1)
}

export async function improveTextWithAi(text: string): Promise<string> {
  if (!YANDEX_API_KEY || !YANDEX_PROJECT_ID || !YANDEX_PROMPT_ID) {
    return localImprove(text)
  }

  const client = new OpenAI({
    apiKey: YANDEX_API_KEY,
    baseURL: YANDEX_BASE_URL,
    defaultHeaders: {
      'OpenAI-Project': YANDEX_PROJECT_ID,
    },
  })

  try {
    const response = await client.responses.create({
      prompt: {
        id: YANDEX_PROMPT_ID,
      },
      input:
        `Ты редактор заметок. Улучши текст: исправь орфографию и пунктуацию, сохрани смысл и стиль, верни только итоговый текст без пояснений.` +
        `Вот текст заметки: ${text}`,
    })

    const improved = response.output_text?.trim()
    return improved || localImprove(text)
  } catch {
    return localImprove(text)
  }
}
