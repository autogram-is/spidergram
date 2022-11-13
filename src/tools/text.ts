import readabilityScores from 'readability-scores';
import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';

let nlp: ReturnType<typeof winkNLP> | undefined;

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

export function getSentiment(input: string) {
  if (nlp === undefined) {
    nlp = winkNLP(model);
  }
  return nlp.readDoc(input).out(nlp.its.sentiment);
}

export function getReadingStats(input: string) {
  if (nlp === undefined) {
    nlp = winkNLP(model);
  }
  return nlp.readDoc(input).out(nlp.its.readabilityStats);
}

export const calculateReadability = readabilityScores;
