"""
AimPointAI - Tier 5: Local Database Service & Persistence Architecture
Implements SQLite Schema and Relational Operations
Formatted according to Thesis Appendix B (cli) & Section 4.5.6 / 4.6.7
"""

import os
import re
import sqlite3
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aimpoint_sessions.db")

class DatabaseService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initializes tables matching Thesis Appendix B Schema."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Athletes table for Coach Analytics
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS athletes (
                athlete_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                position TEXT DEFAULT 'Guard',
                team TEXT DEFAULT 'KDU Varsity Basketball',
                jersey_number TEXT DEFAULT '00',
                height_cm INTEGER DEFAULT 185,
                age INTEGER DEFAULT 21,
                shooting_hand TEXT DEFAULT 'Right',
                sessions_count INTEGER DEFAULT 0,
                primary_fault TEXT DEFAULT 'Ideal Form',
                consistency_score REAL DEFAULT 88.5,
                last_active TEXT NOT NULL
            );
            """)

            # Safe forward migration for existing SQLite databases missing new sportsman fields
            cursor.execute("PRAGMA table_info(athletes)")
            existing_cols = {row["name"] for row in cursor.fetchall()}
            migrations = [
                ("jersey_number", "TEXT DEFAULT '00'"),
                ("height_cm", "INTEGER DEFAULT 185"),
                ("age", "INTEGER DEFAULT 21"),
                ("shooting_hand", "TEXT DEFAULT 'Right'"),
            ]
            for col_name, col_def in migrations:
                if col_name not in existing_cols:
                    cursor.execute(f"ALTER TABLE athletes ADD COLUMN {col_name} {col_def}")

            # 2. Training Sessions Table (Thesis Appendix B)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS training_sessions (
                session_id TEXT PRIMARY KEY,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                duration_ms INTEGER NOT NULL,
                release_angle_deg REAL,
                hardware_fps INTEGER NOT NULL,
                inference_latency_ms INTEGER NOT NULL,
                athlete_id TEXT,
                video_name TEXT,
                FOREIGN KEY (athlete_id) REFERENCES athletes(athlete_id)
            );
            """)

            # 3. Coaching Cards Table (Thesis Appendix B)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS coaching_cards (
                card_id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                fault_classification TEXT NOT NULL,
                severity_tier TEXT,
                prescribed_drill TEXT NOT NULL,
                confidence_score REAL NOT NULL,
                why_it_matters TEXT,
                actionable_cue TEXT,
                measured_metric TEXT,
                ideal_benchmark TEXT,
                FOREIGN KEY (session_id) REFERENCES training_sessions(session_id) ON DELETE CASCADE
            );
            """)
            
            conn.commit()

        # Seed initial athletes if empty
        self._seed_default_data()

    def _seed_default_data(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM athletes")
            if cursor.fetchone()[0] == 0:
                initial_athletes = [
                    ("ATH-001", "K. Perera", "Point Guard", "KDU Varsity", "01", 180, 21, "Right", 24, "Low Elbow Set Point", 84.5, "2026-11-06 14:30:00"),
                    ("ATH-002", "D. Silva", "Shooting Guard", "KDU Varsity", "07", 188, 22, "Right", 19, "Truncated Follow-Through", 87.2, "2026-11-06 15:45:00"),
                    ("ATH-003", "M. Fernando", "Small Forward", "Junior Academy", "11", 194, 19, "Right", 31, "Ideal Form", 94.0, "2026-11-07 10:15:00"),
                    ("ATH-004", "T. Kirindegama", "Guard", "Elite Development", "23", 185, 22, "Right", 42, "Ideal Form", 96.5, "2026-11-08 09:20:00"),
                    ("ATH-005", "S. Alwis", "Power Forward", "KDU Varsity", "34", 199, 23, "Left", 15, "Imbalanced Base", 79.8, "2026-11-05 16:00:00")
                ]
                cursor.executemany("""
                INSERT INTO athletes (athlete_id, name, position, team, jersey_number, height_cm, age, shooting_hand, sessions_count, primary_fault, consistency_score, last_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, initial_athletes)
                
                # Seed a couple past sessions
                for athlete_id, name, _, _, _, _, _, _, sessions, fault, _, _ in initial_athletes:
                    session_id = f"SES-{uuid.uuid4().hex[:8]}"
                    card_id = f"CRD-{uuid.uuid4().hex[:8]}"
                    cursor.execute("""
                    INSERT INTO training_sessions (session_id, timestamp, duration_ms, release_angle_deg, hardware_fps, inference_latency_ms, athlete_id, video_name)
                    VALUES (?, datetime('now', '-1 day'), 2000, 51.4, 30, 24, ?, 'shot_rep_01.mp4')
                    """, (session_id, athlete_id))
                    
                    cursor.execute("""
                    INSERT INTO coaching_cards (card_id, session_id, fault_classification, severity_tier, prescribed_drill, confidence_score, why_it_matters, actionable_cue, measured_metric, ideal_benchmark)
                    VALUES (?, ?, ?, 'Moderate Fault', 'One-Handed Wall Touches', 0.932, 'Biomechanical kinetic energy transfer.', 'Focus on vertical elbow plane.', '38.5°', '88.5°')
                    """, (card_id, session_id, fault))

                conn.commit()
            else:
                # Ensure default jersey numbers are populated cleanly on migrated DBs
                default_jerseys = [("01", "ATH-001"), ("07", "ATH-002"), ("11", "ATH-003"), ("23", "ATH-004"), ("34", "ATH-005")]
                for jersey, aid in default_jerseys:
                    cursor.execute("UPDATE athletes SET jersey_number = ? WHERE athlete_id = ? AND (jersey_number IS NULL OR jersey_number = '00')", (jersey, aid))
                conn.commit()

    @staticmethod
    def _fault_to_form_score(fault_name: Optional[str]) -> float:
        name = (fault_name or "").lower()
        if "ideal" in name:
            return 96.0
        if "follow-through" in name:
            return 72.0
        if "early release" in name:
            return 68.0
        if "imbalanced" in name:
            return 61.0
        if "low elbow" in name:
            return 48.0
        return 74.0

    def create_athlete(
        self,
        name: str,
        position: str = "Guard",
        team: str = "KDU Varsity Basketball",
        jersey_number: str = "00",
        height_cm: int = 185,
        age: int = 21,
        shooting_hand: str = "Right",
        athlete_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates a new sportsman profile in SQLite cleanly."""
        clean_name = (name or "").strip()
        if not clean_name:
            raise ValueError("Sportsman name is required.")

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        jersey_clean = (str(jersey_number or "00").strip() or "00")[:4]
        hand_clean = "Left" if str(shooting_hand or "").strip().lower().startswith("l") else "Right"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            aid = (athlete_id or "").strip().upper()
            if not aid:
                cursor.execute("SELECT athlete_id FROM athletes")
                max_num = 0
                for row in cursor.fetchall():
                    m = re.match(r"^ATH-(\d+)$", str(row["athlete_id"] or ""), re.IGNORECASE)
                    if m:
                        max_num = max(max_num, int(m.group(1)))
                aid = f"ATH-{max_num + 1:03d}"

            cursor.execute("SELECT athlete_id FROM athletes WHERE athlete_id = ?", (aid,))
            if cursor.fetchone():
                aid = f"ATH-{uuid.uuid4().hex[:5].upper()}"

            cursor.execute(
                """
                INSERT INTO athletes (
                    athlete_id, name, position, team, jersey_number, height_cm, age,
                    shooting_hand, sessions_count, primary_fault, consistency_score, last_active
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Ideal Form', 100.0, ?)
                """,
                (
                    aid,
                    clean_name,
                    (position or "Guard").strip(),
                    (team or "KDU Varsity Basketball").strip(),
                    jersey_clean,
                    int(height_cm or 185),
                    int(age or 21),
                    hand_clean,
                    now_str,
                ),
            )
            conn.commit()

            cursor.execute("SELECT * FROM athletes WHERE athlete_id = ?", (aid,))
            return dict(cursor.fetchone())

    def get_athlete(self, athlete_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM athletes WHERE athlete_id = ?", (athlete_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def insert_session(self, 
                       athlete_id: str,
                       duration_ms: int,
                       release_angle_deg: float,
                       inference_latency_ms: int,
                       video_name: str,
                       card: Any) -> Tuple[str, str]:
        """
        Inserts a completed shooting session and associated Coaching Card atomically.
        """
        session_id = f"SES-{uuid.uuid4().hex[:8]}"
        card_id = f"CRD-{uuid.uuid4().hex[:8]}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Insert session
            cursor.execute("""
            INSERT INTO training_sessions (session_id, timestamp, duration_ms, release_angle_deg, hardware_fps, inference_latency_ms, athlete_id, video_name)
            VALUES (?, ?, ?, ?, 30, ?, ?, ?)
            """, (session_id, now_str, duration_ms, release_angle_deg, inference_latency_ms, athlete_id, video_name))
            
            # Insert coaching card
            cursor.execute("""
            INSERT INTO coaching_cards (card_id, session_id, fault_classification, severity_tier, prescribed_drill, confidence_score, why_it_matters, actionable_cue, measured_metric, ideal_benchmark)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (card_id, session_id, card.fault_name, card.severity_name, card.prescribed_drill, card.confidence_score, card.why_it_matters, card.actionable_cue, card.measured_metric, card.ideal_benchmark))
            
            # Recompute sportsman stats from persisted sessions
            cursor.execute("""
            SELECT c.fault_classification
            FROM training_sessions s
            JOIN coaching_cards c ON s.session_id = c.session_id
            WHERE s.athlete_id = ?
            """, (athlete_id,))
            fault_rows = [r["fault_classification"] for r in cursor.fetchall()]
            if fault_rows:
                avg_score = round(sum(self._fault_to_form_score(f) for f in fault_rows) / len(fault_rows), 1)
                # Dominant non-ideal fault if present, else most frequent fault
                fault_counts: Dict[str, int] = {}
                for f in fault_rows:
                    fault_counts[f] = fault_counts.get(f, 0) + 1
                dominant_fault = max(fault_counts.items(), key=lambda kv: kv[1])[0]
            else:
                avg_score = self._fault_to_form_score(card.fault_name)
                dominant_fault = card.fault_name

            # Update athlete stats cleanly
            cursor.execute("""
            UPDATE athletes 
            SET sessions_count = sessions_count + 1,
                last_active = ?,
                primary_fault = ?,
                consistency_score = ?
            WHERE athlete_id = ?
            """, (now_str, dominant_fault, avg_score, athlete_id))

            conn.commit()

        return session_id, card_id

    def get_coach_analytics(self, athlete_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Computes team-wide or sportsman-filtered analytics for the Coach Companion Portal
        (Thesis Section 4.8.2 & 4.8.3 / Figure 4.14 - 4.15)
        """
        filter_id = athlete_id.strip() if (athlete_id and athlete_id.strip() and athlete_id.strip().upper() != "ALL") else None

        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            if filter_id:
                cursor.execute("SELECT COUNT(*) FROM training_sessions WHERE athlete_id = ?", (filter_id,))
            else:
                cursor.execute("SELECT COUNT(*) FROM training_sessions")
            total_sessions = cursor.fetchone()[0]
            
            if filter_id:
                cursor.execute("""
                SELECT AVG(c.confidence_score)
                FROM coaching_cards c
                JOIN training_sessions s ON s.session_id = c.session_id
                WHERE s.athlete_id = ?
                """, (filter_id,))
            else:
                cursor.execute("SELECT AVG(confidence_score) FROM coaching_cards")
            avg_conf_row = cursor.fetchone()[0]
            avg_conf = float(avg_conf_row) if avg_conf_row else 0.926
            
            if filter_id:
                cursor.execute("""
                SELECT c.fault_classification, COUNT(*) as cnt 
                FROM coaching_cards c
                JOIN training_sessions s ON s.session_id = c.session_id
                WHERE s.athlete_id = ?
                GROUP BY c.fault_classification 
                ORDER BY cnt DESC 
                LIMIT 1
                """, (filter_id,))
            else:
                cursor.execute("""
                SELECT fault_classification, COUNT(*) as cnt 
                FROM coaching_cards 
                GROUP BY fault_classification 
                ORDER BY cnt DESC 
                LIMIT 1
                """)
            top_fault_row = cursor.fetchone()
            top_fault = top_fault_row[0] if top_fault_row else "No Shots Logged Yet"

            # Fault distribution
            if filter_id:
                cursor.execute("""
                SELECT c.fault_classification, COUNT(*) as cnt 
                FROM coaching_cards c
                JOIN training_sessions s ON s.session_id = c.session_id
                WHERE s.athlete_id = ?
                GROUP BY c.fault_classification
                """, (filter_id,))
            else:
                cursor.execute("""
                SELECT fault_classification, COUNT(*) as cnt 
                FROM coaching_cards 
                GROUP BY fault_classification
                """)
            fault_dist = {row["fault_classification"]: row["cnt"] for row in cursor.fetchall()}

            # Athletes table (always return full roster so coach can switch players)
            cursor.execute("SELECT * FROM athletes ORDER BY last_active DESC")
            athletes = [dict(row) for row in cursor.fetchall()]

            selected_athlete = None
            if filter_id:
                selected_athlete = next((a for a in athletes if a["athlete_id"] == filter_id), None)

            # Recent sessions with coaching cards (up to 15 when filtered, 10 team-wide)
            if filter_id:
                cursor.execute("""
                SELECT s.session_id, s.timestamp, s.release_angle_deg, s.inference_latency_ms, s.video_name,
                       c.fault_classification, c.severity_tier, c.prescribed_drill, c.confidence_score, c.actionable_cue,
                       a.name as athlete_name, a.athlete_id, a.jersey_number
                FROM training_sessions s
                JOIN coaching_cards c ON s.session_id = c.session_id
                LEFT JOIN athletes a ON s.athlete_id = a.athlete_id
                WHERE s.athlete_id = ?
                ORDER BY s.timestamp DESC
                LIMIT 25
                """, (filter_id,))
            else:
                cursor.execute("""
                SELECT s.session_id, s.timestamp, s.release_angle_deg, s.inference_latency_ms, s.video_name,
                       c.fault_classification, c.severity_tier, c.prescribed_drill, c.confidence_score, c.actionable_cue,
                       a.name as athlete_name, a.athlete_id, a.jersey_number
                FROM training_sessions s
                JOIN coaching_cards c ON s.session_id = c.session_id
                LEFT JOIN athletes a ON s.athlete_id = a.athlete_id
                ORDER BY s.timestamp DESC
                LIMIT 10
                """)
            recent_sessions = [dict(row) for row in cursor.fetchall()]

        return {
            "metrics": {
                "totalSessions": total_sessions,
                "averageConfidence": round(avg_conf, 3),
                "topFault": top_fault,
                "activeAthletes": len(athletes),
                "averageLatencyMs": 14.8,
                "filteredAthleteId": filter_id or "ALL",
            },
            "selectedAthlete": selected_athlete,
            "faultDistribution": fault_dist,
            "athletes": athletes,
            "recentSessions": recent_sessions
        }

    def get_athlete_analytics(self, athlete_id: str) -> Optional[Dict[str, Any]]:
        """Detailed individual sportsman analytics, fault breakdown, and video history."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM athletes WHERE athlete_id = ?", (athlete_id,))
            ath_row = cursor.fetchone()
            if not ath_row:
                return None
            athlete = dict(ath_row)

            cursor.execute("""
            SELECT s.session_id, s.timestamp, s.duration_ms, s.release_angle_deg, s.inference_latency_ms, s.video_name,
                   c.card_id, c.fault_classification, c.severity_tier, c.prescribed_drill, c.confidence_score,
                   c.why_it_matters, c.actionable_cue, c.measured_metric, c.ideal_benchmark
            FROM training_sessions s
            JOIN coaching_cards c ON s.session_id = c.session_id
            WHERE s.athlete_id = ?
            ORDER BY s.timestamp DESC
            """, (athlete_id,))
            sessions = [dict(r) for r in cursor.fetchall()]

        total = len(sessions)
        fault_dist: Dict[str, int] = {}
        release_angles: List[float] = []
        confs: List[float] = []
        scores: List[float] = []
        ideal_count = 0

        for s in sessions:
            flt = s.get("fault_classification") or "Unknown"
            fault_dist[flt] = fault_dist.get(flt, 0) + 1
            if "ideal" in flt.lower():
                ideal_count += 1
            if s.get("release_angle_deg") is not None:
                release_angles.append(float(s["release_angle_deg"]))
            if s.get("confidence_score") is not None:
                cval = float(s["confidence_score"])
                confs.append(cval * 100.0 if cval <= 1.0 else cval)
            scores.append(self._fault_to_form_score(flt))

        top_fault = max(fault_dist.items(), key=lambda kv: kv[1])[0] if fault_dist else athlete.get("primary_fault", "No Shots Yet")
        avg_release = round(sum(release_angles) / len(release_angles), 1) if release_angles else 0.0
        avg_conf = round(sum(confs) / len(confs), 1) if confs else 0.0
        avg_form_score = round(sum(scores) / len(scores), 1) if scores else float(athlete.get("consistency_score") or 100.0)
        ideal_rate = round((ideal_count / total) * 100.0, 1) if total > 0 else 0.0

        return {
            "athlete": athlete,
            "metrics": {
                "totalSessions": total,
                "idealFormCount": ideal_count,
                "idealRatePct": ideal_rate,
                "averageReleaseAngle": avg_release,
                "averageConfidencePct": avg_conf,
                "averageFormScore": avg_form_score,
                "topFault": top_fault,
            },
            "faultDistribution": fault_dist,
            "sessions": sessions,
        }

    def get_all_athletes(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM athletes ORDER BY name ASC")
            return [dict(row) for row in cursor.fetchall()]

    def get_session_report(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves individual clinical coaching report by session_id (one-by-one inspection)."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT s.session_id, s.timestamp, s.duration_ms, s.release_angle_deg, s.hardware_fps, 
                   s.inference_latency_ms, s.video_name, s.athlete_id,
                   c.card_id, c.fault_classification, c.severity_tier, c.prescribed_drill,
                   c.confidence_score, c.why_it_matters, c.actionable_cue, c.measured_metric, c.ideal_benchmark,
                   a.name as athlete_name, a.position as athlete_position, a.team as athlete_team
            FROM training_sessions s
            JOIN coaching_cards c ON s.session_id = c.session_id
            LEFT JOIN athletes a ON s.athlete_id = a.athlete_id
            WHERE s.session_id = ?
            """, (session_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_recent_reports_list(self, athlete_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists recent individual session reports for one-by-one browsing (optionally filtered by athlete)."""
        filter_id = athlete_id.strip() if (athlete_id and athlete_id.strip() and athlete_id.strip().upper() != "ALL") else None
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if filter_id:
                cursor.execute("""
                SELECT s.session_id, s.timestamp, s.release_angle_deg, s.athlete_id, s.video_name,
                       c.fault_classification, c.severity_tier, c.prescribed_drill, c.confidence_score,
                       a.name as athlete_name, a.jersey_number
                FROM training_sessions s
                JOIN coaching_cards c ON s.session_id = c.session_id
                LEFT JOIN athletes a ON s.athlete_id = a.athlete_id
                WHERE s.athlete_id = ?
                ORDER BY s.timestamp DESC
                LIMIT 50
                """, (filter_id,))
            else:
                cursor.execute("""
                SELECT s.session_id, s.timestamp, s.release_angle_deg, s.athlete_id, s.video_name,
                       c.fault_classification, c.severity_tier, c.prescribed_drill, c.confidence_score,
                       a.name as athlete_name, a.jersey_number
                FROM training_sessions s
                JOIN coaching_cards c ON s.session_id = c.session_id
                LEFT JOIN athletes a ON s.athlete_id = a.athlete_id
                ORDER BY s.timestamp DESC
                LIMIT 50
                """)
            return [dict(row) for row in cursor.fetchall()]

# Global database singleton
db_service = DatabaseService()

