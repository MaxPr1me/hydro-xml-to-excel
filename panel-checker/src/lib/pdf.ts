interface PdfImage {
  data: Uint8Array;
  width: number;
  height: number;
}

interface SummarySection {
  title: string;
  image?: PdfImage;
  placeholder?: string;
}

interface SummaryPdfOptions {
  documentTitle: string;
  sections: SummarySection[];
  disclaimer?: string;
}

const encoder = new TextEncoder();

function encode(text: string) {
  return encoder.encode(text);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  arrays.forEach((arr) => {
    merged.set(arr, offset);
    offset += arr.length;
  });
  return merged;
}

const winAnsiSpecials: Record<string, number> = {
  '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97
};

// Text strings are emitted as WinAnsiEncoding octal escapes so accented (FR-CA) characters render with the base Helvetica font.
function escapePdfText(text: string) {
  let result = '';
  for (const char of text) {
    if (char === '\\' || char === '(' || char === ')') {
      result += `\\${char}`;
      continue;
    }
    const code = char.codePointAt(0) ?? 0x3f;
    if (code >= 0x20 && code < 0x7f) {
      result += char;
      continue;
    }
    const winAnsi = code >= 0xa0 && code <= 0xff ? code : winAnsiSpecials[char];
    result += winAnsi === undefined ? '?' : `\\${winAnsi.toString(8).padStart(3, '0')}`;
  }
  return result;
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const TOP_Y = 760;
const BOTTOM_Y = 50;
const DOCUMENT_TITLE_HEIGHT = 28;
const SECTION_TITLE_HEIGHT = 18;
const SECTION_GAP = 16;
const BLOCK_GAP = 14;
const PLACEHOLDER_HEIGHT = 160;
// Tallest block that still fits under the document title on the first page, so no page is ever left empty.
const MAX_BLOCK_HEIGHT = TOP_Y - DOCUMENT_TITLE_HEIGHT - SECTION_TITLE_HEIGHT - BOTTOM_Y;

function layoutPages(
  documentTitle: string,
  sections: SummarySection[],
  imageNames: Array<string | null>,
  disclaimer?: string
): string[] {
  const pages: string[] = [];
  let lines: string[] = [];
  let cursorY = TOP_Y;
  let pageHasSection = false;

  const startNewPage = () => {
    pages.push(lines.join('\n'));
    lines = [];
    cursorY = TOP_Y;
    pageHasSection = false;
  };
  const drawText = (size: number, x: number, y: number, value: string) => {
    lines.push('BT', `/F1 ${size} Tf`, `${x} ${y} Td`, `(${escapePdfText(value)}) Tj`, 'ET');
  };

  drawText(16, MARGIN_X, cursorY, documentTitle);
  cursorY -= DOCUMENT_TITLE_HEIGHT;

  sections.forEach((section, index) => {
    const imageName = imageNames[index];
    let block: { width: number; height: number } | null = null;
    if (section.image && imageName) {
      // Full content width with the original aspect ratio; only images taller than a page are scaled down.
      let width = CONTENT_WIDTH;
      let height = Math.round((CONTENT_WIDTH * section.image.height) / section.image.width);
      if (height > MAX_BLOCK_HEIGHT) {
        width = Math.round((MAX_BLOCK_HEIGHT * section.image.width) / section.image.height);
        height = MAX_BLOCK_HEIGHT;
      }
      block = { width, height };
    } else if (section.placeholder) {
      block = { width: CONTENT_WIDTH, height: PLACEHOLDER_HEIGHT };
    }

    const needed = (pageHasSection ? SECTION_GAP : 0) + SECTION_TITLE_HEIGHT + (block?.height ?? 0);
    if (cursorY - needed < BOTTOM_Y) {
      startNewPage();
    }
    if (pageHasSection) {
      cursorY -= SECTION_GAP;
    }

    drawText(13, MARGIN_X, cursorY, section.title);
    cursorY -= SECTION_TITLE_HEIGHT;

    if (block && section.image && imageName) {
      const imageY = cursorY - block.height;
      lines.push('q', `${block.width} 0 0 ${block.height} ${MARGIN_X} ${imageY} cm`, `/${imageName} Do`, 'Q');
      cursorY = imageY - BLOCK_GAP;
    } else if (block && section.placeholder) {
      const placeholderY = cursorY - block.height;
      // q/Q scopes the light fill so the placeholder label and later text stay black.
      lines.push('q', '0.95 0.96 0.98 rg', `${MARGIN_X} ${placeholderY} ${block.width} ${block.height} re f`, 'Q');
      drawText(11, MARGIN_X + 10, placeholderY + block.height / 2, section.placeholder);
      cursorY = placeholderY - BLOCK_GAP;
    }
    pageHasSection = true;
  });

  if (disclaimer) {
    if (cursorY < BOTTOM_Y - 10) {
      startNewPage();
    }
    drawText(9, MARGIN_X, cursorY, disclaimer);
  }

  pages.push(lines.join('\n'));
  return pages;
}

export function buildSummaryPdf(options: SummaryPdfOptions): Blob {
  if (!options.sections.length) {
    throw new Error('At least one section is required to build the PDF.');
  }

  const offsetsById: number[] = [];
  const bodyParts: Uint8Array[] = [];
  const header = encode('%PDF-1.4\n%âãÏÓ\n');
  bodyParts.push(header);
  let position = header.length;

  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;

  let nextId = 4;
  const imageIds = options.sections.map((section) => (section.image ? nextId++ : null));
  const imageNames = options.sections.map((section, index) => (section.image ? `Im${index + 1}` : null));
  const pageContents = layoutPages(options.documentTitle, options.sections, imageNames, options.disclaimer);
  const pageObjects = pageContents.map(() => ({ contentId: nextId++, pageId: nextId++ }));

  const kidsRefs = pageObjects.map(({ pageId }) => `${pageId} 0 R`).join(' ');

  const catalog = encode(`${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`);
  const pages = encode(`${pagesId} 0 obj\n<< /Type /Pages /Kids [${kidsRefs}] /Count ${pageObjects.length} >>\nendobj\n`);
  const font = encode(`${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`);

  const addObject = (id: number, bytes: Uint8Array) => {
    offsetsById[id] = position;
    bodyParts.push(bytes);
    position += bytes.length;
  };

  addObject(catalogId, catalog);
  addObject(pagesId, pages);
  addObject(fontId, font);

  options.sections.forEach((section, index) => {
    const imageId = imageIds[index];
    if (section.image && imageId) {
      addObject(
        imageId,
        concatBytes(
          encode(
            `${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${section.image.width} /Height ${section.image.height}` +
              ` /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${section.image.data.length} >>\nstream\n`
          ),
          section.image.data,
          encode('\nendstream\nendobj\n')
        )
      );
    }
  });

  const resourceParts = [`/Font << /F1 ${fontId} 0 R >>`];
  const xObjectEntries = imageNames
    .map((name, index) => {
      const imageId = imageIds[index];
      return name && imageId ? `/${name} ${imageId} 0 R` : null;
    })
    .filter(Boolean)
    .join(' ');
  if (xObjectEntries) {
    resourceParts.push(`/XObject << ${xObjectEntries} >>`);
  }

  const resources = resourceParts.join(' ');
  pageObjects.forEach(({ contentId, pageId }, index) => {
    const contentBytes = encode(pageContents[index]);
    addObject(
      contentId,
      concatBytes(
        encode(`${contentId} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`),
        contentBytes,
        encode('\nendstream\nendobj\n')
      )
    );
    addObject(
      pageId,
      encode(
        `${pageId} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << ${resources} >> /Contents ${contentId} 0 R >>\nendobj\n`
      )
    );
  });

  const xrefStart = position;
  const totalObjects = nextId - 1;
  let xref = `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= totalObjects; id += 1) {
    const offset = offsetsById[id];
    if (offset === undefined) {
      throw new Error(`Missing PDF offset for object ${id}.`);
    }
    xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${totalObjects + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  bodyParts.push(encode(xref));

  return new Blob(bodyParts as BlobPart[], { type: 'application/pdf' });
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  if (!base64) {
    return new Uint8Array();
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
