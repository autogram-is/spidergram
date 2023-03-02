import _ from 'lodash';

export type MetaValues = Record<string, string | string[]>;

type Tag = Record<string, unknown> & {
  name?: string;
  itemprop?: string;
  property?: string;
  content?: string;
};

type MetaTagOptions = {
  hierarchyMarker?: string | RegExp;
  arrayTags?: string[];
};

const defaults: MetaTagOptions = {
  hierarchyMarker: /[.:]/,
  arrayTags: ['keywords'],
};

export function parseMetaTags(
  tags: Tag[],
  customOptions: MetaTagOptions = {},
): MetaValues {
  const options = _.defaultsDeep(customOptions, defaults);
  const output: Record<string, string | string[]> = {};

  for (const tag of tags) {
    if (tag.content) {
      const key = tag.name ?? tag.property ?? tag.itemprop;
      if (key !== undefined) {
        const path = key.split(options.hierarchyMarker);
        if (options.arrayMetaTags?.includes(key.toLocaleLowerCase())) {
          const existingValues = _.get(output, key) ?? [];
          const newValues = tag.content.split(',').map(v => v.trim());
          _.set(output, path, [...existingValues, ...newValues]);
        } else {
          _.set(output, path, tag.content);
        }
      } else if (tag['http-equiv']) {
        const path = ['http-equiv', tag['http-equiv'].toString()];
        _.set(output, path, tag.content);
      }
    } else if (tag.charset) {
      _.set(output, 'charset', tag['charset']);
    }
  }

  return output;
}
