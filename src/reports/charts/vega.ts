import {View, Spec, parse} from 'vega';

export type VegaSpec = Spec;

export class VegaChart {
  constructor(public spec: VegaSpec) { }
  protected _view?: View;

  get view() {
    if (this._view === undefined) {
      this._view = new View(parse(this.spec), {renderer: 'none'});
    }
    return this._view;
  }

  async render(): Promise<Buffer> {
    return this.view.toSVG().then(svg => Buffer.from(svg));
  }
}