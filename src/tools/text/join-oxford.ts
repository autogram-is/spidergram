export function joinOxford(input: string[], conjunction = 'and'): string {
  if (input.length === 2) {
    return input.join(` ${conjunction} `);
  } else if (input.length > 2) {
    return input
      .slice(0, input.length - 1)
      .concat(`${conjunction} ${input.slice(-1)}`)
      .join(', ');
  } else {
    return input.join(', ');
  }
}
