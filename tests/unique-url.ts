import test from 'ava';
import { UniqueUrl, JsonGraph, Context, where, isUniqueUrl } from '../source/index.js';

test('uniqueurl roundtrip', async (t) => {
  Context.directory += '/crawl_data';
  const graph = new JsonGraph();
  await graph.save(Context.path('url-test.ldjson'));

  const urls = [
    new UniqueUrl('this is not a url'),
  ];    
  graph.add(urls);
  await graph.save();

  const results = graph.nodes(
    where('type', { eq: 'unique_url' })
  );
  
  const urlResults: UniqueUrl[] = [];
  for (let uu of results) {
    if (isUniqueUrl(uu)) {
      urlResults.push(uu);
    }
  }

  t.is(urlResults.length, urls.length);
});
