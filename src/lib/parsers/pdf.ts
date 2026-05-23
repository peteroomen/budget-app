import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api'

// Disable worker for server-side use — text extraction runs in the main thread.
// The worker is only needed for browser-based concurrent rendering.
GlobalWorkerOptions.workerSrc = ''

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return 'str' in item
}

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableRange: true,
    disableStream: true,
  }).promise

  const pageTexts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .filter(isTextItem)
      .map((item) => item.str)
      .join(' ')
    pageTexts.push(pageText)
  }

  return pageTexts.join('\n')
}
