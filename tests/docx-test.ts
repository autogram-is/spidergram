import test from 'ava';
import { FileTools } from '../src/index.js';

test('document wrapper loads', t => {
  const doc = new FileTools.DocX('./tests/fixtures/filetypes/document.docx');
  t.assert(doc !== undefined);
});

test('data extracted', async t => {
  const file = new FileTools.DocX('./tests/fixtures/filetypes/document.docx');
  const doc = await file.getAll();

  t.is(doc.properties?.title, 'An example MS Word document');
  t.is(doc.properties?.characters, 1199);
});
