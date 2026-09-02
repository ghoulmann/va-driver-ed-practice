#!/usr/bin/env python3
"""Validate a commit message against the convention in CONTRIBUTING.md.

The convention exists so history can be ingested by tooling that never sees the
diff, and a convention nothing checks is a convention that drifts. This parses a
message the way such a reader would, and fails on what would make a section
unusable in isolation.

Usage:
    python tools/check_commit_message.py <file>
    git log -1 --format=%B | python tools/check_commit_message.py -

Install as a hook (not committed, local only):
    ln -s ../../tools/check_commit_message.py .git/hooks/commit-msg
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

TYPES = {"init", "feat", "fix", "content", "verify", "refactor",
         "test", "docs", "build", "ci"}

TRAILERS = {"Component", "Standards", "Authority", "Verification", "Breaking", "Refs"}

SYNOPSIS = re.compile(r"^\((?P<type>[a-z]+)\): (?P<text>.+)$")
FILE_HEADING = re.compile(r"^(?P<paths>[A-Za-z0-9._/-]+(?:, [A-Za-z0-9._/-]+)*):$")
TRAILER = re.compile(r"^(?P<key>[A-Z][A-Za-z-]*): (?P<value>.+)$")

# Bullets that could belong to any file are useless once retrieved alone.
VAGUE = re.compile(r"^- (also |various |misc|minor |small |some |update[sd]? it|"
                   r"see above|as above|and more)", re.I)


def parse(text):
    """Split a message the way an automated reader would."""
    lines = text.rstrip().split("\n")
    out = {"synopsis": None, "type": None, "rationale": [], "files": {}, "trailers": {}}

    match = SYNOPSIS.match(lines[0]) if lines else None
    if match:
        out["type"] = match.group("type")
        out["synopsis"] = match.group("text")

    # Trailers are the final block of Key: value lines.
    body = lines[1:]
    while body and TRAILER.match(body[-1]) and TRAILER.match(body[-1]).group("key") in TRAILERS:
        key, value = body.pop().split(": ", 1)
        out["trailers"][key] = value

    current = None
    for line in body:
        heading = FILE_HEADING.match(line)
        if heading and not TRAILER.match(line):
            current = heading.group("paths")
            out["files"][current] = []
        elif line.startswith("- ") and current:
            out["files"][current].append(line)
        elif line.strip() and current is None:
            out["rationale"].append(line)
    return out


def check(text):
    problems = []
    parsed = parse(text)
    lines = text.rstrip().split("\n")

    if not parsed["synopsis"]:
        problems.append("line 1 is not '(type): imperative synopsis'")
    else:
        if parsed["type"] not in TYPES:
            problems.append(
                f"unknown type '({parsed['type']})' — use one of: {', '.join(sorted(TYPES))}")
        if len(lines[0]) > 72:
            problems.append(f"synopsis line is {len(lines[0])} characters, over 72")
        if parsed["synopsis"].endswith("."):
            problems.append("synopsis ends with a period")
        if parsed["synopsis"][:1].isupper():
            problems.append("synopsis starts with a capital; use lower case after the colon")

    if len(lines) > 1 and lines[1].strip():
        problems.append("line 2 must be blank")

    if not parsed["rationale"]:
        problems.append("no rationale paragraphs — the reasoning is what survives retrieval")

    for paths, bullets in parsed["files"].items():
        if not bullets:
            problems.append(f"'{paths}:' has no bullets")
        for path in paths.split(", "):
            if not (ROOT / path).exists():
                problems.append(f"'{path}' does not exist in the tree")
        for bullet in bullets:
            if VAGUE.match(bullet):
                problems.append(f"vague bullet under '{paths}': {bullet[:60]}")

    for key in parsed["trailers"]:
        if key not in TRAILERS:
            problems.append(f"unknown trailer '{key}'")

    # Attribution arrives as a trailer (Co-authored-by, Signed-off-by, a
    # tool's own Something-Session: line) or as a "Generated with" footer.
    # Reject the shapes rather than a list of names, which would go stale.
    banned = re.findall(
        r"(?im)^(?:(?:co-authored-by|signed-off-by|generated-by|[a-z]+-session)\s*:"
        r"|generated (?:with|by) )", text)
    if banned:
        problems.append(f"attribution trailer or tooling reference present: {banned[0].strip()}")

    for i, line in enumerate(lines, 1):
        if len(line) > 100:
            problems.append(f"line {i} is {len(line)} characters; wrap prose at 80")

    return parsed, problems


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    text = sys.stdin.read() if sys.argv[1] == "-" else pathlib.Path(sys.argv[1]).read_text()
    # A commit-msg hook receives comments too.
    text = "\n".join(l for l in text.split("\n") if not l.startswith("#"))

    parsed, problems = check(text)

    print(f"type       {parsed['type']}")
    print(f"synopsis   {parsed['synopsis']}")
    print(f"rationale  {len(parsed['rationale'])} lines")
    print(f"files      {len(parsed['files'])} sections, "
          f"{sum(len(b) for b in parsed['files'].values())} bullets")
    for key, value in parsed["trailers"].items():
        print(f"  {key:<13}{value[:66]}")

    if problems:
        print(f"\n{len(problems)} problem(s):")
        for problem in problems:
            print(f"  - {problem}")
        return 1
    print("\nvalid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
