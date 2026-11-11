import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Rect, Ellipse, Text as SvgText } from 'react-native-svg';

function computeNorm(wireframes) {
  if (!wireframes || !wireframes.length) return null;
  const keys = [
    'nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
  ];

  const hxs = [], hys = [], hzs = [];
  let dirX = 0, dirZ = 0, n = 0;

  wireframes.forEach((wf) => {
    const j = wf.joints || {};
    if (j.left_hip && j.right_hip) {
      const hx = (j.left_hip[0] + j.right_hip[0]) * 0.5;
      const hy = (j.left_hip[1] + j.right_hip[1]) * 0.5;
      const hz = ((j.left_hip[2] || 0) + (j.right_hip[2] || 0)) * 0.5;
      hxs.push(hx); hys.push(hy); hzs.push(hz);
      if (j.right_wrist) {
        dirX += j.right_wrist[0] - hx;
        dirZ += (j.right_wrist[2] || 0) - hz;
        n++;
      }
    }
  });

  const mid = (arr) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };

  const ox = mid(hxs), oy = mid(hys), oz = mid(hzs);
  let ux = 0.707, uz = 0.707;
  if (n > 0) {
    const m = Math.hypot(dirX, dirZ);
    if (m > 0.05) { ux = dirX / m; uz = dirZ / m; }
    else { ux = 1.0; uz = 0.0; }
  }

  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  wireframes.forEach((wf) => {
    const j = wf.joints || {};
    keys.forEach((k) => {
      const p = j[k];
      if (!p) return;
      const dx = (p[0] || 0) - ox;
      const dy = (p[1] || 0) - oy;
      const dz = (p[2] || 0) - oz;
      const sx = dx * ux + dz * uz;
      if (dy < minY) minY = dy;
      if (dy > maxY) maxY = dy;
      if (sx < minX) minX = sx;
      if (sx > maxX) maxX = sx;
    });
  });

  return {
    ox, oy, oz, ux, uz,
    maxY,
    spanY: Math.max(0.6, maxY - minY),
    midSX: (minX + maxX) * 0.5,
  };
}

export default function StickFigureSvg({ wireframes = [], frameIdx = 0, isFaulty = false, faultName = 'Ideal Form' }) {
  const W = 340;
  const H = 250;

  const norm = useMemo(() => computeNorm(wireframes), [wireframes]);
  const wf = wireframes[Math.min(frameIdx, Math.max(0, wireframes.length - 1))] || {};
  const j = wf.joints || {};
  const colors = wf.joint_colors || {};

  const mapPt = (name, defPt) => {
    const p = j[name];
    if (!p || !norm) return defPt;
    const dx = (p[0] || 0) - norm.ox;
    const dy = (p[1] || 0) - norm.oy;
    const dz = (p[2] || 0) - norm.oz;
    const sx = (dx * norm.ux + dz * norm.uz) - norm.midSX;
    const sc = (H * 0.62) / norm.spanY;
    return [W * 0.35 + sx * sc, H * 0.85 - (norm.maxY - dy) * sc];
  };

  const nose = mapPt('nose', [118, 52]);
  const shL  = mapPt('left_shoulder', [110, 74]);
  const shR  = mapPt('right_shoulder', [126, 74]);
  const elL  = mapPt('left_elbow', [98, 98]);
  const elR  = mapPt('right_elbow', [146, 94]);
  const wrL  = mapPt('left_wrist', [114, 88]);
  const wrR  = mapPt('right_wrist', [152, 62]);
  const hipL = mapPt('left_hip', [112, 130]);
  const hipR = mapPt('right_hip', [124, 130]);
  const knL  = mapPt('left_knee', [114, 172]);
  const knR  = mapPt('right_knee', [126, 172]);
  const akL  = mapPt('left_ankle', [112, 212]);
  const akR  = mapPt('right_ankle', [124, 212]);

  const neck = [(shL[0] + shR[0]) / 2, (shL[1] + shR[1]) / 2];
  const pelvis = [(hipL[0] + hipR[0]) / 2, (hipL[1] + hipR[1]) / 2];

  const elbowFault = colors.right_elbow === '#FF3366';
  const wristFault = colors.right_wrist === '#FF3366';
  const trunkFault = colors.right_shoulder === '#FF3366';
  const legFault = colors.right_knee === '#FF3366';

  const armCol = elbowFault || wristFault ? '#EF4444' : '#10B981';
  const trunkCol = trunkFault ? '#EF4444' : '#F8FAFC';
  const legCol = legFault ? '#EF4444' : '#2DD4BF';

  // Ball position trajectory toward hoop at (284, 80)
  const relFrame = Math.floor(wireframes.length * 0.5);
  let ballX = wrR[0] + 10;
  let ballY = wrR[1] - 10;
  if (frameIdx >= relFrame && wireframes.length > relFrame + 1) {
    const ft = Math.min(1, (frameIdx - relFrame) / Math.max(1, wireframes.length - 1 - relFrame));
    ballX = ballX + (284 - ballX) * ft;
    ballY = ballY + (80 - ballY) * ft - Math.sin(ft * Math.PI) * 58;
  }

  return (
    <View style={styles.container}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Rect x="0" y="0" width={W} height={H} fill="#070A10" rx="12" />
        {/* Floor line & vertical plumb guide */}
        <Line x1="0" y1={H * 0.87} x2={W} y2={H * 0.87} stroke="#3B82F6" strokeWidth="1.5" />
        <Line x1={pelvis[0]} y1="24" x2={pelvis[0]} y2={H * 0.87} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" strokeWidth="1.2" />

        {/* Hoop Schematic */}
        <Line x1="306" y1="42" x2="306" y2="108" stroke="#94A3B8" strokeWidth="3" />
        <Ellipse cx="284" cy="80" rx="16" ry="3.5" fill="none" stroke="#F97316" strokeWidth="3" />

        {/* Guide Arm & Far Leg (Moving Sticks) */}
        <Line x1={shL[0]} y1={shL[1]} x2={elL[0]} y2={elL[1]} stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
        <Line x1={elL[0]} y1={elL[1]} x2={wrL[0]} y2={wrL[1]} stroke="#0EA5E9" strokeWidth="3.5" strokeLinecap="round" />
        <Line x1={hipL[0]} y1={hipL[1]} x2={knL[0]} y2={knL[1]} stroke="#A78BFA" strokeWidth="3.5" strokeLinecap="round" />
        <Line x1={knL[0]} y1={knL[1]} x2={akL[0]} y2={akL[1]} stroke="#8B5CF6" strokeWidth="3.5" strokeLinecap="round" />

        {/* Near Leg, Torso Spine, Neck */}
        <Line x1={hipR[0]} y1={hipR[1]} x2={knR[0]} y2={knR[1]} stroke={legCol} strokeWidth="4.5" strokeLinecap="round" />
        <Line x1={knR[0]} y1={knR[1]} x2={akR[0]} y2={akR[1]} stroke={legCol} strokeWidth="4.5" strokeLinecap="round" />
        <Line x1={neck[0]} y1={neck[1]} x2={pelvis[0]} y2={pelvis[1]} stroke={trunkCol} strokeWidth="4.5" strokeLinecap="round" />
        <Line x1={neck[0]} y1={neck[1]} x2={nose[0]} y2={nose[1]} stroke="#FACC15" strokeWidth="3" strokeLinecap="round" />

        {/* Dominant Shooting Arm */}
        <Line x1={shR[0]} y1={shR[1]} x2={elR[0]} y2={elR[1]} stroke={armCol} strokeWidth="5" strokeLinecap="round" />
        <Line x1={elR[0]} y1={elR[1]} x2={wrR[0]} y2={wrR[1]} stroke={armCol} strokeWidth="5" strokeLinecap="round" />

        {/* Head & Basketball */}
        <Circle cx={nose[0]} cy={nose[1]} r="9" fill="#0F172A" stroke="#FACC15" strokeWidth="2.2" />
        <Circle cx={ballX} cy={ballY} r="9" fill="#EA580C" stroke="#7C2D12" strokeWidth="1.5" />

        {/* Key Joint Pins */}
        <Circle cx={shR[0]} cy={shR[1]} r="4" fill={trunkFault ? '#EF4444' : '#FFFFFF'} />
        <Circle cx={elR[0]} cy={elR[1]} r="5.5" fill={elbowFault ? '#EF4444' : '#10B981'} stroke="#070A10" strokeWidth="1.5" />
        <Circle cx={wrR[0]} cy={wrR[1]} r="4.5" fill={wristFault ? '#EF4444' : '#FFFFFF'} />
        <Circle cx={knR[0]} cy={knR[1]} r="4.5" fill={legFault ? '#EF4444' : '#FFFFFF'} />

        {/* Top-Right Status Label */}
        <Rect x={W - 146} y="10" width="136" height="24" rx="5" fill="rgba(15,23,42,0.88)" stroke={isFaulty ? '#EF4444' : '#10B981'} strokeWidth="1.2" />
        <SvgText x={W - 78} y="25" fill={isFaulty ? '#FCA5A5' : '#6EE7B7'} fontSize="10" fontWeight="bold" textAnchor="middle">
          {faultName.slice(0, 19).toUpperCase()}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
});

