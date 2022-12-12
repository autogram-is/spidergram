import { Chart, ChartSize } from './index.js';
import {View, Spec, Config, parse} from 'vega';
import _ from 'lodash';

export abstract class VegaChart implements Chart {
  protected abstract defaults: Partial<Spec>;

  constructor(protected options: Partial<Spec> = {}, public config: Config = {}) { }

  get spec(): Spec {
    return _.defaultsDeep(this.options, this.defaults);
  }

  get data() {
    return this.options.data;
  }

  set data(input: Spec['data']) {
    this.options.data = input;
  }

  async toSvg(options: Config & ChartSize = {}) {
    const { height, width, ...config } = options;

    const view = new View(parse(this.spec, _.defaultsDeep(config, this.config)), {renderer: 'none'});

    if (options.height) view.height(options.height);
    if (options.width) view.width(options.width);

    return view.toSVG()
  }
}