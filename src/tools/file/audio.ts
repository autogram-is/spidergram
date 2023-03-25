import { GenericFile } from './generic-file.js';
import { parseBuffer, orderTags } from 'music-metadata/lib/core';

export class Audio extends GenericFile {
  public static mimeTypes = ['audio/*'];

  public static extensions = [
    'aiff',
    'aif',
    'aifc',
    'm4a',
    'mp4',
    '3gp',
    'm4a',
    'm4b',
    'm4p',
    'm4r',
    'm4v',
    'aac',
    'asf',
    'wma',
    'wmv',
    'flac',
    'mka',
    'mkv',
    'mp4',
    'm4a',
    'm4v',
    'mp2',
    'mp3',
    'ogg',
    'ogv',
    'oga',
    'ogx',
    'ogm',
    'spx',
    'opus',
    'wav',
    'wave',
    'wma'
  ];

  
  /**
   * We're not currently generating content for audio files; only metadata.
   */
  async getContent(): Promise<{ html?: string; text?: string }> {
    return Promise.resolve({})
  }

  async getMetadata(): Promise<Record<string, unknown>> {
    const buffer = await this.load();
    return parseBuffer(buffer, undefined, { duration: true, skipCovers: true })
      .then(metadata => {
        return {
          ...metadata.common,
          format: metadata.format,
          tags: orderTags(metadata.native['ID3v2.3'])
        }
      });
  }
}
