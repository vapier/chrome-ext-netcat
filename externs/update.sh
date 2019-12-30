#!/bin/sh
rm -f chrome.js chrome_extensions.js
wget https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/chrome.js
wget https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/chrome_extensions.js
