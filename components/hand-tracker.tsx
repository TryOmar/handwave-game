"use client"

import { useEffect, useRef, useState } from "react"
import { Camera } from "lucide-react"
import Script from "next/script"

interface HandTrackerProps {
  onHandDetected: (detected: boolean) => void
  onPositionUpdate: (x: number, y: number) => void
}

export default function HandTracker({ onHandDetected, onPositionUpdate }: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const handLandmarkerRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastVideoTime = useRef<number>(-1)
  const [isMediaPipeReady, setIsMediaPipeReady] = useState(false)

  // Load MediaPipe script
  useEffect(() => {
    const loadMediaPipe = async () => {
      try {
        // @ts-ignore
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision")
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        )

        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        })

        setIsMediaPipeReady(true)
      } catch (error) {
        console.error("Error loading MediaPipe:", error)
        setError("Failed to load hand tracking. Please try again.")
        setIsLoading(false)
      }
    }

    loadMediaPipe()
  }, [])

  // Setup camera and start tracking once MediaPipe is ready
  useEffect(() => {
    if (!isMediaPipeReady) return

    let animationFrameId: number

    async function setupCamera() {
      if (!videoRef.current) return false

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 320,
            height: 240,
            facingMode: "user",
          },
        })

        videoRef.current.srcObject = stream
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play()
              resolve()
            }
          }
        })

        return true
      } catch (error) {
        console.error("Error accessing camera:", error)
        setError("Camera access denied. Please allow camera access to play with hand tracking.")
        setIsLoading(false)
        return false
      }
    }

    async function predictWebcam() {
      if (!videoRef.current || !canvasRef.current || !handLandmarkerRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Draw video frame to canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Check if video is ready and it's a new frame
      if (video.currentTime === lastVideoTime.current) {
        animationFrameId = requestAnimationFrame(predictWebcam)
        return
      }

      lastVideoTime.current = video.currentTime

      try {
        // Detect hands
        const results = handLandmarkerRef.current.detectForVideo(video, performance.now())

        // Process results
        if (results.landmarks && results.landmarks.length > 0) {
          onHandDetected(true)

          // Get PINKY_MCP (point 17) position
          const pinkyMcp = results.landmarks[0][17]
          // Convert to normalized coordinates (0-1)
          const normalizedY = pinkyMcp.y
          // Keep x position fixed at 0.5 (center) since we only care about vertical movement
          onPositionUpdate(0.5, normalizedY)

          // Draw landmarks
          ctx.fillStyle = "#FFFFFF"
          results.landmarks[0].forEach((landmark: any) => {
            ctx.beginPath()
            ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 2, 0, 2 * Math.PI)
            ctx.fill()
          })

          // Highlight PINKY_MCP
          const pinkyMcpX = pinkyMcp.x * canvas.width
          const pinkyMcpY = pinkyMcp.y * canvas.height
          ctx.beginPath()
          ctx.arc(pinkyMcpX, pinkyMcpY, 5, 0, 2 * Math.PI)
          ctx.fillStyle = "#00FF00"
          ctx.fill()
        } else {
          onHandDetected(false)
        }
      } catch (error) {
        console.error("Error in hand detection:", error)
      }

      animationFrameId = requestAnimationFrame(predictWebcam)
    }

    async function initializeTracking() {
      const cameraReady = await setupCamera()
      if (cameraReady) {
        setIsLoading(false)
        requestAnimationFrame(predictWebcam)
      }
    }

    initializeTracking()

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isMediaPipeReady, onHandDetected, onPositionUpdate])

  return (
    <div className="relative w-full h-full bg-black">
      {/* Add MediaPipe script */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/vision_wasm_internal.js"
        strategy="beforeInteractive"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-white text-sm animate-pulse">
            {isMediaPipeReady ? "Starting camera..." : "Loading hand tracking..."}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-2">
          <Camera className="h-8 w-8 text-white mb-2" />
          <div className="text-white text-xs text-center">{error}</div>
        </div>
      )}

      <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover opacity-50" playsInline muted />

      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" width={320} height={240} />
    </div>
  )
}

