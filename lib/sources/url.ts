import { load } from 'cheerio';

export interface UrlExtractionResult {
  text: string;
  meta: {
    title?: string;
    description?: string;
    siteName?: string;
  };
}

const sanitize = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : undefined;
};

export async function extractTextFromUrl(targetUrl: string): Promise<UrlExtractionResult> {
  const { default: puppeteer } = await import('puppeteer');
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 45000,
    });

    const html = await page.content();
    const $ = load(html);

    $('script, style, noscript, iframe, svg').remove();

    const title = sanitize($('meta[property="og:title"]').attr('content')) || sanitize($('title').text());
    const description = sanitize($('meta[name="description"]').attr('content')) || sanitize($('meta[property="og:description"]').attr('content'));
    const siteName = sanitize($('meta[property="og:site_name"]').attr('content'));

    const text = sanitize(
      $('body')
        .text()
        .replace(/\s+/g, ' ')
    ) || '';

    if (!text) {
      throw new Error(`No textual content extracted from URL: ${targetUrl}`);
    }

    return {
      text,
      meta: {
        title,
        description,
        siteName,
      },
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
