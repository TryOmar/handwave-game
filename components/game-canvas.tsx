"use client"

import { useRef, useState } from "react"
import { GameCanvasProps, GameObject, CollisionMessage } from "./game/types"
import { useGameInit } from "./game/hooks/useGameInit"
import { usePlayerControls } from "./game/hooks/usePlayerControls"
import { useObstacles } from "./game/hooks/useObstacles"
import { useGameLoop } from "./game/hooks/useGameLoop"

export default function GameCanvas({
  mode,
  mapConfig,
  isPaused,
  isGameOver,
  handPosition,
  progress,
  onCollision,
  onLevelComplete,
  health,
}: GameCanvasProps) {
  // Create refs for game state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestIdRef = useRef<number>(0)
  const playerRef = useRef<GameObject>({
    x: 50, // Fixed x position
    y: 200,
    width: 20,
    height: 20,
    color: "#FFFFFF",
    speed: 8, // Decreased from 12 to 8 for smoother movement
    type: "player",
  })
  const obstaclesRef = useRef<GameObject[]>([])
  const flagRef = useRef<GameObject | null>(null)
  const gameTimeRef = useRef<number>(0)
  const lastObstacleTimeRef = useRef<number>(0)
  const collisionCooldownRef = useRef<boolean>(false)
  const collisionFlashRef = useRef<number>(0)
  const collisionMessageRef = useRef<CollisionMessage | null>(null)
  const lastObstacleYRef = useRef<number | null>(null)
  const nextObstacleDelayRef = useRef<number>(500)

  // Player movement state
  const [isMovingUp, setIsMovingUp] = useState(false)
  const [isMovingDown, setIsMovingDown] = useState(false)

  // Initialize game state and keyboard controls
  const { currentSpeed, setCurrentSpeed } = useGameInit({
    canvasRef,
    requestIdRef,
    playerRef,
    obstaclesRef,
    flagRef,
    gameTimeRef,
    lastObstacleTimeRef,
    collisionFlashRef,
    collisionMessageRef,
    collisionCooldownRef,
    setIsMovingUp,
    setIsMovingDown,
    mode,
    mapConfig,
    isPaused,
    isGameOver,
  })

  // Player movement controls
  const { updatePlayerPosition } = usePlayerControls({
    canvasRef,
    playerRef,
    mode,
    isPaused,
    isGameOver,
    handPosition,
    isMovingUp,
    isMovingDown,
    progress,
  })

  // Obstacle and flag management
  const { 
    generateObstacles,
    checkCollisions,
    checkFlagCollision 
  } = useObstacles({
    canvasRef,
    obstaclesRef,
    flagRef,
    progress,
    currentSpeed,
    isGameOver,
    mode,
  })

  // Main game loop - uses fixed time steps for consistent performance
  useGameLoop({
    canvasRef,
    requestIdRef,
    playerRef,
    obstaclesRef,
    flagRef,
    gameTimeRef,
    lastObstacleTimeRef,
    lastObstacleYRef,
    nextObstacleDelayRef,
    collisionCooldownRef,
    collisionFlashRef,
    collisionMessageRef,
    isPaused,
    isGameOver,
    onCollision,
    onLevelComplete,
    health,
    currentSpeed,
    setCurrentSpeed,
    mapConfig,
    updatePlayerPosition,
    generateObstacles,
    checkCollisions,
    checkFlagCollision,
  })

  return <canvas ref={canvasRef} className="w-full h-full" />
}

