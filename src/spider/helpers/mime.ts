import { IncomingHttpHeaders } from 'node:http';
import is from '@sindresorhus/is';
import arrify from 'arrify';
import minimatch from 'minimatch';
import mime from 'mime';

export { parse as parseContentType } from 'content-type';

export function mimeMatches(
  candidate: string,
  match: string | string[],
): boolean {
  const matches = arrify(match);
  for (const m of matches) {
    if (minimatch(candidate, m)) {
      return true;
    }
  }
  return false;
}

export function fileNameFromHeaders(
  url: URL,
  headers: IncomingHttpHeaders = {},
  fallback = 'response',
): string {
  const filenameRx = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
  let filename: string | undefined;

  if (!is.nonEmptyStringAndNotWhitespace(filename)) {
    filename = (filenameRx.exec(headers['content-disposition'] ?? '') ?? [])[0];
  }

  if (!is.nonEmptyStringAndNotWhitespace(filename)) {
    filename = (headers['content-location'] ?? '').split('/').pop();
  }

  if (!is.nonEmptyStringAndNotWhitespace(filename)) {
    const parent = url.pathname.split('/').pop();
    if (is.nonEmptyStringAndNotWhitespace(parent)) {
      filename = parent;
    }
  }

  if (!is.nonEmptyStringAndNotWhitespace(filename)) {
    filename = fallback;
  }

  const mimeExtension = mime.getExtension(headers['content-type'] ?? '') ?? undefined;
  if (mimeExtension !== undefined) {
    const fileExtension = filename.split('.').pop();
    if (fileExtension === undefined || fileExtension !== mimeExtension) {
      filename = `${filename}.${mimeExtension ?? 'bin'}`;
    }
  }

  return filename;
}

export function fileExtensionFromHeaders(
  url: URL,
  headers: IncomingHttpHeaders = {},
): string {
  const filename = fileNameFromHeaders(url, headers);
  return filename.split('.').shift()?.toString() ?? '';
}

export const mimeGroups = {
  page: ['text/html'],
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
  image: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif', 'image/bmp'],
  data: [
    'text/csv',
    'application/json',
    'application/ld+json',
    'application/xml',
    'text/xml',
    'application/atom+xml',
    'text/rss+xml',
    'application/rss+xml',
    'application/xhtml+xml',
  ],
  ebook: ['application/epub+zip', 'application/vnd.amazon.ebook'],
  archive: [
    'application/zip',
    'application/x-bzip',
    'application/x-bzip2',
    'application/gzip',
    'application/vnd.rar',
    'application/x-freearc',
    'application/x-7z-compressed',
  ],
  misc: ['application/octet-stream', 'application/vnd.visio', 'text/calendar'],
};
