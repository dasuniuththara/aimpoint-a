"""
AimPointAI - Tier 4: Expert Pedagogical Remediation Engine and Mechanics Ontology
Translates Deep Learning Diagnostic Classifications into Actionable Coaching Feedback
Grounded in Sports Biomechanics Research (Thesis Sections 3.5.1 - 3.5.4)
"""

import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass

@dataclass
class CoachingCard:
    fault_id: int
    fault_name: str
    severity_level: int
    severity_name: str
    confidence_score: float
    deviation_degrees: float
    why_it_matters: str
    prescribed_drill: str
    drill_sets_reps: str
    actionable_cue: str
    ideal_benchmark: str
    measured_metric: str

class PedagogicalEngine:
    """
    Expert rule-based decision engine structured around basketball shooting mechanics ontology.
    Implements 'Actionable Minimalism' to prevent athlete cognitive overload.
    """
    
    # Empirical statistical reference baselines derived from 15,000+ kinematic data rows
    BENCHMARKS = {
        "ideal_elbow_flexion": 88.51,    # Degrees at loading apex
        "ideal_trunk_tilt": 25.55,       # Degrees from vertical
        "ideal_follow_through": 24.71,   # Degrees wrist flexion
        "ideal_release_angle": 52.00,    # Degrees above horizontal
        
        # Clinical Fault Thresholds (Thesis Section 4.4.3 & clvi)
        "low_elbow_threshold": 43.34,
        "imbalanced_base_threshold": 48.66,
        "short_follow_through_threshold": 11.73
    }
    
    # Structured Pedagogical Drill Library
    DRILL_REPOSITORY = {
        0: { # Ideal Form
            "title": "Form Shooting Progression",
            "sets_reps": "3 sets of 15 makes",
            "cue": "Maintain rhythmic rhythm from 5 feet; focus on consistent high release and soft touch.",
            "description": "Step 5 feet from the rim. Focus on fluid kinetic transfer from ankles to fingertips."
        },
        1: { # Low Elbow Set Point
            "title": "One-Handed Wall Touches",
            "sets_reps": "4 sets of 15 repetitions",
            "cue": "Keep your shooting elbow tucked above eyebrow level before initiating upward thrust.",
            "description": "Stand 6 inches from a gym wall. Elevate your shooting arm so the ball brushes the wall without your elbow flaring outward or dropping."
        },
        2: { # Short Follow-Through
            "title": "Gooey Wrist-Snap Holds",
            "sets_reps": "3 sets of 20 repetitions",
            "cue": "Hold your 'goose neck' follow-through until the basketball touches the hardwood.",
            "description": "Shoot stationary form shots into the air or basket. Keep the shooting wrist fully flexed downward with fingers pointed towards the floor for 2 full seconds."
        },
        3: { # Imbalanced Base
            "title": "Line Jump Shooting",
            "sets_reps": "4 sets of 12 repetitions",
            "cue": "Land with balanced shoulder-width feet exactly on the painted sideline without swaying.",
            "description": "Align your shooting foot along the sideline. Jump vertically, release, and land smoothly in the identical footprint with zero lateral lean."
        },
        4: { # Early Release
            "title": "Chair Dip Rhythm Shooting",
            "sets_reps": "3 sets of 15 repetitions",
            "cue": "Allow your legs to reach 90% full extension before unlocking your elbow and wrist.",
            "description": "Begin with hips loaded over a chair. Rise upward into full triple extension before initiating the arm lift, coordinating momentum transfer."
        }
    }

    # Biomechanical Consequence Explanations ("Why It Matters" - Thesis Section 3.5.3)
    CONSEQUENCE_MAPPING = {
        0: "Your kinetic chain demonstrates optimal sequential power transfer and release trajectory. Maintain this muscle memory.",
        1: "Pushing the ball outward rather than elevating upward flattens your launch angle, increasing sensitivity to release velocity errors and causing front-rim misses.",
        2: "Truncating wrist extension immediately after release eliminates aerodynamic backspin, producing inconsistent ball flight and unpredictable bounces off the rim.",
        3: "Excessive trunk tilt and lateral sway disrupt the vertical kinetic chain, leaking momentum and introducing rotational torque that pushes shots left or right.",
        4: "Releasing the ball before lower-body leg drive peaks forces the shoulder and arm muscles to overcompensate, degrading touch and shooting distance consistency."
    }

    def determine_severity(self, delta_degrees: float) -> Tuple[int, str]:
        """
        Grades error severity into discrete clinical tiers (Thesis Section 3.5.2):
        Level 0 (Optimal Execution): delta == 0
        Level 1 (Minor Form Deviation): 0 < delta <= 10 deg
        Level 2 (Moderate Form Fault): 10 < delta <= 20 deg
        Level 3 (Major Technique Flaw): delta > 20 deg
        """
        abs_delta = abs(delta_degrees)
        if abs_delta == 0:
            return 0, "Optimal Execution"
        elif abs_delta <= 10.0:
            return 1, "Minor Form Deviation"
        elif abs_delta <= 20.0:
            return 2, "Moderate Form Fault"
        else:
            return 3, "Major Technique Flaw"

    def evaluate(self, 
                 model_class: int, 
                 confidence: float, 
                 kinematics: Dict[str, Any]) -> CoachingCard:
        """
        Evaluates model predictions and raw kinematic metrics through the ontology rules
        to generate the definitive, actionable Coaching Card.
        """
        fault_name = {
            0: "Ideal Form",
            1: "Low Elbow Set Point",
            2: "Short Follow-Through",
            3: "Imbalanced Base",
            4: "Early Release"
        }.get(model_class, "Ideal Form")

        # Compute specific angular deviation from optimal baseline
        elbow_min = float(np.min(kinematics.get("elbow_angles", [self.BENCHMARKS["ideal_elbow_flexion"]])))
        trunk_max = float(np.max(kinematics.get("trunk_tilt", [self.BENCHMARKS["ideal_trunk_tilt"]])))
        follow_through_angle = float(kinematics.get("release_angles", [self.BENCHMARKS["ideal_release_angle"]])[-1])

        if model_class == 1: # Low Elbow Set Point
            delta = self.BENCHMARKS["ideal_elbow_flexion"] - elbow_min
            measured = f"{elbow_min:.1f}°"
            benchmark = f"{self.BENCHMARKS['ideal_elbow_flexion']:.1f}° (>43.3° min)"
        elif model_class == 2: # Short Follow-Through
            delta = self.BENCHMARKS["ideal_follow_through"] - follow_through_angle
            measured = f"{follow_through_angle:.1f}°"
            benchmark = f"{self.BENCHMARKS['ideal_follow_through']:.1f}°"
        elif model_class == 3: # Imbalanced Base
            delta = trunk_max - self.BENCHMARKS["ideal_trunk_tilt"]
            measured = f"{trunk_max:.1f}° tilt"
            benchmark = f"{self.BENCHMARKS['ideal_trunk_tilt']:.1f}° max"
        elif model_class == 4: # Early Release
            # Temporal delta (ms desynchronization)
            delta = 15.0 # default moderate
            measured = "Wrist released prior to leg drive peak"
            benchmark = "Simultaneous peak extension at apex"
        else:
            delta = 0.0
            measured = f"Release: {follow_through_angle:.1f}°, Elbow: {elbow_min:.1f}°"
            benchmark = "All kinematic checkpoints optimal"

        sev_level, sev_name = self.determine_severity(delta)
        drill_info = self.DRILL_REPOSITORY.get(model_class, self.DRILL_REPOSITORY[0])
        consequence = self.CONSEQUENCE_MAPPING.get(model_class, self.CONSEQUENCE_MAPPING[0])

        return CoachingCard(
            fault_id=model_class,
            fault_name=fault_name,
            severity_level=sev_level,
            severity_name=sev_name,
            confidence_score=float(confidence),
            deviation_degrees=round(float(delta), 1),
            why_it_matters=consequence,
            prescribed_drill=drill_info["title"],
            drill_sets_reps=drill_info["sets_reps"],
            actionable_cue=drill_info["cue"],
            ideal_benchmark=benchmark,
            measured_metric=measured
        )

    def audit_all_checkpoints(self, kinematics: Dict[str, Any], release_angle: float) -> List[Dict[str, str]]:
        """
        Objective 1 Comprehensive Checkpoint Audit:
        Evaluates all 5 critical shooting checkpoints (elbow alignment, knee flexion,
        release angle, base stability, and follow-through mechanics) with per-checkpoint advice.
        """
        elbow_arr = np.array(kinematics.get("elbow_angles", [88.5]), dtype=float)
        knee_arr = np.array(kinematics.get("knee_angles", [115.0]), dtype=float)
        trunk_arr = np.array(kinematics.get("trunk_tilt", [24.0]), dtype=float)
        wrist_vel = np.array(kinematics.get("wrist_y_vel", [0.0]), dtype=float)

        elbow_min = float(np.min(elbow_arr))
        elbow_max = float(np.max(elbow_arr))
        knee_min = float(np.min(knee_arr))
        trunk_max = float(np.max(trunk_arr))

        audits: List[Dict[str, str]] = []

        # 1. Elbow Set-Point Alignment
        if elbow_min < self.BENCHMARKS["low_elbow_threshold"]:
            audits.append({
                "checkpoint": "Elbow Alignment",
                "measured": f"{elbow_min:.1f}°",
                "target": "85°–95° (≥43.3°)",
                "status": "FAULT",
                "advice": "Raise shooting elbow to eyebrow height before extending upward to avoid flat shots."
            })
        else:
            audits.append({
                "checkpoint": "Elbow Alignment",
                "measured": f"{elbow_min:.1f}°",
                "target": "85°–95°",
                "status": "PASS",
                "advice": "Good elbow stack directly under the ball during loading."
            })

        # 2. Knee Flexion & Leg Drive
        if knee_min > 158.0 or knee_min < 70.0:
            audits.append({
                "checkpoint": "Knee Flexion",
                "measured": f"{knee_min:.1f}°",
                "target": "100°–145° dip",
                "status": "FAULT",
                "advice": "Bend knees smoothly into an athletic dip (~110°–130°) to generate lower-body upward power."
            })
        else:
            audits.append({
                "checkpoint": "Knee Flexion",
                "measured": f"{knee_min:.1f}°",
                "target": "100°–145° dip",
                "status": "PASS",
                "advice": "Balanced knee load transferring momentum smoothly upward."
            })

        # 3. Release Trajectory Elevation
        if release_angle < 38.0 or release_angle > 68.0:
            audits.append({
                "checkpoint": "Release Angle",
                "measured": f"{release_angle:.1f}°",
                "target": "45°–58° (52° ideal)",
                "status": "FAULT",
                "advice": "Aim forearm trajectory higher at release (around 50°–55°) to improve basket entry arc."
            })
        else:
            audits.append({
                "checkpoint": "Release Angle",
                "measured": f"{release_angle:.1f}°",
                "target": "45°–58°",
                "status": "PASS",
                "advice": "Release angle gives an effective shooting arc toward the rim."
            })

        # 4. Base Stability / Trunk Tilt
        if trunk_max > self.BENCHMARKS["imbalanced_base_threshold"]:
            audits.append({
                "checkpoint": "Base Stability",
                "measured": f"{trunk_max:.1f}° tilt",
                "target": "<48.7° tilt",
                "status": "FAULT",
                "advice": "Keep torso upright and land on the same floor spot without leaning sideways or drifting."
            })
        else:
            audits.append({
                "checkpoint": "Base Stability",
                "measured": f"{trunk_max:.1f}° tilt",
                "target": "<48.7° tilt",
                "status": "PASS",
                "advice": "Stable upright core maintaining straight vertical alignment."
            })

        # 5. Follow-Through Extension Mechanics
        if elbow_max < 155.0:
            audits.append({
                "checkpoint": "Follow-Through",
                "measured": f"{elbow_max:.1f}° ext",
                "target": "≥155° full ext",
                "status": "FAULT",
                "advice": "Fully lock out your shooting elbow and hold the downward wrist snap until the ball lands."
            })
        else:
            audits.append({
                "checkpoint": "Follow-Through",
                "measured": f"{elbow_max:.1f}° ext",
                "target": "≥155° full ext",
                "status": "PASS",
                "advice": "Full elbow extension and clean wrist snap follow-through."
            })

        return audits

# Global singleton instance for high-throughput evaluation
pedagogical_engine = PedagogicalEngine()
