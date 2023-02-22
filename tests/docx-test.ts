import test from 'ava';
import { FileTools } from '../src/index.js';

test('document wrapper loads', t => {
  const doc = new FileTools.Document('./tests/fixtures/filetypes/document.docx');
  t.assert(doc !== undefined);
});

test('properties extracted', async t => {
  const doc = new FileTools.Document('./tests/fixtures/filetypes/document.docx');

  const props = await doc.getProperties();
  console.log(props);

  t.assert(props !== undefined);
});

test('content extracted', async t => {
  const doc = new FileTools.Document('./tests/fixtures/filetypes/document.docx');

  const content = await doc.getContent();
  console.log(content);

  t.assert(content !== undefined);
});
