import { ChartBase } from './chart-base.js';

export class Bar extends ChartBase {
  defaults = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    mark: 'bar',
    data: null,
    encoding: {
      x: {field: 'a', type: 'nominal', axis: {labelAngle: 0}},
      y: {field: 'b', type: 'quantitative'}
    }
  }
}