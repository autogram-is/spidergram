import { Graph, Fetch} from '../../source/index.js';
import { Entity } from '../../source/graph/index.js';


const uu = new Graph.UniqueUrl('https://example.com');
const headers: Graph.HeaderShape = {
  referer: 'https://google.com',
}

const f = new Fetch.GotFetcher()
f.rules.download = () => true;

f.fetch(uu, headers)
  .then((ent: Entity[]) => console.log(ent))
  .catch((reason: any) => console.log(reason));