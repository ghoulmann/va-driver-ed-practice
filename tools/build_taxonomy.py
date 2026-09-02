#!/usr/bin/env python3
"""Write data/taxonomy.json.

The spine is Appendix C of VDOE's *Module 13 Curriculum Guide for Behind-the-Wheel
In-Car Instruction* -- the 2022 Virginia Standards of Learning for Driver Education,
DE.1 through DE.24.  The behind-the-wheel skills come from that guide's Appendix B and
its seven sample lessons.

Transcribed by hand from the guide; this script is the single place they live, so a
correction happens once and regenerates the data file.  Offline, no dependencies.
"""

import json
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "taxonomy.json"

SOURCE = {
    "title": "2022 Virginia Standards of Learning for Driver Education",
    "publisher": "Virginia Department of Education",
    "document": "Curriculum Guide for Behind-the-Wheel In-Car Instruction, Module 13",
    "appendix": "C",
}

# (id, statement, [(letter, concept), ...])
SOL = [
    ("DE.1", "Virginia traffic laws, the licensing process, and other driving responsibilities", [
        ("a", "graduated driver licensing, types of licenses, and required documentation"),
        ("b", "traffic safety information in the Virginia Driver's Manual"),
        ("c", "the motor vehicle section of the Code of Virginia"),
        ("d", "becoming an organ and tissue donor"),
    ]),
    ("DE.2", "Basic vehicle operating procedures", [
        ("a", "pre-driving procedures"),
        ("b", "starting procedures for automatic transmissions"),
        ("c", "vehicle information, warning, and control devices"),
        ("d", "efficient accelerating, braking, and steering techniques"),
        ("e", "vehicle securing procedures"),
    ]),
    ("DE.3", "Vehicle reference points to establish position and execute basic maneuvers", [
        ("a", "parking"),
        ("b", "turning"),
        ("c", "establishing lane position"),
        ("d", "backing"),
    ]),
    ("DE.4", "How laws of physics affect force of impact", [
        ("a", "sitting and hand position"),
        ("b", "steering, braking, and accelerating"),
        ("c", "compensating for shifts in vehicle load that affect performance"),
        ("d", "managing front tire traction loss (understeer) and rear tire traction loss (oversteer)"),
        ("e", "analyzing cause and severity of collision types: head-on, near-frontal, broadside, rear-end, rollover, sideswipe"),
    ]),
    ("DE.5", "Managing visibility, time, and space to reduce risk and avoid collisions", [
        ("a", "targeting and tracking skills"),
        ("b", "the SEEiT space-management decision-making process"),
        ("c", "following distance and space concepts"),
        ("d", "selecting appropriate speed, maintaining adequate space, and judging distance"),
        ("e", "estimating time and space needs for passing"),
        ("f", "identifying changes to line-of-sight and path-of-travel"),
        ("g", "responding to open and closed spaces"),
    ]),
    ("DE.6", "Adjustments at controlled and uncontrolled intersections, curves, work zones, railroad crossings, and hills", [
        ("a", "right-of-way rules"),
        ("b", "roadway signs, signals, and markings"),
        ("c", "slope/grade of terrain"),
        ("d", "vehicle position and speed control"),
    ]),
    ("DE.7", "Unique characteristics of an expressway and risk-management strategies", [
        ("a", "identifying various interchanges"),
        ("b", "entering, merging, and exiting from traffic flow"),
        ("c", "selecting vehicle position"),
        ("d", "changing lanes"),
        ("e", "preparing for higher speeds, limited access, and increased traffic"),
        ("f", "the interstate highway numbering system"),
    ]),
    ("DE.8", "Communication strategies to other highway transportation users", [
        ("a", "vehicle position and driver action"),
        ("b", "communication devices"),
        ("c", "hand signals for slow/stop, right turn, and left turn"),
    ]),
    ("DE.9", "Physiological, psychological, and cognitive effects of alcohol and other drugs", [
        ("a", "effects of alcohol, marijuana, and other drugs on the body"),
        ("b", "prescription and nonprescription medications"),
        ("c", "legal responsibility not to use alcohol and other drugs that affect safe operation"),
    ]),
    ("DE.10", "Legal and economic consequences of alcohol and other drug use while driving", [
        ("a", "Implied Consent, Use and Lose, and Zero Tolerance laws"),
        ("b", "drug laws"),
        ("c", "strategies for alternative means of safe transportation"),
        ("d", "consequences of impaired driving"),
    ]),
    ("DE.11", "Consequences of aggressive driving and the influence of emotions", [
        ("a", "stress and anxiety"),
        ("b", "anger management"),
        ("c", "the relationship between aggressive driving and road rage"),
        ("d", "legal and financial consequences of reckless driving and road rage"),
    ]),
    ("DE.12", "Effects of fatigue and other conditions that impact driver performance", [
        ("a", "fatigue warning signs, preventative measures, and self-assessment"),
        ("b", "circadian rhythms and sleep deprivation"),
        ("c", "short and long term physical and cognitive effects on the driving task"),
        ("d", "chronic health conditions that may affect the driving task"),
    ]),
    ("DE.13", "Visual, manual, and cognitive distractions and the impact of divided attention", [
        ("a", "distracted driving laws"),
        ("b", "strategies to prevent distractions"),
        ("c", "technology distractions"),
        ("d", "vehicle distractions"),
        ("e", "outdoor distractions"),
        ("f", "cost/benefit self-analysis"),
    ]),
    ("DE.14", "Environmental changes affecting visibility and traction", [
        ("a", "driving at night"),
        ("b", "fog and other weather-related conditions"),
        ("c", "road construction and other adverse road conditions"),
    ]),
    ("DE.15", "Proper use of vehicle occupant-protection features", [
        ("a", "restraint systems (active, passive, and child)"),
        ("b", "laws regarding passengers in truck beds"),
        ("c", "legal obligations"),
    ]),
    ("DE.16", "How technological advancements in safety design affect driving practices", [
        ("a", "driver/passenger protection"),
        ("b", "child safety"),
        ("c", "driver assistance technology"),
        ("d", "vehicle technology"),
        ("e", "autonomous driving features (five levels)"),
        ("f", "vehicle stability and traction control systems, including four-wheel, all-wheel, front-wheel, and rear-wheel drive on adverse road conditions"),
    ]),
    ("DE.17", "Emergency response strategies to avoid or reduce collision severity", [
        ("a", "how decisions are influenced by the environment, the vehicle, driver error, and driver capabilities"),
        ("b", "evasive maneuvers using braking and steering combinations"),
        ("c", "off-road recovery"),
    ]),
    ("DE.18", "Performance characteristics of other road users and sharing the roadway", [
        ("a", "pedestrians and animals"),
        ("b", "bicycles, scooters, mopeds, and motorcycles"),
        ("c", "tractor-trailers, trucks, and construction vehicles"),
        ("d", "sport utility vehicles, recreation vehicles, and trailers"),
        ("e", "emergency vehicles"),
        ("f", "funeral processions"),
        ("g", "passenger and school buses"),
        ("h", "farm machinery and horse-drawn vehicles"),
        ("i", "work zones"),
    ]),
    ("DE.19", "Vehicle braking systems and proper braking techniques", [
        ("a", "conventional brake systems including regenerative braking"),
        ("b", "controlled braking, trail braking, and threshold braking"),
        ("c", "antilock brake systems (ABS) and steering toward a target"),
        ("d", "how preventive maintenance reduces brake failure, including the rationale for annual state safety inspection"),
    ]),
    ("DE.20", "Preventive maintenance and warning signs of needed repair", [
        ("a", "vehicle warning devices"),
        ("b", "lights and signals"),
        ("c", "steering and suspension systems"),
        ("d", "tires and braking systems"),
        ("e", "fluids, cooling systems, and belts"),
        ("f", "appropriate disposal of batteries, fluids, tires, and other hazardous materials"),
    ]),
    ("DE.21", "Vehicle ownership responsibilities and operating costs", [
        ("a", "methods of purchasing or leasing a vehicle"),
        ("b", "different types of vehicles (hybrid, electric, traditional)"),
        ("c", "Financial Responsibility Law (Code of Virginia § 46.2-706)"),
        ("d", "required and optional insurance coverages"),
        ("e", "title and registration requirements"),
        ("f", "Virginia inspection and emissions expectations and requirements"),
        ("g", "regular and depreciation maintenance costs"),
    ]),
    ("DE.22", "Trip planning skills using available resources", [
        ("a", "navigation options for trip planning"),
        ("b", "safe and legal practices for using navigation tools while driving"),
        ("c", "route options when planning a trip"),
        ("d", "total cost of a trip including fuel, toll road, food, hotels, and entertainment"),
    ]),
    ("DE.23", "Personal transportation options and environmental impact", [
        ("a", "the purpose of emission testing and Virginia laws pertaining to testing and yearly license plate registration"),
        ("b", "safe consumer practices for public transportation and rideshare services including carpooling"),
        ("c", "environmental impact of public transportation, rideshare, or carpooling"),
        ("d", "energy conservation and alternative or renewable energy sources"),
        ("e", "green driving practices"),
    ]),
    ("DE.24", "Interacting with law enforcement and responding to a crash", [
        ("a", "appropriate interaction with law enforcement to reduce risk (safely pulling over, required documents, physical movements to reduce perceived threat)"),
        ("b", "driver responsibilities and rights during the law enforcement interaction"),
        ("c", "responsibilities at a crash scene"),
    ]),
]

# Behind-the-wheel skills: Appendix B and the seven sample lessons.
# (id, name, environment, ordered steps or key elements)
BTW_SKILLS = [
    ("btw.pre-drive", "Inside pre-drive checks", "low_risk", [
        "Place keys on dashboard", "Lock door", "Adjust seat for leg/heel position",
        "Adjust and secure restraints", "Adjust steering wheel",
        "Adjust side and rear mirrors", "Check that the parking brake is set",
    ]),
    ("btw.starting", "Starting the vehicle", "low_risk", [
        "Place key in ignition", "Place right foot on brake", "Unlock ignition",
        "Check gauges", "Put gear selector in park", "Start engine",
        "Select any accessories", "Select proper gear", "Check traffic",
        "Release parking brake",
    ]),
    ("btw.securing", "Securing the vehicle", "low_risk", [
        "Place selector in park", "Set the parking brake", "Turn off any accessories",
        "Turn off and lock ignition switch", "Remove restraints", "Check traffic",
        "Exit vehicle", "Lock door and activate alarms", "Remove items from the trunk",
    ]),
    ("btw.steering", "Push-pull (hand-to-hand) steering", "low_risk", [
        "Drive with hands at 9-3 or lower",
        "Pull the wheel in the direction of the turn",
        "Use the outside of the steering wheel rim",
        "Move the wheel continuously and smoothly into the turn",
        "When the hand reaches the bottom of the wheel, bring it up to 10 o'clock",
        "Return the wheel with the same smooth continuous motion until positioned in lane",
    ]),
    ("btw.lane-change", "Changing lanes", "moderate_risk", [
        "Check mirrors", "Signal", "Check blind zone", "Adjust speed",
        "Move when the way is clear", "Use minimal steering",
        "Establish lane position", "Cancel signal",
    ]),
    ("btw.turnabout-2pt", "Two-point turnabout (backing into a driveway)", "moderate_risk", [
        "Search for traffic behind",
        "Back into a driveway on the same side of the roadway",
        "Place vehicle in drive and signal",
        "Check for a gap in traffic",
    ]),
    ("btw.turnabout-3pt", "Three-point turnabout", "moderate_risk", [
        "Position the vehicle next to the right curb",
        "Move forward while turning the wheel sharply left toward the opposite side of the road",
        "Stop approximately one foot from the curb",
        "Shift to reverse; check traffic and back to the right until the front bumper is in the center of the road",
        "Shift to drive, target the center of the path of travel, and accelerate",
    ]),
    ("btw.park-perpendicular", "Perpendicular parking (pull in)", "moderate_risk", [
        "Signal intention and position the vehicle 5-6 feet from the space",
        "Move forward until the side mirror aligns with the first pavement marking",
        "Turn the wheel rapidly in the direction of the space, controlling speed",
        "Steer toward a target in the center of the space and straighten the wheels",
        "Position the front bumper 3-6 inches from the curb or end of space",
    ]),
    ("btw.park-perpendicular-back", "Backing into a perpendicular space", "moderate_risk", [
        "Signal intention and select the space",
        "Align your vehicle with the farthest line of the third spot up from the space",
        "Turn the steering wheel all the way in the direction of the space",
        "Back slowly, continuously checking mirrors for spacing and pedestrians",
        "Once centered in the space, straighten the wheel and back straight in using reference points",
    ]),
    ("btw.park-parallel", "Parallel parking", "complex", [
        "Give the proper signal and stop alongside the vehicle in front, bumpers even",
        "Shift to reverse and turn your head to see out of the rear window",
        "Steer hard right while moving slowly backward",
        "Stop when the back bumper of the front vehicle and the curb are visible in the sideview mirror",
        "Straighten the wheels and move back until the front bumpers are even",
        "Steer hard left while moving, then center the vehicle and straighten the wheels",
    ]),
    ("btw.passing", "Passing another vehicle", "complex", [
        "Position 2-3 seconds behind the vehicle; check mirrors, blind spot, and oncoming traffic",
        "Check ahead for safe passing distance and signal intention",
        "Accelerate into the passing lane to a legal, appropriate speed",
        "Monitor the path ahead and check the mirror for the passed vehicle's front",
        "Signal, return to the lane maintaining speed, and cancel the signal",
    ]),
    ("btw.expressway-enter", "Entering an expressway", "complex", [
        "Do not enter traffic at the start of the ramp",
        "Begin the signal",
        "Adjust speed to traffic flow in the acceleration lane",
        "Merge when a gap is available",
    ]),
    ("btw.expressway-exit", "Exiting an expressway", "complex", [
        "Begin the signal in advance",
        "Move into the deceleration lane",
        "Slow down within the deceleration lane, not before it",
        "Check the posted safe ramp speed",
    ]),
    ("btw.u-turn", "U-turn", "complex", [
        "Evaluate risk and select the safest location; check for a no-U-turn sign",
        "Begin in the left lane closest to the center or median",
        "Apply left signal and check traffic",
        "Creep and turn the wheel rapidly to the left",
        "Complete the turn into the far-right lane of the opposite flow and accelerate to speed",
    ]),
    ("btw.brake-failure", "Brake failure", "emergency", [
        "Pump the brake",
        "Shift to a lower gear",
        "Slowly apply the parking brake",
        "Scan for a safe place to roll to a stop",
    ]),
    ("btw.engine-failure", "Engine failure", "emergency", [
        "Maintain control of the travel path and steering",
        "Place the selector carefully in neutral",
        "Try to restart the engine",
        "If restart fails, signal and move out of traffic flow",
        "Scan for a safe place to stop and secure the vehicle",
    ]),
    ("btw.accelerator-failure", "Accelerator failure (stuck gas pedal)", "emergency", [
        "Maintain visual and steering control",
        "Shift to neutral",
        "Apply the brakes to reduce speed",
        "Warn other drivers",
        "Locate a safe stopping zone and pull over",
    ]),
    ("btw.off-road-recovery", "Off-road recovery", "emergency", [
        "Keep hands firmly on the wheel at 8 and 4 o'clock",
        "Ease off the accelerator and allow gradual slowing -- do not brake",
        "Drop both tires off the roadway and stay off-road to establish maximum control",
        "Determine a target and path of travel",
        "With speed under control, turn the wheel toward the target and ease onto the paved surface",
        "When the front tire is on the roadway, counter-steer to maintain lane position",
    ]),
]

# Road-skills-test automatic failures (Module 13, Day 7 lesson).
AUTOMATIC_FAILURES = [
    "Teacher intervention to maintain vehicle control",
    "Dangerous maneuvers",
    "Disobeys regulatory sign or signal",
    "Strikes an object",
    "Speeding 5 or more mph over the speed limit",
    "Failure to yield",
]


def build():
    return {
        "version": 1,
        "source": SOURCE,
        "sol": [
            {
                "id": sid,
                "statement": statement,
                "concepts": [{"id": f"{sid}{letter}", "letter": letter, "text": text}
                             for letter, text in concepts],
            }
            for sid, statement, concepts in SOL
        ],
        "btw_skills": [
            {"id": bid, "name": name, "environment": env, "steps": steps}
            for bid, name, env, steps in BTW_SKILLS
        ],
        "road_test_automatic_failures": AUTOMATIC_FAILURES,
    }


def main():
    data = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2) + "\n")
    concepts = sum(len(t["concepts"]) for t in data["sol"])
    print(f"{OUT}: {len(data['sol'])} SOL topics, {concepts} concepts, "
          f"{len(data['btw_skills'])} behind-the-wheel skills")


if __name__ == "__main__":
    main()
