import {Chart, ChartSize} from './index.js';
import {TopLevelSpec, compile} from 'vega-lite';
import {View, parse} from 'vega';
import _ from 'lodash';

type VegaLiteData = TopLevelSpec['data'];

export class VegaLiteChart implements Chart {
  readonly defaults: Partial<TopLevelSpec> = {};
  spec: TopLevelSpec;

  constructor(
    data: VegaLiteData = { values: [] },
    spec: Partial<TopLevelSpec> = {},
  ) {
    this.spec = _.defaultsDeep({ data: data }, this.defaults, spec);
  }

  get data(): VegaLiteData {
    return this.spec.data;
  }
  
  set data(input: VegaLiteData) {
    this.spec.data = input;
  }

  buildView() {
    const vegaSpec = compile(this.spec);
    return new View(parse(vegaSpec.spec), {renderer: 'none'})
  }

  async toSvg(options: Record<string, unknown> & ChartSize = {}) {
    const view = this.buildView();

    if (options.height) view.height(options.height);
    if (options.width) view.width(options.width);

    return view.toSVG()
  }
}