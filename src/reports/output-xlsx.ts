import { Spidergram } from '../config/index.js';
import { FileTools } from '../tools/index.js';
import { BaseReportSettings, ReportConfig } from './report-types.js';
import { ensureDir } from 'fs-extra';
import path from 'path';
import {
  Properties,
  ColInfo,
  CellObject,
  CellStyle,
  ExcelDataType,
  NumberFormat,
  RowInfo,
} from 'xlsx-js-style';
import xlspkg from 'xlsx-js-style';
const { utils } = xlspkg;

import { ReportRunner } from './report.js';
import {
  JsonCollection,
  JsonMap,
  JsonPrimitive,
  isJsonArray,
  isJsonMap,
} from '@salesforce/ts-types';
import { DateTime } from 'luxon';
import is from '@sindresorhus/is';
import _ from 'lodash';

/**
 * Output options specific to workbook-style spreadsheet files
 */
export type XlsReportSettings = BaseReportSettings & {
  type: 'xlsx';

  /**
   * Internal metadata about the spreadsheet, usually displayed by a program's
   * "document information" command.
   */
  metadata?: Properties;

  /**
   * A dictionary of per-sheet configuration options. Each key corresponds to a key
   * in the report's `data` property; if it exists, the `default` entry will be used
   * as a fallback for sheets with no specific settings.
   */
  sheets?: Record<string, SheetSettings | undefined>;
};

type SheetSettings = {
  /**
   * A human-friendly name for the sheet.
   */
  name?: string;

  /**
   * A human-friendly description of the data on the sheet.
   */
  description?: string;

  /**
   * An output template to use when generating the sheet.
   *
   * - table: A traditional columns/rows data sheet, with styled header
   * - cover: An array of strings to turned into
   * - inspector: Key/Value pairs, optionally grouped under subheadings.
   */
  template?: 'table' | 'cover' | 'inspector';

  /**
   * Settings for individual columns. The settings in the 'default' entry will be
   * applied to all columns.
   */
  columns?: Record<string, ColumnSettings>;

  /**
   * Default styling information for all cells in the sheet
   */
  style?: CellStyle;

  /**
   * Additional style information for heading columns and rows.
   */
  headingStyle?: CellStyle;
};

type ColumnSettings = {
  /**
   * Override the text of the column's first row.
   */
  title?: string;

  /**
   * Add a hover/tooltip comment to the column's first row.
   */
  comment?: string;

  /**
   * Hide the column from view; its data will still be present and usable in formulas.
   */
  hidden?: boolean;

  /**
   * Adjust the column to the width of its widest row.
   *
   * @defaultValue true
   */
  autoFit?: boolean;

  /**
   * Hard-code the width of the column. This measurement is in 'approxomate characters,' not pixels.
   */
  width?: number;

  /**
   * The max width for the column. This measurement is in 'approxomate characters,' not pixels.
   *
   * @defaultValue 80
   */
  maxWidth?: number;

  /**
   * The minimum width for the column. This measurement is in 'approxomate characters,' not pixels.
   *
   * @defaultValue 5
   */
  minWidth?: number;

  /**
   * Wrap the contents of this column rather than truncating or overflowing.
   */
  wrap?: boolean;

  /**
   * If the column is populated and wrapping is turned on, its Row's height should
   * be set to this number.
   */
  height?: number;

  /**
   * Override data type auto-detection. Possible values:
   *
   * - "b": boolean
   * - "n": number
   * - "s": string
   * - "d": date
   */
  type?: ExcelDataType;

  /**
   * If the data type is set to 'n' or 'd', this format will be used used by Excel
   * when displaying the data. it does not change the underlying cell value.
   */
  format?: NumberFormat;

  /**
   * Attempt to parse and/or coerce the column's data before creating the sheet.
   * This is mostly useful for dates, which are a nightmare: setting 'type' to 'd'
   * and 'parse' to 'true' means Spidergram will ATTEMPT to turn timestamps, ISO dates,
   * and more into "clean" dates.
   */
  parse?: boolean;
};

/**
 * Default fallback settings for a sheet. Incoming values are merged with these settings.
 */
const sheetDefaults: SheetSettings = {
  template: 'table',
  headingStyle: { font: { bold: true } },
  style: {
    alignment: {
      vertical: 'top',
      horizontal: 'left',
    },
  },
  columns: {
    default: {
      autoFit: true,
      maxWidth: 80,
    },
  },
};

export async function outputXlsxReport(
  config: ReportConfig,
  runner: ReportRunner,
): Promise<void> {
  const sg = await Spidergram.load();

  const datasets = config.data ?? {};
  const settings = (config.settings ?? {}) as XlsReportSettings;
  settings.sheets ??= {};
  settings.message ??= {};

  const outputPath = settings.path ?? '';
  const rpt = new FileTools.Spreadsheet();
  rpt.workbook.Props = { ...rpt.workbook.Props, ...settings.metadata };

  for (const [name, data] of Object.entries(datasets)) {
    if (data.length === 0 && !settings.includeEmptyResults) continue;
    const sheetSettings = _.defaultsDeep(
      settings.sheets[name] || settings.sheets.default,
      sheetDefaults,
    );

    switch (sheetSettings.template) {
      case 'table':
        buildTabularSheet(name, data, sheetSettings, rpt);
        break;
      case 'inspector':
        buildInspectorSheet(name, data, sheetSettings, rpt);
        break;
      case 'cover':
        buildCoverSheet(name, data, sheetSettings, rpt);
        break;
    }
  }
  const curFilePath = `${outputPath}.xlsx`;

  const bin = path.join(
    sg.config.outputDirectory ?? sg.config.storageDirectory ?? './storage',
  );
  await ensureDir(path.join(bin, path.dirname(curFilePath)));

  await sg
    .files('output')
    .write(
      curFilePath,
      rpt.toBuffer({
        cellStyles: true,
        Props: settings.metadata,
        compression: true,
      }),
    )
    .then(() => {
      runner.status.finished++;
      runner.status.files.push(curFilePath);
    });

  return Promise.resolve();
}

function buildTabularSheet(
  name: string,
  data: JsonCollection,
  settings: SheetSettings,
  rpt: FileTools.Spreadsheet,
) {
  if (!isJsonArray(data) || !isJsonMap(data[0])) {
    // We can only work with arrays of maps here; in the future we might be able to
    // expand it to deal with other stuff.
    return;
  }

  let displayName = (settings.name ?? name).slice(0, 31);
  if (displayName.length === 0) displayName = 'Empty';

  rpt.addSheet({ displayName, data }, displayName);
  const sheet = rpt.workbook.Sheets[displayName];

  const firstRow = data[0];
  const colInfo: ColInfo[] = [];
  const rowInfo: RowInfo[] = [];

  settings.columns ??= {};

  if (sheet['!ref']) {
    const range = utils.decode_range(sheet['!ref']);
    const dense = sheet['!data'];

    const colSettings: ColumnSettings[] = [];
    for (const c of Object.keys(firstRow)) {
      colSettings.push({
        ...settings.columns[c],
        ...settings.columns['default'],
      });
    }

    for (let R = 0; R <= range.e.r; ++R) {
      const ri: RowInfo = {};
      for (let C = 0; C <= range.e.c; ++C) {
        const cell: CellObject = dense
          ? sheet['!data']?.[R]?.[C]
          : sheet[utils.encode_cell({ r: R, c: C })];
        const cs = colSettings[C];

        cell.s = settings.style;

        if (R === 0) {
          if (cs.comment) {
            cell.c = [{ t: cs.comment }];
          }
          if (cs.title) cell.v = cs.title;
          if (settings.headingStyle) {
            cell.s = { ...cell.s, ...settings.headingStyle };
          }
        } else {
          if (cs.type) cell.t = cs.type;
          if (cs.format) cell.z = cs.format;
          if (cell.v && cs.parse && cs.type === 'd') {
            cell.v = desperatelyAttemptToParseDate(cell.v);
          }
        }

        if (cs.autoFit) {
          let rowWidth = cell.v?.toLocaleString().length ?? 0;
          rowWidth = Math.max(1, Math.floor(rowWidth / 5)) * 5;
          colSettings[C].width = Math.max(colSettings[C].width ?? 0, rowWidth);
        }
      }
      rowInfo.push(ri);
    }

    for (const cs of colSettings) {
      cs.width = Math.min(cs.maxWidth ?? 120, cs.width ?? 5);
      cs.width = Math.max(cs.minWidth ?? 5, cs.width);
      colInfo.push({
        wch: cs.width,
        hidden: cs.hidden,
      });
    }

    sheet['!cols'] = colInfo;
    sheet['!rows'] = rowInfo;
  }
}

function buildInspectorSheet(
  name: string,
  input: JsonCollection,
  settings: SheetSettings,
  rpt: FileTools.Spreadsheet,
) {
  const cells: JsonPrimitive[][] = [];
  const data = isJsonArray(input) ? input[0] : input;
  if (!isJsonMap(data)) {
    return;
  }

  objectToArray(data, cells);
  const displayName = (settings.name ?? name).slice(0, 31);
  rpt.addSheet({ displayName, data: cells, skipHeader: true }, displayName);

  // Now go through and align everything
  const sheet = rpt.workbook.Sheets[displayName];

  if (sheet['!ref']) {
    const range = utils.decode_range(sheet['!ref']);
    const dense = sheet['!data'];
    const rowInfo: RowInfo[] = [];

    for (let R = 0; R <= range.e.r; ++R) {
      const ri: RowInfo = {};
      for (let C = 0; C <= range.e.c; ++C) {
        const cell: CellObject = dense
          ? sheet['!data']?.[R]?.[C]
          : sheet[utils.encode_cell({ r: R, c: C })];
        if (!cell) continue;
        const cs = settings.columns?.[cell.v?.toString() ?? 'default'] ?? {};

        cell.s = settings.style;

        if (C === 0) {
          if (cs.title) cell.v = cs.title;
          if (settings.headingStyle) {
            cell.s = { ...cell.s, ...settings.headingStyle };
          }
        } else {
          if (cs.type) cell.t = cs.type;
          if (cs.format) cell.z = cs.format;
          if (cs.parse && cs.type === 'd') {
            cell.v = desperatelyAttemptToParseDate(cell.v);
          }

          if (cs.wrap) {
            const maxHeight = 10;
            const ptSize = 12;
            cell.s = { alignment: { wrapText: true } };
            const lines = Math.floor(
              (cell.v?.toLocaleString().length ?? 0) / (cs.width ?? 80),
            );
            ri.hpt = ptSize * Math.min(maxHeight, lines);
          }
        }
      }
      rowInfo.push(ri);
    }

    sheet['!cols'] = [{ wch: 20 }, { wch: 80 }];
    sheet['!rows'] = rowInfo;
  }
}

function objectToArray(data: JsonMap, cells: JsonPrimitive[][]) {
  for (const [key, value] of Object.entries(data)) {
    if (isJsonArray(value)) {
      const rs = [...value];
      cells.push([key, rs.shift()?.toString() ?? null]);
      while (rs.length) {
        cells.push(['', rs.shift()?.toString() ?? null]);
      }
    } else if (isJsonMap(value)) {
      cells.push(['', '']);
      cells.push([key, '']);
      objectToArray(value, cells);
    } else if (is.string(value)) {
      cells.push([key, value.slice(0, 30_000)]);
    } else {
      cells.push([key, value ?? null]);
    }
  }
}

function buildCoverSheet(
  name: string,
  data: JsonCollection,
  settings: SheetSettings,
  rpt: FileTools.Spreadsheet,
) {
  // Not yet implemented
  console.log(name, data, settings, rpt);
}

function desperatelyAttemptToParseDate(
  input: string | number | boolean | Date | undefined,
) {
  let value = input;
  if (is.numericString(value)) {
    value = Number.parseInt(value);
  }

  if (is.number(value)) {
    return DateTime.fromMillis(value).toJSDate();
  } else if (is.string(value)) {
    return DateTime.fromISO(value).toJSDate();
  }

  return value;
}
