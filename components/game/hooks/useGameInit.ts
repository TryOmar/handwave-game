"use client"

import { useState, useEffect, RefObject, MutableRefObject } from "react"
import { GameObject, CollisionMessage } from "../types"

interface UseGameInitProps {
  canvasRef: RefObject<HTMLCanvasElement>
  requestIdRef: MutableRefObject<number>
  playerRef: MutableRefObject<GameObject>
  obstaclesRef: MutableRefObject<GameObject[]>
  flagRef: MutableRefObject<GameObject | null>
  gameTimeRef: MutableRefObject<number>
  lastObstacleTimeRef: MutableRefObject<number>
  collisionFlashRef: MutableRefObject<number>
  collisionMessageRef: MutableRefObject<CollisionMessage | null>
  collisionCooldownRef: MutableRefObject<boolean>
  setIsMovingUp: (isMoving: boolean) => void
  setIsMovingDown: (isMoving: boolean) => void
  mode: "keyboard" | "camera"
  mapConfig: {
    obstacleSpeed: number
    increasingSpeed: boolean
  }
  isPaused: boolean
  isGameOver: boolean
}

export const useGameInit = ({
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
}: UseGameInitProps) => {
  // Base speed is the same regardless of mode
  const [currentSpeed, setCurrentSpeed] = useState<number>(mapConfig.obstacleSpeed)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas dimensions
    canvas.width = 800
    canvas.height = 300

    // Reset game state
    obstaclesRef.current = []
    gameTimeRef.current = 0
    lastObstacleTimeRef.current = 0
    flagRef.current = null
    collisionFlashRef.current = 0
    collisionMessageRef.current = null
    collisionCooldownRef.current = false
    playerRef.current = {
      x: 50,
      y: 150,
      width: 20,
      height: 20,
      color: "#FFFFFF",
      speed: 8,
      type: "player",
    }
    
    // Always set the same base speed regardless of mode
    setCurrentSpeed(mapConfig.obstacleSpeed)

    // Set up keyboard controls - only up/down
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isGameOver || mode !== "keyboard") return

      switch (e.key) {
        case "ArrowUp":
        case "w":
          setIsMovingUp(true)
          break
        case "ArrowDown":
        case "s":
          setIsMovingDown(true)
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
          setIsMovingUp(false)
          break
        case "ArrowDown":
        case "s":
          setIsMovingDown(false)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      cancelAnimationFrame(requestIdRef.current)
    }
  }, [
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
    mode, 
    mapConfig.obstacleSpeed, 
    isPaused, 
    isGameOver, 
    setIsMovingUp, 
    setIsMovingDown
  ])

  return { currentSpeed, setCurrentSpeed }
} 