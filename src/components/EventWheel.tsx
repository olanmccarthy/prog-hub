'use client';

import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

interface WheelSegment {
  name: string;
  description: string;
  weight: number;
  color: string;
}

interface EventWheelProps {
  segments: WheelSegment[];
  onSpinComplete: (selectedIndex?: number) => void;
  spinning: boolean;
  targetIndex?: number | null; // The segment to land on (null/undefined = random selection)
}

const WHEEL_COLORS = [
  'var(--wheel-color-1)',
  'var(--wheel-color-2)',
  'var(--wheel-color-3)',
  'var(--wheel-color-4)',
  'var(--wheel-color-5)',
  'var(--wheel-color-6)',
  'var(--wheel-color-7)',
  'var(--wheel-color-8)',
];

export default function EventWheel({
  segments,
  onSpinComplete,
  spinning,
  targetIndex,
}: EventWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);

  // Draw the wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context and rotate
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    // Calculate total weight
    const totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);

    let currentAngle = 0;

    // Draw each segment
    segments.forEach((segment, index) => {
      const segmentAngle = (segment.weight / totalWeight) * 2 * Math.PI;

      // Get color - use grey for "no event", otherwise cycle through colors
      const color = segment.name === 'No Event'
        ? 'var(--wheel-color-no-event)'
        : WHEEL_COLORS[index % WHEEL_COLORS.length];

      // Resolve CSS variable to actual color
      const computedColor = getComputedStyle(document.documentElement)
        .getPropertyValue(color.replace('var(', '').replace(')', ''))
        .trim();

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle);
      ctx.closePath();
      ctx.fillStyle = computedColor;
      ctx.fill();
      ctx.strokeStyle = 'var(--bg-primary)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(currentAngle + segmentAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px Arial';

      // Wrap text if too long
      const maxWidth = radius - 40;
      const words = segment.name.split(' ');
      let line = '';
      const lines: string[] = [];

      words.forEach(word => {
        const testLine = line + (line ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      });
      lines.push(line);

      // Draw each line
      const lineHeight = 16;
      const totalHeight = lines.length * lineHeight;
      lines.forEach((textLine, i) => {
        ctx.fillText(
          textLine,
          radius - 20,
          -totalHeight / 2 + i * lineHeight + lineHeight / 2
        );
      });

      ctx.restore();

      currentAngle += segmentAngle;
    });

    ctx.restore();

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = 'var(--accent-primary)';
    ctx.fill();
    ctx.strokeStyle = 'var(--bg-primary)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw pointer line at top (10% of radius from edge)
    const pointerLength = radius * 0.1;
    const pointerStart = centerY - radius;
    const pointerEnd = pointerStart + pointerLength;

    ctx.beginPath();
    ctx.moveTo(centerX, pointerStart);
    ctx.lineTo(centerX, pointerEnd);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.stroke();
  }, [segments, rotation]);

  // Spinning animation
  useEffect(() => {
    if (!spinning) {
      return;
    }

    const totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);
    const duration = 5000; // 5 seconds
    const startTime = Date.now();
    const startRotation = rotation;
    const spins = 5; // Number of full rotations

    let targetRotation: number;
    let finalSelectedIndex: number;

    // If targetIndex is provided, calculate rotation to land on that segment
    if (targetIndex !== null && targetIndex !== undefined) {
      let segmentStartAngle = 0;

      // Calculate where the target segment starts
      // Segments are drawn starting at 0° (right/east) going counterclockwise in canvas coords
      for (let i = 0; i < targetIndex; i++) {
        const segmentAngle = (segments[i].weight / totalWeight) * 360;
        segmentStartAngle += segmentAngle;
      }

      // Add half of the target segment to land in the middle
      const targetSegmentAngle = (segments[targetIndex].weight / totalWeight) * 360;
      const segmentMiddleAngle = segmentStartAngle + targetSegmentAngle / 2;

      // Pointer is at top (270° in canvas coords, or -90° from right)
      // We want to rotate the wheel so that segmentMiddleAngle aligns with 270°
      // rotation needed = 270 - segmentMiddleAngle
      targetRotation = (270 - segmentMiddleAngle + 360) % 360;
      finalSelectedIndex = targetIndex;
    } else {
      // Random rotation
      targetRotation = Math.random() * 360;

      // Calculate which segment this rotation corresponds to
      const normalizedRotation = (360 - targetRotation) % 360;
      let currentAngle = 0;
      finalSelectedIndex = 0;

      for (let i = 0; i < segments.length; i++) {
        const segmentAngle = (segments[i].weight / totalWeight) * 360;
        if (normalizedRotation >= currentAngle && normalizedRotation < currentAngle + segmentAngle) {
          finalSelectedIndex = i;
          break;
        }
        currentAngle += segmentAngle;
      }
    }

    // Calculate total rotation: multiple full spins + landing on target
    let rotationDifference = targetRotation - (startRotation % 360);
    if (rotationDifference < 0) {
      rotationDifference += 360;
    }
    const totalRotation = spins * 360 + rotationDifference;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const newRotation = startRotation + totalRotation * easeProgress;
      setRotation(newRotation % 360);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we're exactly at the target rotation
        setRotation(targetRotation);
        onSpinComplete(finalSelectedIndex);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [spinning, targetIndex]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 2,
      }}
    >
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        style={{
          maxWidth: '100%',
          height: 'auto',
        }}
      />
    </Box>
  );
}
