export function parseElementsToArray($: cheerio.Root, tag: string) {
  const results: Record<string, string | undefined>[] = [];
  
  $(tag).toArray().forEach(element => {
    const content = $(element).html()?.trim() ?? undefined;
    const attributes = $(element).attr();
    for (const [key, value] of Object.entries(attributes)) {
      if (value === '') attributes[key] = "true";
    }
    if (content) attributes.content = content;
    results.push(attributes);
  });

  return results;
}

export function parseElementsToDictionary($: cheerio.Root, tag: string, key: string, defaultKey = 'none') {
  const results: Record<string, Record<string, string | undefined>[]> = {};
  for (const result of parseElementsToArray($, tag)) {
    const keyValue = result[key] ?? defaultKey;
    delete result[key];

    results[keyValue] ??= [];
    results[keyValue].push(result);
  }
  return results;
}