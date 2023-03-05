import { Chalk } from 'chalk';

export const chalk = new Chalk();

export const Colors = {
  error: chalk.bold.red,
  warning: chalk.bold.yellow,
  info: chalk.dim,
  success: chalk.bold.green,
  highlight: chalk.bold.bgYellow,
};
