interface PdfImage {
  data: Uint8Array;
  width: number;
  height: number;
}

interface SummaryPdfOptions {
  title: string;
  summaryLines: string[];
  loads: string[];
  disclaimer: string;
  chartImage?: PdfImage;
  placeholderMessage?: string;
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

function buildContent(options: SummaryPdfOptions) {
  const lines: string[] = [];
  let cursorY = 760;
  lines.push('BT');
  lines.push('/F1 16 Tf');
  lines.push(`50 ${cursorY} Td`);
  lines.push(`(${escapePdfText(options.title)}) Tj`);
  lines.push('ET');
  cursorY -= 24;

  options.summaryLines.forEach((line) => {
    lines.push('BT');
    lines.push('/F1 11 Tf');
    lines.push(`50 ${cursorY} Td`);
    lines.push(`(${escapePdfText(line)}) Tj`);
    lines.push('ET');
    cursorY -= 14;
  });

  cursorY -= 6;
  const chartWidth = 520;
  if (options.chartImage) {
    const ratioHeight = Math.min(480, Math.round((chartWidth * options.chartImage.height) / options.chartImage.width));
    const chartY = cursorY - ratioHeight - 10;
    lines.push('q');
    lines.push(`${chartWidth} 0 0 ${ratioHeight} 50 ${chartY} cm`);
    lines.push('/Im1 Do');
    lines.push('Q');
    cursorY = chartY - 20;
  } else if (options.placeholderMessage) {
    const placeholderHeight = 200;
    const chartY = cursorY - placeholderHeight - 10;
    lines.push('0.91 0.94 0.98 rg');
    lines.push(`50 ${chartY} ${chartWidth} ${placeholderHeight} re f`);
    lines.push('BT');
    lines.push('/F1 10 Tf');
    lines.push(`60 ${chartY + placeholderHeight / 2} Td`);
    lines.push(`(${escapePdfText(options.placeholderMessage)}) Tj`);
    lines.push('ET');
    cursorY = chartY - 20;
  }

  lines.push('BT');
  lines.push('/F1 13 Tf');
  lines.push(`50 ${cursorY} Td`);
  lines.push('(Proposed loads) Tj');
  lines.push('ET');
  cursorY -= 18;

  const loadLines = options.loads.length ? options.loads : ['No what-if loads were added to this run.'];
  loadLines.forEach((line) => {
    lines.push('BT');
    lines.push('/F1 11 Tf');
    lines.push(`50 ${cursorY} Td`);
    lines.push(`(${escapePdfText(line)}) Tj`);
    lines.push('ET');
    cursorY -= 14;
  });

  cursorY -= 10;
  lines.push('BT');
  lines.push('/F1 9 Tf');
  lines.push(`50 ${Math.max(cursorY, 80)} Td`);
  lines.push(`(${escapePdfText(options.disclaimer)}) Tj`);
  lines.push('ET');

  return lines.join('\n');
}

export function buildSummaryPdf(options: SummaryPdfOptions): Blob {
  const offsets: number[] = [];
  const bodyParts: Uint8Array[] = [];
  const header = encode('%PDF-1.4\n%âãÏÓ\n');
  bodyParts.push(header);
  let position = header.length;

  const resources = options.chartImage
    ? '/Resources << /Font << /F1 5 0 R >> /XObject << /Im1 6 0 R >> >>'
    : '/Resources << /Font << /F1 5 0 R >> >>';
  const catalog = encode('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  const pages = encode('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  const pageObject = encode(
    '3 0 obj\n' +
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ${resources} /Contents 4 0 R >>\nendobj\n`
  );
  const contentString = buildContent(options);
  const contentBytes = encode(contentString);
  const content = concatBytes(
    encode(`4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`),
    contentBytes,
    encode('\nendstream\nendobj\n')
  );
  const font = encode('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  const baseObjects = [catalog, pages, pageObject, content, font];
  const imageObject =
    options.chartImage
      ? concatBytes(
          encode(
            `6 0 obj\n<< /Type /XObject /Subtype /Image /Width ${options.chartImage.width} /Height ${options.chartImage.height} ` +
              '/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ' +
              `/Length ${options.chartImage.data.length} >>\nstream\n`
          ),
          options.chartImage.data,
          encode('\nendstream\nendobj\n')
        )
      : null;

  const allObjects = imageObject ? baseObjects.concat(imageObject) : baseObjects;
  allObjects.forEach((obj) => {
    offsets.push(position);
    bodyParts.push(obj);
    position += obj.length;
  });

  const xrefStart = position;
  const totalObjects = offsets.length;
  let xref = `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  xref += `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
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
