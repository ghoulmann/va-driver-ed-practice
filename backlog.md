# Backlog

## Blocked

- **Northern Virginia items need sources.** VDOE Module 13 has no Northern Virginia content.
  Verified facts so far are in `research/2026-law-verification.md` §11.
  Needed before authoring: current HOV occupancy and hours per facility from VDOT, PD-8 penalty
  escalation from §33.2-501, and the E-ZPass Flex requirement. Everything else NoVA-flavoured
  (interchange density, left exits, sustained work zones) needs a citable source or it does not
  ship.
- **`credits.ip.html` content.** Owned by the repository owner (D7). The attribution fragment
  ships as a scaffold until then.

## Open questions needing a primary source

Carried from the gap list in `research/2026-law-verification.md`. Do not write questions on these:

- Knowledge-test and road-skills waivers when exchanging a valid out-of-state or foreign license.
  DMV's eligibility page is silent; no statute found. US-state and foreign reciprocity reportedly
  differ.
- The substance of four 2026 amendments — c. 518 (§46.2-818.2), c. 93/HB 230 (§46.2-1094),
  c. 132/HB 409 (§46.2-859), c. 1112 (DUI). LIS bill pages render via JavaScript. The statutory
  text as published is reliable; only the what-changed attribution is open.
- Which provisions of the 2026 speed-camera acts have delayed effective dates.
- The penalty amount under §46.2-1156.1 for transporting an under-16 in a truck bed.

## Question authoring queue

Work is queued by what a question needs, not by where it came from.

- [ ] **Retire the structurally unsound.** Some question forms cannot be fixed by correcting a
      number: options that are logically nested so more than one is true, questions with two
      defensible answers, and forward-looking or preference claims graded as fact. Replace them
      rather than repair them.
- [ ] **Author reconciling pairs together.** Where two questions test steering or traction
      responses that differ by situation, write them as a pair and state the distinguishing
      condition explicitly. Split across a bank, they teach a contradiction.
- [ ] **Licensing, fees, ages, and holding periods.** The densest concentration of numbers a
      legislature can change, and therefore the highest-yield area to verify and cover.
- [ ] **Signalling distance.** Virginia's rule is tiered — 50 feet, rising to 100 feet above
      35 mph — and is commonly taught as a flat 100.
- [ ] **Ordering questions from the behind-the-wheel skills**: lane change, two- and three-point
      turnabouts, parallel and perpendicular parking, the three-phase pass, expressway entry and
      exit, brake/engine/accelerator failure, off-road recovery.
- [ ] **The eleven areas where the law changed** since 2020, listed in
      `research/2026-law-verification.md`. This is the highest-value content in the app: it is
      exactly where someone who studied older material is confidently wrong.

## Deployment

- [ ] **Container image and compose stack for self-hosting.** The application is static files,
      so the image is small: a build stage running the generators and both test suites, then an
      `nginx:alpine` stage serving the result. Building the data inside the image rather than
      copying it in means a published image cannot contain unverified questions — the same gate
      CI applies, applied again at package time.

      Files to add:

      | File | Purpose |
      |---|---|
      | `Dockerfile` | Two stages: `python:3.11-slim` + node to generate and verify, `nginx:alpine` to serve |
      | `.dockerignore` | Excludes `.git`, `.venv`, `dist`, `research`, `tools`, `tests` from the build context |
      | `docker-compose.yml` | One `web` service, port mapping, `restart: unless-stopped` |
      | `deploy/nginx.conf` | Cache headers — long for `js/` and `styles.css`, short for `data/*.json`, since question content changes and code does not |

      **The design problem to solve first:** the list of files the site actually serves is
      currently written out by hand in `.github/workflows/pages.yml`. A Dockerfile would be a
      second hand-written copy, and `.dockerignore` a third, inverted. Three copies of one
      allowlist will drift, and the failure is silent — a file stops being served, or one that
      should never be published starts being served.

      Fix it before adding the container, not after: put the allowlist in one place — a
      `tools/stage_site.py` that copies the runtime files into a directory given as an argument
      — and have the workflow and the Dockerfile both call it. The `test ! -e` assertion that
      keeps the source question bank out of the site moves there too, so it guards every
      deployment path at once rather than only the Pages one.

## Repository hygiene

- [ ] **Restructure this file so entries map onto a GitHub Project.** Projects v2 operates on
      issues, not files, so nothing here syncs natively. The cheap path is to give each entry
      the fields a Project would want, in the same `Key: value` shape the commit trailers use,
      and generate issues one-way when they are needed:

      ```markdown
      ### Northern Virginia items need sources

      Module 13 contains no Northern Virginia content, so these must be
      authored from DMV and VDOT sources.

      Status: Blocked
      Priority: P2
      Size: M
      Area: content
      Blocked-by: sourcing
      Area: content
      ```

      A `### ` heading per entry, prose body, then the field block. `tools/backlog_to_issues.py`
      parses it and calls `gh issue create --project`; `.github/ISSUE_TEMPLATE/*.yml` issue forms
      keep hand-made issues in the same shape so the Project's fields stay populated.

      **Decide the direction before importing anything.** Markdown-canonical keeps the backlog
      reviewable in a pull request beside the code it describes, at the cost of drift when an
      issue is closed. Issues-canonical gets Projects automation and cross-repo views, at the
      cost of the reasoning leaving version control. One-way generation from markdown suits a
      single maintainer; switch to issues-canonical if others start working the queue. Two
      half-maintained sources is the outcome to avoid.

- [ ] **Pull request template with a checklist.** `.github/pull_request_template.md`, using the
      headings CONTRIBUTING.md already specifies (Summary, Rationale, Changes, Verification,
      Risk) plus a checklist that makes the two governing rules explicit at review time: every
      new question `reviewed` and `verified`, every authority carrying a URL and an effective
      date, `verified_on` current, no stem reproducing a source question, both test suites run
      and their output pasted into Verification. GitHub renders the template into the PR body
      automatically, so the checklist arrives before the reviewer rather than after.
- [ ] **pre-commit configuration including the message check.** `.pre-commit-config.yaml`
      running `tools/check_commit_message.py` plus `pytest tests/test_items.py` and pyflakes.
      Note the message check must be registered at the `commit-msg` stage, not `pre-commit` —
      the message does not exist yet when `pre-commit` hooks run — which means
      `stages: [commit-msg]` in the config and `pre-commit install --hook-type commit-msg` at
      setup, since the default install only wires the `pre-commit` stage. Until then the manual
      symlink documented in CONTRIBUTING.md does the same job for one repository.

## Deferred

- Item-difficulty calibration export — once enough responses accumulate, dump learned Elo ratings
  back into `data/items.json` as `difficulty0` so a fresh profile starts calibrated.
- Spaced-repetition scheduling across sessions (currently a per-session spacing window only).
- Printable summary of the law/course divergences, for the day of a course quiz.
