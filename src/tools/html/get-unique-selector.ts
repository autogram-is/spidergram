// Adapted from https://github.com/bertyhell/cheerio-get-css-selector

export function getUniqueSelector(
  element: cheerio.Element,
  $: cheerio.Root,
) {
  const parents = $(element).parents();
  if (!parents[0]) {
    // Element doesn't have any parents
    return ':root';
  }
  let selector = getElementSelector(element, $);
  let i = 0;
  let elementSelector;

  if (selector[0] === '#' || selector === 'body') {
    return selector;
  }

  do {
    elementSelector = getElementSelector(parents[i], $);
    selector = elementSelector + ' > ' + selector;
    i++;
  } while (i < parents.length - 1 && elementSelector[0] !== '#'); // Stop before we reach the html element parent
  return selector;
}

function getElementSelector(
  element: cheerio.Element,
  $: cheerio.Root,    
): string {
  const el = $(element);
  if (el.attr('id')) {
    return '#' + el.attr('id');
  } else {
    const tagName = el.get(0).tagName;
    if (tagName === 'body') {
      return tagName;
    }
    if (el.siblings().length === 0) {
      return el.get(0).tagName;
    }
    if (el.index() === 0) {
      return el.get(0).tagName + ':first-child';
    }
    if (el.index() === el.siblings().length){
      return el.get(0).tagName + ':last-child';
    }
    return el.get(0).tagName+ ':nth-child(' + (el.index() + 1) + ')';
  }
}
