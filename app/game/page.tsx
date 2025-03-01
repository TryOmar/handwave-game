"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Heart, Pause, Play, Home, RefreshCw, ArrowLeft } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import HandTracker from "@/components/hand-tracker"
import GameCanvas from "@/components/game-canvas"
import Link from "next/link"

type ProgressMap = { map1: number; map2: number; map3: number; map4: number; };

type InitialProgress = {
  keyboard: ProgressMap;
  camera: ProgressMap;
};

const initialProgress: InitialProgress = {
  keyboard: { map1: 0, map2: 0, map3: 0, map4: 0 },
  camera: { map1: 0, map2: 0, map3: 0, map4: 0 },
};

export default function GamePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get("mode") || "keyboard"
  const mapId = searchParams.get("map") || "map1"

  // Fixed useState declarations - removed incorrect = signs
  const [health, setHealth] = useState(3)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isHandDetected, setIsHandDetected] = useState(false)
  const [isGameStarted, setIsGameStarted] = useState(mode === "keyboard")
  const [showStartMessage, setShowStartMessage] = useState(mode === "camera")
  const [handPosition, setHandPosition] = useState({ x: 0, y: 0 })
  const [gameStartTime, setGameStartTime] = useState<number | null>(null)

  const gameRef = useRef<HTMLDivElement>(null)
  const startTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Map configurations
  const mapConfigs = {
    map1: { obstacleSpeed: 6, increasingSpeed: false },
    map2: { obstacleSpeed: 7, increasingSpeed: false },
    map3: { obstacleSpeed: 7, increasingSpeed: true },
    map4: { obstacleSpeed: 8, increasingSpeed: true },
  }

  const currentMap = mapConfigs[mapId as keyof typeof mapConfigs]

  // Handle continuous keyboard movement
  useEffect(() => {
    if (mode !== "keyboard") return

    const keysPressed = new Set<string>()
    const moveSpeed = 12 // Same as player speed in GameCanvas

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isGameOver || !isGameStarted) return
      keysPressed.add(e.key.toLowerCase())
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.key.toLowerCase())
    }

    // Update player position on each frame
    const updatePlayerPosition = () => {
      if (keysPressed.has("w") || keysPressed.has("arrowup")) {
        // Move up
      }
      if (keysPressed.has("s") || keysPressed.has("arrowdown")) {
        // Move down
      }
      requestAnimationFrame(updatePlayerPosition)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    const animationId = requestAnimationFrame(updatePlayerPosition)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      cancelAnimationFrame(animationId)
    }
  }, [mode, isPaused, isGameOver, isGameStarted])

  useEffect(() => {
    if (!["keyboard", "camera"].includes(mode) || !mapId.match(/^map[1-4]$/)) {
      router.push("/single-player")
    }

    // Handle keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== "keyboard" || isPaused || isGameOver || !isGameStarted) return

      // Handle keyboard controls - only up/down
      switch (e.key) {
        case "ArrowUp":
        case "w":
          // Move up
          break
        case "ArrowDown":
        case "s":
          // Move down
          break
        case "Escape":
          setIsPaused(true)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mode, mapId, router, isPaused, isGameOver, isGameStarted])

  // Handle hand detection status change
  useEffect(() => {
    if (mode === "camera") {
      if (isHandDetected && !isGameStarted && !startTimerRef.current) {
        setShowStartMessage(false)
        startTimerRef.current = setTimeout(() => {
          setIsGameStarted(true)
          setGameStartTime(Date.now())
          startTimerRef.current = null
        }, 1000)
      } else if (!isHandDetected && isGameStarted && !startTimerRef.current) {
        setTimeout(() => {
          if (!isHandDetected) {
            console.log("Hand not detected, pausing game")
            setIsPaused(true)
          }
        }, 500)
      }
    } else if (isGameStarted && !gameStartTime) {
      setGameStartTime(Date.now())
    }

    return () => {
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current)
        startTimerRef.current = null
      }
    }
  }, [isHandDetected, isGameStarted, mode, gameStartTime])

  // Handle collision
  const handleCollision = () => {
    setHealth((prev) => {
      const newHealth = prev - 1
      if (newHealth <= 0) {
        setIsGameOver(true)
      }
      return newHealth
    })

    // Play collision sound
    const collisionSound = new Audio("/sounds/collision.mp3")
    collisionSound.play().catch((e) => console.error("Error playing sound:", e))
  }

  // Handle progress update based on survival time
  useEffect(() => {
    if (!isGameStarted || isPaused || isGameOver || !gameStartTime) return

    const progressInterval = setInterval(() => {
      const elapsedTime = Date.now() - gameStartTime
      // Calculate progress based on time (max 100% after 60 seconds)
      const timeProgress = Math.min(Math.floor((elapsedTime / 60000) * 100), 99)

      setProgress(timeProgress)

      // Save progress to local storage if it's higher than previous
      const savedProgress = localStorage.getItem("handwave-progress")
      if (savedProgress) {
        const progressData = JSON.parse(savedProgress)
        if (timeProgress > (progressData[mode][mapId] || 0)) {
          progressData[mode][mapId] = timeProgress
          localStorage.setItem("handwave-progress", JSON.stringify(progressData))
        }
      } else {
        const initialProgress = {
          keyboard: { map1: 0, map2: 0, map3: 0, map4: 0 },
          camera: { map1: 0, map2: 0, map3: 0, map4: 0 },
        }
        initialProgress[mode as keyof InitialProgress][mapId as keyof ProgressMap] = timeProgress
        localStorage.setItem("handwave-progress", JSON.stringify(initialProgress))
      }
    }, 1000)

    return () => clearInterval(progressInterval)
  }, [isGameStarted, isPaused, isGameOver, gameStartTime, mode, mapId])

  // Handle hand position update
  const handleHandPositionUpdate = (x: number, y: number) => {
    setHandPosition({ x, y })
  }

  // Handle level completion
  const handleLevelComplete = () => {
    setProgress(100)
    setIsGameOver(true)

    // Save 100% progress to local storage
    const savedProgress = localStorage.getItem("handwave-progress")
    if (savedProgress) {
      const progressData = JSON.parse(savedProgress)
      progressData[mode as "keyboard" | "camera"][mapId] = 100
      localStorage.setItem("handwave-progress", JSON.stringify(progressData))
    } else {
      const initialProgress = {
        keyboard: { map1: 0, map2: 0, map3: 0, map4: 0 },
        camera: { map1: 0, map2: 0, map3: 0, map4: 0 },
      }
      initialProgress[mode as keyof InitialProgress][mapId as keyof ProgressMap] = 100
      localStorage.setItem("handwave-progress", JSON.stringify(initialProgress))
    }
  }

  // Restart game
  const restartGame = () => {
    setHealth(3)
    setProgress(0)
    setIsGameOver(false)
    setIsPaused(false)
    setIsGameStarted(mode === "keyboard")
    setShowStartMessage(mode === "camera")
    setGameStartTime(null)
  }

  const generateObstacles = (numberOfObstacles: number, canvasWidth: number, canvasHeight: number) => {
    const obstacleSpacing = 200; // Minimum spacing between obstacles
    const newObstacles: { x: number; y: number }[] = []; // Define the type of newObstacles

    while (newObstacles.length < numberOfObstacles) {
      const xPosition = Math.random() * canvasWidth;
      const yPosition = Math.random() * canvasHeight;

      // Ensure obstacles are spaced out
      if (newObstacles.every(obstacle => Math.abs(obstacle.x - xPosition) > obstacleSpacing)) {
        newObstacles.push({ x: xPosition, y: yPosition });
      }
    }

    return newObstacles;
  };

  return (
    <div className="flex min-h-screen flex-col bg-black p-4 text-white">
      {/* Game UI */}
      <div className="flex justify-between items-center mb-4 bg-black/40 p-3 rounded-lg backdrop-blur-sm">
        {/* Back button */}
        <Link href={`/maps?mode=${mode}`}>
          <Button
            variant="outline"
            size="icon"
            className="border border-white/20 bg-black text-white hover:bg-white hover:text-black transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        {/* Progress */}
        <div className="flex-1 max-w-xs mx-4">
          <div className="text-sm font-medium text-white mb-1">Progress: {progress}%</div>
          <Progress value={progress} className="h-3 bg-white/10" />
        </div>

        {/* Health */}
        <div className="flex gap-2 mx-4">
          {[...Array(3)].map((_, i) => (
            <Heart
              key={i}
              className={`h-6 w-6 transition-all duration-300 ${
                i < health ? "text-white fill-white" : "text-white/20"
              }`}
            />
          ))}
        </div>

        {/* Pause button */}
        <Button
          variant="outline"
          size="icon"
          className="border border-white/20 bg-black text-white hover:bg-white hover:text-black transition-colors"
          onClick={() => setIsPaused(true)}
        >
          <Pause className="h-4 w-4" />
        </Button>
      </div>

      {/* Game container */}
      <div
        ref={gameRef}
        className="relative flex-1 border border-white/20 rounded-lg overflow-hidden bg-black shadow-[inset_0_0_100px_rgba(255,255,255,0.1)]"
      >
        {/* Camera feed (if in camera mode) - Updated position to top right */}
        {mode === "camera" && (
          <div className="absolute top-2 right-2 w-1/4 h-1/4 z-10 border border-white/10 rounded overflow-hidden">
            <HandTracker onHandDetected={setIsHandDetected} onPositionUpdate={handleHandPositionUpdate} />
          </div>
        )}

        {/* Game canvas */}
        <GameCanvas
          mode={mode as "keyboard" | "camera"}
          mapConfig={currentMap}
          isPaused={isPaused || !isGameStarted}
          isGameOver={isGameOver}
          handPosition={handPosition}
          progress={progress}
          health={health}
          onCollision={handleCollision}
          onLevelComplete={handleLevelComplete}
        />

        {/* Show hand message */}
        {showStartMessage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <Card className="p-8 bg-black border-white/20 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Show your hand to start</h2>
              <p className="text-lg text-white/60">Position your hand in front of the camera</p>
            </Card>
          </div>
        )}
      </div>

      {/* Pause dialog */}
      <Dialog open={isPaused && !isGameOver} onOpenChange={setIsPaused}>
        <DialogContent className="bg-black/95 border border-white/20 text-white backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-white">Game Paused</DialogTitle>
            <DialogDescription className="text-lg text-white/60">
              Take a break or continue your adventure
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-6">
            <Button
              className="w-full h-12 bg-white text-black hover:bg-white/90 transition-colors text-lg font-medium"
              onClick={() => setIsPaused(false)}
            >
              <Play className="mr-2 h-5 w-5" /> Resume Game
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 border border-white/20 bg-black text-white hover:bg-white hover:text-black transition-colors text-lg font-medium"
              onClick={restartGame}
            >
              <RefreshCw className="mr-2 h-5 w-5" /> Restart Level
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 border border-white/20 bg-black text-white hover:bg-white hover:text-black transition-colors text-lg font-medium"
              onClick={() => router.push("/maps?mode=" + mode)}
            >
              <Home className="mr-2 h-5 w-5" /> Back to Maps
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Game over dialog */}
      <Dialog open={isGameOver} onOpenChange={setIsGameOver}>
        <DialogContent className="bg-black/95 border border-white/20 text-white backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-white">
              {progress >= 100 ? "Level Complete! 🎉" : "Game Over"}
            </DialogTitle>
            <DialogDescription className="text-lg text-white/60">
              {progress >= 100
                ? "Congratulations! You've completed this level."
                : "Better luck next time. Keep trying!"}
            </DialogDescription>
          </DialogHeader>

          <div className="my-6">
            <div className="text-lg font-medium text-white mb-2">Progress: {progress}%</div>
            <Progress value={progress} className="h-4 bg-white/10" />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-4">
            <Button
              className="flex-1 h-12 bg-white text-black hover:bg-white/90 transition-colors text-lg font-medium"
              onClick={restartGame}
            >
              <RefreshCw className="mr-2 h-5 w-5" /> Play Again
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12 border border-white/20 bg-black text-white hover:bg-white hover:text-black transition-colors text-lg font-medium"
              onClick={() => router.push("/maps?mode=" + mode)}
            >
              <Home className="mr-2 h-5 w-5" /> Back to Maps
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

