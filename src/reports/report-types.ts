import { JsonCollection } from "@salesforce/ts-types";
import { XlsReportSettings } from "./output-xlsx.js";
import { CsvReportSettings } from "./output-csv.js";
import { JsonReportSettings } from "./output-json.js";
import { ReportRunner } from "./report.js";
import { ChildQuery, QueryInput } from "../model/queries/query-inheritance.js";
import { AqFilter } from "aql-builder";

export type ReportResult = { messages?: string[], errors?: Error[] };
export type ReportWorker = (report: ReportConfig, runner: ReportRunner) => Promise<ReportResult>
export type TransformOptions = Record<string, unknown>;

export type BaseReportSettings = Record<string, unknown> & {
  /**
   * The path where the final report will be saved. `outputPath` supports the following
   * placeholder tokens:
   *
   * - `{{name}}`: The name of the report
   * - `{{date}}`: The current date in YYYY-MM-DD format
   *
   * In addition, any values used the `options` property of the Report configuration
   * can be used as tokens. The file extension (.json, .xlsx, etc) will be appended
   * automatically.
   *
   * @defaultValue `{{name}} - {{date}}`
   */
  path?: string;

  /**
   * Include datasets in final output even when they're empty.
   */
  includeEmptyResults?: boolean,
};

export type ReportSettings = BaseReportSettings | CsvReportSettings | JsonReportSettings | XlsReportSettings;

/**
 * Configuration for a specific Spidergram report
 */
export interface ReportConfig extends Record<string, unknown> {
  /**
   * A human-friendly name for the report. This controls output file metadata
   * for certain formats, and can be inserted into the output filename.
   */
  name?: string;

  /**
   * A short summary of the report's purpose; this will be displayed in the
   * Spidergram CLI, and may be used when building file metadata for some exports.
   */
  description?: string;

  /**
   * Used to group and organize reports in the Spidergram CLI; does not affect
   * queries or file output.
   */
  group?: string;

  /**
   * Additional settings for the report instance, including the output path. Some
   * output types take additional parameters here (delimiter settings for CVS/TSV
   * exports, etc.)
   */
  settings?: ReportSettings;

  /**
   * Run the report multiple times, once for each entry in the 'repeat' property.
   * 
   * The key of each repeat entry will be used as the new report name, and the value
   * (one or more AqFilters) will be applied to every alterable query in the report.
   */
  repeat?: Record<string, AqFilter | AqFilter[]>

  /**
   * A keyed list of queries to be run when building this report's data. Query data can
   * be references to an existing stored query in the project configuration, standalone
   * query definitions in {@link AqQuery} format, raw strings containing AQL queries,
   * etc.
   */
  queries?: Record<string, QueryInput | ChildQuery>;

  /**
   * Custom function to be run before any queries are excecuted. This can be used
   * to alter existing queries, expand one query into multiple derivative queries,
   * etc.
   */
  alterQueries?: ReportWorker;

  /**
   * Keyed JSON data containing results from the reports queries. Additional datasets
   * can also be included manually; this can be useful for explanitory/overview sheets,
   * or pre-built supplementary data used during the output process.
   * 
   * Generally this collection's records correspond directly to the queries; transform
   * callbacks or query alteration flags may result in multiple datasets from a single
   * query, or multiple queries combined into a single dataset.
   */
  data?: Record<string, JsonCollection>;

  /**
   * Transformation options, or a custom transform function, to alter the report's
   * data after all queries have been run, but before output is generated. This can
   * be useful for date and number formatting and other cleanup.
   */
  alterData?: ReportWorker;

  /**
   * A custom report generation function that assumes responsibility for processing
   * the final datasets and outputting the files.
   */
  output?: ReportWorker;
}
