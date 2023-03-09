import { default as inquirer, Answers, QuestionCollection } from 'inquirer';
export * from 'inquirer';

/**
 * Prompt user for information. See https://www.npmjs.com/package/inquirer for details.
 */
export async function prompt<T extends Answers = Answers>(
  questions: QuestionCollection<T>,
  initialAnswers?: Partial<T>,
) {
  return inquirer.prompt<T>(questions, initialAnswers);
}

/**
 * Prompt user for information with a timeout (in milliseconds). See https://www.npmjs.com/package/inquirer for more.
 */
// eslint-disable-next-line class-methods-use-this
export async function timedPrompt<T extends Answers>(
  questions: QuestionCollection<T>,
  ms = 20_000,
  initialAnswers?: Partial<T>,
): Promise<T> {
  let id: NodeJS.Timeout;
  const thePrompt = prompt<T>(questions, initialAnswers);
  const timeout = new Promise((_, reject) => {
    id = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      thePrompt.ui['activePrompt'].done();
      reject(new Error(`Timed out after ${ms} ms.`));
    }, ms).unref();
  });

  return Promise.race([timeout, thePrompt]).then(result => {
    clearTimeout(id);
    return result as T;
  });
}

/**
 * Simplified prompt for single-question confirmation.
 * 
 * If the `timeout` parameter is set, the prompt will automatically dismiss
 * itself after the specified number of miliseconds, using the `initial` parameter
 * as its final answer.
 */
export async function confirm(
  message: string,
  initial = true,
  timeout?: number | undefined
): Promise<boolean> {
  if (timeout === undefined) {
    return prompt<{ confirmed: boolean }>(
      [{ name: 'confirmed', message, default: initial, type: 'confirm' }],
    ).then(result => result.confirmed);
  } else {
    return timedPrompt<{ confirmed: boolean }>(
      [{ name: 'confirmed', message, type: 'confirm' }], timeout,
    ).then(result => result.confirmed);
  }
}
