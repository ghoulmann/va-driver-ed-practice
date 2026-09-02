# Virginia driver-law verification for 2026

Research pass run **2026-09-01** against primary sources only: Code of Virginia
(law.lis.virginia.gov), Virginia DMV, VDOT, and the Division of Legislative Services'
official session summaries (dls.virginia.gov/pubs/idc/).

This file is the authority table behind every `accuracy` block in `data/items.json`.
Re-run and re-date it annually; the test suite fails items whose `verified_on` is
more than 12 months old.

---

## The eleven stale answers

A course written before ~2023 is wrong on all of these.

| # | Stale answer | Correct 2026 answer | Changed |
|---|---|---|---|
| 1 | Reckless driving at **80 mph** | **85 mph** (§46.2-862) | 2020-07-01 |
| 2 | "Texting ban" / under-18 total phone ban | **Holding any handheld device** is illegal for all ages, **primary** enforcement, $125 / $250; §46.2-1078.1 **repealed** | 2021-01-01 |
| 3 | Move Over law is **§46.2-921.1** | That section is **repealed**; it is **§46.2-861.1** | 2019 |
| 4 | Move Over covers only emergency/tow vehicles | Also **any stationary vehicle with hazard flashers, caution signs, or lit flares** (traffic infraction, vs. reckless for emergency vehicles) | 2023-07-01 |
| 5 | I-66 Inside the Beltway is **HOV-2** | **HOV-3+** | 2022-12-05 |
| 6 | You may pay a **$500 UMV fee** instead of insurance | **Eliminated**; liability insurance is mandatory | 2024-07-01 |
| 7 | Minimum limits **30/60/20** (or 25/50/20) | **50/100/25** | 2025-01-01 |
| 8 | Back-seat adults need not buckle | **All occupants 18+, all seats** (still *secondary*, $25) | 2025-07-01 |
| 9 | Point suspension = 90 days, full stop | **Choice** of 90-day suspension or **9-month Intelligent Speed Assistance** program | 2026-07-01 |
| 10 | No live-streaming offense | **§46.2-818.3**, up to $500 + suspensions (secondary) | 2026 |
| 11 | 18+ first-timers: 60-day permit **or** driver ed | **Ages 18-20: driver ed AND 90-day permit** (21+ unchanged) | 2027-01-01 |

---

## 1. Handheld / distracted driving — §46.2-818.2

- Unlawful to **hold** a handheld personal communications device while driving on a highway.
  Not "texting only".
- 1st offense **$125**; 2nd+ **$250**; **mandatory $250** in a highway work zone. Court may
  order a driver improvement clinic in lieu of conviction on a first offense.
- **Primary offense.** §46.2-818.2 contains no "no law-enforcement officer shall stop" clause.
  That clause lives in §46.2-818.3 and §46.2-1094 — do not confuse them.
- Enacted 2020 cc. 250, 543 (eff. 2021-01-01); amended 2023 cc. 557, 558 (work-zone fine);
  amended 2026 c. 518.
- **§46.2-1078.1, the old under-18 total cell-phone ban, was REPEALED effective 2021-01-01.**
  The rule is now uniform across ages and primary for everyone.
- https://law.lis.virginia.gov/vacode/title46.2/chapter8/section46.2-818.2/
- https://law.lis.virginia.gov/vacode/title46.2/chapter10/section46.2-1078.1/

**New 2026 — §46.2-818.3 live streaming while driving** (2026 c. 1047, HB 320). Fine up to
$500; 2nd offense 30-day suspension; 3rd 90-day; extra $500 if involved in an accident.
**Secondary enforcement** (subsection G). Exceptions for emergency reporting and for dashcams
that record without transmitting.
- https://law.lis.virginia.gov/vacode/title46.2/chapter8/section46.2-818.3/

## 2. Move Over — §46.2-861.1

- §46.2-921.1 **repealed** by Acts 2019 c. 850. Any citation to it is dead.
- **(A)** Stationary vehicle displaying flashing blue, red, or amber emergency lights, on a
  highway with 4+ lanes and 2+ in your direction: change lanes away; if unreasonable or unsafe,
  proceed with due caution at a safe speed. **Violation is reckless driving.**
- **(B)** Added 2023 cc. 616, 617, eff. 2023-07-01 — same duty toward any stationary vehicle
  with **hazard flashers activated**, **caution signs displayed**, or **lit flares/torches**.
  **Violation is a traffic infraction**, not reckless driving.
- **(C)** Suspension up to 1 year if the violation causes property damage; up to 2 years for
  injury or death. **(D)** Does not apply in highway work zones.
- https://law.lis.virginia.gov/vacode/title46.2/chapter8/section46.2-861.1/

## 3. BAC, Zero Tolerance, Implied Consent, Use and Lose — STABLE

No changes 2021-2026. Safe to keep as taught.

- **DUI per se 0.08%** — §18.2-266. Also per se: cocaine 0.02 mg/L, methamphetamine 0.1 mg/L,
  PCP 0.01 mg/L, MDMA 0.1 mg/L. Statute reads "**0.08 grams or more**" — the safe formulation
  is "0.08 or more", never "exceeds 0.08".
- **Zero Tolerance (under 21): 0.02% to under 0.08%** — §18.2-266.1. Class 1 misdemeanor;
  **1-year suspension**; minimum **$500 fine or 50 hours community service**.
- **Implied Consent** — §18.2-268.2. Operating on a highway is consent to breath/blood testing
  if arrested for DUI. Breath primary for alcohol; blood for drugs or if breath unavailable.
- **Refusal** — §18.2-268.3. 1st = **civil offense, 1-year suspension**. 2nd+ within 10 years =
  **Class 1 misdemeanor, 3-year revocation**.
- **DUI penalties** — §18.2-270. 1st: Class 1 misdemeanor, min **$250**; BAC 0.15-0.20 =
  **5 days mandatory jail**; over 0.20 = **10 days**. 2nd within 5 yrs: $500 min + 20 days.
  2nd in 5-10 yrs: $500 min + 10 days. 3rd within 10 yrs: **Class 6 felony**, 90 days mandatory
  ($1,000 min); 6 months if all three within 5 years. Passenger under 17: extra $500-$1,000 and
  5 days mandatory jail.
- **Use and Lose** — §16.1-278.9. Delinquent children **13+** for DUI, refusal, drug offenses,
  underage purchase/possession (§4.1-305), alcohol on school grounds (§4.1-309), public
  intoxication. Denial **1 year or until age 17** (1st), **1 year or until age 18** (2nd+),
  whichever is longer; license surrendered to the court.

## 4. Marijuana and driving

- **There is NO per se THC blood limit in Virginia.** §18.2-266's per se list covers cocaine,
  meth, PCP, MDMA only. Any numeric THC threshold in older practice material is wrong.
- **§4.1-1107** — using or consuming marijuana in a moving vehicle on a public highway applies
  to **driver and passengers**; **Class 4 misdemeanor**. "Open container" = any vessel except
  the original sealed manufacturer's container. Permissive inference from open container +
  partially removed contents + appearance/conduct/speech — **odor expressly excluded**.
- **§4.1-1100** — 21+ may possess up to **2 oz** in public. 2-4 oz: civil penalty up to $25.
  4 oz-1 lb: Class 3 misdemeanor (Class 2 on repeat). Over 1 lb: felony, 1-10 years.
- Alcohol open container remains separate — §18.2-323.1.

## 5. Demerit points — §46.2-506 changed 2026-07-01

Point values stable at 3 / 4 / 6. Demerit points remain **2 years from the offense date**;
convictions stay 3, 5, or 11 years (some permanent).

- **3 points:** speeding 1-9 over; improper passing/driving; failure to yield; improper turn;
  running a red light; failure to obey highway signs; **handheld device use**; drinking while driving.
- **4 points:** speeding 10-19 over; reckless driving - failure to stop before entering a highway;
  failure to stop at the scene of a crash with unattended property damage over $500.
- **6 points:** all reckless driving (incl. **over 85 mph** - 11 yrs; **20+ over** - 5 yrs),
  all DUI, manslaughter, habitual offender, driving on a suspended license.
- **Safe driving points:** +1 per full violation-free calendar year, max +5; +5 for a
  *voluntarily* completed driver improvement clinic.
- **Adult thresholds:** 8/12mo (or 12/24) advisory letter; 12/12mo (or 18/24) mandatory clinic;
  18/12mo (or 24/24) **90-day suspension** + clinic.
- **Under 18:** 1st demerit violation mandatory clinic; 2nd **90-day suspension**; 3rd
  **revocation for one year or until age 18, whichever is longer**.
- **NEW eff. 2026-07-01** (2025 c. 652, HB 2096): at the 18/12mo or 24/24mo threshold the driver
  must be offered in writing a choice between the 90-day suspension + clinic, or enrolling in the
  **Intelligent Speed Assistance Program for nine months** + clinic. **30 days** to respond; no
  response means suspension. Neither option permits operating a commercial vehicle.
- https://www.dmv.virginia.gov/licenses-ids/improvement/points/system
- https://law.lis.virginia.gov/vacode/title46.2/chapter3/section46.2-506/

## 6. Graduated Driver Licensing, under 18 — STABLE

- **Learner's permit minimum age 15 years 6 months** (§46.2-335); must be held **9 months, or
  until age 18, whichever comes first** (§46.2-335.2).
- **45 hours** behind-the-wheel practice, **at least 15 after sunset**, certified by
  parent/foster parent/legal guardian.
- **Minimum licensing age 16 years 3 months** (§46.2-334).
- **Permit:** no more than **one passenger under 21** (except driver ed or family/household);
  no driving **midnight-4:00 a.m.**
- **Provisional (§46.2-334.01):** first year, **one passenger under 21**; after the first year,
  up to **three** under 21 and only when (i) to/from a school-sponsored activity, (ii) accompanied
  by a licensed driver 21+, or (iii) an emergency. **Family and household members exempt from both.**
  Curfew **midnight-4:00 a.m.** with exceptions for work, supervised school/civic/religious
  activity, accompaniment by a parent/guardian/spouse 18+, or emergency.
- **Secondary enforcement** — "No law-enforcement officer shall stop a motor vehicle for a
  violation of this section." Traffic infraction; 2nd+ can suspend up to 6 months.
- **Cell phone is now §46.2-818.2, not a separate under-18 rule.** §46.2-334.01 has no device clause.
- 2025 **SB 750** — knowingly authorizing an unlicensed minor or a permit holder to drive in
  violation of permit limits is a **Class 1 misdemeanor** if it causes a death or injury crash.

## 7. Occupant restraint — changed 2025-07-01

- **§46.2-1094 as amended by 2025 c. 414 (HB 2475), the "Christopher King Law", eff. 2025-07-01:**
  **every occupant 18 and older, in every seat including the back seat**, must wear a safety belt
  while the vehicle is in motion on a public highway. Prior law covered front seat only. Includes
  rideshare drivers and passengers.
- **Still SECONDARY enforcement** (subsection F). Civil penalty **$25**, no court costs,
  **no demerit points**. Virginia did *not* go primary — do not overstate the 2025 change.
- All occupants **under 18** must be restrained in all seats.
- **Child restraints — §46.2-1095:** restraint device required **through age 7** (until the 8th
  birthday); ages **8 to under 18** must use a safety belt. **Rear-facing until at least age 2**
  or the manufacturer's minimum forward-facing weight limit. Restraints in the **rear seat**;
  front only if there is no passenger airbag or it is disabled. This is **age-based** — content
  stating a weight threshold (e.g. "40 lbs") to graduate out of a car seat is wrong.
- **Truck beds — §46.2-1156.1:** no person **under 16** in the rear cargo area of a pickup on a
  Virginia highway. Exceptions: **authorized parades** and **farm operations** between fields.
  Hunting is **not** an exception.

## 8. Speed and reckless driving

- **§46.2-862:** reckless = **20 mph or more over** the limit **OR in excess of 85 mph** regardless
  of the posted limit. **The absolute threshold rose from 80 to 85** by 2020 cc. 444, 445
  (eff. 2020-07-01). Pre-2020 content saying 80 is a very common stale answer.
- **§46.2-870 maximums:** 55 baseline on interstates/limited-access divided highways, raisable to
  **70** where posted; 55 elsewhere for passenger vehicles/motorcycles; **45** for trucks, tractor
  trucks, property-carrying combinations and vehicles towing trailers on non-interstate highways;
  60 posted on certain divided multilane US routes.
- **NEW eff. 2026-07-01 — §46.2-865 racing / exhibition driving** (2025 cc. 648, 652). First
  statutory definition of "exhibition driving": burnouts, unnecessary zigzagging or circular
  patterns, speed/power demonstrations between designated points, and carrying passengers on the
  hood or roof, when performed near a group of two or more people. Racing = reckless driving with
  **6 months to 2 years mandatory suspension**; exhibition driving up to 6 months; riding on a
  hood/roof a Class 3 misdemeanor; intentionally impeding traffic for a race a Class 1 misdemeanor.
- **NEW eff. 2026-07-01 — §46.2-507 Intelligent Speed Assistance Program** (2025 c. 652),
  administered by the Commission on VASAP. GPS-based in-vehicle system preventing exceeding the
  posted limit. A court **must** order ISA enrollment for reckless driving **over 100 mph** unless
  it suspends instead. Participants install ISA in every vehicle they own or that is registered to
  them. **Tampering with or bypassing ISA is a Class 1 misdemeanor.**

## 9. Work zones, school buses, photo enforcement

- **§46.2-878.1** — speeding in a properly signed work zone **when workers are present**: fine up
  to **$500**.
- **§46.2-818.2** — mandatory **$250** handheld fine in a work zone.
- **§46.2-861.1(D)** — the Move Over duty does **not** apply in work zones.
- **§46.2-859 school buses** — must stop when approaching a stopped school bus loading/unloading
  **from any direction**. **Exception:** the bus is on the other roadway of a **divided highway**,
  on an access road, or on a driveway separated by a physical barrier or unpaved area.
  **Violation is reckless driving.**
- **§46.2-844 stop-arm cameras** — a locality may by ordinance authorize video-monitoring systems
  on buses. **Civil penalty $250**, a civil penalty against the vehicle. A version effective
  **2027-07-01** (2026 cc. 963, 965) tightens who may certify the video evidence.
- **§46.2-882.1 photo speed monitoring** — threshold **at least 10 mph over**; civil penalty
  **not to exceed $100**. A **mailed** citation "shall not be made part of the operating record"
  and **cannot be used for insurance purposes**; an officer-issued summons at the time **does** go
  on the record. Authorized in school crossing zones, work zones, high-risk intersection segments,
  National Park highways in Planning District 8, and "safety red zones" in PD 8 by ordinance.
- **2026 overhaul** (HB 994, HB 1220, SB 84, SB 219 - chapters 963-970, 986, 1033): work-zone
  cameras limited to when workers are actually present, with sworn certification; a uniform summons
  to be developed by the Supreme Court of Virginia; non-compliance **invalidates the summons**; a
  second summons must be mailed before a DMV registration hold; localities acting in willful
  disregard owe compensatory damages.
- **SB 84 (2026)** newly authorizes **pedestrian crossing** and **stop sign** violation monitoring
  systems. **SB 221 (2026)** lets localities extend school crossing zone active times from 30 to
  up to **60 minutes** before and after school hours.

## 10. Financial responsibility

- **§46.2-472 minimum liability limits** (2021 Sp. Sess. I c. 273, two-step phase-in):
  - policies effective **2022-01-01 to 2024-12-31**: **30/60/20**
  - policies effective **on or after 2025-01-01**: **50/100/25**
  - (bodily injury one person / two or more / property damage)
- **The Uninsured Motor Vehicle fee was ELIMINATED effective 2024-07-01** (2023 SB 951). The
  option to pay a fee **in lieu of** insurance is gone; all registered vehicles must carry
  liability insurance (or a bond, cash deposit, or self-insurance certificate). The old fee was
  **$500** and never provided the motorist any coverage.
- Driving/registering uninsured: privileges suspended, **$600 noncompliance fee**, **SR-22** for
  three years, plus reinstatement fees.
- Caveat: the DMV "Insurance Requirements" page still carries a stale reference to a payment plan
  for "the statutory fee". §46.2-706 controls; treat the fee as eliminated.
- **Cancellation/nonrenewal notice — §38.2-2212(E) requires 45 days**, not 30.

## 11. HOV and Northern Virginia express lanes

**Statutory — §33.2-501:**
- Occupancy levels are set by the Commonwealth Transportation Board and vary by facility.
- **Exempt:** emergency/fire/EMS, law enforcement, **motorcycles**, transit buses (16+ capacity),
  public utility vehicles responding to emergencies, vehicles with **clean special fuel plates**,
  taxicabs with 2+ occupants, active-duty military in uniform on I-264/I-64 in Hampton Roads.
- **Penalty, general:** traffic infraction, **not a moving violation**, **$100**, **no demerit points**.
- **Penalty, Planning District 8 (Northern Virginia):** **1st $125; 2nd within 5 years $250;
  3rd $500; 4th+ $1,000**, plus **3 demerit points** for each second and subsequent offense
  within five years.

**Operational (VDOT):**
- **I-66 Inside the Beltway: HOV-3+**, changed from HOV-2 on **2022-12-05**. Tolled/restricted
  **eastbound 5:30-9:30 a.m., westbound 3-7 p.m., Mon-Fri, excluding federal holidays** — tolls
  apply only in those peak hours, not 24/7.
- **I-66 Outside the Beltway (66 Express): HOV-3+, 24/7.**
- **I-495 Express Lanes: HOV-3+.**  **I-95/I-395 Express Lanes: HOV-3+**, reversible.
- **(Contrast) I-64 Express Lanes, Hampton Roads: HOV-2+, 24/7.**
- **An E-ZPass *Flex* switched to HOV ON is required for toll-free HOV travel.** A standard E-ZPass
  is charged the toll even with 3+ occupants.

## 12. Other 2024-2026 changes that move an answer

- **SB 1416 (2025)** — drivers must stop for pedestrians; failure is a traffic infraction, and a
  **Class 1 misdemeanor** if it causes serious bodily injury or death to a **vulnerable road user**
  lawfully crossing.
- **HB 812 (2026)** — cyclists must obey **bicycle signals** at intersections; fine up to $350.
- **HB 564/SB 583 (2026)** — bus obstruction monitoring systems for bus stops and bus lanes.
- **HB 646 (2026)** — green warning lights on farm vehicles.
- **HB 911/SB 446 (2026)** — limited-duration licenses, driver privilege cards and ID privilege
  cards extended to standard validity (up to 8 years; 5 years for age 75+).
- **HB 2116 / HB 2501 (2025)** — non-apparent disability indicator on licenses/IDs; DMV
  communication-envelope program for drivers with autism spectrum disorder (the "Blue Envelope"
  program).
- **SB 1332 (2025)** — maximum passenger-car hookup and initial towing fee raised to **$210**.

## 13. Initial licensure for adults — §46.2-324.1, changing 2027-01-01

- Applies **only** to persons **18 or older who have never held a license** issued by Virginia,
  another state, a U.S. territory, or a foreign country. **Anyone previously licensed anywhere is
  exempt** from the driver-education and permit-holding requirement; proof of prior licensure is
  what triggers the waiver.
- **Through 2026-12-31:** complete a course at a licensed driver training school **OR** hold a
  learner's permit **at least 60 days** before the first behind-the-wheel exam.
- **From 2027-01-01** (2026 cc. 754, 755 - HB 1224/SB 396):
  - **21 and older:** unchanged, 60-day permit **or** driver education.
  - **18-20:** must complete approved driver education **AND** hold a permit **90 days**. Both.
  - For 18-20, a learner's permit plus documentation of age and driver-ed completion now
    **functions as a temporary license** permitting unaccompanied driving.
- The driver-education **completion certificate must be submitted to DMV by the school** — DMV
  will not accept it from the applicant.
- **Under-18 movers-in:** time on a valid out-of-state learner's permit **counts toward** the
  9-month holding period. A minor with a valid out-of-state *license* who qualifies under
  §46.2-334(E) is exempt from the permit requirement entirely.

---

## Known gaps — do NOT write items on these without further verification

1. **Test-waiver rules when exchanging a valid out-of-state or foreign license.** No authoritative
   source found. DMV's eligibility page covers the education/permit requirement but is silent on
   knowledge/road-skills waivers, and no statute states it. Practice is known to differ between
   US-state exchanges and foreign reciprocity.
2. **Exact content of four 2026 amendments** — c. 518 (§46.2-818.2), c. 93/HB 230 (§46.2-1094),
   c. 132/HB 409 (§46.2-859), c. 1112 (DUI sections). LIS bill pages render via JavaScript and
   returned no text. The statutory text quoted above is current as published, so the *rules* are
   reliable; only the *what-changed* attribution for these four is open.
3. **Delayed effective dates inside the 2026 speed-camera acts.** DLS notes them without
   specifying which provisions. Verify before writing any dated camera-enforcement item.
4. **§46.2-1156.1 penalty amount** for transporting an under-16 in a truck bed. The prohibition is
   confirmed; the penalty is not stated in the section.
