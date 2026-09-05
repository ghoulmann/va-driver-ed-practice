# Contributing

Two rules govern everything here:

1. **No question ships whose answer has not been verified against a primary source.**
   Enforced by `tests/test_items.py`.
2. **No question reproduces an existing question verbatim.** Checked before a question
   reaches this repository, for reasons given under *The verbatim rule* below.

Everything else follows from those.

## Setup

Python 3.9 or newer, and Node 18 or newer for the engine suite. The application itself needs
neither — it is static files — but the checks and generators do.

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
```

## Running it

```bash
python -m http.server 8000   # from the repository root, then open http://localhost:8000/
```

Opening `index.html` from the filesystem will not work: the page fetches its JSON, and
browsers block that over `file://`.

```bash
pytest                # item bank gates; configuration lives in pyproject.toml
node tests/run.mjs    # adaptive engine assertions, headless
python -m pyflakes tools/*.py tests/test_items.py
```

`tests/engine.html` runs the same engine suite in a browser.

## Generated files

`data/taxonomy.json`, `data/resources.json`, and `dist/artifact.html` are generated. `dist/`
is not committed — rebuild it rather than expecting it in a clone.

```bash
python tools/build_taxonomy.py   # -> data/taxonomy.json
python tools/build_resources.py  # -> data/resources.json
python tools/build_artifact.py   # -> dist/artifact.html, the single-file bundle
```

## Authoring a question

A question ships only when `status` is `reviewed` **and** `accuracy.status` is `verified`.
Anything else stays in the file and is filtered out at load.

```json
{
  "id": "de10a-implied-consent-003",
  "concept": "de10a-implied-consent",
  "sol": ["DE.10a"],
  "region": "va",
  "form": "multiple_choice",
  "stem": "...",
  "options": [{ "id": "a", "text": "...", "rationale": "why this one is wrong" }],
  "answer": "c",
  "explanation": "...",
  "source": { "kind": "reauthored", "basis": "2026 law verification §3" },
  "accuracy": {
    "status": "verified",
    "verified_on": "2026-09-01",
    "authority": [{ "cite": "Va. Code § 46.2-861.1",
                    "url": "https://law.lis.virginia.gov/...",
                    "effective": "2023-07-01" }]
  },
  "status": "reviewed"
}
```

Forms: `multiple_choice`, `true_false`, and `ordering` (which uses `steps` and `answerOrder`
in place of `options`; each step is `{ "text": ..., "why": ... }`). Regions: `va` or `nova`.

**`concept` names the fact being tested**, and is the item id without its serial. Two items
with the same concept are variants: the same rule dressed in a different scenario, with the same
`sol[0]`. The engine never asks two variants in one session, so a concept can be re-tested
without the learner meeting the same question twice. Write a variant when a topic is thin, not
when you have a second fact -- a second fact is a second concept.

**`source.kind` says where the question came from.** `reauthored` means it restates something the
course that inspired this review tests, in new words; `module13` means it comes from the DMV's own
Module 13 material; `experiment` means it was written from a primary source that course does not
test against. An `experiment` item also carries `source.channel` -- `manual` (Virginia Driver's
Manual), `code` (Code of Virginia) or `sol` (the VDOE curriculum) -- and `source.citation`, the
chapter, section number or SOL id it rests on. The app labels these by their source so a learner
knows the question is inside the curriculum even if their own course never taught it, and a setting
lets them leave such questions out. The accuracy gate is the same for every kind.

**Every option needs a `rationale`, and every ordering step needs a `why`.** A wrong answer
should teach why it is wrong, not merely be marked wrong. Feedback addresses what the learner
did: the option they chose, the step they misplaced and where they put it. An explanation that
does not mention the learner's answer is not feedback, whatever else it explains.

### Sourcing

Primary sources only for legal facts: the Code of Virginia (`law.lis.virginia.gov`), the
Virginia DMV, VDOT, and the Virginia Department of Education. A secondary source may point
you at a change; it can never substantiate one.

Record the date the rule took force, not the date you read it. `tests/test_items.py` fails
any question whose `verified_on` is more than 365 days old, so the bank is re-checked rather
than left to rot.

If a fact cannot be confirmed, leave `accuracy.status` as `unverified` and do not ship it.
A gap is acceptable; a confident wrong answer is not. Record the gap in `backlog.md`.

### When law and that course disagree

Carry both answers:

```json
"answer": "c",
"course_answer": "b",
"divergence": "The course that inspired this review predates the 2023 amendment
               and still teaches the old rule."
```

The application shows both, because a learner whose course taught the old rule needs one answer to
drive by and another to pass by. `answer` is always what the law says. Name the origin in full on
first mention and as "that course" after; write "your course" only where the text addresses the
learner about their own course.

### The verbatim rule

Write questions in your own words. Use existing material only to establish what is
*testable* — never to establish how to phrase it.

**This rule is checked, but not in this repository.** Checking it here would require shipping
a description of the question bank being compared against — digests are enough to confirm
membership, so publishing them would disclose exactly what the rule exists to protect. The
comparison therefore runs where that material already is, before a question is brought over,
and it covers stems, options, and explanations rather than stems alone.

The consequence worth stating plainly: continuous integration cannot enforce this rule, so a
pull request adding a question relies on the author having run the check. Say in the pull
request that you did.

## Commit messages

Messages here are read twice: by a person reviewing the change, and by tooling — search,
changelog generation, model-assisted review — that ingests history without the diff beside
it. The second reader sets most of these rules, because it sees fragments rather than whole
messages.

```
(type): imperative synopsis

Rationale paragraphs — the design, the intent, the effect.

path/to/file.ext:

- specific change made in this file
- another change in this file

path/to/next-file.ext:

- specific change made in this file

Key: value
Key: value
```

Validate before committing:

```bash
python tools/check_commit_message.py <file>
git log -1 --format=%B | python tools/check_commit_message.py -
```

To check every commit automatically, install it as a local hook. This is deliberately not
committed, so it stays your choice:

```bash
ln -s ../../tools/check_commit_message.py .git/hooks/commit-msg
chmod +x tools/check_commit_message.py
```

### Synopsis

`(type):` from the closed vocabulary, then an imperative synopsis. Under 72 characters, lower
case after the colon, no trailing period.

Name the effect, not the mechanism: `(fix): stop the verbatim gate skipping when its data is
absent`, not `(fix): update test_items.py`.

### Types

The set is closed. A change fitting no type is usually a commit doing two things.

| Type | Use for |
|---|---|
| `init` | A repository or subsystem brought into existence |
| `feat` | New capability visible to someone using the application |
| `fix` | Corrected behaviour that was wrong |
| `content` | Questions, explanations, or taxonomy — the material itself |
| `verify` | Accuracy checks, sources, or the evidence behind content |
| `refactor` | Restructuring with no behavioural change |
| `test` | Tests and their fixtures |
| `docs` | Prose that is not shipped content |
| `build` | Tooling, generation scripts, packaging |
| `ci` | Workflow and deployment configuration |

### Rationale

Prose, not bullets. State the problem before the solution and give the effect in the present
tense. Include the numbers, dates, and citations that make a claim checkable — `§ 46.2-862`,
`2020-07-01`, `16 passed` — because those literals are what retrieval matches on.

Name the subject rather than referring back: "the verbatim gate", not "it". A paragraph
retrieved on its own must still make sense.

### File sections

One section per file, path exactly as it appears in the tree, colon on its own line. Bullets
describe changes **in that file only** and name the identifiers they touch — function,
constant, selector, key. A bullet that could belong to any file is too vague to retrieve.

Group files only when they change as one unit and every bullet applies to all of them.

### Trailers

Single-line `Key: value` pairs at the end, parseable by `git interpret-trailers`. Omit any
that do not apply.

| Trailer | Value |
|---|---|
| `Component` | `app`, `engine`, `data`, `tooling`, `ci`, `docs` — comma separated |
| `Standards` | Affected Standards of Learning, e.g. `DE.10a, DE.13a` |
| `Authority` | Statute or agency a content change rests on |
| `Verification` | Commands run and their result, e.g. `pytest tests/test_items.py: 16 passed` |
| `Breaking` | What breaks, and what to do about it |
| `Refs` | Issue or pull request this change answers |

No attribution trailers of any kind.

## Pull requests

Same reader, larger unit. Use these headings verbatim so sections can be extracted:

```markdown
## Summary

One paragraph: what changes, and why it is worth doing.

## Rationale

The argument. Problem, options considered, the choice and its cost.

## Changes

Per-file or per-area bullets, same rules as a commit body.

## Verification

Commands run and their output. State what was not tested.

## Risk

What could go wrong, what is reversible, what is not.
```

## Rules that exist for the automated reader

1. **No section depends on another to be understood.** Assume any section may be retrieved
   alone.
2. **Identifiers appear literally.** Write `passProbability()` and `data/items.json`, never
   "the scoring function" or "the item file".
3. **Numbers carry units and dates carry years.** `45 days`, `2025-01-01`, `16 passed`.
4. **One commit, one claim.** A message asserting two unrelated things can be neither
   classified, retrieved, nor reverted cleanly.
5. **Plain text only.** No ANSI, no emoji, no box drawing. Tables and fenced code are fine.
6. **State what was not done.** Absence of evidence is information: "the ordering questions
   were not exercised in a browser" is worth more than silence.

## Decisions

When a choice is made that a later reader would otherwise have to reconstruct — especially
one that looks arbitrary from the outside — put the reasoning in the commit's rationale
paragraphs. That is what they are for, and it keeps the argument attached to the change.
