import { PDFParse } from 'pdf-parse'

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const result = await parser.getText()
  return result.text
}
