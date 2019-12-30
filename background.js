// Written by Mike Frysinger <vapier@gmail.com>.
// Released into the public domain.

chrome.app.runtime.onLaunched.addListener(function() {
  // Load the theme settings here rather than in the page so they're available
  // asap for overriding.  This helps with initial theme loading/flashing.
  chrome.storage.sync.get(['theme'], (items) => {
    let theme = items['theme'];
    if (theme) {
      // Sanity check the values.
      if (theme != 'light' && theme != 'dark') {
        theme = undefined;
        chrome.storage.sync.remove('theme');
      }
    }

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: light)') ?
          'light' : 'dark';
    }

    const frame = theme == 'light' ? '#eee' : '#111';
    chrome.app.window.create(`main.html?theme=${theme}`, {
      frame: {
        color: frame,
      },
    });
  });
});
