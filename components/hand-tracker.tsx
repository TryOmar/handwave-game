"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Camera } from "lucide-react"
import Script from "next/script"
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision"

interface HandTrackerProps {
  onHandDetected: (detected: boolean) => void
  onPositionUpdate: (x: number, y: number) => void
}

export default function HandTracker({ onHandDetected, onPositionUpdate }: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<number>(0)
  const lastDetectionTimeRef = useRef<number>(0)
  const lastPositionRef = useRef({ x: 0.5, y: 0.5 })
  const lastUpdateTimeRef = useRef<number>(0)
  const handDetectedRef = useRef(false)
  const processingRef = useRef(false)
  const gameStartedRef = useRef(false) // Track if the game has been started
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [handLandmarker, setHandLandmarker] = useState<any>(null)
  const [waitingForHand, setWaitingForHand] = useState(true) // Visual indicator that we're waiting for hand
  
  // Even lower frame rate for detection to reduce CPU usage
  const DETECTION_INTERVAL = 150 // Detect hands only every 150ms (≈6.7 FPS) 
  const POSITION_UPDATE_INTERVAL = 50 // Throttle position updates to every 50ms

  // Memoize video constraints to avoid recreating on every render
  // Using standard 16:9 resolution for most webcams
  const videoConstraints = useMemo(() => ({
    video: true // Let the browser select optimal constraints
  }), []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      try {
        const videoElement = videoRef.current
        if (!videoElement) return

        await initVideo(videoElement)
        const model = await initModel()
        setHandLandmarker(model)
        
        // Use a throttled approach with requestAnimationFrame
        const detectFrame = (time: number) => {
          if (!videoElement.paused && !videoElement.ended) {
            // Only run detection if not currently processing and interval has passed
            if (!processingRef.current && (time - lastDetectionTimeRef.current >= DETECTION_INTERVAL)) {
              processingRef.current = true
              lastDetectionTimeRef.current = time
              
              // Use setTimeout to move detection off the main thread slightly
              setTimeout(() => {
                try {
                  if (videoElement.readyState === 4) {
                    const detections = model.detectForVideo(videoElement, time)
                    processDetections(detections, time)
                  }
                } catch (err) {
                  console.error("Detection error:", err)
                } finally {
                  processingRef.current = false
                }
              }, 0)
            }
          }
          requestRef.current = requestAnimationFrame(detectFrame)
        }
        
        requestRef.current = requestAnimationFrame(detectFrame)
        setIsLoading(false)
      } catch (error) {
        console.error("Initialization error:", error)
        setError("Failed to initialize hand tracking.")
        setIsLoading(false)
      }
    }

    init()

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
      
      // Cleanup camera stream
      const videoElement = videoRef.current
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const initVideo = async (videoElement: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(videoConstraints)
      videoElement.srcObject = stream
      
      return new Promise<void>((resolve) => {
        videoElement.addEventListener("loadeddata", () => {
          videoElement.play()
          resolve()
        })
      })
    } catch (e) {
      console.error("Camera access error:", e)
      throw e
    }
  }

  const initModel = async () => {
    try {
      const wasm = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm")
      return await HandLandmarker.createFromOptions(wasm, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: 'GPU'
        },
        numHands: 1, // Only track one hand
        runningMode: 'VIDEO',
        minHandDetectionConfidence: 0.5,  // Increase threshold to reduce false positives
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    } catch (err) {
      console.error("Model initialization failed:", err)
      throw err
    }
  }

  const processDetections = (detections: HandLandmarkerResult, time: number) => {
    const handPresent = detections && detections.landmarks.length > 0;

    // Handle hand detection state changes
    if (handPresent) {
      // Hand is detected
      if (!handDetectedRef.current) {
        handDetectedRef.current = true;
        
        // Start the game when a hand is first detected
        if (!gameStartedRef.current) {
          gameStartedRef.current = true;
          setWaitingForHand(false);
          onHandDetected(true); // Start the game
        }
      }
      
      // Process hand position for game control
      const pinkyMcp = detections.landmarks[0][17]; // Get PINKY_MCP position
      const normalizedY = pinkyMcp.y;
      
      // Throttle position updates to avoid overwhelming the main thread
      if (
        time - lastUpdateTimeRef.current >= POSITION_UPDATE_INTERVAL && 
        Math.abs(lastPositionRef.current.y - normalizedY) > 0.015
      ) {
        lastPositionRef.current = { x: 0.5, y: normalizedY };
        lastUpdateTimeRef.current = time;
        onPositionUpdate(0.5, normalizedY); // Keep x fixed at 0.5
      }
    } else {
      // Hand is not detected
      if (handDetectedRef.current) {
        handDetectedRef.current = false;
        
        // Only signal hand disappearance if the game hasn't started yet
        if (!gameStartedRef.current) {
          onHandDetected(false);
        }
        // Otherwise, we keep the game running even when the hand disappears
      }
    }
  }
  
  return (
    <div 
      ref={containerRef} 
      className="relative h-full bg-black flex items-center justify-center overflow-hidden"
    >
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/vision_wasm_internal.js"
        strategy="beforeInteractive"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-white text-sm animate-pulse">Loading hand tracking...</div>
        </div>
      )}

      {!isLoading && waitingForHand && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="text-white text-sm animate-pulse">Show your hand to start...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-2 z-10">
          <Camera className="h-8 w-8 text-white mb-2" />
          <div className="text-white text-xs text-center">{error}</div>
        </div>
      )}

      <video 
        ref={videoRef} 
        className="absolute object-cover w-full h-full opacity-50"
        playsInline 
        muted 
      />
    </div>
  )
}

