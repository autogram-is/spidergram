import { Chart } from './index.js';
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

  async toSvg() {
    const vegaSpec = compile(this.spec, {config: this.config});
    const view = new View(parse(vegaSpec.spec), {renderer: 'none'});
    return view.toSVG()
  }
}