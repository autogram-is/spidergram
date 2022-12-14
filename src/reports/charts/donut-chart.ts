import { VegaLiteChart, VegaLiteSpec } from './index.js';

export class DonutChart extends VegaLiteChart {
  constructor(data: Record<string, unknown>[], value = 'value', category = 'category') {
    const spec: VegaLiteSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "arc", innerRadius: 50},    
      data: { values: data },
      encoding: {
        theta: { field: value, type: "quantitative"},
        color: { field: category, type: "nominal"}
      }
    };

    super(spec);
  }
}