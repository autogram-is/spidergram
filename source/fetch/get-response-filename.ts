import { URL } from 'node:url';
import { IncomingHttpHeaders as HttpHeaders } from 'node:http';
import { IncomingHttpHeaders as Http2Headers } from 'node:http2';
import mime from 'mime';
import is from '@sindresorhus/is';

type IncomingHeaders = HttpHeaders | Http2Headers;

export const getResponseFilename = (
  headers: IncomingHeaders,
  url: URL,
  fallback: string = 'response'
): string => {
  const filenameRx = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
  let filename: string | undefined;

  if (!is.nonEmptyStringAndNotWhitespace(filename))
    filename = (filenameRx.exec(headers['content-disposition'] ?? '') ?? [])[0];

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