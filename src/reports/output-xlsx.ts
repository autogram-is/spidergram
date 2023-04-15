import { Spidergram } from "../config/index.js";
import { FileTools } from "../tools/index.js";
import { BaseReportSettings, ReportConfig } from "./report-types.js";
import { Properties, WorkSheet, ColInfo, utils, CellObject, ExcelDataType, NumberFormat } from "xlsx";
import { ReportRunner } from "./report.js";
import { JsonMap, isJsonArray, isJsonMap } from "@salesforce/ts-types";
import { DateTime } from "luxon";
import is from "@sindresorhus/is";

/**
 * Output options specific to workbook-style spreadsheet files
 */
export type XlsReportSettings = BaseReportSettings & {
  type: 'xlsx',

  /**
   * Internal metadata about the spreadsheet, usually displayed by a program's
   * "document information" command.
   */
  metadata?: Properties

  /**
   * A dictionary of per-sheet configuration options. Each key corresponds to a key
   * in the report's `data` property; if it exists, the `default` key will be used
   * as a fallback for sheets with no specific settings.
   */
  sheets?: Record<string, SheetSettings | undefined>
};

type SheetSettings = {
  name?: string,
  header?: string[],
  skipHeader?: boolean,
  formatHeader?: boolean,
  columnSettings?: Record<string, ColumnSettings>,
}

type ColumnSettings = {
  title?: string,
  comment?: string,
  hidden?: boolean,
  width?: number,
  maxWidth?: number,
  minWidth?: number,
  autoFit?: boolean,
  type?: ExcelDataType,
  format?: NumberFormat,
  parse?: boolean,
}

const sheetDefaults: SheetSettings = {
  formatHeader: true,
  columnSettings: {
    default: {
      autoFit: true,
      maxWidth: 80,
      parse: true
    }
  }
}

export async function outputXlsxReport(config: ReportConfig, runner: ReportRunner): Promise<void> {
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

    const sheetSettings = settings.sheets[name] || settings.sheets.default || sheetDefaults;
    if (sheetSettings) {
      rpt.addSheet({ name, data, ...sheetSettings }, name.slice(0, 31));
      if (isJsonArray(data) && isJsonMap(data[0])) {
        setColumnData(rpt.workbook.Sheets[name], sheetSettings, data[0]);
      }
    } else {
      rpt.addSheet(data, name.slice(0, 31));      
    }

  }
  const curFilePath = `${outputPath}.xlsx`;

  await sg
    .files('output')
    .write(curFilePath, rpt.toBuffer({ cellStyles: true, Props: settings.metadata, compression: true }))
    .then(() => {
      runner.status.finished++;
      runner.status.files.push(curFilePath);
    });

  return Promise.resolve();
}

function setColumnData(sheet: WorkSheet, settings: SheetSettings, firstRow: JsonMap) {
  const colInfo: ColInfo[] = [];
  settings.columnSettings ??= {};

  if (sheet["!ref"]) {
    const range = utils.decode_range(sheet["!ref"]);
    const dense = sheet["!data"];

    const colSettings: ColumnSettings[] = [];
    for (const c of Object.keys(firstRow)) {
      colSettings.push({
        ...settings.columnSettings[c],
        ...settings.columnSettings['default']
      });
    }

    for(let R = 0; R <= range.e.r; ++R) {
      for(let C = 0; C <= range.e.c; ++C) {
        const cell: CellObject = dense ? sheet["!data"]?.[R]?.[C] : sheet[utils.encode_cell({r:R, c:C})];
        const cs = colSettings[C];
  
        if (R === 0 && !settings.skipHeader) {
          if (settings.formatHeader) {
            cell.s = {
              font: { bold: true },
              fill: { bgColor:{ rgb: "FFD3D3D3" } }
            };
            if (cs.comment) {
              cell.c = [{ t: cs.comment }];
            }
            if (cs.title) cell.v = cs.title;
          }
        } else {
          if (cs.type) cell.t = cs.type;
          if (cs.format) cell.z = cs.format;
          if (cs.parse && cs.type === 'd') {
            cell.v = desperatelyAttemptToParseDate(cell.v);
          }
        }

        if (cs.autoFit) {
          let rowWidth = cell.v?.toLocaleString().length ?? 0;
          rowWidth = Math.max(1, Math.floor(rowWidth / 5)) * 5;
          colSettings[C].width = Math.max(colSettings[C].width ?? 0, rowWidth);
        }
      }
    }

    for (const cs of colSettings) {
      cs.width = Math.min(cs.maxWidth ?? 120, cs.width ?? 5)
      cs.width = Math.max(cs.minWidth ?? 5, cs.width)
      colInfo.push({
        wch: cs.width,
        hidden: cs.hidden,
      })
    }
    sheet["!cols"] = colInfo;  
    
  }
}

function desperatelyAttemptToParseDate(input: string | number | boolean | Date | undefined) {
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
