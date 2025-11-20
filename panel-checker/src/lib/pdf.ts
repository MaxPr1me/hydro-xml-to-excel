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

function escapePdfText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSectionContent(
  documentTitle: string,
  section: SummarySection,
  imageName: string | null,
  disclaimer?: string
) {
  const lines: string[] = [];
  let cursorY = 760;

  lines.push('BT');
  lines.push('/F1 16 Tf');
  lines.push(`50 ${cursorY} Td`);
  lines.push(`(${escapePdfText(documentTitle)}) Tj`);
  lines.push('ET');
  cursorY -= 24;

  lines.push('BT');
  lines.push('/F1 13 Tf');
  lines.push(`50 ${cursorY} Td`);
  lines.push(`(${escapePdfText(section.title)}) Tj`);
  lines.push('ET');
  cursorY -= 20;

  const contentWidth = 512;
  const maxHeight = 640;

  if (section.image && imageName) {
    const scaledHeight = Math.min(maxHeight, Math.round((contentWidth * section.image.height) / section.image.width));
    const imageY = Math.max(cursorY - scaledHeight, 80);

    lines.push('q');
    lines.push(`${contentWidth} 0 0 ${scaledHeight} 50 ${imageY} cm`);
    lines.push(`/${imageName} Do`);
    lines.push('Q');
    cursorY = imageY - 20;
  } else if (section.placeholder) {
    const placeholderHeight = 200;
    const placeholderY = Math.max(cursorY - placeholderHeight, 80);
    lines.push('0.95 0.96 0.98 rg');
    lines.push(`50 ${placeholderY} ${contentWidth} ${placeholderHeight} re f`);
    lines.push('BT');
    lines.push('/F1 11 Tf');
    lines.push(`60 ${placeholderY + placeholderHeight / 2} Td`);
    lines.push(`(${escapePdfText(section.placeholder)}) Tj`);
    lines.push('ET');
    cursorY = placeholderY - 20;
  }

  if (disclaimer) {
    lines.push('BT');
    lines.push('/F1 9 Tf');
    lines.push(`50 ${Math.max(cursorY, 60)} Td`);
    lines.push(`(${escapePdfText(disclaimer)}) Tj`);
    lines.push('ET');
  }

  return lines.join('\n');
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
  const contentIds = options.sections.map(() => nextId++);
  const pageIds = options.sections.map(() => nextId++);

  const kidsRefs = pageIds.map((id) => `${id} 0 R`).join(' ');

  const catalog = encode(`${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`);
  const pages = encode(
    `${pagesId} 0 obj\n<< /Type /Pages /Kids [${kidsRefs}] /Count ${pageIds.length} >>\nendobj\n`
  );
  const font = encode(`${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

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

    const imageName = imageId ? `Im${index + 1}` : null;
    const contentString = buildSectionContent(
      options.documentTitle,
      section,
      imageName,
      index === options.sections.length - 1 ? options.disclaimer : undefined
    );
    const contentBytes = encode(contentString);
    const content = concatBytes(
      encode(`${contentIds[index]} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`),
      contentBytes,
      encode('\nendstream\nendobj\n')
    );

    addObject(contentIds[index], content);

    const resourceParts = [`/Font << /F1 ${fontId} 0 R >>`];
    if (imageId && imageName) {
      resourceParts.push(`/XObject << /${imageName} ${imageId} 0 R >>`);
    }

    const resources = resourceParts.join(' ');
    addObject(
      pageIds[index],
      encode(
        `${pageIds[index]} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << ${resources} >> /Contents ${contentIds[index]} 0 R >>\nendobj\n`
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
