import { aql } from "arangojs";
import { GeneratedAqlQuery, literal } from "arangojs/aql.js";

export const enum AggregateFunction {
  group = 'GROUP',
  distinct = 'COUNT_DISTINCT',
  nonempty = 'COUNT_NONEMPTY',
  empty = 'COUNT_EMPTY',
  min = 'MIN',
  max = 'MAX',
  sum = 'SUM',
  avg = 'AVG'
}

export interface PropertyDescriptor {
  /**
   * The dot-notation path of a given JSON document property; individual
   * entries in arrays can be referenced using array notation.
   * 
   * @example A simple property reference
   * `{ property: 'title' }`
   * 
   * @example A nested property with custom label
   * `{ property: 'metadata.headline', label: 'headline' }`
   * 
   * @example An item from a nested array, and a custom label
   * `{ property: 'children[0].title', label: 'firstborn' }`
   */
  property: string;

  /**
   * A label to be used when returning or displaying the property. If
   * no label is specified, one will be generated by sanitizing the
   * property name itelf.
   */
  label?: string;


  /**
   * If a custom Filter is being used to add additional collections to 
   * the query, this property specifies the record the property is
   * located on.
   *
   * @defaultValue `item`
   */
  prefix?: string;

  /**
   * Whether the property contains a numeric value.
   * 
   * @remarks
   * Aggregates other than group and distinct, empty, and nonempty
   * will operate on the property value's LENGTH.
   * 
   * @defaultValue `false`
   */
  numeric?: boolean

  /**
   * The aggregate function to use when summarizing this property.
   * 
   * @defaultValue `AggregateFunction.nonempty` 
   */
  function?: AggregateFunction;
}

/**
 * Options for the {@link getPropertySummary} report
 */
export interface PropertySummaryOptions {
  /**
   * A list of document properties to summarize
   */
  properties: (string | PropertyDescriptor)[];

  /**
   * A list of document properties to group by; adding a groupBy property 
   * is equivalent to adding a property with its `function` set to 'GROUP'.
   */
  groupBy?: (string | PropertyDescriptor)[];

  /**
   * A fully-constructed AQL filter clause; if necessary, this clause can
   * also include other collections.
   *
   * @remarks
   * The current item of the query's 'core' collection will always
   * be named `item`, and will be returned directly from the collection.
   * If your query needs to construct a custom return document, consider
   * the Query class instead of this one.
   *
   * @example
   * const options = {
   *   aqlFilter = aql`FILTER item.someProperty IN [0, 1, 2]`
   * }
   */
  customFilter?: GeneratedAqlQuery;

  /**
   * Include the total number of records in addition to the aggregate
   * values. This is equivalent to adding a dummy 'total = COUNT(1)`
   * to the query properties.
   *
   * @defaultValue `true`
   */
  includeTotal?: boolean
}

/**
 * Summarizes the range of values in specific properties of an Arango collection.
 */
export function getPropertySummary(collection: string, options: PropertySummaryOptions) {
  const properties: Record<string, PropertyDescriptor> = {};
  
  for (const input of options.groupBy ?? []) {
    const prop = toProperty(input, { function: AggregateFunction.group, force: true });
    properties[prop.property] = prop;
  }

  for (const input of options.properties ?? []) {
    const prop = toProperty(input, { function: AggregateFunction.nonempty, force: false });
    properties[prop.property] = prop;
  }

  const groups: GeneratedAqlQuery[] = [];
  const aggregates: GeneratedAqlQuery[] = [];
  const flags: GeneratedAqlQuery[] = [];

  for (const [path, property] of Object.entries(properties)) {
    const key = literal(property.prefix + '.' + path);
    const label = literal(property.label);
    const flagLabel = literal('flag_' + property.label);

    switch(property.function) {
      case AggregateFunction.group: {
        groups.push(aql`${label} = ${key}`);
        break;
      }
      
      case AggregateFunction.empty: {
        flags.push(aql`${flagLabel} = (${key} == null) ? 1 : 0`);
        aggregates.push(aql`${label} = SUM(${flagLabel})`);  
        break;
      }

      case AggregateFunction.nonempty: {
        flags.push(aql`${flagLabel} = (${key} != null) ? 1 : 0`);
        aggregates.push(aql`${label} = SUM(${flagLabel})`);  
        break;
      }

      case AggregateFunction.distinct: {
        aggregates.push(aql`${label} = COUNT_DISTINCT(${key})`);  
        break;
      }

      case AggregateFunction.min: {
        if (property.numeric) {
          aggregates.push(aql`${label} = MIN(${key})`);  
        } else {
          aggregates.push(aql`${label} = MIN(LENGTH(${key}))`);  
        }
        break;
      }

      case AggregateFunction.max: {
        if (property.numeric) {
          aggregates.push(aql`${label} = MAX(${key})`);  
        } else {
          aggregates.push(aql`${label} = MAX(LENGTH(${key}))`);  
        }
        break;
      }

      case AggregateFunction.sum: {
        if (property.numeric) {
          aggregates.push(aql`${label} = SUM(${key})`);  
        } else {
          aggregates.push(aql`${label} = SUM(LENGTH(${key}))`);  
        }
        break;
      }

      case AggregateFunction.avg: {
        if (property.numeric) {
          aggregates.push(aql`${label} = AVG(${key})`);  
        } else {
          aggregates.push(aql`${label} = AVG(LENGTH(${key}))`);  
        }
        break;
      }
    }
  }

  const returnProperties = Object.values(properties).map(prop => prop.label);

  if (options.includeTotal !== false) {
    aggregates.push(aql`total = COUNT(1)`);
    returnProperties.push('total');
  }

  const letClause = arrayToClause('LET', flags);
  const collectClause = arrayToClause('COLLECT', groups, false);
  const aggregateClause = arrayToClause('AGGREGATE', aggregates);
  const returnClause = literal(returnProperties.join(', '));

  const query = aql`
    FOR item IN ${literal(collection)}
    ${options.customFilter}
    ${letClause}
    ${collectClause}
    ${aggregateClause}
    RETURN { ${returnClause} }
  `;

  return query;
}

type ToPropertyOptions = {
  function?: AggregateFunction,
  force?: boolean
}

function toProperty(input: string | PropertyDescriptor, options: ToPropertyOptions = {}) {
  if (typeof input === 'string') {
    return {
      property: input,
      label: sanitizeLabel(input),
      function: options.function,
      prefix: 'item',
    }
  } else {
    if (options.force || input.function === undefined) {
      input.function = options.function;
    }
    input.prefix ??= 'item';
    input.label = sanitizeLabel(input.label ?? input.property);
    return input;
  }
}

function sanitizeLabel(input: string) {
  return input.replaceAll('.', '_').replaceAll('[', '_').replaceAll(']', '_');
}

function arrayToClause(section: string, clauses: GeneratedAqlQuery[], rejectEmpty = true) {
  if (clauses.length || rejectEmpty === false) {
    return literal(`${section} ${clauses.map(q => q.query).join(', ')}`);
  } else {
    return undefined;
  }
}