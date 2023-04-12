import {
  Relationship,
  RelationshipConstructorOptions,
  Entity,
  Reference,
  Resource,
  Pattern
} from '../index.js';

export interface PatternInstanceConstructorOptions extends RelationshipConstructorOptions<Resource, Pattern> {
  page?: Reference<Resource>;
  pattern?: Reference<Pattern>;
}

export class PatternInstance extends Relationship<Resource, Pattern> {
  readonly _collection = 'pattern_instance';

  constructor(data: PatternInstanceConstructorOptions = {}) {
    const { page, pattern, ...dataForSuper } = data;

    dataForSuper.from ??= page;
    dataForSuper.to ??= pattern;

    super(dataForSuper);
  }
}

Entity.types.set('pattern_instance', {
  constructor: PatternInstance,
  isRelationship: true,
});
