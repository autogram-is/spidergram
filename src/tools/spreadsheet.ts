// Sheets.js setup
import * as fs from 'node:fs';
import { Readable } from 'node:stream';
import is from '@sindresorhus/is';
import * as XLSX from 'xlsx';
import { JsonPrimitive } from '@salesforce/ts-types';
import { Buffer } from 'node:buffer';

XLSX.set_fs(fs);
XLSX.stream.set_readable(Readable);

/**
 * TODO: Support the following structures…
 *
 * Workbook
 * Named Records: { sheet1: sheetData1, sheet2: sheetData2 }
 * Array of Sheets: [sheetData1, sheetData2]
 *
 * Sheet
 * Object with meta: { name: 'Sheet 1', data: [ rowData1, rowData2 ], headers: [...] }
 * Array of Rows: [ rowData1, rowData2 ]
 *
 * Row
 * Named columns: { col1: 'some data', col2: 123, ... }
 * Array of values: [ 'some data', 123 ]
 */

type Workbook = Sheet[] | Record<string, Sheet>;
type Sheet = Row[];
type Row = Record<string, Cell>;
type Cell = JsonPrimitive;

type SpreadsheetWriteOptions = {
  format: XLSX.BookType;
  compression: boolean;
};

type SpreadsheetGenerateOptions = Omit<XLSX.WritingOptions, 'type'>;

export class Spreadsheet {
  static utils = XLSX.utils;

  workbook: XLSX.WorkBook;

  constructor(data?: Workbook) {
    const { utils } = Spreadsheet;
    this.workbook = utils.book_new();
    if (!is.undefined(data)) {
      if (is.array(data)) {
        for (const sheet of data) {
          this.addSheet(sheet);
        }
      } else {
        for (const name in data) {
          this.addSheet(data[name], name);
        }
      }
    }
  }

  addSheet(data: Sheet | Cell[], name?: string) {
    if (is.array(data)) {
      name = Spreadsheet.utils.book_append_sheet(
        this.workbook,
        XLSX.utils.json_to_sheet(data),
        name,
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

  generate(customOptions: Partial<SpreadsheetGenerateOptions> = {}): Buffer {
    const options = {
      format: 'xlsx',
      compression: true,
      ...customOptions,
    };

    return XLSX.write(this.workbook, { ...options, type: 'buffer' }) as Buffer;
  }
}
