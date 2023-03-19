import chalk from 'chalk';
import is, { Primitive } from '@sindresorhus/is';

type ObjInspectOptions = {
  strMax?: number;
  arrMax?: number;
  color?: boolean;
  path?: 'full' | 'indent' | 'none';
  type?: boolean;
};

const defaults: ObjInspectOptions = {
  strMax: 40,
  arrMax: 5,
  color: true,
  path: 'full',
  type: true,
};

export function inspectValue(
  input: unknown,
  prefix: string[] = [],
  options: ObjInspectOptions = {},
) {
  const opt: ObjInspectOptions = { ...defaults, ...options };
  const output: string[] = [];
  const parents: string[] = [...prefix];

  if (is.primitive(input)) {
    output.push(formatLine(formatKey(parents, opt), formatValue(input, opt)));
  } else if (is.array(input)) {
    output.push(
      formatLine(formatKey(parents, opt), formatType(input, opt), ' '),
    );
    [...input.slice(0, opt.arrMax)].forEach((value, idx) => {
      parents.push(`[${idx}]`);
      output.push(inspectValue(value, parents, opt));
      parents.pop();
    });
  } else if (is.object(input)) {
    output.push(
      formatLine(formatKey(parents, opt), formatType(input, opt), ' '),
    );
    for (const [key, value] of Object.entries(input)) {
      parents.push(key);
      output.push(inspectValue(value, parents, opt));
      parents.pop();
    }
  }

  return output.join('\n');
}

function formatKey(path: string[] = [], opt: ObjInspectOptions) {
  const dim = opt.color ? chalk.dim : (s: string) => s;
  const bright = opt.color ? chalk.bold : (s: string) => s;
  let prefix = '';

  if (path.length === 0) {
    return '';
  } else if (path.length > 0) {
    if (opt.path === 'indent') {
      prefix = '  '.repeat(path.length);
    } else if (opt.path === 'full') {
      prefix = path.slice(0, -1).join('.');
      prefix += path.length > 1 ? '.' : '';
    }
  }
  return dim(prefix) + bright(path[path.length - 1]);
}

function formatValue(input: Primitive, opt: ObjInspectOptions): string {
  const dim = opt.color ? chalk.dim : (s: string) => s;
  let valStr = '';

  if (is.boolean(input)) {
    valStr = input ? 'true' : 'false';
  } else if (is.symbol(input)) {
    valStr = input.valueOf.toString();
  } else if (is.number(input) || is.bigint(input)) {
    valStr = input.toLocaleString();
  } else if (is.string(input)) {
    if (input.length > (opt.strMax ?? Infinity)) {
      valStr = input.slice(0, opt.strMax);
      if (input.length > (opt.strMax ?? Infinity)) {
        valStr += dim('…');
      }
    } else {
      valStr = input;
    }
  }

  return [valStr, formatType(input, opt)].join(' ');
}

function formatLine(key: string, value = '', separator = ': ') {
  if (value.length > 0) {
    return (key + separator + value).trim();
  }
  return key.trim();
}

function formatType(input: unknown, opt: ObjInspectOptions = {}) {
  if (opt.type === false) return '';

  const dim = opt.color ? chalk.dim : (s: string) => s;

  if (is.symbol(input)) {
    return dim(` (${is(input)}) ${input.description}`);
  } else if (is.number(input) || is.bigint(input)) {
    return dim(` (${is(input)})`);
  } else if (is.string(input)) {
    if (input.length > (opt.strMax ?? Infinity)) {
      return dim(`(${is(input)}, ${input.length.toLocaleString()} bytes)`);
    } else {
      return dim(` (${is(input)})`);
    }
  }
  if (is.emptyArray(input) || is.emptyObject(input)) {
    return dim(`(empty ${is(input)})`);
  }
  if (is.array(input)) {
    return dim(`(${is(input)}, ${input.length} elements)`);
  }
  if (is.plainObject(input)) {
    return dim(`(${is(input)}, ${Object.keys(input).length} properties)`);
  }
  return dim(` (${is(input)})`);
}
