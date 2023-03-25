import { GenericFile } from './generic-file.js';
import {ExifParserFactory} from "ts-exif-parser";


export class Audio extends GenericFile {
  public static mimeTypes = ['image/*'];

  public static extensions = [
    'jpg', 'jpeg', 'tif', 'tiff', 'png', 'webp'
  ];

  /**
   * We're not currently generating content for image files; only metadata.
   */
  async getContent(): Promise<{ html?: string; text?: string }> {
    return Promise.resolve({})
  }

  async getMetadata(): Promise<Record<string, unknown>> {
    const buffer = await this.load();
    ExifParserFactory.create(buffer);
    const data = ExifParserFactory.create(buffer).parse();
    return Promise.resolve({
      size: data.getImageSize(),
      ...data.tags
    })
  }
}
