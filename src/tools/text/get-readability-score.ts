import readabilityScores from 'readability-scores';
import _ from 'lodash';

export interface ReadabilityScore extends Record<string, unknown> {
	words?: number
	sentences?: number
  difficultWords?: string[];
  score?: number;
  formula?: string;
}

export interface ReadabilityScoreOptions {
  stats?: boolean;
  difficultWords?: boolean;
  formula?: 'ARI' | 'DaleChall' | 'ColemanLiau' | 'FleschKincaid' | 'GunningFog' | 'SMOG' | 'Spache';
}

const defaults: Required<ReadabilityScoreOptions> = {
  stats: true,
  difficultWords: true,
  formula: 'FleschKincaid'
}

export function getReadabilityScore(input: string, customOptions: ReadabilityScoreOptions = {}) {
  const options: Required<ReadabilityScoreOptions> = _.defaultsDeep(customOptions, defaults);
  const results: ReadabilityScore = { formula: options.formula };

  const scoreConfig: Record<string, boolean> = {
    difficultWords: options.difficultWords
  };
  scoreConfig[`${options.formula}`] = true;
  const rawScores = readabilityScores(input, scoreConfig);
  
  switch (options.formula) {
    case 'ARI':
      results.score = rawScores.ari;
      break;
    case 'ColemanLiau':
      results.score = rawScores.colemanLiau;
      break;
    case 'DaleChall':
      results.score = rawScores.daleChall;
      if (options.difficultWords) results.difficultWords = rawScores.daleChallDifficultWords;
      break;
    case 'FleschKincaid':
      // We calculate the Reading Level rather than the Grade Level.
      // See https://github.com/words/flesch for a standalone implementation.
      results.score = 206.835 - 1.015 * (rawScores.wordCount / rawScores.sentenceCount) - 84.6 * (rawScores.syllableCount / rawScores.wordCount)
      results.score = Number.parseFloat(results.score.toPrecision(1));
      break;
    case 'GunningFog':
      results.score = rawScores.gunningFog;
      break;
    case 'SMOG':
      results.score = rawScores.smog;
      break;
    case 'Spache':
      results.score = rawScores.spache;
      if (options.difficultWords) results.difficultWords = rawScores.spacheUniqueUnfamiliarWords;
      break;
  }

  if (options.stats) {
    results.words = rawScores.wordCount;
    results.sentences = rawScores.sentenceCount;
  }

  return results;
}