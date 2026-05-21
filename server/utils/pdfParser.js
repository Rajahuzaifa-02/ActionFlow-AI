import fs from 'fs';
import pdf from 'pdf-parse';

/**
 * Extract text content from a PDF file buffer or path.
 * @param {Buffer|string} input - PDF buffer or file path
 * @returns {Promise<{text: string, pages: number, info: object}>}
 */
export async function parsePDF(input) {
  try {
    let buffer;
    if (typeof input === 'string') {
      buffer = fs.readFileSync(input);
    } else {
      buffer = input;
    }

    const data = await pdf(buffer);
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info || {},
    };
  } catch (error) {
    console.error(`PDF parsing error: ${error.message}`);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

export default { parsePDF };
