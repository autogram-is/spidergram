import is from '@sindresorhus/is';
import { URL } from 'node:url';
import { BrowserCrawlingContext, CrawlingContext, Request, KeyValueStore, CheerioCrawlingContext } from "crawlee";
import { SpiderContext } from "./context.js";
import { UniqueUrl, RespondsWith, Resource, LinksTo } from "../model/index.js";
import { IncomingHttpHeaders as HttpHeaders } from "http";
import { IncomingHttpHeaders as Http2Headers} from "http2";
import mime from 'mime';
/**
 * Structured dumping ground for links found in markup; flexible enough
 * to represent both `<a>` and `<link>` tags; `context` and  `selector`
 * should be used to store information about where the link was found
 * that can't be intuited from the data/attributes/etc.
 */
 export type HtmlLink = {
  href: string;
  selector?: string;
  context?: string;
  rel?: string;
  title?: string;
  attributes?: Record<string, string>;
  data?: string | Record<string, string>;
};

type resourceBundle = {
  resource: Resource,
  respondsWith: RespondsWith,
};

type linkToBundle = {
  uniqueUrl: UniqueUrl,
  linksTo?: LinksTo
}

export abstract class SpiderHelper {
  /**
   * @param context A crawler-specific context object; be sure to to specify the correct interface in implementing functions.
   * @param spidergram Spidergram-specific context object, containing crawl rules and other state.
   */
  abstract buildResource(
    context: CrawlingContext,
    spidergram: SpiderContext
  ): Promise<resourceBundle>;

  /**
   * @param input A crawler-appropriate reference to the string, markup, or page to be parsed for links.
   * @param selectors A dictionary of named DOM selectors; the key should be used to populate the `context` property of the resulting `HtmlLink` record.
   * @param ignoreSelfLinkAnchors Discard links that only contain anchor tags.
   * @param ignoreEmptyHref Discard links that contain no href property. 
   */
   async extractLinks(
    $: cheerio.Root,
    selectors: Record<string, string> = { default: 'body a' },
    ignoreSelfLinkAnchors = true,
    ignoreEmptyHref = true,
  ) {
    const results: HtmlLink[] = [];
    
    for (const key in selectors) {
      $(selectors[key]).each((i, element) => {
        const href: string = $(element).attr('href') ?? '';
  
        if (
          !(href.length === 0 && ignoreEmptyHref)
          && !(href.startsWith('#') && ignoreSelfLinkAnchors)
        ) {
          results.push({
            href,
            context: key,
            rel: $(element).attr('rel') ?? '',
            title: $(element).text() ?? '',
            attributes: $(element).attr() as Record<string, string>,
            data: $(element).data() ?? {},
          });
        }
      });
    }
  
    return Promise.resolve(results);
  };
  
  /**
   * @param context A crawler-specific context object; be sure to to specify the correct interface in implementing functions.
   * @param link An object containing `href` and other link properties.
   * @param spidergram Spidergram-specific context object, containing crawl rules and other state.
   */
  abstract buildLinkTo(
    context: CrawlingContext,
    link: HtmlLink,
    spidergram: SpiderContext
  ): Promise<linkToBundle>;

  buildRequest(url: UniqueUrl) {
    const rq = new Request({
      url: url.url,
      uniqueKey: url.key,
      userData: url.toJSON()
    });
    if (url.referer) {
      rq.headers = { referer: url.referer };
    }
    return rq;
  }

  async downloadResourceFile(
    context: CheerioCrawlingContext | BrowserCrawlingContext,
    resource: Resource,
  ): Promise<string> {
    const { response, request, sendRequest } = context;
    const dlStore = await KeyValueStore.open('downloads');
    const dlBuffer = await sendRequest({ responseType: 'buffer' });

    const suggested = this.fileNameFromHeaders(
      new URL(request.url),
      response?.headers,
      'response',
    );
    const filename = `${resource!.key}-${suggested}`;

    return await dlStore.setValue(
      `${resource!.key}-${filename}`,
      dlBuffer,
      { contentType: dlBuffer.readableEncoding?.toString()
    }).then(() => filename);
  }

  fileNameFromHeaders(
    url: URL,
    headers: HttpHeaders | Http2Headers = {},
    fallback = 'response',
  ): string {
    const filenameRx = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    let filename: string | undefined;

    if (!is.nonEmptyStringAndNotWhitespace(filename))
      filename = (filenameRx.exec(headers['content-disposition'] ?? '') ??
        [])[0];

    if (!is.nonEmptyStringAndNotWhitespace(filename))
      filename = (headers['content-location'] ?? '').split('/').pop();

    if (!is.nonEmptyStringAndNotWhitespace(filename)) {
      const parent = url.pathname.split('/').pop();
      if (is.nonEmptyStringAndNotWhitespace(parent)) {
        filename = parent;
      }
    }

    if (!is.nonEmptyStringAndNotWhitespace(filename)) filename = fallback;

    const mimeExtension = mime.getExtension(headers['content-type'] ?? '');
    if (mimeExtension !== undefined) {
      const fileExtension = filename.split('.').pop();
      if (fileExtension === undefined || fileExtension !== mimeExtension)
        filename = `${filename}.${mimeExtension ?? 'bin'}`;
    }

    return filename;
  }

  fileExtensionFromHeaders(
    url: URL,
    headers: HttpHeaders | Http2Headers = {},
  ): string {
    const filename = this.fileNameFromHeaders(
      url,
      headers
    );
    return filename.split('.').shift()!.toString();
  }

  /**
   * Convenience grouping of MIMEtypes for opening up the crawler's normally-restricted
   * focus on HTML. 
   */
  static mimeTypes = {
    html: ['text/html', 'application/xhtml+xml'],
    pdf: ['application/pdf'],
    document: [
      'text/plain',
      'application/x-abiword',
      'application/rtf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
    ],
    spreadsheet: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.spreadsheet',
    ],
    presentation: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation',
    ],
    audio: [
      'audio/aac',
      'audio/midi',
      'audio/x-midi',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/webm',
    ],
    video: [
      'video/mp4',
      'video/mpeg',
      'video/ogg',
      'video/x-msvideo',
      'video/webm',
    ],
    js: ['text/javascript'],
    css: ['text/css'],
    font: [
      'font/otf',
      'font/ttf',
      'font/woff',
      'font/woff2',
      'application/vnd.ms-fontobject',
    ],
    image: [
      'image/svg+xml',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/bmp',
    ],
    data: [
      'text/csv',
      'application/json',
      'application/ld+json',
      'application/xml',
      'text/xml',
      'application/atom+xml',
      'text/rss+xml',
      'application/rss+xml',
    ],
    ebook: [
      'application/epub+zip',
      'application/vnd.amazon.ebook',
    ],
    archive: [
      'application/zip',
      'application/x-bzip',
      'application/x-bzip2',
      'application/gzip',
      'application/vnd.rar',
      'application/x-freearc',
      'application/x-7z-compressed',
    ],
    misc: [
      'application/octet-stream',
      'application/vnd.visio',
      'text/calendar'
    ]
  }
}