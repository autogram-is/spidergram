// Sheets.js setup
import * as fs from 'node:fs';
import { Readable } from 'node:stream';
import * as XLSX from 'xlsx';
import {
  JsonPrimitive,
  isJsonMap,
  isJsonArray,
  toAnyJson,
  isAnyJson,
} from '@salesforce/ts-types';
import { Buffer } from 'node:buffer';

XLSX.set_fs(fs);
XLSX.stream.set_readable(Readable);

export type Sheet = SimpleSheet | StructuredSheet;
export type SimpleSheet = (JsonPrimitive[] | Record<string, JsonPrimitive>)[];
export type StructuredSheet = {
  name?: string;
  data: SimpleSheet;
  header?: string[];
  skipHeader?: boolean;
};

function isSimpleSheet(input: unknown): input is SimpleSheet {
  return isJsonArray(toAnyJson(input));
}

function isStructuredSheet(input: unknown): input is StructuredSheet {
  if (!isAnyJson(input)) return false;
  if (!isJsonMap(input)) return false;
  return isSimpleSheet(input.data);
}

type SpreadsheetWriteOptions = {
  format: XLSX.BookType;
  compression: boolean;
};

type SpreadsheetGenerateOptions = Omit<XLSX.WritingOptions, 'type'>;

export class Spreadsheet {
  static utils = XLSX.utils;

  workbook: XLSX.WorkBook;

  constructor() {
    const { utils } = Spreadsheet;
    this.workbook = utils.book_new();
  }

  addSheet(input: unknown, name?: string) {
    if (isSimpleSheet(input)) {
      name = Spreadsheet.utils.book_append_sheet(
        this.workbook,
        XLSX.utils.json_to_sheet(input),
        name,
      );
    } else if (isStructuredSheet(input)) {
      name = Spreadsheet.utils.book_append_sheet(
        this.workbook,
        XLSX.utils.json_to_sheet(input.data, {
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

        XLSX.writeFile(this.workbook, filename, options);
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

    return XLSX.write(this.workbook, { ...options, type: 'buffer' }) as Buffer;
  }

  toStream(customOptions: Partial<SpreadsheetGenerateOptions> = {}): Readable {
    return Readable.from(this.toBuffer(customOptions));
  }
}
