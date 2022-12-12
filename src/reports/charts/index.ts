export * from './bar-chart.js';
export * from './vega-chart.js';
export * from './vega-lite-chart.js';

export type ChartSize = {
  height?: number,
  width?: number,
};

export interface Chart {
  toSvg(): Promise<string>;
}