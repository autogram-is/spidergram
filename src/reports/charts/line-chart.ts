import { VegaLiteChart } from './index.js';

export class Line extends VegaLiteChart {
  defaults = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "data": null,
    "mark": {
      "type": "line",
      "point": true
    },
    "encoding": {
      "x": {"timeUnit": "year", "field": "date"},
      "y": {"aggregate":"mean", "field": "price", "type": "quantitative"},
      "color": {"field": "symbol", "type": "nominal"}
    }
  }
}