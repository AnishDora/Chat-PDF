import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { SourceType } from './sourceTypes';

const toTitleCase = (input: string): string =>
  input
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const buildFallbackChatTitle = (message: string, sourceTitles: string[], fallbackTitle: string): string => {
  const trimmed = message.replace(/\s+/g, ' ').trim();
  if (trimmed.length === 0) {
    const firstSource = sourceTitles.find(Boolean);
    return firstSource ? firstSource : fallbackTitle;
  }
  const words = trimmed.split(' ').slice(0, 6);
  if (words.length === 0) {
    const firstSource = sourceTitles.find(Boolean);
    return firstSource ? firstSource : fallbackTitle;
  }
  return toTitleCase(words.join(' '));
};

const TITLE_PROMPT = PromptTemplate.fromTemplate(`
You are helping label user-provided knowledge sources for a retrieval augmented generation system.
Analyze the content snippet below and suggest a concise, specific title (max 7 words) that captures the main subject.
Return only the title without additional words or punctuation beyond what is needed.

Source type: {sourceType}
Snippet:
"""
{snippet}
"""
`);

export async function generateDocumentTitle(
  snippet: string,
  sourceType: SourceType,
  fallbackTitle: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackTitle;
  }

  const trimmedSnippet = snippet.replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (!trimmedSnippet) {
    return fallbackTitle;
  }

  try {
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      temperature: 0.2,
    });

    const result = await TITLE_PROMPT
      .pipe(llm)
      .pipe(new StringOutputParser())
      .invoke({
        snippet: trimmedSnippet,
        sourceType,
      });

    const cleaned = result.replace(/"/g, '').trim();
    return cleaned.length ? cleaned : fallbackTitle;
  } catch (error) {
    console.error('Failed to generate AI title, falling back:', error);
    return fallbackTitle;
  }
}

const CHAT_TITLE_PROMPT = PromptTemplate.fromTemplate(`
You are helping name chat conversations for a knowledge assistant. Create a short, specific title (max 6 words) that reflects the primary topic.
Focus on the user's latest message and optional source titles.
Return only the title in Title Case, without quotes.

User message:
"""
{message}
"""

Relevant source titles (may be empty):
{sourceTitles}
`);

export async function generateChatTitleFromMessage(
  message: string,
  sourceTitles: string[],
  fallbackTitle: string
): Promise<string> {
  const fallback = buildFallbackChatTitle(message, sourceTitles, fallbackTitle);

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  const trimmedMessage = message.replace(/\s+/g, ' ').trim().slice(0, 800);

  if (!trimmedMessage) {
    return fallback;
  }

  try {
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      temperature: 0.2,
    });

    const response = await CHAT_TITLE_PROMPT
      .pipe(llm)
      .pipe(new StringOutputParser())
      .invoke({
        message: trimmedMessage,
        sourceTitles: sourceTitles.length ? sourceTitles.join('\n') : 'None'
      });

    const cleaned = response.replace(/"/g, '').trim();
    return cleaned.length ? cleaned : fallback;
  } catch (error) {
    console.error('Failed to generate chat title, using fallback:', error);
    return fallback;
  }
}
