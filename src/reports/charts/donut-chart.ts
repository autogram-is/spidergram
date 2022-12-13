import { VegaLiteChart } from './index.js';

export class Donut extends VegaLiteChart {
  defaults = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: { type: "arc", innerRadius: 50},
    encoding: {
      theta: { field: "value", type: "quantitative"},
      color: { field: "category", type: "nominal"}
    }
  }  
}