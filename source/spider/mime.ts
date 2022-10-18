/**
 * Convenience grouping of MIMEtypes for opening up the crawler's normally-restricted
 * focus on HTML. 
 */
 export const spiderMimeTypes = {
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
