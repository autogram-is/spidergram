import { JsonCollection, JsonPrimitive } from "@salesforce/ts-types";
import { AqQuery } from "aql-builder";
import { Query } from "../model";
import { GeneratedAqlQuery } from "arangojs/aql";

export type AqQueryFragment = Partial<AqQuery>;
export type AqBindVars = Record<string, JsonPrimitive | JsonPrimitive[]>
export type QueryInput = string | AqQuery | Query | GeneratedAqlQuery;

export type ReportResult = { messages?: string[], errors?: Error[] };
export type ReportWorker = (report: ReportConfig) => Promise<void>
export type TransformOptions = Record<string, unknown>;
export type ReportOutputType = 'csv' | 'json' | 'xslx';

export type ReportSettings = Record<string, unknown> & {
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
  includeEmptyResults?: boolean
}

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
  settings?: Record<string, unknown>;

  /**
   * A keyed list of queries to be run when building this report's data. Query data can
   * be references to an existing stored query in the project configuration, standalone
   * query definitions in {@link AqQuery} format, raw strings containing AQL queries,
   * etc.
   */
  queries?: Record<string, QueryInput | ReportQuery>;

  /**
   * Custom function to be run before any queries are excecuted. This can be used
   * to alter existing queries, expand one query into multiple derivative queries,
   * etc.
   */
  build?: ReportWorker

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
  transform?: TransformOptions | ReportWorker;

  /**
   * The ID of a supported output format, or a custom function that receives the
   * report's data collection and assumes responsibility for final output.
   * 
   * Currently supported formats are `csv`, `json`, and `xslx`.
   * 
   * @defaultValue `xslx`
   */
  output?: ReportOutputType | ReportWorker;
}

/**
 * A query definition that can (optionally) include a foundational base query.
 * 
 * If the base query is a {@link Query} or an {@link AqQuery}, the properties of
 * the {@link ReportQuery} will be combined with those of the base query to
 * generate a new derivitive query.
 * 
 * If the base query is a {@link GeneratedAqlQuery}, the list of named bind variables
 * will be injected into the base query before execution.
 */
export type ReportQuery = AqQueryFragment & {
  /**
   * The query to use as a starting point. If this value is a string,
   * it will be treated as the name of a saved query to look up in the global
   * configuration. If no query is found, it will be compiled as a raw AQL query.
   * If that fails you're SOL.
   */
  base: QueryInput;

  /**
   * After a query has been compiled into a {@link GeneratedAqlQuery}, these
   * values will be injected into its list of bound variables.
   */
  bind?: Record<string, JsonPrimitive | JsonPrimitive[]>
};
