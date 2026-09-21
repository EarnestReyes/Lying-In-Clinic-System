import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { PrenatalVisit } from '../src/models/PatientRecord';
import { bpHistory } from '../src/utils/patientProgress';
import { CareCard, s } from './care/CareUI';

export function BloodPressureChart({ visits = [] }: { visits?: PrenatalVisit[] }) {
  const points = bpHistory(visits);
  
  // Chart dimensions & scaling
  const chartHeight = 160;
  const itemWidth = 70; // Width allocated per data point on the horizontal scroll
  const chartWidth = Math.max(300, points.length * itemWidth);
  const paddingLeft = 35;
  const paddingRight = 20;
  const totalSvgWidth = chartWidth + paddingLeft + paddingRight;

  const maxBp = Math.max(160, ...points.map(p => p.systolic), 0);
  const minBp = 40; // baseline for diastolic/systolic scaling

  // Helper to map BP value to Y coordinate
  const getY = (val: number) => {
    const clamped = Math.max(minBp, Math.min(maxBp, val));
    return chartHeight - ((clamped - minBp) / (maxBp - minBp)) * chartHeight;
  };

  // Build SVG path strings (M for move, L for line)
  const systolicPath = points.reduce((acc, p, i) => {
    const x = paddingLeft + (i * itemWidth) + (itemWidth / 2);
    const y = getY(p.systolic);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const diastolicPath = points.reduce((acc, p, i) => {
    const x = paddingLeft + (i * itemWidth) + (itemWidth / 2);
    const y = getY(p.diastolic);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <CareCard title="Blood pressure history" subtitle="Prenatal visit trends · mmHg">
      {!points.length ? (
        <Text style={s.muted}>No dated blood pressure readings recorded yet.</Text>
      ) : (
        <>
          <Text style={s.muted}>Teal: systolic · Blue: diastolic</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingVertical: 10 }}>
            <View>
              <Svg height={chartHeight + 30} width={totalSvgWidth}>
                {/* Background grid lines & Y-axis labels */}
                {[minBp, 80, 120, 140, maxBp].map((val, idx) => {
                  const y = getY(val);
                  return (
                    <React.Fragment key={idx}>
                      <Line
                        x1={paddingLeft}
                        y1={y}
                        x2={totalSvgWidth - paddingRight}
                        y2={y}
                        stroke="#E2E8F0"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <SvgText
                        x={paddingLeft - 8}
                        y={y + 4}
                        fill="#64748B"
                        fontSize="10"
                        textAnchor="end"
                      >
                        {val}
                      </SvgText>
                    </React.Fragment>
                  );
                })}

                {/* Diastolic Line Path */}
                {points.length > 1 && (
                  <Path d={diastolicPath} fill="none" stroke="#0284C7" strokeWidth="2.5" />
                )}

                {/* Systolic Line Path */}
                {points.length > 1 && (
                  <Path d={systolicPath} fill="none" stroke="#0D9488" strokeWidth="2.5" />
                )}

                {/* Data Points and Value Callouts */}
                {points.map((point, i) => {
                  const x = paddingLeft + (i * itemWidth) + (itemWidth / 2);
                  const sysY = getY(point.systolic);
                  const diaY = getY(point.diastolic);
                  const dateStr = new Date(point.time).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

                  return (
                    <React.Fragment key={point.id}>
                      {/* Systolic Circle */}
                      <Circle cx={x} cy={sysY} r={5} fill="#0D9488" stroke="#FFFFFF" strokeWidth={1.5} />
                      
                      {/* Diastolic Circle */}
                      <Circle cx={x} cy={diaY} r={5} fill="#0284C7" stroke="#FFFFFF" strokeWidth={1.5} />

                      {/* X-Axis Date Label */}
                      <SvgText
                        x={x}
                        y={chartHeight + 20}
                        fill="#64748B"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {dateStr}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
              </Svg>
            </View>
          </ScrollView>

          
        </>
      )}
    </CareCard>
  );
}