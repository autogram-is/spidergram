import { GenericFile } from './generic-file.js';
import { ExifParserFactory } from 'ts-exif-parser';

export class Image extends GenericFile {
  public static mimeTypes = ['image/*'];

  public static extensions = ['jpg', 'jpeg', 'tif', 'tiff', 'png', 'webp'];

  /**
   * We're not currently generating content for image files; only metadata.
   */
  async getContent() {
    return Promise.resolve(undefined);
  }

  async getMetadata() {
    return this.getBuffer()
      .then(buffer => ExifParserFactory.create(buffer).parse())
      .then(data => {
        return {
          ...data.getImageSize(),
          ...data.tags,
        };
      });
  }
}
