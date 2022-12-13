import {Chart} from './index.js';
import {TopLevelSpec, compile} from 'vega-lite';
import {View, parse} from 'vega';
import _ from 'lodash';
import { Encoding } from 'vega-lite/build/src/encoding.js';
import { Field } from 'vega-lite/build/src/channeldef.js';

export type VegaLiteData = TopLevelSpec['data'];
export type VegaLiteEncoding = Encoding<Field>;
export type VegaLiteSchema = TopLevelSpec & { encoding: VegaLiteEncoding }

export class VegaLiteChart implements Chart {
  readonly defaults: Partial<TopLevelSpec> = {};
  data: VegaLiteData | undefined;
  encoding: VegaLiteEncoding | undefined;
  options: Partial<VegaLiteSchema> = {};

  get spec(): TopLevelSpec {
    return _.defaultsDeep({ data: this.data }, { encoding: this.encoding }, this.options, this.defaults);
  }

  buildView() {
    const vegaSpec = compile(this.spec);
    return new View(parse(vegaSpec.spec), {renderer: 'none'})
  }

  async toSvg() {
    const view = this.buildView();
    return view.toSVG()
  }
}