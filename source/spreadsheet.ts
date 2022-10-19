// Sheets.js setup
import is from '@sindresorhus/is';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { Readable } from 'stream';
import { JsonPrimitive } from './types';

XLSX.set_fs(fs);
XLSX.stream.set_readable(Readable);

export type SpreadsheetData = Record<string, SheetData> | SheetData[];
export type SheetData = {
  name?: string,
  headers?: string[],
  rows: RowData[]
} | RowData[];
export type RowData = Record<string, CellValue> | CellValue[];
export type CellValue = JsonPrimitive;

type SpreadsheetSaveOptions = {
  format: XLSX.BookType,
  compression: boolean,
}

export class Spreadsheet  {
  static utils = XLSX.utils;

  workbook: XLSX.WorkBook;

  constructor(data?: SpreadsheetData) {
    const utils = Spreadsheet.utils;
    this.workbook = utils.book_new();
    if (!is.undefined(data)) {
      if (is.array(data)) {
        for(let sheet of data) {
          this.addSheet(sheet, ('name' in sheet) ? sheet.name : undefined);
        }
      } else {
        for(let name in data) {
          this.addSheet(data[name], name);
        }
      }
    }
  }

  addSheet(data: SheetData, name?: string) {
    if (is.array(data)) {
      Spreadsheet.utils.book_append_sheet(this.workbook, XLSX.utils.aoa_to_sheet([data]), name);
    } else {
      const key = Spreadsheet.utils.book_append_sheet(this.workbook, XLSX.utils.json_to_sheet(data.rows), name ?? data.name);      
      if (data.headers) {
        Spreadsheet.utils.sheet_add_aoa(this.workbook.Sheets[key], [data.headers], { origin: "A1" });
      }
    }
  }

  async save(filename: string, customOptions: Partial<SpreadsheetSaveOptions> = {}): Promise<string> {

    const options: SpreadsheetSaveOptions = {
      format: 'xlsx',
      compression: true,
      ...customOptions
    }

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
}