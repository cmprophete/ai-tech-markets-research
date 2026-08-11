#!/usr/bin/env python3
"""
build.py -- assemble the site's HTML pages from src/.

    python3 build.py            write every page
    python3 build.py --check    verify only; exit 1 if a rebuild would change one

index.html is a GENERATED FILE. It stays committed, because GitHub Pages serves
it and the WordPress embed loads it as one self-contained document, but it is
never the thing you edit. Edit src/ and rebuild.

    index.html   the whole site, in one self-contained document

Where to edit:
    a number      ->  nowhere. Rerun its contract: Rscript analysis/run.R <name>
                      (never hand-edit data/*.js)
    prose         ->  src/views/<view>.html
    styling       ->  src/styles/<area>.css
    app behaviour ->  src/js/<area>.js

The format is deliberately dumb: src/index.template.html holds every structural
line of the original file, and one directive per extracted block,

    @@include src/styles/tokens.css@@

alone on a line, replaced by that file's exact bytes. No templating language, no
variables, no conditionals, no bundler, no npm. If you want to know what the
build does, this file is 70 lines and there is nothing behind it.

Ordering is significant and is the template's job, not this script's: CSS
cascade order and the JS execution order inside the app IIFE are both just the
order the directives appear.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent

# template -> output. Add a page by adding a row.
TARGETS = [
    ("src/index.template.html", "index.html"),
]

INCLUDE = re.compile(r"^[ \t]*@@include[ \t]+(\S+)[ \t]*@@[ \t]*\r?\n?$")


def expand(path: pathlib.Path, stack: tuple = ()) -> list:
    """Return path's lines with every @@include@@ directive replaced in place."""
    if path in stack:
        chain = " -> ".join(p.name for p in stack + (path,))
        sys.exit(f"build.py: include cycle: {chain}")
    if not path.exists():
        sys.exit(f"build.py: missing input {path.relative_to(ROOT)}")

    out = []
    with open(path, "r", encoding="utf-8", newline="") as fh:
        for lineno, line in enumerate(fh, 1):
            m = INCLUDE.match(line)
            if m is None:
                out.append(line)
                continue
            target = ROOT / m.group(1)
            try:
                target.relative_to(ROOT)
            except ValueError:
                sys.exit(f"build.py: {path.name}:{lineno}: include escapes the repo")
            out.extend(expand(target, stack + (path,)))
    return out


def main() -> int:
    check = "--check" in sys.argv[1:]
    if set(sys.argv[1:]) - {"--check"}:
        sys.exit(f"build.py: unknown argument\n\n{__doc__.strip()}")

    stale = []
    for template, output in TARGETS:
        built = "".join(expand(ROOT / template))
        out = ROOT / output

        if check:
            current = out.read_text(encoding="utf-8") if out.exists() else None
            if current == built:
                print(f"  ok     {output} ({len(built.splitlines())} lines)")
            else:
                stale.append(output)
                print(f"  STALE  {output}")
            continue

        with open(out, "w", encoding="utf-8", newline="") as fh:
            fh.write(built)
        print(f"  wrote  {output} ({len(built.splitlines())} lines, "
              f"{len(built.encode('utf-8'))} bytes)")

    if stale:
        print("\nbuild.py --check: " + ", ".join(stale) +
              " does not match a fresh build of src/.\n"
              "  Either src/ changed and the page was not rebuilt, or the page was\n"
              "  hand-edited and those edits are about to be lost.\n"
              "  Inspect first (`git diff " + stale[0] + "`), then: python3 build.py",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
