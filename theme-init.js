// Written by Mike Frysinger <vapier@gmail.com>.
// Released into the public domain.

// Grab the theme override from the query string if it's available, then load it
// immediately.  This helps with initial loading/flashing.
const params = new URLSearchParams(document.location.search);
const theme = params.get('theme');
if (theme == 'light' || theme == 'dark') {
  const css = document.querySelector('link#theme-override');
  css.href = `css/${theme}.css`;
}
