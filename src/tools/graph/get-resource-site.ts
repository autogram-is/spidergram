import { Resource, Site, PropertyMap, Spidergram } from '../../index.js';
import { findPropertyValue } from '../../index.js';

export async function getResourceSite(
  input: Resource,
  source: PropertyMap<Resource> | PropertyMap<Resource>[],
  saveSite = true,
) {
  const siteKey = findPropertyValue(input, source);
  if (typeof siteKey === 'string' && saveSite) {
    const sg = await Spidergram.load();
    sg.arango.push(new Site({ key: siteKey }), false);
  }
  return Promise.resolve(
    typeof siteKey === 'string' ? 'sites/' + siteKey : undefined,
  );
}
