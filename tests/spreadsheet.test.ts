import test from 'ava';
import { FileTools, Query, aql } from "../src/index.js";
import * as fs from 'fs/promises';

test('query results treated as sheet', async t => {
  const data = await Query.run(aql`
    FOR r IN resources
    LIMIT 10
    RETURN {
      url: r.url,
      status: r.code,
      mime: r.mime
    }
  `);

  const report = new FileTools.Spreadsheet();
  report.addSheet(data, 'report');
  
  await t.notThrowsAsync(
    report.save('./tests/spreadsheet-simple')
      .then(fileName => fs.stat(fileName)
      .then(stats => stats ? fileName : false ))
      .then(fileName => fileName ? fs.rm(fileName) : {} )
  );
})

test('sheet structure respected', async t => {
  const data = await Query.run(aql`
    FOR r IN resources
    LIMIT 10
    RETURN {
      url: r.url,
      status: r.code,
      mime: r.mime
    }
  `);

  const report = new Spreadsheet();
  report.addSheet({
    name: 'Sheet 1',
    data,
    header: ['URL', 'HTTP Status', 'MIME Type']
  });
  
  await t.notThrowsAsync(
    report.save('./tests/spreadsheet-complex')
      .then(fileName => fs.stat(fileName)
      .then(stats => stats ? fileName : false ))
      .then(fileName => fileName ? fs.rm(fileName) : {} )
  );
})

