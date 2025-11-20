import assert from 'assert';
import { describe, it } from 'node:test';
import { buildSummaryPdf } from '../src/lib/pdf.js';

describe('summary pdf builder', () => {
  it('builds a multi-section PDF with placeholders', async () => {
    const sampleImage = { data: new Uint8Array([255, 216, 255, 217]), width: 400, height: 200 };
    const blob = buildSummaryPdf({
      documentTitle: 'Test Summary',
      sections: [
        { title: 'Report', image: sampleImage },
        { title: 'Demand profile', placeholder: 'No chart available' }
      ],
      disclaimer: 'Screening only'
    });

    const buffer = Buffer.from(await blob.arrayBuffer());
    const content = buffer.toString('latin1');

    assert.ok(content.includes('/Count 2'));
    assert.ok(content.includes('Test Summary'));
    assert.ok(content.includes('Demand profile'));
    assert.ok(content.includes('%%EOF'));
  });
});
