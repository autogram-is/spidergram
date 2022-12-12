import { VegaLiteChart } from './index.js';

export class ScatterPlot extends VegaLiteChart {
  defaults = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "data": null,
    "mark": "point",
    "encoding": {
      "x": {
        "field": "x",
        "type": "quantitative",
      },
      "y": {
        "field": "y",
        "type": "quantitative",
      },
      "color": {"field": "color", "type": "nominal"},
    }
  }  
}