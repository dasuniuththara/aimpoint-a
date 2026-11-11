"""
AimPointAI - Tier 2: Preprocessing and Kinematic Feature Extraction Engine
Grounded in Sports Biomechanics and MediaPipe BlazePose Landmark Tracking
Formulated according to Thesis Chapter 3 (Sections 3.3.1 - 3.3.4)
"""

import math
import numpy as np
from typing import Dict, List, Tuple, Any, Optional

# MediaPipe BlazePose 33-Landmark Standard Indices
LANDMARK_NOSE = 0
LANDMARK_LEFT_SHOULDER = 11
LANDMARK_RIGHT_SHOULDER = 12
LANDMARK_LEFT_ELBOW = 13
LANDMARK_RIGHT_ELBOW = 14
LANDMARK_LEFT_WRIST = 15
LANDMARK_RIGHT_WRIST = 16
LANDMARK_LEFT_HIP = 23
LANDMARK_RIGHT_HIP = 24
LANDMARK_LEFT_KNEE = 25
LANDMARK_RIGHT_KNEE = 26
LANDMARK_LEFT_ANKLE = 27
LANDMARK_RIGHT_ANKLE = 28

# Standard Basketball Shooting Fault Taxonomy
FAULT_CLASSES = {
    0: "Ideal Form",
    1: "Low Elbow Set Point",
    2: "Short Follow-Through",
    3: "Imbalanced Base",
    4: "Early Release"
}

def calculate_angle_3d(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """
    Computes the interior 3D joint angle (in degrees) at vertex B
    between vector BA and vector BC using the dot product formula:
    theta(t) = arccos( (BA . BC) / (||BA|| * ||BC||) )
    (Thesis Section 3.3.2)
    """
    ba = a - b
    bc = c - b
    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)
    
    denom = norm_ba * norm_bc
    if denom < 1e-7:
        return 0.0
        
    cosine_angle = np.dot(ba, bc) / denom
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosine_angle)))

# Pre-computed Savitzky-Golay filter coefficients (Window=7, Polynomial order=2)
# Preserves higher-order movement moments with zero matrix inversion overhead (Thesis Section 3.3.3)
_SG_COEFFS = np.array([-2.0, 3.0, 6.0, 7.0, 6.0, 3.0, -2.0], dtype=np.float32) / 21.0

def savitzky_golay_filter(y: np.ndarray, window_size: int = 7, order: int = 2) -> np.ndarray:
    """
    Suppresses high-frequency tracking jitter and monocular occlusion artifacts
    using pre-computed Savitzky-Golay coefficients (Thesis Section 3.3.3).
    """
    n = len(y)
    if n < 7:
        return y
        
    half_window = 3
    # Reflection boundary padding
    firstvals = 2 * y[0] - y[1:half_window + 1][::-1]
    lastvals = 2 * y[-1] - y[-half_window - 1:-1][::-1]
    y_padded = np.concatenate((firstvals, y, lastvals))
    return np.convolve(_SG_COEFFS, y_padded, mode='valid')

class KinematicFeatureExtractor:
    """
    Extracts spatial, angular, and derivative features across temporal frames
    representing a basketball shooting repetition (T=60 frames @ 30fps).
    """
    def __init__(self, target_frames: int = 60):
        self.target_frames = target_frames

    def normalize_spatial_coordinates(self, landmarks_seq: np.ndarray) -> np.ndarray:
        """
        Spatial Normalization & Pelvic Centering (Thesis Section 3.3.1):
        Centers coordinates relative to pelvic root (midpoint of hips)
        and scales by torso length (Euclidean distance between shoulder center and pelvic root).
        Input shape: (T, 33, 3)
        Output shape: (T, 33, 3) normalized
        """
        T = landmarks_seq.shape[0]
        normalized = np.zeros_like(landmarks_seq)
        
        for t in range(T):
            frame = landmarks_seq[t]
            # Hip center (pelvic root: index 23 Left Hip, 24 Right Hip)
            pelvic_root = (frame[LANDMARK_LEFT_HIP] + frame[LANDMARK_RIGHT_HIP]) / 2.0
            
            # Midpoint of shoulders (index 11 Left Shoulder, 12 Right Shoulder)
            mid_shoulder = (frame[LANDMARK_LEFT_SHOULDER] + frame[LANDMARK_RIGHT_SHOULDER]) / 2.0
            
            # Torso length S_torso
            torso_length = np.linalg.norm(mid_shoulder - pelvic_root)
            if torso_length < 1e-4:
                torso_length = 1.0  # Avoid division by zero
                
            # Translate to pelvic root and scale
            normalized[t] = (frame - pelvic_root) / torso_length
            
        return normalized

    def extract_kinematic_channels(self, landmarks_seq: np.ndarray) -> Dict[str, np.ndarray]:
        """
        Calculates biomechanical joint angles across temporal frames:
        - Elbow flexion (Shoulder -> Elbow -> Wrist)
        - Knee flexion (Hip -> Knee -> Ankle)
        - Trunk tilt (Vertical alignment of torso)
        - Release angle & Wrist vertical trajectory
        """
        T = landmarks_seq.shape[0]
        elbow_angles = np.zeros(T)
        knee_angles = np.zeros(T)
        trunk_tilt = np.zeros(T)
        wrist_y_positions = np.zeros(T)
        release_angles = np.zeros(T)
        
        for t in range(T):
            f = landmarks_seq[t]
            
            # Shooting side (default to right side / dominant arm)
            # Right elbow flexion: Shoulder(12) -> Elbow(14) -> Wrist(16)
            sh = f[LANDMARK_RIGHT_SHOULDER]
            el = f[LANDMARK_RIGHT_ELBOW]
            wr = f[LANDMARK_RIGHT_WRIST]
            elbow_angles[t] = calculate_angle_3d(sh, el, wr)
            
            # Right knee flexion: Hip(24) -> Knee(26) -> Ankle(28)
            hp = f[LANDMARK_RIGHT_HIP]
            kn = f[LANDMARK_RIGHT_KNEE]
            ak = f[LANDMARK_RIGHT_ANKLE]
            knee_angles[t] = calculate_angle_3d(hp, kn, ak)
            
            # Trunk tilt relative to vertical Y-axis
            torso_vec = sh - hp
            vert_vec = np.array([0.0, -1.0, 0.0]) # Screen space up
            trunk_tilt[t] = calculate_angle_3d(sh, hp, hp + vert_vec)
            
            # Wrist vertical position (higher elevation = lower Y in screen coordinates, or normalized)
            wrist_y_positions[t] = -wr[1]  # Inverted so upward elevation is positive
            
            # True 3D forearm elevation angle relative to horizontal ground plane (XZ plane)
            forearm_vec = wr - el
            horiz_dist = math.hypot(float(forearm_vec[0]), float(forearm_vec[2]))
            elev_deg = math.degrees(math.atan2(-float(forearm_vec[1]), max(1e-6, horiz_dist)))
            release_angles[t] = max(0.0, min(90.0, elev_deg))

        # Apply Savitzky-Golay temporal smoothing (Thesis Section 3.3.3)
        elbow_angles = savitzky_golay_filter(elbow_angles)
        knee_angles = savitzky_golay_filter(knee_angles)
        trunk_tilt = savitzky_golay_filter(trunk_tilt)
        wrist_y_positions = savitzky_golay_filter(wrist_y_positions)
        release_angles = np.clip(savitzky_golay_filter(release_angles), 0.0, 90.0)

        # Calculate first-order temporal derivatives: Angular velocities (Thesis Section 3.3.4)
        dt = 1.0 / 30.0  # 30 fps
        elbow_vel = np.gradient(elbow_angles, dt)
        knee_vel = np.gradient(knee_angles, dt)
        wrist_y_vel = np.gradient(wrist_y_positions, dt)
        trunk_vel = np.gradient(trunk_tilt, dt)
        
        # Second-order temporal derivatives: Angular accelerations
        elbow_acc = np.gradient(elbow_vel, dt)
        knee_acc = np.gradient(knee_vel, dt)

        return {
            "elbow_angles": elbow_angles,
            "knee_angles": knee_angles,
            "trunk_tilt": trunk_tilt,
            "wrist_y_positions": wrist_y_positions,
            "release_angles": release_angles,
            "elbow_vel": elbow_vel,
            "knee_vel": knee_vel,
            "wrist_y_vel": wrist_y_vel,
            "trunk_vel": trunk_vel,
            "elbow_acc": elbow_acc,
            "knee_acc": knee_acc
        }

    def construct_feature_tensor(self, landmarks_seq: np.ndarray) -> np.ndarray:
        """
        Builds the 12-dimensional core kinematic tensor x in R^(T x 12)
        and concatenated normalized coordinates used by the Res-TCN / BiLSTM classifier.
        Features per frame:
        [elbow_angle, knee_angle, trunk_tilt, wrist_y_pos, release_angle,
         elbow_vel, knee_vel, wrist_y_vel, trunk_vel, elbow_acc, knee_acc, release_vel]
        """
        channels = self.extract_kinematic_channels(landmarks_seq)
        T = landmarks_seq.shape[0]
        
        release_vel = np.gradient(channels["release_angles"], 1.0/30.0)
        
        feature_matrix = np.column_stack([
            channels["elbow_angles"],
            channels["knee_angles"],
            channels["trunk_tilt"],
            channels["wrist_y_positions"],
            channels["release_angles"],
            channels["elbow_vel"],
            channels["knee_vel"],
            channels["wrist_y_vel"],
            channels["trunk_vel"],
            channels["elbow_acc"],
            channels["knee_acc"],
            release_vel
        ]) # Shape: (T, 12)
        
        # Standardize / interpolate to exact target_frames (e.g. 60)
        if T != self.target_frames:
            orig_indices = np.linspace(0, T - 1, T)
            target_indices = np.linspace(0, T - 1, self.target_frames)
            resampled = np.zeros((self.target_frames, 12))
            for dim in range(12):
                resampled[:, dim] = np.interp(target_indices, orig_indices, feature_matrix[:, dim])
            return resampled.astype(np.float32)
            
        return feature_matrix.astype(np.float32)

    def generate_synthetic_shot_landmarks(self, fault_type: int = 0) -> np.ndarray:
        """
        Generates realistic 3D human pose landmark trajectories for testing
        and commercial demonstration across the 5 basketball shooting conditions:
        0: Ideal Form
        1: Low Elbow Set Point (min elbow < 43.34°)
        2: Short Follow-Through (incomplete extension < 155°)
        3: Imbalanced Base (trunk tilt > 48.66°)
        4: Early Release (wrist velocity peak before knee drive)
        """
        T = self.target_frames
        t_steps = np.linspace(0, 2.0, T) # 2-second shot sequence
        landmarks = np.zeros((T, 33, 3), dtype=np.float32)
        
        for i in range(T):
            t = t_steps[i]
            
            # Kinetic phases:
            # 0.0s - 0.7s: Gathering / Crouch (Knees flex)
            # 0.7s - 1.2s: Elevation / Extension (Hips, knees extend, arm elevates)
            # 1.2s - 1.4s: Release apex (Elbow extends, wrist flicks)
            # 1.4s - 2.0s: Landing & Follow-through hold
            
            crouch_factor = np.exp(-((t - 0.5) / 0.22)**2)
            lift_factor = 1.0 / (1.0 + np.exp(-12 * (t - 0.85)))
            release_factor = 1.0 / (1.0 + np.exp(-22 * (t - 1.22)))
            
            # Pelvis / Hips (Index 23 L-Hip, 24 R-Hip)
            hip_y = 0.0 + 0.18 * crouch_factor
            landmarks[i, LANDMARK_LEFT_HIP] = [-0.15, hip_y, 0.0]
            landmarks[i, LANDMARK_RIGHT_HIP] = [0.15, hip_y, 0.0]
            
            # Knees & Ankles (Index 25/26 Knee, 27/28 Ankle)
            if fault_type == 4: # Early Release: Leg extension is delayed while arm fires
                knee_bend = 0.35 * np.exp(-((t - 1.05) / 0.3)**2)
            else:
                knee_bend = 0.30 * crouch_factor
                
            landmarks[i, LANDMARK_LEFT_KNEE] = [-0.15, hip_y + 0.45, -0.05 + knee_bend]
            landmarks[i, LANDMARK_RIGHT_KNEE] = [0.15, hip_y + 0.45, -0.05 + knee_bend]
            landmarks[i, LANDMARK_LEFT_ANKLE] = [-0.15, hip_y + 0.90, 0.0]
            landmarks[i, LANDMARK_RIGHT_ANKLE] = [0.15, hip_y + 0.90, 0.0]
            
            # Torso & Trunk Tilt (Index 11 L-Shoulder, 12 R-Shoulder)
            if fault_type == 3: # Imbalanced Base: Severe trunk tilt > 48.66°
                tilt_rad = np.radians(52.0 * np.sin(t * np.pi / 2.0))
            else: # Normal upright athletic posture (~25° forward lean)
                tilt_rad = np.radians(24.0 + 4.0 * crouch_factor)
                
            sh_dx = 0.55 * np.sin(tilt_rad)
            sh_dy = -0.55 * np.cos(tilt_rad)
            
            sh_r = np.array([0.18 + sh_dx, hip_y + sh_dy, 0.05], dtype=np.float32)
            sh_l = np.array([-0.18 + sh_dx, hip_y + sh_dy, 0.0], dtype=np.float32)
            landmarks[i, LANDMARK_LEFT_SHOULDER] = sh_l
            landmarks[i, LANDMARK_RIGHT_SHOULDER] = sh_r
            landmarks[i, LANDMARK_NOSE] = [sh_dx, hip_y + sh_dy - 0.22, 0.08]
            
            # Shooting Arm Biomechanics: Shoulder(12) -> Elbow(14) -> Wrist(16)
            # Upper arm length ~ 0.30, Forearm length ~ 0.28
            L1 = 0.30
            L2 = 0.28
            
            # Shoulder elevation angle (raising upper arm upward toward 52° optimal launch elevation)
            shoulder_elev_deg = 20.0 + 124.0 * lift_factor # from 20° to 144°
            sh_elev_rad = np.radians(shoulder_elev_deg)
            
            # Elbow flexion angle theta
            if fault_type == 1: # Low Elbow Set Point (elbow dropped < 43.34°)
                current_elbow_deg = 36.0 + 40.0 * release_factor
            elif fault_type == 2: # Short Follow-Through (truncated extension < 155°)
                current_elbow_deg = 88.5 + 48.0 * release_factor # Stops at ~136°
            else: # Ideal & Early Release
                current_elbow_deg = 88.5 + 85.0 * release_factor # Fluid extension to ~173.5°
                
            elbow_flex_rad = np.radians(current_elbow_deg)
            
            # Position Elbow relative to Shoulder
            el_y = sh_r[1] + L1 * np.cos(sh_elev_rad)
            el_z = sh_r[2] + L1 * np.sin(sh_elev_rad)
            el_r = np.array([sh_r[0] + 0.05, el_y, el_z], dtype=np.float32)
            landmarks[i, LANDMARK_RIGHT_ELBOW] = el_r
            
            # Position Wrist relative to Elbow using interior angle theta
            forearm_angle_rad = sh_elev_rad - (np.pi - elbow_flex_rad)
            wr_y = el_y + L2 * np.cos(forearm_angle_rad)
            wr_z = el_z + L2 * np.sin(forearm_angle_rad)
            
            if fault_type == 2 and t > 1.32: # Truncated wrist snap / collapses early
                wr_y += 0.12 # drops down
                
            if fault_type == 4: # Early Release: wrist snaps prematurely at t=0.75s
                early_lift = 1.0 / (1.0 + np.exp(-25 * (t - 0.75)))
                wr_y = el_y + L2 * np.cos(sh_elev_rad - (np.pi - np.radians(88.5 + 85.0 * early_lift)))
                wr_z = el_z + L2 * np.sin(sh_elev_rad - (np.pi - np.radians(88.5 + 85.0 * early_lift)))
                
            landmarks[i, LANDMARK_RIGHT_WRIST] = np.array([el_r[0], wr_y, wr_z], dtype=np.float32)
            
            # Guide Hand (Left arm)
            landmarks[i, LANDMARK_LEFT_ELBOW] = [-0.22, hip_y - 0.30, 0.20]
            landmarks[i, LANDMARK_LEFT_WRIST] = [-0.14, hip_y - 0.45, 0.30]
            
        return landmarks


def identify_biomechanical_frames(kinematics: Dict[str, np.ndarray], T: int = 60) -> List[Dict[str, Any]]:
    """
    Identifies the 4 clinically significant biomechanical keyframes from a shooting sequence:
    1. Dip / Shot Pocket (Peak knee crouch loading)
    2. Elbow Set-Point (Primary elbow flexion loading angle)
    3. Ball Release Apex (Peak upward wrist velocity / propulsion transition)
    4. Follow-Through Hold (Peak elbow extension hold)
    """
    elbow = np.array(kinematics["elbow_angles"], dtype=float)
    knee = np.array(kinematics["knee_angles"], dtype=float)
    trunk = np.array(kinematics["trunk_tilt"], dtype=float)
    release = np.array(kinematics["release_angles"], dtype=float)
    wrist_vel = np.array(kinematics["wrist_y_vel"], dtype=float)

    n = min(T, len(elbow), len(knee), len(trunk), len(release), len(wrist_vel))
    if n < 4:
        return []

    # 1. Dip / Shot Pocket: minimum knee flexion angle in first 45% of shot
    dip_end = max(2, int(n * 0.45))
    dip_idx = int(np.argmin(knee[:dip_end]))

    # 2. Set Point: minimum elbow flexion angle after dip initiation prior to propulsion
    set_start = min(n - 3, dip_idx + 2)
    set_end = max(set_start + 2, int(n * 0.72))
    set_idx = set_start + int(np.argmin(elbow[set_start:set_end]))

    # 3. Release Apex: peak upward wrist velocity during propulsion/release
    rel_start = max(set_idx + 1, int(n * 0.40))
    rel_end = max(rel_start + 2, int(n * 0.85))
    rel_idx = rel_start + int(np.argmax(wrist_vel[rel_start:rel_end]))

    # 4. Follow-Through Hold: maximum elbow extension from release onward
    ft_start = min(n - 1, rel_idx + 1)
    ft_idx = ft_start + int(np.argmax(elbow[ft_start:]))

    def build_frame_entry(frame_id: str, phase: str, title: str, desc: str, idx: int) -> Dict[str, Any]:
        wf_idx = min(29, max(0, idx // 2))
        return {
            "id": frame_id,
            "phase": phase,
            "title": title,
            "description": desc,
            "raw_frame": int(idx),
            "frame_idx": int(wf_idx),
            "time_sec": round(idx / 30.0, 2),
            "progress_ratio": round(idx / max(1, n - 1), 4),
            "elbow_deg": round(float(elbow[idx]), 1),
            "knee_deg": round(float(knee[idx]), 1),
            "trunk_deg": round(float(trunk[idx]), 1),
            "release_deg": round(float(release[idx]), 1),
        }

    return [
        build_frame_entry(
            "dip", "PHASE 1", "Shot Pocket / Dip",
            "Max knee crouch loading prior to vertical leg drive.", dip_idx
        ),
        build_frame_entry(
            "set_point", "PHASE 2", "Elbow Set-Point",
            "Elbow flexion loading check (Optimal: 85°–95°).", set_idx
        ),
        build_frame_entry(
            "release", "PHASE 3", "Ball Release Apex",
            "Peak wrist upward velocity & launch trajectory angle.", rel_idx
        ),
        build_frame_entry(
            "follow_through", "PHASE 4", "Follow-Through Hold",
            "Full arm extension & wrist snap hold (Target >= 155°).", ft_idx
        ),
    ]
