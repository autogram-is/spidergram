export * from './bar-chart.js';
export * from './vega-chart.js';
export * from './vega-lite-chart.js';

export interface Chart {
  toSvg(): Promise<string>;
}