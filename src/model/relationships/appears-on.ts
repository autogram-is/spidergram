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

  protected override keySeed(): unknown {
    return {
      from: this._from,
      label: this.label,
      selector: this?.uniqueSelector,
      to: this._to,
    };
  }
}

Entity.types.set('appears_on', {
  constructor: AppearsOn,
  isRelationship: true,
});
