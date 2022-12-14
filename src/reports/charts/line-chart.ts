import { VegaLiteChart, VegaLiteSpec } from './index.js';

export class LineChart extends VegaLiteChart {
  constructor(data: Record<string, unknown>[], x = 'x', y = 'y', points = true) {
    const spec: VegaLiteSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      "mark": {
        "type": "line",
        "point": points
      },
      data: { values: data },
      encoding: {
        x: { field: 'x' },
        y: { field: 'y', type: 'quantitative' },
      }
    };

    super(spec);
  }
}