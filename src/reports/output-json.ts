import { ReportSettings, ReportConfig } from "./report-types.js";
import { Spidergram } from '../index.js';
import JSON5 from 'json5'
import path from "path";

type JsonReportSettings = ReportSettings & {
  json5: boolean,
  readable: boolean
};

export async function outputJsonReport(config: ReportConfig): Promise<void> {
  const sg = await Spidergram.load();

  const datasets = config.data ?? {};
  const settings = (config.settings ?? {}) as JsonReportSettings;

  const format = settings.json5 ? 'json5' : 'json';
  const outputPath = settings.path ?? '';

  if (!(await sg.files('output').exists(outputPath))) {
    await sg.files('output').createDirectory(outputPath);
  }

  for (const [name, data] of Object.entries(datasets)) {
    if (data.length === 0 && settings.includeEmptyResults === false) continue;

    const curFilePath = path.join(outputPath, `${name}.${format}`);

    const b = Buffer.from(
      format === 'json' ? 
        JSON.stringify(data, undefined, settings.readable ? 2 : 0) :
        JSON5.stringify(data, undefined, settings.readable ? 2 : 0)
    );
    
    await sg
      .files('output')
      .write(curFilePath, b);

    // this.status.finished++;
    // this.status.files.push(curFilePath);
  }

  return Promise.resolve();
}