import { readFile } from 'fs/promises';

/**
 * A general-purpose base class for extracting data from downloaded
 * files. It handles instantiating from a buffer or a filepath, while concrete
 * implementations are expected to supply `getAll()`, `getData()`, and
 * `getContent()` methods.
 */
export abstract class GenericFile {
  protected fileData?: Buffer;
  protected filePath?: string;

  constructor(file?: string | Buffer) {
    if (file === undefined) {
      // Do nothing here
    } if (typeof file === 'string') {
      // Set the local filePath
      this.filePath = file;
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
        resolve(readFile(this.filePath)
          .then(buffer => {
            this.fileData = buffer;
            return this.fileData;
          }));
      } else {
        reject(`No file data or path`);
      }  
    });
  }
}
