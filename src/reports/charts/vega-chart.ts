import { Chart } from './index.js';
import {View, Spec, parse} from 'vega';
import _ from 'lodash';

export abstract class VegaChart implements Chart {
  protected abstract defaults: Partial<Spec>;

  constructor(protected options: Partial<Spec> = {}) { }

  get spec(): Spec {
    return _.defaultsDeep(this.options, this.defaults);
  }

  get data() {
    return this.options.data;
  }

  set data(input: Spec['data']) {
    this.options.data = input;
  }

  async toSvg() {
    const view = new View(parse(this.spec), {renderer: 'none'});
    return view.toSVG()
  }
}