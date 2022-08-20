/* eslint-disable @typescript-eslint/naming-convention */
import { HeaderGeneratorOptions } from 'fingerprint-generator';

/**
 * A properly-typed mirror of the browser header presets from header-generator.
 *
 * @type {Record<string, Partial<HeaderGeneratorOptions>>}
 */
export const HEADER_PRESETS: Record<
  string,
  Partial<HeaderGeneratorOptions>
> = {};

HEADER_PRESETS.MODERN_DESKTOP = {
  browserListQuery: 'last 5 versions',
};
HEADER_PRESETS.MODERN_MOBILE = {
  ...HEADER_PRESETS.MODERN_DESKTOP,
  devices: ['mobile'],
};
HEADER_PRESETS.MODERN_LINUX = {
  ...HEADER_PRESETS.MODERN_DESKTOP,
  operatingSystems: ['linux'],
};
HEADER_PRESETS.MODERN_LINUX_FIREFOX = {
  browserListQuery: 'last 5 firefox versions',
  operatingSystems: ['linux'],
};
HEADER_PRESETS.MODERN_LINUX_CHROME = {
  browserListQuery: 'last 5 chrome versions',
  operatingSystems: ['linux'],
};
HEADER_PRESETS.MODERN_WINDOWS = {
  ...HEADER_PRESETS.MODERN_DESKTOP,
  operatingSystems: ['windows'],
};
HEADER_PRESETS.MODERN_WINDOWS_FIREFOX = {
  browserListQuery: 'last 5 firefox versions',
  operatingSystems: ['windows'],
};
HEADER_PRESETS.MODERN_WINDOWS_CHROME = {
  browserListQuery: 'last 5 chrome versions',
  operatingSystems: ['windows'],
};
HEADER_PRESETS.MODERN_MACOS = {
  ...HEADER_PRESETS.MODERN_DESKTOP,
  operatingSystems: ['macos'],
};
HEADER_PRESETS.MODERN_MACOS_FIREFOX = {
  browserListQuery: 'last 5 firefox versions',
  operatingSystems: ['macos'],
};
HEADER_PRESETS.MODERN_MACOS_CHROME = {
  browserListQuery: 'last 5 chrome versions',
  operatingSystems: ['macos'],
};
HEADER_PRESETS.MODERN_ANDROID = {
  ...HEADER_PRESETS.MODERN_MOBILE,
  operatingSystems: ['android'],
};
