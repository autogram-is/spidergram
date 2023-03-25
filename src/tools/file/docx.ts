import mammoth from 'mammoth';
import {
  fromBuffer,
  DocumentProperties as DocxProperties,
} from 'office-document-properties';
import { GenericFile } from './generic-file.js';

/**
 * Currently only handles importing existing .docx files, and extracting their contents
 * and metadata. In the future we may use this to generate them from scratch for reports.
 */
export class DocX extends GenericFile {
  public static mimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  public static extensions = ['docx'];

  async getContent() {
    const buffer = await this.getBuffer();
    return Promise.resolve({
      html: await mammoth
        .convertToHtml({ buffer })
        .then(results => results.value),
      text: await mammoth
        .extractRawText({ buffer })
        .then(results => results.value),
    });
  }

  async getMetadata(): Promise<DocxProperties> {
    const buffer = await this.getBuffer();
    return new Promise((resolve, reject) =>
      fromBuffer(buffer, (error, data) => {
        if (error) reject(error);
        else resolve(data);
      }),
    );
  }
}
