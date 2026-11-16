import assert from 'assert';
import { describe, it } from 'node:test';
import { en, fr, localizeError, relabelDefault } from '../src/content/i18n.js';

describe('localizeError', () => {
  it('translates static source messages to French and leaves English unchanged', () => {
    const message = 'Worksheet is empty.';
    assert.strictEqual(localizeError(message, 'fr'), fr.messages.worksheetEmpty);
    assert.strictEqual(localizeError(message, 'en'), message);
    assert.strictEqual(localizeError(en.home.manualError, 'fr'), fr.home.manualError);
  });

  it('translates dynamic messages while keeping their values', () => {
    assert.strictEqual(
      localizeError('We expected 15/30/60-minute data; detected 5-minute cadence.', 'fr'),
      'Données aux 15/30/60 minutes attendues; cadence de 5 minutes détectée.'
    );
    assert.strictEqual(
      localizeError('Only the first 200,000 rows were processed to keep the browser responsive on GitHub Pages.', 'fr'),
      fr.messages.rowLimit('200,000')
    );
  });

  it('passes unknown messages through untouched', () => {
    assert.strictEqual(localizeError('Something unexpected', 'fr'), 'Something unexpected');
  });

  it('has a French string for every English message', () => {
    for (const key of Object.keys(en.messages) as Array<keyof typeof en.messages>) {
      assert.strictEqual(typeof fr.messages[key], typeof en.messages[key], key);
      if (typeof en.messages[key] === 'string') {
        assert.notStrictEqual(fr.messages[key], en.messages[key], key);
      }
    }
  });
});

describe('relabelDefault', () => {
  it('switches default load names between languages but keeps custom names', () => {
    assert.strictEqual(relabelDefault(en.chart.peakLine, 'fr'), fr.chart.peakLine);
    assert.strictEqual(relabelDefault(fr.calculator.proposedLoads, 'en'), en.calculator.proposedLoads);
    assert.strictEqual(relabelDefault('Heat pump', 'fr'), 'Heat pump');
  });
});
