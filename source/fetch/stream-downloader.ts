import { promisify } from 'node:util';
import { Readable } from 'node:stream';
import { URL } from 'node:url';
import { IncomingHttpHeaders as HttpHeaders } from 'node:http';
import { IncomingHttpHeaders as Http2Headers } from 'node:http2';
import * as fs from 'node:fs';
import { Buffer } from 'node:buffer';
import mime from 'mime';
import mkdirp from 'mkdirp';
import is from '@sindresorhus/is';

const pipeline = promisify(Readable.pipeline);
type IncomingHeaders = HttpHeaders | Http2Headers;

export class StreamDownloader {
  static async stringifyStream(stream: Readable) : Promise<string> {
    const chunks: Uint8Array[] = [];
    return new Promise((resolve, reject) => {
      stream
        .on('data', (chunk: Uint8Array) => chunks.push(Buffer.from(chunk)))
        .on('error', (error) => reject(error))
        .on('end', () => {
          resolve(
            Buffer.concat(chunks).toString(stream.readableEncoding ?? undefined),
          );
        });
    });
  }

  static async downloadStream(
    stream: Readable,
    directory: string,
    filename: string,
  ): Promise<string> {
    const filePath = [directory, filename].join('/'); 
    return new Promise((resolve, reject) => {
      try {
        mkdirp(directory).then(() => {
          const writeStream = fs.createWriteStream(
            filePath,
            stream.readableEncoding ?? undefined,
          ).on('open', () => {
            pipeline(stream, writeStream)
              .then(() => resolve(filePath))
              .catch((error: unknown) => reject(error),
            );
          });
        });
      } catch (error: unknown) {
        reject(error);
      }
    });
  }

  static getFileName(
    headers: IncomingHeaders,
    url: URL,
    fallback: string = 'response'
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
  }
}
