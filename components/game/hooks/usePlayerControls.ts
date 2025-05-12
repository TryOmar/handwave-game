"use client"

import { useEffect, RefObject, MutableRefObject, useState, useRef } from "react"
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
  const [targetY, setTargetY] = useState(150);
  const lastHandleTimeRef = useRef(0);
  const CAMERA_UPDATE_INTERVAL = 50; // Only process camera input every 50ms

  // Update player position based on hand tracking - throttled updates
  useEffect(() => {
    if (mode === "camera" && !isPaused && !isGameOver) {
      // Throttle camera updates to reduce main thread load
      const now = performance.now();
      if (now - lastHandleTimeRef.current < CAMERA_UPDATE_INTERVAL) {
        return; // Skip this update if it's too soon
      }
      lastHandleTimeRef.current = now;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Calculate target position
      const targetPosition = Math.min(
        Math.max(handPosition.y * canvas.height * 1.2 - playerRef.current.height / 2, 0),
        canvas.height - playerRef.current.height,
      );
      
      setTargetY(targetPosition);
    }
  }, [handPosition, mode, isPaused, isGameOver, canvasRef, playerRef]);

  // Update player position on each frame
  const updatePlayerPosition = () => {
    const player = playerRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate new x position based on progress
    const targetX = (progress / 100) * (canvas.width - player.width);
    player.x = lerp(player.x, targetX, 0.01); // Use a smaller factor for smoother movement

    // Handle keyboard movement
    if (isMovingUp) {
      player.y = Math.max(player.y - player.speed, 0);
    }
    if (isMovingDown) {
      player.y = Math.min(player.y + player.speed, canvas.height - player.height);
    }

    // Handle camera mode smoothly
    if (mode === "camera" && !isPaused && !isGameOver) {
      // Smoothly interpolate to target position - very responsive despite less frequent updates
      player.y = lerp(player.y, targetY, 0.15); // Slightly higher interpolation factor for responsiveness
    }
  };

  return { updatePlayerPosition };
} 