"use client"

import { useEffect, useRef, useState } from "react"
import { Camera } from "lucide-react"
import Script from "next/script"
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision"

interface HandTrackerProps {
  onHandDetected: (detected: boolean) => void
  onPositionUpdate: (x: number, y: number) => void
}

export default function HandTracker({ onHandDetected, onPositionUpdate }: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [handLandmarker, setHandLandmarker] = useState<any>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      try {
        const videoElement = videoRef.current
        if (!videoElement) return

        await initVideo(videoElement)
        const model = await initModel()
        setHandLandmarker(model)

        detectionIntervalRef.current = setInterval(() => {
          const detections = model.detectForVideo(videoElement, performance.now())
          processDetections(detections)
        }, 1000 / 30) // 30 FPS

        setIsLoading(false)
      } catch (error) {
        console.error("Initialization error:", error)
        setError("Failed to initialize hand tracking.")
        setIsLoading(false)
      }
    }

    init()

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [])

  const initVideo = async (videoElement: HTMLVideoElement) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    videoElement.srcObject = stream
    videoElement.addEventListener("loadeddata", () => {
      videoElement.play()
    })
  }

  const initModel = async () => {
    const wasm = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm")
    return await HandLandmarker.createFromOptions(wasm, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: 'GPU'
      },
      numHands: 1, // Only track one hand
      runningMode: 'VIDEO'
    })
  }

  const processDetections = (detections: HandLandmarkerResult) => {
    if (detections && detections.landmarks.length > 0) {
      onHandDetected(true)
      const pinkyMcp = detections.landmarks[0][17] // Get PINKY_MCP position
      const normalizedY = pinkyMcp.y
      onPositionUpdate(0.5, normalizedY) // Keep x fixed at 0.5
    } else {
      onHandDetected(false)
    }
  }

  return (
    <div className="relative w-full h-full bg-black">
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/vision_wasm_internal.js"
        strategy="beforeInteractive"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-white text-sm animate-pulse">Loading hand tracking...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-2">
          <Camera className="h-8 w-8 text-white mb-2" />
          <div className="text-white text-xs text-center">{error}</div>
        </div>
      )}

      <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover opacity-50" playsInline muted />
    </div>
  )
}

