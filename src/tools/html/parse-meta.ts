import _ from 'lodash';

export type MetaValues = Record<string, string | string[]>;

type Tag = Record<string, unknown> & {
  name?: string,
  itemprop?: string,
  property?: string,
  content?: string
}

type metaParseOptions = {
  arrayMetaTags?: string[],
}

const defaultMetaParseOptions = {
  arrayMetaTags: ['keywords', 'field_category'],
}

export function parseMetatags(tags: Tag[], customOptions: metaParseOptions = {}): MetaValues {
  const options = _.defaultsDeep(customOptions, defaultMetaParseOptions);
  const output: Record<string, string | string[]> = {};

  for (const tag of tags) {
    if (tag.content) {
      const key = tag.name ?? tag.property ?? tag.itemprop;
      if (key !== undefined) {
        const path = key.split(':');
        if (options.arrayMetaTags?.includes(key.toLocaleLowerCase())) {
          const existingValues  = _.get(output, key) ?? [];
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