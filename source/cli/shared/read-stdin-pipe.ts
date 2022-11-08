// Yoinked from https://github.com/Yukaii/pipe-demo

/**
 * Pulls data from stdin for use as an argument value.
 *
 * @example
 * const str = await readStdinPipe();
 *
 *  if (str) {
 *     this.log(str);
 *   } else {
 *     this.log('Nothing piped in!');
 *   }
 * }
 *
 * @returns Promise<string>
 */
export const readStdinPipe: () => Promise<string | undefined> = () => {
  return new Promise(resolve => {
    const stdin = process.openStdin();
    stdin.setEncoding('utf-8');

    let data = '';
    stdin.on('data', chunk => {
      data += chunk;
    })

    stdin.on('end', () => {
      resolve(data);
    })

    if (stdin.isTTY) {
      resolve('');
    }
  })
}
