import { Entity, Resource, Query, Reference, Site, aql } from '../../index.js';

/**
 * Delete a {@link Site} and remove references to it from {@link Resource.site}.
 * If a replacement site is offered, update the affected resources to point to
 * the new site.
 */
export async function deleteSite(site: Reference<Site>, replacement?: Reference<Site>) {
  const sid = Entity.idFromReference(site);
  
  if (replacement) {
    const rid = Entity.idFromReference(replacement);
    return Query.run(
      aql`FOR r IN resources FILTER r.site == ${sid} UPDATE r WITH { site: ${rid} } IN resources`
    ).then(() => Query.run(aql`REMOVE ${sid}`))
  } else {
    return Query.run(
      aql`FOR r IN resources FILTER r.site == ${sid} UPDATE r WITH { site: null } IN resources`
    ).then(() => Query.run(aql`REMOVE ${sid}`))
  }
}