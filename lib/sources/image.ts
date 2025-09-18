import OpenAI from 'openai';

export const SUPPORTED_OCR_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

const getOpenAIClient = (): OpenAI | null => {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

export async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI API key is required for screenshot OCR.');
  }

  if (!SUPPORTED_OCR_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported image type for OCR: ${mimeType}`);
  }

  const base64 = buffer.toString('base64');

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Transcribe every legible word in this screenshot. Return plain text without commentary.',
          },
          {
            type: 'input_image',
            image_url: `data:${mimeType};base64,${base64}`,
          },
        ],
      },
    ],
  });

  const text = response.output_text?.trim();
  if (!text) {
    throw new Error('No text extracted from the screenshot.');
  }

  return text;
}
