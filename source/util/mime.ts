import is from '@sindresorhus/is';
import MIMEType from 'whatwg-mimetype';
import mime from 'mime';

export class Mime {
  static parse = (type: string) : MIMEType | undefined => {
    const parsed = MIMEType.parse(type);
    if (!is.null_(parsed)) return parsed;
  }

  static extensionFromType = (type: string): string | undefined => {
    return mime.getExtension(type) ?? undefined;
  }

  static typeFromExtension = (extension: string): string | undefined => {
    return mime.getType(extension) ?? undefined;
  }
}