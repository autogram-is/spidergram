import { VegaLiteChart, VegaLiteSpec } from './index.js';

export class BarChart extends VegaLiteChart {
  constructor(data: Record<string, unknown>[], x = 'x', y = 'y') {
    const spec: VegaLiteSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: 'bar',    
      data: { values: data },
      encoding: {
        theta: { field: x, type: "quantitative"},
        color: { field: y, type: "nominal"}
      }
    };

    super(spec);
  }
}