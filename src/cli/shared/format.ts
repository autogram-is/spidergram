import { Chalk } from 'chalk';
import logSymbols from 'log-symbols';

export const chalk = new Chalk();

export const Colors = {
  error: chalk.bold.red,
  warning: chalk.bold.yellow,
  info: chalk.dim,
  success: chalk.bold.green,
  highlight: chalk.bold.bgYellow,
  h: chalk.bold.bgYellow,
};

export const Prefixes = {
  error: logSymbols.error,
  warning: logSymbols.warning,
  info: logSymbols.info,
  success: logSymbols.success,
};