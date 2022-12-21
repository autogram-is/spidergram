import * as htmlparser2 from 'htmlparser2';
import { Handler, Result as HtmlMetaResult, ResultHtml } from 'htmlmetaparser';
import { Resource } from '../../model/index.js';

type MetadataResponse = Omit<HtmlMetaResult, 'links' | 'images'> & {
  head?: ResultHtml;
};
export async function getMetadata(input: string | Resource) {
  const html = typeof input === 'string' ? input : input.body ?? '';
  const url = input instanceof Resource ? input.url : input ?? '';

  let output: HtmlMetaResult | undefined;

  // We're using destructuring to pull variables out of the results
  // that we never want to use; there's probably a cleaner way of dealing with
  // this, buuuuut…
  
  /* eslint-disable @typescript-eslint/no-unused-vars */
  return new Promise<MetadataResponse>((resolve, reject) => {
    const handler = new Handler(
      (err, result) => {
        if (err instanceof Error) reject(err);
        const { html, links, images, ...remainder } = result;
        resolve({ head: html, ...remainder });
      },
      { url },
    );

    const parser = new htmlparser2.Parser(handler, { decodeEntities: true });
    parser.write(html);
    parser.end();

    if (output === undefined) {
      throw new Error('Could not parse document.');
    } else {
      const { html, links, images, ...remainder } = output;
      return {
        meta: html,
        ...remainder,
      };
      return output;
    }
  });
  /* eslint-enable no-unused-vars */
}