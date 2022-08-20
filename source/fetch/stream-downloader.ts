import { promisify } from 'node:util';
import { Readable } from 'node:stream';
import { URL } from 'node:url';
import { IncomingHttpHeaders as HttpHeaders } from 'node:http';
import { IncomingHttpHeaders as Http2Headers } from 'node:http2';
import * as fs from 'node:fs';
import { Buffer } from 'node:buffer';
import mime from 'mime';

const pipeline = promisify(Readable.pipeline);
type IncomingHeaders = HttpHeaders | Http2Headers;

export class StreamDownloader {
  static async stringify(stream:Readable) : Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on('data', (chunk: Uint8Array) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (error) => {
        reject(error);
      });
      stream.on('end', () => {
        resolve(
          Buffer.concat(chunks).toString(stream.readableEncoding ?? undefined),
        );
      });
    });
  }

  static async download(
    stream: Readable,
    filepath: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.access(filepath.split('/').slice(0, -1).join('/'), () => {
        const writeStream = fs.createWriteStream(
          filepath,
          stream.readableEncoding ?? undefined,
        );
        pipeline(stream, writeStream).then(
          () => {
            resolve(filepath);
          },
          (error: unknown) => {
            reject(error);
          },
        );
      });
    });
  }

  static getFileName(
    headers: IncomingHeaders,
    url?: URL,
  ): string {
    const filenameRx = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    let filename: string | undefined;
  
    if (filename === undefined)
      filename = (filenameRx.exec(headers['content-disposition'] ?? '') ?? [])[0];
  
    if (filename === undefined)
      filename = (headers['content-location'] ?? '').split('/').pop();
  
    if (filename === undefined && url !== undefined)
      filename = url.pathname.split('/').pop();
  
    if (filename === undefined) filename = 'download';
  
    const mimeExtension = mime.getExtension(headers['content-type'] ?? '');
    if (mimeExtension !== undefined) {
      const fileExtension = filename.split('.').pop();
      if (fileExtension === undefined || fileExtension !== mimeExtension)
        filename = `${filename}.${mimeExtension ?? 'bin'}`;
    }
  
    return filename;
  }
}
