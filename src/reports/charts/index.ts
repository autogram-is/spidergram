export * from './vega.js';
export * from './vega-lite.js';
export * from './line-chart.js';
export * from './bar-chart.js';
export * from './donut-chart.js';
export * from './scatter-plot.js';

import {VegaChart} from './vega.js';
import {VegaLiteChart} from './vega-lite.js';
import {LineChart} from './line-chart.js';
import {BarChart} from './bar-chart.js';
import {DonutChart} from './donut-chart.js';
import {ScatterPlot} from './scatter-plot.js';

export const charts = {
  vega: VegaChart,
  vegaLite: VegaLiteChart,
  line: LineChart,
  bar: BarChart,
  donut: DonutChart,
  scatter: ScatterPlot
}