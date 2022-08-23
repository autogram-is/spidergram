/* eslint-disable @typescript-eslint/naming-convention */
import { HeaderGeneratorOptions } from 'fingerprint-generator';

/**
 * A properly-typed mirror of the browser header presets from header-generator.
 *
 * @type {Record<string, Partial<HeaderGeneratorOptions>>}
 */
export const BROWSER_PRESETS: Record<
  string,
  Partial<HeaderGeneratorOptions>
> = {};

BROWSER_PRESETS.MODERN_DESKTOP = {
  browserListQuery: 'last 5 versions',
};
BROWSER_PRESETS.MODERN_MOBILE = {
  ...BROWSER_PRESETS.MODERN_DESKTOP,
  devices: ['mobile'],
};
BROWSER_PRESETS.MODERN_LINUX = {
  ...BROWSER_PRESETS.MODERN_DESKTOP,
  operatingSystems: ['linux'],
};
BROWSER_PRESETS.MODERN_LINUX_FIREFOX = {
  browserListQuery: 'last 5 firefox versions',
  operatingSystems: ['linux'],
};
BROWSER_PRESETS.MODERN_LINUX_CHROME = {
  browserListQuery: 'last 5 chrome versions',
  operatingSystems: ['linux'],
};
BROWSER_PRESETS.MODERN_WINDOWS = {
  ...BROWSER_PRESETS.MODERN_DESKTOP,
  operatingSystems: ['windows'],
};
BROWSER_PRESETS.MODERN_WINDOWS_FIREFOX = {
  browserListQuery: 'last 5 firefox versions',
  operatingSystems: ['windows'],
};
BROWSER_PRESETS.MODERN_WINDOWS_CHROME = {
  browserListQuery: 'last 5 chrome versions',
  operatingSystems: ['windows'],
};
BROWSER_PRESETS.MODERN_MACOS = {
  ...BROWSER_PRESETS.MODERN_DESKTOP,
  operatingSystems: ['macos'],
};
BROWSER_PRESETS.MODERN_MACOS_FIREFOX = {
  browserListQuery: 'last 5 firefox versions',
  operatingSystems: ['macos'],
};
BROWSER_PRESETS.MODERN_MACOS_CHROME = {
  browserListQuery: 'last 5 chrome versions',
  operatingSystems: ['macos'],
};
BROWSER_PRESETS.MODERN_ANDROID = {
  ...BROWSER_PRESETS.MODERN_MOBILE,
  operatingSystems: ['android'],
};
