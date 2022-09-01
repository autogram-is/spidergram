import is from '@sindresorhus/is';

import { URL } from 'node:url';
import fsp from 'node:fs/promises';
import fs, { PathLike } from 'node:fs';
import { IncomingHttpHeaders as HttpHeaders } from 'node:http';
import { IncomingHttpHeaders as Http2Headers } from 'node:http2';
import { Context } from '../util/index.js';

import mkdirp from 'mkdirp';
import mime from 'mime';

type IncomingHeaders = HttpHeaders | Http2Headers;

export class FileManager {
  static ensureDirectory = Context.ensureSubdirectory;
  static ensureFile = Context.ensureFile;

  static filenameFromHeaders(
    headers: IncomingHeaders,
    url: URL,
    fallback = 'response',
  ): string {
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
  };
}