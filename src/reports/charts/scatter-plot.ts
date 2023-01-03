import { VegaLiteChart, VegaLiteSpec } from './index.js';

export class ScatterPlot extends VegaLiteChart {
  constructor(
    data: Record<string, unknown>[],
    x = 'x',
    y = 'y',
    color = undefined,
  ) {
    const spec: VegaLiteSpec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: data },
      mark: 'point',
      encoding: {
        x: { field: x, type: 'quantitative' },
        y: { field: y, type: 'quantitative' },
        color: color ? { field: color, type: 'nominal' } : undefined,
      },
    };

    super(spec);
  }
}
