declare module 'office-document-properties' {

  export interface DocumentProperties {
    [key: string]: string | number | undefined;
    application: string;
    applicationVersion: string;
    characters: number;
    comments: string;
    company: string;
    created: string;
    createdBy: string;
    keywords: string;
    manager: string;
    modified: string;
    modifiedBy: string;
    pages: number;
    paragraphs: number;
    revision: number;
    subject: string;
    template: string;
    title: string;
    totalTime: number;
    words: number;
  }

  export function fromFilePath(path: string, callback: (error: Error, data: DocumentProperties) => void ): void;

  export function fromBuffer(buffer: Buffer, callback: (error: Error, data: DocumentProperties) => void ): void;

}