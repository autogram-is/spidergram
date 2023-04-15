import { BookType, WorkBook, WritingOptions } from 'xlsx-js-style';
import xlspkg from 'xlsx-js-style';
const { utils, write, writeFile } = xlspkg;

import {
  JsonPrimitive,
  isJsonMap,
  isJsonArray,
  toAnyJson,
  isAnyJson,
} from '@salesforce/ts-types';
import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';

export type Sheet = SimpleSheet | StructuredSheet;
export type SimpleSheet = (JsonPrimitive[] | Record<string, JsonPrimitive>)[];
export type StructuredSheet = {
  name?: string;
  data: SimpleSheet;
  header?: string[];
  skipHeader?: boolean;
};

export function isSimpleSheet(input: unknown): input is SimpleSheet {
  return isJsonArray(toAnyJson(input));
}

export function isStructuredSheet(input: unknown): input is StructuredSheet {
  if (!isAnyJson(input)) return false;
  if (!isJsonMap(input)) return false;
  return isSimpleSheet(input.data);
}

type SpreadsheetWriteOptions = {
  format: BookType;
  compression: boolean;
};

type SpreadsheetGenerateOptions = Omit<WritingOptions, 'type'>;

/**
 * Builds and exports single and multi-sheet Excel Workbooks from JSON
 * arrays and dictionaries.
 */
export class Spreadsheet {
  workbook: WorkBook;

  constructor() {
    this.workbook = utils.book_new();
  }

  addSheet(input: unknown, name?: string) {
    if (isSimpleSheet(input)) {
      utils.book_append_sheet(
        this.workbook,
        utils.json_to_sheet(input),
        name,
      );
    } else if (isStructuredSheet(input)) {
      utils.book_append_sheet(
        this.workbook,
        utils.json_to_sheet(input.data, {
          header: input.header,
          skipHeader: input.skipHeader,
        }),
        input.name ?? name,
      );
    } else {
      throw new TypeError(
        'Input must be a SimpleSheet array or StructuredSheet object',
      );
    }
    return name;
  }

  async save(
    filename: string,
    customOptions: Partial<SpreadsheetWriteOptions> = {},
  ): Promise<string> {
    const options: SpreadsheetWriteOptions = {
      format: 'xlsx',
      compression: true,
      ...customOptions,
    };

    return new Promise((resolve, reject) => {
      try {
        if (!filename.endsWith(options.format)) {
          filename = `${filename}.${options.format}`;
        }

        writeFile(this.workbook, filename, options);
        resolve(filename);
      } catch (error: unknown) {
        reject(error);
      }
    });
  }

  toBuffer(customOptions: Partial<SpreadsheetGenerateOptions> = {}): Buffer {
    const options = {
      format: 'xlsx',
      compression: true,
      ...customOptions,
    };

    return write(this.workbook, { Props: this.workbook.Props, ...options, type: 'buffer' }) as Buffer;
  }

  toStream(customOptions: Partial<SpreadsheetGenerateOptions> = {}): Readable {
    return Readable.from(this.toBuffer({ Props: this.workbook.Props, ...customOptions }));
  }
}
