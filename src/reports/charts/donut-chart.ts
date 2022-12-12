import { VegaLiteChart } from './index.js';

export class Donut extends VegaLiteChart {
  defaults = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "A simple donut chart with embedded data.",
    "data": null,
    "mark": {"type": "arc", "innerRadius": 50},
    "encoding": {
      "theta": {"field": "value", "type": "quantitative"},
      "color": {"field": "category", "type": "nominal"}
    }
  }  
}