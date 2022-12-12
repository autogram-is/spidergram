import { Chart, ChartSize } from './index.js';
import {Config, TopLevelSpec, compile} from 'vega-lite';
import {View, parse} from 'vega';
import _ from 'lodash';

export abstract class VegaLiteChart implements Chart {
  protected abstract defaults: Partial<TopLevelSpec>;

  constructor(protected options: Partial<TopLevelSpec> = {}, public config: Config = {}) { }

  get spec(): TopLevelSpec {
    return _.defaultsDeep(this.options, this.defaults);
  }

  get data() {
    return this.options.data;
  }

  set data(input: TopLevelSpec['data']) {
    this.options.data = input;
  }

  async toSvg(options: Config & ChartSize = {}) {
    const { height, width, ...config } = options;
    
    const vegaSpec = compile(this.spec, { config: _.defaultsDeep(config, this.config) });
    const view = new View(parse(vegaSpec.spec), {renderer: 'none'});

    if (options.height) view.height(options.height);
    if (options.width) view.width(options.width);

    return view.toSVG()
  }
}