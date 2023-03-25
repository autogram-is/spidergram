import { Readable } from 'stream';
import { Spidergram } from '../../index.js';

export interface GenericFileData extends Record<string, unknown> {
  metadata?: Record<string, unknown>,
  content?: Record<string, unknown>,
  error?: Error
}

/**
 * A general-purpose base class for extracting data from downloaded
 * files. It handles instantiating from a buffer or a filepath, while concrete
 * implementations are expected to supply `getAll()` aandmd `getData()` methods.
 * If a specific implementation also supports additional data, overriding the `getAll()`
 * method allows it to bundle its information for use.
 */
export abstract class GenericFile {
  /**
   * An array of mimetypes, or glob strings matching mimetype patterns, that
   * the class can read and parse.
   */
  public static readonly mimeTypes: string[] = [];
  public static readonly extensions: string[] = [];

  protected stream?: Readable;
  protected fileData?: Buffer;
  protected filePath?: string;

  constructor(file?: string | Buffer | Readable) {
    if (file === undefined) {
      // Do nothing here
    }
    if (typeof file === 'string') {
      // Set the local filePath
      this.filePath = file;
    } else if (file instanceof Readable) {
      this.stream;
    } else if (file instanceof Buffer) {
      // Set the local fileData
      this.fileData = file;
    }
  }

  async getBuffer(): Promise<Buffer> {
    if (this.stream) {
      return Promise.resolve(this.streamToBuffer(this.stream))
    } else if (this.fileData) {
      return this.fileData;
    } else if (this.filePath) {
      const sg = await Spidergram.load()
      return sg.files().read(this.filePath);
    }
    throw new Error('No file information');
  }

  async getStream(): Promise<Readable> {
    if (this.stream) {
      return Promise.resolve(this.stream);
    } else if (this.fileData) {
      return Promise.resolve(Readable.from(this.fileData));
    } else if (this.filePath) {
      const sg = await Spidergram.load()
      return sg.files().readStream(this.filePath);
    }
    throw new Error('No file information');
  }

  abstract getMetadata(): Promise<Record<string, unknown> | undefined>
  abstract getContent(): Promise<Record<string, unknown> | undefined> 

  async getAll(): Promise<GenericFileData> {
    return Promise.resolve({
      metadata: await this.getMetadata(),
      content: await this.getContent(),
    });
  }

  protected streamToBuffer(stream: Readable): Promise<Buffer>{
    return new Promise<Buffer>((resolve) => {
      const _buf = Array<Uint8Array>();
      stream.on('data', chunk => _buf.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(_buf)));
    })
  }
}
