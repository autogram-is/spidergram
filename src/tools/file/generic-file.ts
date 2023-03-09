import { readFile } from 'fs/promises';
import { Stream } from 'stream';

/**
 * A general-purpose base class for extracting data from downloaded
 * files. It handles instantiating from a buffer or a filepath, while concrete
 * implementations are expected to supply `getAll()`, `getData()`, and
 * `getContent()` methods.
 */
export abstract class GenericFile {
  /**
   * An array of mimetypes, or glob strings matching mimetype patterns, that
   * the class can read and parse.
   */
  public static readonly mimeTypes: string[] = [];
  public static readonly extensions: string[] = [];

  protected fileData?: Buffer;
  protected filePath?: string;

  constructor(file?: string | Buffer | Stream) {
    if (file === undefined) {
      // Do nothing here
    }
    if (typeof file === 'string') {
      // Set the local filePath
      this.filePath = file;
    } else if (file instanceof Stream) {
      this.fileData = GenericFile.streamToBuffer(file, this.fileData);
    } else if (file instanceof Buffer) {
      // Set the local fileData
      this.fileData = file;
    }
  }

  protected async load(): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      if (this.fileData) {
        resolve(this.fileData);
      } else if (this.filePath) {
        resolve(
          readFile(this.filePath).then(buffer => {
            this.fileData = buffer;
            return this.fileData;
          }),
        );
      } else {
        reject(`No file data or path`);
      }
    });
  }

  async getBuffer(): Promise<Buffer> {
    return this.load();
  }

  async getMetadata(): Promise<Record<string, unknown>> {
    await this.load();
    return Promise.resolve({});
  }

  async getContent(): Promise<Record<string, unknown>> {
    await this.load();
    return Promise.resolve({});
  }

  async getAll() {
    await this.load();
    return Promise.resolve({
      metadata: await this.getMetadata(),
      content: await this.getContent(),
    });
  }

  protected static streamToBuffer(stream: Stream, target?: Buffer) {
    const _buf = Array<Uint8Array>();
    stream.on('data', chunk => _buf.push(chunk));
    stream.on('end', () => (target = Buffer.concat(_buf)));
    return target;
  }
}
