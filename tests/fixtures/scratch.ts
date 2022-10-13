import { ArangoStore } from '../../source/arango-store.js';
import { UrlHierarchy } from '../../source/analysis/url-hierarchy.js';
import { aql } from 'arangojs/aql.js';

const storage = await ArangoStore.open('karenmcgrane_com');
await storage.collection('is_child_of').truncate();


const query = aql`FILTER uu.parsed.domain == 'karenmcgrane.com'`;
const urlHier = new UrlHierarchy(storage);
await urlHier.loadUrls(query)
  .then(urlHier.buildHierarchy)
  .then(urlHier.saveHierarchy);
