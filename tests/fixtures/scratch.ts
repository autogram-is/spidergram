import { HeaderShape, Entity, UniqueUrl, GotFetcher } from '../../source/index.js';

const uu = new UniqueUrl('https://example.com');
const headers: HeaderShape = {
  referer: 'https://google.com',
};

const f = new GotFetcher();
f.rules.download = () => true;

f.fetch(uu, headers)
  .then((ent: Entity[]) => {
    console.log(ent);
  })
  .catch((error: any) => {
    console.log(error);
  });
