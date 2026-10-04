#!/usr/bin/env python3
"""Bundle the dashboard into single HTML files that open anywhere, no server needed.

    python3 scripts/build.py

Writes:
  dist/cozy-market-atlas.html   standalone page (double-click to open, email it, host it)
  dist/artifact.html            the same page without the <html>/<head>/<body> wrapper,
                                for publishing as a claude.ai Artifact
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
DATA_FILES = {
    "meta": "meta.json", "market": "market.json", "games": "games.json", "niches": "niches.json",
    "playbook": "playbook.json", "insights": "insights.json", "concepts": "concepts.json", "live": "live/steam.json",
    "gotomarket": "gotomarket.json", "verification": "verification.json", "culture": "culture.json", "ideation": "ideation.json", "genres": "genres.json",
}


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def script_safe(text):
    # keep "</script>" inside inlined code or data from closing the tag early
    return text.replace("</", "<\\/")


def main():
    html = read("index.html")
    html = html.replace('<link rel="stylesheet" href="css/styles.css">', "<style>\n" + read("css/styles.css") + "\n</style>")
    html = re.sub(r'<script src="(js/[^"]+)"></script>',
                  lambda m: "<script>\n" + script_safe(read(m.group(1))) + "\n</script>", html)
    data = {}
    for key, name in DATA_FILES.items():
        path = ROOT / "data" / name
        data[key] = json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
    blob = script_safe(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    html = html.replace("<!-- ATLAS:DATA -->", "<script>window.__ATLAS_DATA__ = " + blob + ";</script>")

    DIST.mkdir(exist_ok=True)
    (DIST / "cozy-market-atlas.html").write_text(html, encoding="utf-8")

    frag = html
    for pat in (r"<!doctype html>\s*", r"<html[^>]*>\s*", r"\s*</html>", r"<head>\s*", r"\s*</head>", r"<body>\s*",
                r"\s*</body>", r'<meta charset="utf-8">\s*', r'<meta name="viewport"[^>]*>\s*'):
        frag = re.sub(pat, "", frag, count=1, flags=re.I)
    (DIST / "artifact.html").write_text(frag, encoding="utf-8")
    kb = len(html.encode()) // 1024
    print(f"Built dist/cozy-market-atlas.html and dist/artifact.html ({kb} KB)")


if __name__ == "__main__":
    main()
