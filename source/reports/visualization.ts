import { JSDOM } from 'jsdom';
import * as d3 from 'd3';

export {d3};

// Shamelessly yoinked from https://github.com/d3-node/d3-node
// and wrapped in some Typescript-friendly-ifying. We'll be 
// consolidating this and wrapping it in canvas-based image exports
// shortly, as well. Usage is fairly straightforward: 

export interface VisuzlizationOptions {
  html?: string,
  selector?: string,
  styles?: string,
}

export class Visualization {
  dom: JSDOM;
  selector?: string;
  document: Document;
  element: d3.Selection<HTMLElement, unknown, d3.BaseType, unknown>;

  constructor (public options: VisuzlizationOptions = {}) {
    this.dom = new JSDOM(options.html);
    this.document = this.dom.window.document;
    this.element = d3.select(this.document.body);
    this.selector = options.selector;
    if (options.selector) this.element = this.element.select(options.selector);
  }

  protected fixXmlCase(text: string) {
    // Fix a jsdom issue where all SVG tagNames are lowercased:
    // https://github.com/tmpvar/jsdom/issues/620
    const tagNames = ['linearGradient', 'radialGradient', 'clipPath', 'textPath'];
    for (let i = 0, l = tagNames.length; i < l; i++) {
      const tagName = tagNames[i];
      text = text.replace(
        new RegExp('(<|</)' + tagName.toLowerCase() + '\\b', 'g'),
        (all, start) => { return start + tagName }
      );
    }
    return text;
  }

  createSVG(width?: number, height?: number, attrs?: Record<string, string | number>) {
    const svg = this.element.append('svg')
      .attr('xmlns', 'http://www.w3.org/2000/svg');
    
    if (width && height) {
      svg.attr('width', width).attr('height', height);
    }

    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        svg.attr(key, attrs[key])
      });
    }

    if (this.options.styles) {
      svg.append('defs')
        .append('style')
        .attr('type', 'text/css')
        .text(this.escapeStyles(this.options.styles))
    }
    return svg;
  }

  toSvg() {
    return this.fixXmlCase(this.element.select<SVGElement>('svg').node()?.outerHTML ?? '');
  }

  toHtml() {
    return this.dom.serialize();
  }

  chartHTML() {
    if (this.options.selector) {
      return this.document.querySelector(this.options.selector)?.outerHTML ?? '';
    }
    return '';
  }

  protected escapeStyles(styles?: string) {
    return `<![CDATA[ ${styles} ]]>`;
  }
}
