// pdfjs-dist uses DOMMatrix for text transform calculations (a browser global
// not available in Node.js). This polyfill must be defined before pdfjs-dist
// loads — ES module imports are hoisted, so we use dynamic import() below to
// guarantee the polyfill runs first.
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

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  // Dynamic import ensures pdfjs-dist loads after the polyfill above is set.
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = ''

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
      .filter((item): item is typeof item & { str: string } => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ')
    pageTexts.push(pageText)
  }

  return pageTexts.join('\n')
}
