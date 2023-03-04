import test from 'ava';
import { FileTools } from '../../src/index.js';

test('document wrapper loads', t => {
  const doc = new FileTools.Pdf('./tests/fixtures/filetypes/pdf-basic.pdf');
  t.assert(doc !== undefined);
});

test('data extracted', async t => {
  const file = new FileTools.Pdf('./tests/fixtures/filetypes/pdf-basic.pdf');
  const pdf = await file.getAll();
  t.assert(pdf.info !== null);
  t.is(pdf.content.text.trim(), 'Dummy PDF file');
});
