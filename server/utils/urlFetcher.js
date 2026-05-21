import fetch from 'node-fetch';

/**
 * Fetch and extract text content from a URL.
 * Strips HTML tags and returns clean text.
 * @param {string} url - The URL to fetch content from
 * @returns {Promise<{text: string, title: string, url: string}>}
 */
export async function fetchURL(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ActionFlow-AI/1.0 (Content Analysis Bot)',
        'Accept': 'text/html,application/xhtml+xml,text/plain',
      },
      timeout: 15000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();

    if (contentType.includes('text/html')) {
      // Extract title
      const titleMatch = body.match(/<title[^>]*>(.*?)<\/title>/is);
      const title = titleMatch ? titleMatch[1].trim() : '';

      // Remove scripts, styles, and HTML tags
      let text = body
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      // Limit text length
      if (text.length > 10000) {
        text = text.substring(0, 10000) + '... [truncated]';
      }

      return { text, title, url };
    }

    // Plain text
    return { text: body.substring(0, 10000), title: '', url };
  } catch (error) {
    console.error(`URL fetch error: ${error.message}`);
    throw new Error(`Failed to fetch URL: ${error.message}`);
  }
}

export default { fetchURL };
