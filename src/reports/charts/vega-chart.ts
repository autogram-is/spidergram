import { Chart, ChartSize } from './index.js';
import {View, Spec, Data, parse} from 'vega';
import _ from 'lodash';

export abstract class VegaChart implements Chart {
  readonly defaults: Partial<Spec> = {};
  spec: Spec;

  constructor(data: Data[] = [], spec: Partial<Spec> = {}) {
    this.spec = _.defaultsDeep({ data: data }, this.defaults, spec);
  }

  get data() {
    return this.spec.data ?? [];
  }

  set values(input: Data[]) {
    this.spec.data = input;
  }

  buildView() {
    return new View(parse(this.spec), {renderer: 'none'});
  }

  async toSvg(options: Record<string, unknown> & ChartSize = {}) {
    const view = this.buildView();
    
    if (options.height) view.height(options.height);
    if (options.width) view.width(options.width);

    return view.toSVG()
  }
}