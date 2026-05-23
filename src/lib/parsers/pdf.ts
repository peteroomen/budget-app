import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api'

// pdfjs-dist uses DOMMatrix for text transform calculations during getTextContent().
// It's a browser global — not available in Node.js. This minimal stub prevents
// crashes; the actual matrix values only affect text positioning, not which strings
// are extracted, so identity defaults are fine for our use case.
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    a = 1
    b = 0
    c = 0
    d = 1
    e = 0
    f = 0
    m11 = 1
    m12 = 0
    m13 = 0
    m14 = 0
    m21 = 0
    m22 = 1
    m23 = 0
    m24 = 0
    m31 = 0
    m32 = 0
    m33 = 1
    m34 = 0
    m41 = 0
    m42 = 0
    m43 = 0
    m44 = 1
    is2D = true
    isIdentity = true

    constructor(init?: number[] | string) {
      if (Array.isArray(init) && init.length === 6) {
        ;[this.a, this.b, this.c, this.d, this.e, this.f] = init as [
          number,
          number,
          number,
          number,
          number,
          number,
        ]
        this.m11 = this.a
        this.m12 = this.b
        this.m21 = this.c
        this.m22 = this.d
        this.m41 = this.e
        this.m42 = this.f
      }
    }

    transformPoint(p: { x?: number; y?: number }) {
      return {
        x: this.a * (p.x ?? 0) + this.c * (p.y ?? 0) + this.e,
        y: this.b * (p.x ?? 0) + this.d * (p.y ?? 0) + this.f,
        z: 0,
        w: 1,
      }
    }

    multiply() {
      return this
    }
    inverse() {
      return this
    }
    translate() {
      return this
    }
    scale() {
      return this
    }
    rotate() {
      return this
    }
    rotateAxisAngle() {
      return this
    }
    skewX() {
      return this
    }
    skewY() {
      return this
    }
    flipX() {
      return this
    }
    flipY() {
      return this
    }
    toString() {
      return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`
    }
  }

  globalThis.DOMMatrix = DOMMatrixPolyfill as unknown as typeof DOMMatrix
}

// Disable worker for server-side use — text extraction runs in the main thread.
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
