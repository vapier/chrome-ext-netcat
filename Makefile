CLOSURE = \
	closure-compiler \
		--externs externs/chrome.js \
		--externs externs/chrome_extensions.js \
		--language_in ECMASCRIPT_2019 \
		--language_out ECMASCRIPT_2019 \
		--compilation_level SIMPLE
YUICOMPRESSOR = yuicompressor

all:

%.js.min: %.js
	$(CLOSURE) $< $(CLOSURE_$@) > $@

JS_FILES = $(shell grep '[.]js$$' manifest.files)
CLOSURE_main.js.min = ./js/
js-min: $(JS_FILES:=.min)

%.css.min: %.css
	$(YUICOMPRESSOR) $< > $@

CSS_FILES = $(shell grep '[.]css$$' manifest.files)
css-min: $(CSS_FILES:=.min)

check: css-min js-min

clean:
	rm -f css/*.css.min js/*.js.min *.js.min

dist:
	./makedist.sh

.PHONY: all clean check css-min dist js-min
