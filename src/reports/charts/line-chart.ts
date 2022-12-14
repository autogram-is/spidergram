import { VegaLiteChart } from './index.js';

export class LineChart extends VegaLiteChart {
  defaults = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "data": null,
    "mark": {
      "type": "line",
      "point": true
    },
    encoding: {
      x: { field: 'x' },
      y: { field: 'y', type: 'quantitative' },
    }
  }
}