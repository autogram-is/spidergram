import readabilityScores from 'readability-scores';
import nlp from 'compromise';
import Three from 'compromise/types/view/three';

export function oxfordJoin(input: string[], conjunction = 'and'): string {
  if (input.length === 2) {
    return input.join(` ${conjunction} `);
  } else if (input.length > 2) {
    return input.slice(0, input.length - 1)
      .concat(`${conjunction} ${input.slice(-1)}`)
      .join(', ');
  } else {
    return input.join(', ');
  }
}

export interface NamedEntityOptions {
  people: boolean,
  places: boolean,
  organizations: boolean
};

export function findNamedEntities(text: string | Three, options: Partial<NamedEntityOptions> = {}) {
  const doc = (typeof text === 'string') ? nlp(text) : text;
  const results: Record<string, string[]> = {};
  if (options.people !== false) results.people = doc.people().unique().out('array');
  if (options.places !== false) results.places = doc.places().unique().out('array');
  if (options.organizations !== false) results.organizations = doc.organizations().unique().out('array');
  return results;
}

export const calculateReadability = readabilityScores;
