const input = document.querySelector('#query');
const results = document.querySelector('#search-results');
const query = new URLSearchParams(location.search).get('q')?.trim() || '';
if (query) input.value = query;

function result(item) {
  const article = document.createElement('article');
  const date = document.createElement('time');
  date.textContent = item.date;
  const title = document.createElement('h2');
  const link = document.createElement('a');
  link.href = item.url;
  link.textContent = item.title;
  title.append(link);
  const description = document.createElement('p');
  description.textContent = item.description;
  article.append(date, title, description);
  return article;
}

if (query) {
  fetch('/search-index.json').then(response => response.json()).then(items => {
    const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const matches = items.filter(item => words.every(word => `${item.title} ${item.description} ${item.text}`.toLocaleLowerCase().includes(word))).slice(0, 40);
    results.replaceChildren();
    const summary = document.createElement('p');
    summary.textContent = `${matches.length} result${matches.length === 1 ? '' : 's'} for “${query}”${matches.length === 40 ? ' (showing first 40)' : ''}`;
    results.append(summary, ...matches.map(result));
  }).catch(() => { results.textContent = 'Search is temporarily unavailable. Browse all articles instead.'; });
} else {
  results.textContent = 'Enter a word or phrase to search the archive.';
}
