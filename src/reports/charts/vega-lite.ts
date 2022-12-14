import {TopLevelSpec, compile} from 'vega-lite';
import {View, parse} from 'vega';

export type VegaLiteSpec = TopLevelSpec;

export class VegaLiteChart {
  constructor(public spec: VegaLiteSpec) { }
  protected _view?: View;

  get view() {
    if (this._view === undefined) {
      const vegaSpec = compile(this.spec);
      this._view = new View(parse(vegaSpec.spec), {renderer: 'none'});
    }
    return this._view;
  }

  async render(): Promise<Buffer> {
    return this.view.toSVG().then(svg => Buffer.from(svg));
  }
}