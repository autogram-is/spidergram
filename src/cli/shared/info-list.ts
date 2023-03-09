import { chalk, joinOxford } from './format.js';

type InfoListOptions = {
  title?: string;
  align?: boolean;
};

type InfoListInput = Record<string, (number | string) | (number | string)[]>;

export function infoList(
  input: InfoListInput,
  customOptions: InfoListOptions = {},
) {
  const options = { align: true, ...customOptions };
  const maxWidth = Object.keys(input).reduce((prev, current) =>
    prev.length > current.length ? prev : current,
  ).length;
  const lines: string[] = [];

  if (options.title) {
    lines.push(chalk.bold(options.title));
  }

  for (const [key, value] of Object.entries(input)) {
    const title = chalk.bold(key);
    const padding = options.align ? ' '.repeat(maxWidth - key.length) : '';
    const values = Array.isArray(value) ? value : [value];
    const content = joinOxford(
      values.map(v => (typeof v === 'string' ? v : v.toLocaleString())),
    );

    lines.push(`${title}:${padding} ${content}`);
  }

  return lines.join('\n');
}
