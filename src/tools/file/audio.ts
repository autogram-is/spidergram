import { GenericFile } from './generic-file.js';
import { parseBuffer, orderTags } from 'music-metadata/lib/core';

export class Audio extends GenericFile {
  public static mimeTypes = [
    'audio/x-aiff',
    'audio/aiff',
    'audio/aac ',
    'audio/aacp ',
    'audio/3gpp ',
    'audio/3gpp2 ',
    'audio/mp4 ',
    'audio/mp4a-latm ',
    'audio/mpeg4-generic',
    'audio/x-ape',
    'video/x-ms-asf',
    'application/vnd.ms-asf',
    'audio/x-wav',
    'audio/flac',
    'audio/mpeg',
    'audio/MPA',
    'audio/mpa-robust',
    'video/ogg',
    'audio/ogg',
    'application/ogg',
    'audio/opus',
    'audio/x-speex',
    'audio/speex',
    'audio/vorbis',
    'audio/vorbis-config',
    'audio/vnd.wave',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'video/webm',
    'audio/webm',
    'audio/x-wavpack',
    'audio/x-wavpack-correction',
    'audio/x-ms-wma'
  ];

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
