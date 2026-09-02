#!/usr/bin/env python3
"""Bundle the app into a single self-contained HTML file.

The published artifact is one file with no network access to its own assets, so
the CSS, the ES modules, the JSON data, and the attribution fragment all have to
travel inside it. Nothing is rewritten by hand: this reads the same sources the
static site serves, so the two cannot drift.

Module flattening: each ES module becomes an entry in a small registry object,
with its `import` lines rewritten to read from that registry and its `export`
keywords stripped. Order is dependency order, listed below.

Output is a fragment, not a document -- the artifact host supplies the doctype,
<html>, <head>, and <body> wrapper, so emitting them here would nest documents.
"""

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT
OUT = ROOT / "dist" / "artifact.html"

MODULES = ["bkt", "elo", "select", "session", "store", "credits", "ui"]
DATA = ["items", "taxonomy", "resources"]

FONTS = ("https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700"
         "&family=Source+Sans+3:wght@400;600&family=IBM+Plex+Mono:wght@500;600&display=swap")


def flatten(name):
    """Rewrite one ES module into a registry entry."""
    src = (APP / "js" / f"{name}.js").read_text()

    # import * as alias from './mod.js';  ->  const alias = __M['mod'];
    src = re.sub(r"^import \* as (\w+) from '\./(\w+)\.js';$",
                 r"const \1 = __M['\2'];", src, flags=re.M)
    # import { a, b } from './mod.js';    ->  const { a, b } = __M['mod'];
    src = re.sub(r"^import \{([^}]+)\} from '\./(\w+)\.js';$",
                 r"const {\1} = __M['\2'];", src, flags=re.M)

    exported = set()
    exported.update(re.findall(r"^export (?:async )?function (\w+)", src, flags=re.M))
    exported.update(re.findall(r"^export const (\w+)", src, flags=re.M))
    if re.search(r"^import\b", src, flags=re.M):
        raise SystemExit(f"{name}.js: an import survived flattening — check its form")

    src = re.sub(r"^export ", "", src, flags=re.M)
    returns = ", ".join(sorted(exported))
    return f"__M['{name}'] = (() => {{\n{src}\nreturn {{ {returns} }};\n}})();"


def build():
    css = (APP / "styles.css").read_text()
    ip_html = (APP / "credits.ip.html").read_text()
    data = {name: json.loads((APP / "data" / f"{name}.json").read_text()) for name in DATA}
    data["ipHtml"] = ip_html

    body = (APP / "index.html").read_text()
    body = body[body.index("<header"):body.index("</main>") + len("</main>")]

    modules = "\n\n".join(flatten(name) for name in MODULES)

    return f"""<title>Virginia Road Rules Trainer</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>
{css}
</style>

{body}

<footer class="chrome">
  <p>Practice tool, not legal advice. Not affiliated with any driving school, with the
    Virginia Department of Motor Vehicles, or with the Commonwealth of Virginia.
    Progress is stored only in this browser.</p>
</footer>

<script type="application/json" id="app-data">
{json.dumps(data, ensure_ascii=False)}
</script>

<script type="module">
globalThis.__APP_DATA = JSON.parse(document.getElementById('app-data').textContent);

// Flattened ES modules, in dependency order.
const __M = {{}};

{modules}
</script>
"""


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = build()
    OUT.write_text(html)
    kb = len(html.encode()) / 1024
    print(f"{OUT}: {kb:.0f} KB, {len(MODULES)} modules, {len(DATA)} data files inlined")


if __name__ == "__main__":
    main()
