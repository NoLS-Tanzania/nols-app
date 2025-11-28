"use client";

import React, { useRef, useState } from 'react';
import Image from 'next/image';

type Props = {
  onSubmit?: (file: Blob, transcript?: string) => Promise<void> | void;
  maxSizeBytes?: number;
};

export default function VoiceRecorder({ onSubmit, maxSizeBytes = 5_000_000 }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [useFallbackSvg, setUseFallbackSvg] = useState(false);

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Audio recording is not supported in your browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size > maxSizeBytes) {
          alert('Recording is too large. Try a shorter message.');
          if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;
          setIsRecording(false);
          return;
        }

        // One-time processing: submit audio automatically for scanning
        try {
          setIsRecording(false);
          setIsProcessing(true);
          await onSubmit?.(blob);
        } catch (err) {
          console.error('Auto-submit failed', err);
        } finally {
          setIsProcessing(false);
        }

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      alert('Unable to access microphone. Check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
    }
  };

  

 

  return (
    <div className="col-span-full mt-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (isRecording) stopRecording(); else startRecording();
          }}
          className={`inline-flex items-center justify-center w-10 h-10 p-2 rounded-full ${isRecording ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-white border border-slate-200 text-slate-700'} shadow-sm hover:shadow-md transition`}
          aria-pressed={isRecording}
          aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
        >
            {!useFallbackSvg ? (
              <Image
                src="/assets/Record Icon.png"
                alt="Record"
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
                onError={() => setUseFallbackSvg(true)}
              />
            ) : (
              /* Inline fallback SVG when PNG not available */
              <svg className="w-6 h-6" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <g>
                  <path d="M 263.22 346.98 C242.69,349.34 227.39,346.99 207.83,338.47 C187.22,329.50 171.06,315.11 159.33,295.27 C152.45,283.62 150.07,277.57 147.43,265.00 L 145.02 253.50 L 145.01 174.16 C145.00,98.04 145.08,94.40 147.05,84.73 C149.76,71.46 153.73,61.41 160.60,50.47 C173.76,29.51 192.25,14.37 213.83,6.90 C227.76,2.07 231.81,1.50 251.50,1.55 L 270.50 1.60 L 282.41 5.35 C288.96,7.42 296.39,10.28 298.91,11.72 C315.97,21.45 330.38,34.85 339.60,49.52 C347.18,61.58 349.59,67.33 352.79,80.96 L 355.50 92.50 L 355.50 255.50 L 353.14 266.00 C349.14,283.82 337.71,304.46 324.83,317.12 C308.77,332.91 284.84,344.51 263.22,346.98 ZM 236.00 304.30 C242.02,305.33 261.82,304.89 266.61,303.61 C282.61,299.36 299.92,284.85 306.97,269.81 C308.37,266.81 309.50,264.50 310.40,262.10 C313.97,252.55 313.98,241.66 313.98,180.64 C313.98,178.59 313.98,176.47 313.99,174.30 C313.99,125.74 313.63,98.27 312.94,94.80 C309.10,75.70 296.90,59.04 280.36,50.28 C270.48,45.06 262.14,43.03 250.50,43.03 C232.48,43.03 217.86,49.12 205.10,61.94 C199.14,67.92 196.87,71.14 193.45,78.44 C191.11,83.42 188.70,89.88 188.10,92.80 C187.36,96.38 187.00,122.82 187.00,174.34 C187.00,176.58 187.00,178.76 187.00,180.87 C187.00,243.57 187.00,253.58 190.27,262.36 C191.00,264.33 191.90,266.23 192.99,268.65 C196.48,276.33 202.42,283.93 210.12,290.54 C215.44,295.11 231.16,303.47 236.00,304.30 ZM 500.00 500.00 L 0.00 500.00 L 123.75 499.96 C228.08,499.93 247.02,499.71 244.42,498.58 C242.73,497.84 239.67,495.77 237.62,493.97 C230.60,487.81 230.57,487.67 230.17,456.31 L 229.82 428.12 L 227.16 427.59 C225.70,427.30 221.71,426.58 218.29,426.00 C209.86,424.54 195.66,420.14 183.00,415.04 C149.13,401.42 117.30,373.02 98.32,339.50 C86.14,317.99 78.87,293.84 76.09,265.73 C74.73,251.92 75.79,246.34 80.86,240.73 C89.91,230.68 103.55,230.50 112.87,240.29 C116.18,243.78 116.25,244.05 117.63,258.17 C119.84,280.90 121.62,288.45 128.78,305.50 C140.62,333.71 163.10,357.83 190.50,371.70 C210.88,382.02 227.58,386.00 250.63,386.04 C272.91,386.08 289.72,382.18 308.99,372.51 C316.66,368.65 330.22,360.14 332.00,358.06 C332.27,357.73 335.52,354.85 339.20,351.66 C364.97,329.30 382.97,289.90 382.99,255.82 C383.00,246.56 383.68,244.60 388.53,239.78 C398.56,229.81 413.89,231.31 421.64,243.04 C426.25,250.00 425.99,265.90 420.87,289.50 C418.36,301.08 411.77,321.54 408.38,328.26 C391.32,362.09 371.15,384.46 340.54,403.48 C324.85,413.23 302.13,422.19 284.66,425.54 C280.17,426.39 275.48,427.31 274.23,427.57 L 271.96 428.05 L 272.61 454.27 C273.08,473.06 272.93,481.71 272.09,484.76 C270.61,490.12 266.22,495.18 260.74,497.84 L 256.50 499.90 L 378.25 499.95 L 500.00 500.00 Z" fill="currentColor"/>
                </g>
              </svg>
            )}
          {isRecording && <span className="ml-2 inline-block w-2 h-2 bg-red-600 rounded-full animate-pulse" aria-hidden />}
        </button>

        <div className="ml-auto text-sm text-slate-500">
          {isProcessing ? 'Scanning…' : null}
        </div>
      </div>
    </div>
  );
}
