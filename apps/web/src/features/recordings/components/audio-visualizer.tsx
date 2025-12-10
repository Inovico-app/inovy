"use client";

import { useEffect, useRef, useState } from "react";

const interpolateColor = (
  startColor: number[],
  endColor: number[],
  factor: number
): number[] => {
  const result = [];
  for (let i = 0; i < startColor.length; i++) {
    result[i] = Math.round(
      startColor[i] + factor * (endColor[i] - startColor[i])
    );
  }
  return result;
};

// Type guard for AudioContext support
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Check for standard AudioContext
  if (window.AudioContext) {
    return new window.AudioContext();
  }

  // Check for webkitAudioContext (legacy Safari)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WebkitAudioContext = (window as any).webkitAudioContext;
  if (WebkitAudioContext) {
    return new WebkitAudioContext();
  }

  return null;
}

export const AudioVisualizer = ({
  microphone,
}: {
  microphone: MediaRecorder;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800); // Default width for SSR
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Initialize audio context and analyser
  useEffect(() => {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    audioContextRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyserRef.current = analyser;
    // Create Uint8Array for frequency data
    const bufferLength = analyser.frequencyBinCount;
    const buffer = new ArrayBuffer(bufferLength);
    dataArrayRef.current = new Uint8Array(buffer) as Uint8Array<ArrayBuffer>;

    return () => {
      ctx.close();
    };
  }, []);

  // Set canvas width on mount/client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCanvasWidth(window.innerWidth);
    }
  }, []);

  useEffect(() => {
    if (!audioContextRef.current || !analyserRef.current) {
      return;
    }

    const source = audioContextRef.current.createMediaStreamSource(
      microphone.stream
    );
    source.connect(analyserRef.current);

    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphone.stream]);

  const draw = (): void => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    if (!canvas || !analyser || !dataArray) return;

    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    if (!context) return;

    context.clearRect(0, 0, width, height);

    const barWidth = 10;
    let x = 0;
    const startColor = [19, 239, 147];
    const endColor = [20, 154, 251];

    for (const value of dataArray) {
      const barHeight = (value / 255) * height * 2;

      const interpolationFactor = value / 255;

      const color = interpolateColor(startColor, endColor, interpolationFactor);

      context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.1)`;
      context.fillRect(x, height - barHeight, barWidth, barHeight);
      x += barWidth;
    }
  };

  return <canvas ref={canvasRef} width={canvasWidth}></canvas>;
};

