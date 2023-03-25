import { Stream } from 'stream';
import { Spidergram } from '../../index.js';

export interface GenericFileData extends Record<string, unknown> {
  metadata?: Record<string, unknown>,
  content?: Record<string, unknown>,
  error?: Error
}

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

  constructor(file?: string | Buffer) {
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
    if (this.fileData) {
      return Promise.resolve(this.fileData);
    } else if (this.filePath) {
      const sg = await Spidergram.load();
      this.fileData = await sg.files().read(this.filePath);
      return Promise.resolve(this.fileData);
    } else {
      return Promise.reject(new Error('No file exists'));
    }
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

  async getAll(): Promise<GenericFileData> {
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
