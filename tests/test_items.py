"""Gates on the shipped question bank.

The rule enforced here is that nothing ships whose answer has not been verified
against a primary source within the last year -- easy to break during an
authoring pass, and invisible afterwards.

The companion rule, that no question reproduces an existing one verbatim, is
checked where the material being compared against actually lives; see
CONTRIBUTING.md. Comparing here would mean publishing a description of someone
else's question bank, which is the opposite of the point.
"""

import datetime
import json
import pathlib
import re

import pytest

ROOT = pathlib.Path(__file__).resolve().parent.parent
ITEMS = ROOT / "data" / "items.json"
TAXONOMY = ROOT / "data" / "taxonomy.json"

STALE_AFTER = datetime.timedelta(days=365)


@pytest.fixture(scope="module")
def items():
    return json.loads(ITEMS.read_text())


@pytest.fixture(scope="module")
def taxonomy():
    return json.loads(TAXONOMY.read_text())


@pytest.fixture(scope="module")
def shipped(items):
    return [i for i in items
            if i.get("status") == "reviewed"
            and i.get("accuracy", {}).get("status") == "verified"]


# --- structure -------------------------------------------------------------

def test_bank_is_not_empty(shipped):
    assert shipped, "no item passes the reviewed + verified gate"


def test_ids_are_unique(items):
    ids = [i["id"] for i in items]
    dupes = {i for i in ids if ids.count(i) > 1}
    assert not dupes, f"duplicate item ids: {sorted(dupes)}"


def test_choice_items_have_a_real_answer(shipped):
    for item in shipped:
        if item["form"] == "ordering":
            continue
        option_ids = [o["id"] for o in item["options"]]
        assert len(option_ids) >= 2, f"{item['id']}: fewer than two options"
        assert len(set(option_ids)) == len(option_ids), f"{item['id']}: duplicate option ids"
        assert item["answer"] in option_ids, f"{item['id']}: answer is not one of its options"


def test_ordering_items_have_a_key(shipped):
    for item in shipped:
        if item["form"] != "ordering":
            continue
        steps, key = item["steps"], item["answerOrder"]
        assert len(steps) >= 3, f"{item['id']}: an ordering item needs at least three steps"
        assert sorted(key) == list(range(len(steps))), \
            f"{item['id']}: answerOrder is not a permutation of its steps"
        for n, step in enumerate(steps, start=1):
            assert step.get("text", "").strip(), f"{item['id']}: step {n} has no text"


def test_every_ordering_step_carries_a_why(shipped):
    """The ordering counterpart of the option rationale: a misplaced step
    should teach why it sits where it does, not just be marked out of place."""
    for item in shipped:
        if item["form"] != "ordering":
            continue
        for n, step in enumerate(item["steps"], start=1):
            assert step.get("why", "").strip(), f"{item['id']}: step {n} has no why"


def test_every_option_carries_a_rationale(shipped):
    """A wrong answer should teach, not just score."""
    for item in shipped:
        for option in item.get("options", []):
            assert option.get("rationale", "").strip(), \
                f"{item['id']}: option {option['id']} has no rationale"


def test_sol_tags_exist_in_the_taxonomy(shipped, taxonomy):
    known = {c["id"] for topic in taxonomy["sol"] for c in topic["concepts"]}
    known |= {topic["id"] for topic in taxonomy["sol"]}
    for item in shipped:
        assert item["sol"], f"{item['id']}: no SOL tag"
        for tag in item["sol"]:
            assert tag in known, f"{item['id']}: unknown SOL tag {tag}"


def test_btw_skill_references_resolve(shipped, taxonomy):
    known = {s["id"] for s in taxonomy["btw_skills"]}
    for item in shipped:
        skill = item.get("btw_skill")
        if skill:
            assert skill in known, f"{item['id']}: unknown behind-the-wheel skill {skill}"


def test_region_is_known(shipped):
    for item in shipped:
        assert item.get("region") in {"va", "nova"}, f"{item['id']}: bad region"


def test_form_is_one_the_app_renders(shipped):
    for item in shipped:
        assert item.get("form") in {"multiple_choice", "true_false", "ordering"}, \
            f"{item['id']}: form {item.get('form')!r} has no renderer"


def test_concept_is_the_id_without_its_serial(items):
    """`concept` groups variants; the engine never asks two of one concept in a session."""
    for item in items:
        assert item.get("concept"), f"{item['id']}: no concept"
        assert re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)+", item["concept"]), \
            f"{item['id']}: concept {item['concept']!r} is not a kebab slug"
        assert item["id"].startswith(item["concept"] + "-"), \
            f"{item['id']}: id should be its concept plus a serial"


def test_variants_share_their_primary_topic(items):
    by_concept = {}
    for item in items:
        by_concept.setdefault(item["concept"], set()).add(item["sol"][0])
    split = {c: sorted(tags) for c, tags in by_concept.items() if len(tags) > 1}
    assert not split, f"variants of one concept tagged to different topics: {split}"


def test_source_says_where_the_question_came_from(items):
    for item in items:
        source = item.get("source") or {}
        assert source.get("kind") in {"reauthored", "module13", "experiment"}, \
            f"{item['id']}: source.kind must be reauthored, module13 or experiment"
        if source["kind"] == "experiment":
            assert source.get("channel") in {"manual", "code", "sol"}, \
                f"{item['id']}: an experiment item needs source.channel of manual, code or sol"
            assert source.get("citation", "").strip(), \
                f"{item['id']}: an experiment item needs source.citation"


# --- the two gates ---------------------------------------------------------

def test_no_draft_or_unverified_item_would_ship(items):
    """The app filters on these fields; this asserts the filter is meaningful."""
    for item in items:
        if item.get("status") != "reviewed":
            continue
        assert item.get("accuracy", {}).get("status") in {"verified", "unverified"}, \
            f"{item['id']}: accuracy.status must be set once an item is reviewed"


def test_verified_items_cite_a_primary_source(shipped):
    for item in shipped:
        authority = item["accuracy"].get("authority") or []
        assert authority, f"{item['id']}: verified with no authority"
        for source in authority:
            assert source.get("cite"), f"{item['id']}: authority with no citation"
            assert source.get("url", "").startswith("https://"), \
                f"{item['id']}: authority {source.get('cite')} has no https URL"
            assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", source.get("effective", "")), \
                f"{item['id']}: authority {source.get('cite')} has no effective date"


def test_verification_is_not_stale(shipped):
    today = datetime.date.today()
    for item in shipped:
        verified = datetime.date.fromisoformat(item["accuracy"]["verified_on"])
        assert today - verified <= STALE_AFTER, (
            f"{item['id']}: verified {verified}, more than a year ago. "
            "Re-run the law research pass and re-date the accuracy blocks."
        )


def test_divergences_are_explained(shipped):
    """Where the course and the law disagree, both answers and the why must be present."""
    for item in shipped:
        if "course_answer" not in item:
            continue
        assert item.get("divergence", "").strip(), \
            f"{item['id']}: course_answer set with no divergence note"
        assert item["course_answer"] != item["answer"], \
            f"{item['id']}: course_answer equals answer, so there is no divergence"
        option_ids = [o["id"] for o in item["options"]]
        assert item["course_answer"] in option_ids, \
            f"{item['id']}: course_answer is not one of its options"


# --- resources page --------------------------------------------------------

RESOURCES = ROOT / "data" / "resources.json"


@pytest.fixture(scope="module")
def resources():
    return json.loads(RESOURCES.read_text())


def test_resources_cover_every_shipped_authority(shipped, resources):
    """Regenerate with `python tools/build_resources.py` when this fails."""
    listed = {s["url"] for g in resources["groups"] for s in g["sources"]}
    cited = {source["url"]
             for item in shipped
             for source in item["accuracy"]["authority"]}
    missing = cited - listed
    assert not missing, f"authorities cited by an item but absent from resources.json: {sorted(missing)}"


def test_resources_list_only_primary_sources(resources):
    """Only the Commonwealth's own publications substantiate a legal claim."""
    allowed = {"law.lis.virginia.gov", "www.dmv.virginia.gov", "www.vdot.virginia.gov",
               "dls.virginia.gov", "www.doe.virginia.gov"}
    for group in resources["groups"]:
        for source in group["sources"]:
            host = source["url"].split("/")[2]
            assert host in allowed, f"non-primary source listed: {source['url']}"


# --- no dangling file references ----------------------------------------------

# A filename mentioned in this repository should exist in it. That is worth
# checking for its own sake -- a reference a reader cannot follow is a broken
# document -- and it happens to catch the more serious case: a leftover pointer
# to a file that lives somewhere else entirely.
#
# Enumerating the names to look for would defeat the purpose, so this checks the
# general property instead: every filename-shaped token either resolves inside
# the tree or is listed below as deliberately external.

# A match may not begin part-way through a dotted name, or "credits.ip.html"
# would be read as "ip.html"; hence the dot in the lookbehind. The trailing
# lookahead rejects method calls such as r.json().
FILENAME = re.compile(r"(?<![\w}$./-])\.?[A-Za-z0-9_-]+(?:[./][A-Za-z0-9_-]+)*"
                      r"\.(?:md|json|js|mjs|py|html|css|yml|yaml|toml|txt)\b(?!\()")

# Files referenced before they exist: planned work in backlog.md, and tooling a
# contributor may add locally. Remove an entry once the file is real.
EXTERNAL_OK = {
    "Dockerfile", "docker-compose.yml", ".dockerignore", "deploy/nginx.conf",
    "tools/backlog_to_issues.py", "tools/stage_site.py",
    ".github/pull_request_template.md", ".pre-commit-config.yaml",
    ".github/ISSUE_TEMPLATE/*.yml", "requirements.txt",
    "mod.js", "path/to/file.ext", "path/to/next-file.ext",
}

# Build outputs: written by a tool in tools/, ignored by git, so present on a
# machine that has run the tool and absent on a fresh checkout or the CI runner.
BUILD_OUTPUTS = {"dist/artifact.html", "artifact.html"}

TEXT_SUFFIXES = {".md", ".json", ".js", ".mjs", ".html", ".py", ".yml", ".txt"}
SKIP_DIRS = {".git", ".venv", "dist", "__pycache__", ".pytest_cache", "node_modules"}

# Fields that js/ui.js renders to the learner.
RENDERED_FIELDS = ["stem", "explanation", "divergence"]


def unresolved_filenames(text):
    """Filename-shaped tokens in `text` that name nothing in this repository."""
    out = set()
    for token in FILENAME.findall(text):
        if token in EXTERNAL_OK or token in BUILD_OUTPUTS or (ROOT / token).exists():
            continue
        # A bare name may sit anywhere in the tree.
        if any(p.name == token for p in ROOT.rglob(token) if p.is_file()):
            continue
        out.add(token)
    return out


def test_no_rendered_text_references_a_file():
    """Learners are shown prose, not repository paths."""
    items = json.loads(ITEMS.read_text())
    for item in items:
        texts = [item.get(f, "") for f in RENDERED_FIELDS]
        texts += [o.get("rationale", "") for o in item.get("options", [])]
        for text in texts:
            assert not unresolved_filenames(text), (
                f"{item['id']}: rendered text names a file that is not in this repository: "
                f"{sorted(unresolved_filenames(text))}")


def test_no_repository_file_names_a_missing_file():
    offenders = []
    for path in ROOT.rglob("*"):
        parts = set(path.relative_to(ROOT).parts)
        if not path.is_file() or parts & SKIP_DIRS or path.suffix not in TEXT_SUFFIXES:
            continue
        if path.name == "test_items.py":       # defines the patterns above
            continue
        for token in unresolved_filenames(path.read_text(errors="ignore")):
            offenders.append(f"{path.relative_to(ROOT)} -> {token}")
    assert not offenders, "references to files that do not exist here: " + "; ".join(sorted(offenders))


# --- corrections that must stay corrected --------------------------------

# Each entry pins a fact that was once wrong in this bank or in material it
# was written against, by concept. `key` is a regex the correct option's text
# must match; `explain` must match the explanation or the correct rationale,
# and `never` must match neither. New variants of these concepts inherit the
# check, which is the point: a fault fixed once should not be re-authored.
CORRECTIONS = [
    {   # the per se limit is 0.08 *or more*; exactly 0.08 is enough
        "concept": "de10a-per-se-threshold",
        "key": r"0\.08(%)? or (more|higher)",
        "explain": r"0\.08 (grams )?or more",
        "never": r"(exceed\w*|above|more than|over) 0?\.08",
    },
    {   # aggressive driving: being a hazard is a prong on its own
        "concept": "de11d-aggressive-driving",
        "explain": r"hazard to (another|someone)",
        "never": r"(requires|must (show|prove)) intent|defined as the intent",
    },
    {
        "concept": "de11b-anger-response",
        "explain": r"hazard to (another|someone)",
        "never": r"(requires|must (show|prove)) intent|defined as the intent",
    },
    {   # the school-bus exception is the divided highway and the barrier, not
        # "divided highways" alone
        "concept": "de18g-school-bus",
        "explain": r"divided highway",
        "never": r"only (on|for) divided highways",
    },
    {   # cancellation notice is 45 days, not 10
        "concept": "de21d-nonrenewal-notice",
        "key": r"\b45 days\b",
        "never": r"\b10 days\b(?! is| was| —)",
    },
    {   # 4 seconds at 46-70 mph per the manual's table
        "concept": "de5c-following-seconds-at-highway-speed",
        "key": r"\b4 seconds\b",
    },
    {   # Module 13 p. 34 picks the target before any steering, and its
        # "drop both tires off" bullet is a state, not a step: an ordering
        # item cannot rest on where an unnumbered bullet sits
        "concept": "de17c-off-road-recovery",
        "before": (r"\b(target|point|spot)\b", r"\b(steer|turn the wheel)\b"),
        "never_step": r"\b(both|two) (right )?(tires|wheels)\b",
    },
]


@pytest.mark.parametrize("rule", CORRECTIONS, ids=lambda r: r["concept"])
def test_a_corrected_fault_stays_corrected(shipped, rule):
    matching = [i for i in shipped if i.get("concept") == rule["concept"]]
    assert matching, f"no shipped item on {rule['concept']}; drop the rule or restore the item"
    for item in matching:
        if item.get("form") == "ordering":
            keyed = [item["steps"][k]["text"] for k in item["answerOrder"]]
            if "before" in rule:
                first, second = rule["before"]
                a = next(i for i, t in enumerate(keyed) if re.search(first, t, re.I))
                b = next(i for i, t in enumerate(keyed) if re.search(second, t, re.I))
                assert a < b, f"{item['id']}: {keyed[b]!r} is keyed before {keyed[a]!r}"
            if "never_step" in rule:
                hit = [t for t in keyed if re.search(rule["never_step"], t, re.I)]
                assert not hit, f"{item['id']}: reintroduces step {hit[0]!r}"
            continue
        key = next(o for o in item["options"] if o["id"] == item["answer"])
        prose = item.get("explanation", "") + " " + key.get("rationale", "")
        if "key" in rule:
            assert re.search(rule["key"], key["text"], re.I), \
                f"{item['id']}: key text {key['text']!r} does not match {rule['key']!r}"
        if "explain" in rule:
            assert re.search(rule["explain"], prose, re.I), \
                f"{item['id']}: explanation no longer states {rule['explain']!r}"
        if "never" in rule:
            hit = re.search(rule["never"], prose, re.I)
            assert not hit, f"{item['id']}: reintroduces {hit.group(0)!r}"
