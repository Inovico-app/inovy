interface GenerateProcessingDataParams {
  containerWidth: number;
  barWidth: number;
  barGap: number;
  mode: "scrolling" | "static";
  time: number;
  lastActiveData: number[];
  transitionProgress: number;
}

export function generateProcessingData({
  containerWidth,
  barWidth,
  barGap,
  mode,
  time,
  lastActiveData,
  transitionProgress,
}: GenerateProcessingDataParams): number[] {
  const processingData: number[] = [];
  const barCount = Math.floor(containerWidth / (barWidth + barGap));

  if (mode === "static") {
    const halfCount = Math.floor(barCount / 2);

    for (let i = 0; i < barCount; i++) {
      const normalizedPosition = (i - halfCount) / halfCount;
      const centerWeight = 1 - Math.abs(normalizedPosition) * 0.4;

      const wave1 = Math.sin(time * 1.5 + normalizedPosition * 3) * 0.25;
      const wave2 = Math.sin(time * 0.8 - normalizedPosition * 2) * 0.2;
      const wave3 = Math.cos(time * 2 + normalizedPosition) * 0.15;
      const combinedWave = wave1 + wave2 + wave3;
      const processingValue = (0.2 + combinedWave) * centerWeight;

      let finalValue = processingValue;
      if (lastActiveData.length > 0 && transitionProgress < 1) {
        const lastDataIndex = Math.min(i, lastActiveData.length - 1);
        const lastValue = lastActiveData[lastDataIndex] || 0;
        finalValue =
          lastValue * (1 - transitionProgress) +
          processingValue * transitionProgress;
      }

      processingData.push(Math.max(0.05, Math.min(1, finalValue)));
    }
  } else {
    for (let i = 0; i < barCount; i++) {
      const normalizedPosition = (i - barCount / 2) / (barCount / 2);
      const centerWeight = 1 - Math.abs(normalizedPosition) * 0.4;

      const wave1 = Math.sin(time * 1.5 + i * 0.15) * 0.25;
      const wave2 = Math.sin(time * 0.8 - i * 0.1) * 0.2;
      const wave3 = Math.cos(time * 2 + i * 0.05) * 0.15;
      const combinedWave = wave1 + wave2 + wave3;
      const processingValue = (0.2 + combinedWave) * centerWeight;

      let finalValue = processingValue;
      if (lastActiveData.length > 0 && transitionProgress < 1) {
        const lastDataIndex = Math.floor(
          (i / barCount) * lastActiveData.length
        );
        const lastValue = lastActiveData[lastDataIndex] || 0;
        finalValue =
          lastValue * (1 - transitionProgress) +
          processingValue * transitionProgress;
      }

      processingData.push(Math.max(0.05, Math.min(1, finalValue)));
    }
  }

  return processingData;
}

interface GenerateStaticBarsParams {
  analyser: AnalyserNode;
  barCount: number;
  sensitivity: number;
}

export function generateStaticBars({
  analyser,
  barCount,
  sensitivity,
}: GenerateStaticBarsParams): number[] {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  const startFreq = Math.floor(dataArray.length * 0.05);
  const endFreq = Math.floor(dataArray.length * 0.4);
  const relevantData = dataArray.slice(startFreq, endFreq);

  const halfCount = Math.floor(barCount / 2);
  const newBars: number[] = [];

  // Mirror the data for symmetric display
  for (let i = halfCount - 1; i >= 0; i--) {
    const dataIndex = Math.floor((i / halfCount) * relevantData.length);
    const value = Math.min(1, (relevantData[dataIndex] / 255) * sensitivity);
    newBars.push(Math.max(0.05, value));
  }

  for (let i = 0; i < halfCount; i++) {
    const dataIndex = Math.floor((i / halfCount) * relevantData.length);
    const value = Math.min(1, (relevantData[dataIndex] / 255) * sensitivity);
    newBars.push(Math.max(0.05, value));
  }

  return newBars;
}

interface CalculateScrollingAverageParams {
  analyser: AnalyserNode;
  sensitivity: number;
}

export function calculateScrollingAverage({
  analyser,
  sensitivity,
}: CalculateScrollingAverageParams): number {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  let sum = 0;
  const startFreq = Math.floor(dataArray.length * 0.05);
  const endFreq = Math.floor(dataArray.length * 0.4);
  const relevantData = dataArray.slice(startFreq, endFreq);

  for (let i = 0; i < relevantData.length; i++) {
    sum += relevantData[i];
  }
  const average = (sum / relevantData.length / 255) * sensitivity;

  return Math.min(1, Math.max(0.05, average));
}
