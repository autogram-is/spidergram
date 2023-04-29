import {
  Relationship,
  RelationshipConstructorOptions,
  Entity,
  Reference,
  Resource,
  Pattern,
} from '../index.js';

export interface AppearsOnConstructorOptions
  extends RelationshipConstructorOptions<Pattern, Resource> {
  page?: Reference<Resource>;
  pattern?: Reference<Pattern>;
}

export class AppearsOn extends Relationship<Pattern, Resource> {
  readonly _collection = 'appears_on';

  constructor(data: AppearsOnConstructorOptions = {}) {
    const { page, pattern, ...dataForSuper } = data;

    dataForSuper.from ??= pattern;
    dataForSuper.to ??= page;

    super(dataForSuper);
  }
}

Entity.types.set('appears_on', {
  constructor: AppearsOn,
  isRelationship: true,
});
