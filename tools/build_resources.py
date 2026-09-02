#!/usr/bin/env python3
"""Write data/resources.json -- the sources consulted while fact-checking.

Two inputs, deliberately:

  * every authority cited by a shipped item in data/items.json, so the
    list cannot drift out of step with what the app actually claims; and
  * ADDITIONAL, the sources consulted during the 2026 verification pass that no
    shipped item happens to cite yet -- checking a statute and finding it
    unchanged is still work the reader should be able to retrace.

The course that prompted this project is deliberately NOT listed. It is the
subject of the fact-check, not a source for it.

Offline; reads and writes files only.
"""

import json
import pathlib
import re
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
ITEMS = ROOT / "data" / "items.json"
OUT = ROOT / "data" / "resources.json"

# Publisher for a hostname. Order matters: first match wins.
PUBLISHERS = [
    ("law.lis.virginia.gov", "Code of Virginia", "law.lis.virginia.gov"),
    ("dmv.virginia.gov", "Virginia Department of Motor Vehicles", "dmv.virginia.gov"),
    ("vdot.virginia.gov", "Virginia Department of Transportation", "vdot.virginia.gov"),
    ("dls.virginia.gov", "Virginia Division of Legislative Services", "dls.virginia.gov"),
    ("doe.virginia.gov", "Virginia Department of Education", "doe.virginia.gov"),
]

# Consulted during verification; not (yet) cited by a shipped item.
# Each was read to confirm a rule, including the ones that confirmed no change.
ADDITIONAL = [
    ("Va. Code § 18.2-270 — DUI penalties",
     "https://law.lis.virginia.gov/vacode/title18.2/chapter7/section18.2-270/"),
    ("Va. Code § 16.1-278.9 — Use and Lose",
     "https://law.lis.virginia.gov/vacode/title16.1/chapter11/section16.1-278.9/"),
    ("Va. Code § 4.1-1100 — marijuana possession limits",
     "https://law.lis.virginia.gov/vacode/title4.1/chapter11/section4.1-1100/"),
    ("Va. Code § 18.2-323.1 — alcohol open container",
     "https://law.lis.virginia.gov/vacode/title18.2/chapter7/section18.2-323.1/"),
    ("Va. Code § 46.2-334 — minimum licensing age",
     "https://law.lis.virginia.gov/vacode/title46.2/chapter3/section46.2-334/"),
    ("Va. Code § 46.2-335.2 — learner's permit holding period",
     "https://law.lis.virginia.gov/vacode/title46.2/chapter3/section46.2-335.2/"),
    ("Va. Code § 46.2-324.1 — initial licensure for applicants 18 and older",
     "https://law.lis.virginia.gov/vacode/title46.2/chapter3/section46.2-324.1/"),
    ("Va. Code § 46.2-507 — Intelligent Speed Assistance Program",
     "https://law.lis.virginia.gov/vacode/title46.2/chapter3/section46.2-507/"),
    ("Va. Code § 46.2-865 — racing and exhibition driving",
     "https://law.lis.virginia.gov/vacode/title46.2/chapter8/section46.2-865/"),
    ("Va. Code § 46.2-870 — maximum speed limits",
     "https://law.lis.virginia.gov/vacode/title46.2/chapter8/section46.2-870/"),
    ("Va. Code § 46.2-878.1 — speeding in a highway work zone",
     "https://law.lis.virginia.gov/vacode/title46.2/chapter8/section46.2-878.1/"),
    ("Va. Code § 46.2-818.3 — live streaming while driving",
     "https://law.lis.virginia.gov/vacode/title46.2/chapter8/section46.2-818.3/"),
    ("Va. Code § 46.2-1078.1 — repealed under-18 cell phone ban",
     "https://law.lis.virginia.gov/vacode/title46.2/chapter10/section46.2-1078.1/"),
    ("Va. Code § 46.2-921.1 — repealed Move Over section",
     "https://law.lis.virginia.gov/vacode/title46.2/chapter8/section46.2-921.1/"),
    ("Va. Code § 46.2-341.20:7 — marijuana in a commercial vehicle",
     "https://law.lis.virginia.gov/vacode/title46.2/chapter3/section46.2-341.20:7/"),
    ("Virginia DMV — demerit points, 3-point violations",
     "https://www.dmv.virginia.gov/licenses-ids/improvement/points/points-3"),
    ("Virginia DMV — demerit points, drivers under 18",
     "https://www.dmv.virginia.gov/licenses-ids/improvement/points/under-18"),
    ("Virginia DMV — insurance requirements",
     "https://www.dmv.virginia.gov/vehicles/insurance-requirements"),
    ("Virginia DMV — all occupants must buckle up (2025 law)",
     "https://www.dmv.virginia.gov/news/new-virginia-law-requires-all-vehicle-occupants-buckle"),
    ("Virginia DMV — learner's permit holding period and driver education FAQs",
     "https://www.dmv.virginia.gov/licenses-ids/learners/revised-learners-permit-holding-period-and-driver-education-requirements-faqs"),
    ("Virginia DMV — license eligibility",
     "https://www.dmv.virginia.gov/licenses-ids/license/applying/eligibility"),
    ("Virginia DMV — Intelligent Speed Assistance Program",
     "https://www.dmv.virginia.gov/licenses-ids/license/reinstate/intelligent-speed-assistance-program-isap"),
    ("VDOT — 66 Express, using the lanes",
     "https://www.vdot.virginia.gov/projects/major-projects/66expresslanes/using-the-lanes/"),
    ("Division of Legislative Services — In Due Course 2025",
     "https://dls.virginia.gov/pubs/idc/idc25.pdf"),
    ("Division of Legislative Services — In Due Course 2026",
     "https://dls.virginia.gov/pubs/idc/idc26.pdf"),
    ("Virginia Department of Education — driver education",
     "https://www.doe.virginia.gov/teaching-learning-assessment/instruction/driver-education"),
]


def publisher_for(url):
    host = urlparse(url).netloc.lower()
    for needle, name, domain in PUBLISHERS:
        if needle in host:
            return name, domain
    return "Other", host


def sort_key(entry):
    """Statutes sort by title and section number, everything else by title."""
    match = re.search(r"§\s*([\d.]+)-([\d.:]+)", entry["cite"])
    if not match:
        return (1, entry["cite"].lower(), 0.0, 0.0)
    title, section = match.groups()
    return (0, "", _num(title), _num(section))


def _num(text):
    parts = re.split(r"[.:-]", text)
    out = 0.0
    for i, part in enumerate(parts[:3]):
        if part.isdigit():
            out += int(part) / (1000 ** i)
    return out


def collect(items):
    seen = {}
    for item in items:
        if item.get("status") != "reviewed":
            continue
        if item.get("accuracy", {}).get("status") != "verified":
            continue
        for source in item["accuracy"].get("authority", []):
            url = source["url"]
            entry = seen.setdefault(url, {
                "cite": source["cite"],
                "url": url,
                "effective": source.get("effective"),
                "cited_by": 0,
            })
            entry["cited_by"] += 1

    for cite, url in ADDITIONAL:
        seen.setdefault(url, {"cite": cite, "url": url, "effective": None, "cited_by": 0})

    groups = {}
    for entry in seen.values():
        name, domain = publisher_for(entry["url"])
        group = groups.setdefault(name, {"publisher": name, "domain": domain, "sources": []})
        group["sources"].append(entry)

    for group in groups.values():
        group["sources"].sort(key=sort_key)

    order = [name for _, name, _ in PUBLISHERS] + ["Other"]
    return [groups[name] for name in order if name in groups]


# How the check was carried out, and what it could not settle. Kept beside the
# source list because a reader deserves to know the method and its limits, not
# just the citations that survived it.
METHOD = {
    "date": "2026-09-01",
    "steps": [
        "Every draft question was triaged by how it could go wrong: dependent on a "
        "statutory number, dependent on a named legal doctrine, already broken on its "
        "face, or resting on no changeable fact at all.",
        "Each legal fact was then read from the current statutory text rather than from "
        "any summary of it, and its effective date recorded — including the checks that "
        "confirmed no change, which are listed among the sources above.",
        "Where a shipped answer differs from what the source course teaches, both answers "
        "are carried and the divergence is explained rather than silently corrected.",
        "Questions whose defect was structural rather than numeric — logically nested "
        "options, two defensible answers, a subject absent from the material — were "
        "retired instead of repaired.",
        "Anything that could not be confirmed from a primary source was left out. The "
        "gaps below are recorded rather than filled.",
    ],
    "sourcing_rule": (
        "Primary sources only for legal facts: the Code of Virginia, the Department of "
        "Motor Vehicles, the Department of Transportation, the Department of Education, "
        "and the Division of Legislative Services' session summaries. A secondary source "
        "may point at a change; it never substantiates one."
    ),
    "unresolved": [
        "Knowledge-test and road-skills-test waivers when exchanging a valid out-of-state "
        "or foreign licence. No authoritative source found; practice is reported to differ "
        "between state exchanges and foreign reciprocity. No question is written on it.",
        "The substance of four 2026 amendments — to the handheld-device, occupant-restraint, "
        "school-bus, and driving-under-the-influence sections. The statutory text as "
        "published is reliable and is what the questions rest on; only the attribution of "
        "what each amendment changed is open.",
        "Which provisions of the 2026 photo-enforcement acts carry delayed effective dates. "
        "No dated question is written on camera enforcement as a result.",
        "The penalty amount for transporting a person under 16 in an open pickup bed. The "
        "prohibition and its two exceptions are confirmed; the section states no penalty.",
    ],
}


def main():
    items = json.loads(ITEMS.read_text())
    groups = collect(items)
    data = {
        "version": 1,
        "verified_on": "2026-09-01",
        "note": ("Primary sources consulted while fact-checking this app's questions for 2026. "
                 "Secondary sources may locate a change but never substantiate one, so none are "
                 "listed. The driver-improvement course that prompted this project is not a "
                 "source and is not listed."),
        "method": METHOD,
        "groups": groups,
    }
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    total = sum(len(g["sources"]) for g in groups)
    cited = sum(1 for g in groups for s in g["sources"] if s["cited_by"])
    print(f"{OUT}: {total} sources across {len(groups)} publishers "
          f"({cited} cited by a shipped item)")


if __name__ == "__main__":
    main()
