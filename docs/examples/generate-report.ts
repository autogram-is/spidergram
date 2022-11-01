import {
  Spreadsheet,
  RowData,
  LinkSummaries,
  Project
} from '../../source/index.js';
import {AqlQuery} from 'arangojs/aql.js';

const context = await Project.context();

const queries: Record<string, AqlQuery> = {
  'Pages': LinkSummaries.pages(),
  'Errors': LinkSummaries.errors(),
  'Malformed URLs': LinkSummaries.malformed(),
  'Non-Web URLs': LinkSummaries.excludeProtocol(),
  'External Links': LinkSummaries.outlinks(['example.com']),
};

const report = new Spreadsheet();
for (const name in queries) {
  await context.graph.query<RowData>(queries[name])
    .then(async cursor => cursor.all())
    .then(result => {
      report.addSheet(result, name);
    });
}

await report.save(`storage/example`)
  .then(fileName => {
    console.log(`${fileName} generated.`);
  });
