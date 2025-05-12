"use client"

import { useEffect, RefObject, MutableRefObject } from "react"
import { GameObject } from "../types"
import { lerp } from "../utils"

interface UsePlayerControlsProps {
  canvasRef: RefObject<HTMLCanvasElement>
  playerRef: MutableRefObject<GameObject>
  mode: "keyboard" | "camera"
  isPaused: boolean
  isGameOver: boolean
  handPosition: { x: number; y: number }
  isMovingUp: boolean
  isMovingDown: boolean
  progress: number
}

export const usePlayerControls = ({
  canvasRef,
  playerRef,
  mode,
  isPaused,
  isGameOver,
  handPosition,
  isMovingUp,
  isMovingDown,
  progress,
}: UsePlayerControlsProps) => {
  // Update player position based on hand tracking - only y position
  useEffect(() => {
    if (mode === "camera" && !isPaused && !isGameOver) {
      const canvas = canvasRef.current
      if (!canvas) return

      const player = playerRef.current
      // Keep x position fixed, multiply hand movement for faster response
      player.y = Math.min(
        Math.max(handPosition.y * canvas.height * 1.2 - player.height / 2, 0),
        canvas.height - player.height,
      )
    }
  }, [handPosition, mode, isPaused, isGameOver, canvasRef, playerRef])

  // Update player position on each frame
  const updatePlayerPosition = () => {
    const player = playerRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    // Calculate new x position based on progress
    const targetX = (progress / 100) * (canvas.width - player.width)
    player.x = lerp(player.x, targetX, 0.01) // Use a smaller factor for smoother movement

    if (isMovingUp) {
      player.y = Math.max(player.y - player.speed, 0)
    }
    if (isMovingDown) {
      player.y = Math.min(player.y + player.speed, canvas.height - player.height)
    }
  }

  return { updatePlayerPosition }
} 