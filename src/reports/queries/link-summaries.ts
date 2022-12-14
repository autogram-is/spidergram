import { aql } from 'arangojs';

export const LinkSummaries = {
  inboundLinkCount: aql`
    let inlinks = (
      for lt in links_to
        filter lt._to == url._id
      return distinct lt._from
    )
  `,

  pages() {
    return aql`
      for resource in resources
        filter resource.code == 200
      for rw in responds_with
        filter rw._to == resource._id
      for url in unique_urls
        filter url._id == rw._from

      ${LinkSummaries.inboundLinkCount}

      return {
        host: url.parsed.host,
        path: url.parsed.pathname,
        title: resource.metadata.title,
        sentences: resource.readability.sentenceCount,
        fog: resource.readability.gunningFog,
        references: length(inlinks),
        size: resource.headers.´content-length´,
      }
  `;
  },

  downloads() {
    return aql`
      for resource in resources
        filter resource.code == 200
        filter resource.headers.´content-type´ NOT LIKE '%html%'
      for rw in responds_with
        filter rw._to == resource._id
      for url in unique_urls
        filter url._id == rw._from

      ${LinkSummaries.inboundLinkCount}

      return {
        host: url.parsed.host,
        path: url.parsed.pathname,
        references: length(inlinks),
        size: resource.headers.´content-length´,
        mime: resource.headers.´content-type´,
      }
  `;
  },

  errors() {
    return aql`
      for resource in resources
        filter resource.code != 200
      for rw in responds_with
        filter rw._to == resource._id
      for url in unique_urls
        filter url._id == rw._from

      ${LinkSummaries.inboundLinkCount}

      return {
        host: url.parsed.host,
        path: url.parsed.pathname,
        code: resource.code,
        message: resource.message,
        references: length(inlinks)
      }
  `;
  },

  malformed() {
    return aql`
      for url in unique_urls
      filter url.parsed == null

      ${LinkSummaries.inboundLinkCount}

      return {
        url: url.url,
        references: length(inlinks)
      }
  `;
  },

  excludeProtocol(excluded: string[] = ['https:', 'http:']) {
    return aql`
      for url in unique_urls
      filter url.parsed.protocol NOT IN ${excluded}

      ${LinkSummaries.inboundLinkCount}

      return {
        url: url.url,
        references: length(inlinks)
      }
  `;
  },

  outlinks(internalDomains: string[]) {
    return aql`
      for url in unique_urls
      filter url.parsed.domain NOT IN ${internalDomains}

      ${LinkSummaries.inboundLinkCount}
      
      return {
        host: url.parsed.host,
        path: url.parsed.pathname,
        references: length(inlinks)
      }
  `;
  },

  /**
   * A list of all 30x redirects encountered during the crawl
   */
  redirects() {
    return aql`
    for u in unique_urls
    for rw in responds_with
        FILTER u._id == rw._from
        for r in resources
            FILTER rw._to == r._id
            FILTER r.url != u.url
            LET redirects = LENGTH(rw.redirects)
            SORT redirects DESC
            return { requested: u.url, returned: r.url, redirects: redirects }
  `;
  },

  /**
   * A list of every UniqueUrl whose inbound links contain more
   * than one distinct HREF value. This can be used to find important
   * querystring parameters or path elements that are being discared
   * by an overly-aggressive URL Normalizer.
   */
  normalized() {
    return aql`
    FOR uu IN unique_urls

    LET inlinks = (
        FOR lt IN links_to
        FILTER lt._to == uu._id
        RETURN DISTINCT lt.href
    )
    FILTER LENGTH(inlinks) > 1
    SORT LENGTH(inlinks) DESC
    RETURN {
        domain: uu.parsed.domain,
        url: uu.url,
        inlinks
    }`;
  },
};
