export * from './vega-lite-chart.js';
export * from './line-chart.js';
export * from './bar-chart.js';
export * from './donut-chart.js';
export * from './scatter-plot.js';

export * from './vega-chart.js';

export type ChartSize = {
  height?: number,
  width?: number,
};

export interface Chart {
  toSvg(): Promise<string>;
}