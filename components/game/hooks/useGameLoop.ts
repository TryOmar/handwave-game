"use client"

import { useEffect, RefObject, MutableRefObject } from "react"
import { GameObject, CollisionMessage } from "../types"
import { getPlayerOpacity } from "../utils"

interface UseGameLoopProps {
  canvasRef: RefObject<HTMLCanvasElement>
  requestIdRef: MutableRefObject<number>
  playerRef: MutableRefObject<GameObject>
  obstaclesRef: MutableRefObject<GameObject[]>
  flagRef: MutableRefObject<GameObject | null>
  gameTimeRef: MutableRefObject<number>
  lastObstacleTimeRef: MutableRefObject<number>
  lastObstacleYRef: MutableRefObject<number | null>
  nextObstacleDelayRef: MutableRefObject<number>
  collisionCooldownRef: MutableRefObject<boolean>
  collisionFlashRef: MutableRefObject<number>
  collisionMessageRef: MutableRefObject<CollisionMessage | null>
  isPaused: boolean
  isGameOver: boolean
  onCollision: () => void
  onLevelComplete: () => void
  health: number
  currentSpeed: number
  setCurrentSpeed: (speed: number) => void
  mapConfig: {
    obstacleSpeed: number
    increasingSpeed: boolean
  }
  updatePlayerPosition: () => void
  generateObstacles: (
    time: number,
    lastObstacleTimeRef: MutableRefObject<number>,
    nextObstacleDelayRef: MutableRefObject<number>,
    lastObstacleYRef: MutableRefObject<number | null>
  ) => boolean
  checkCollisions: (
    playerRef: MutableRefObject<GameObject>,
    onCollision: () => void,
    collisionCooldownRef: MutableRefObject<boolean>,
    collisionFlashRef: MutableRefObject<number>,
    collisionMessageRef: MutableRefObject<CollisionMessage | null>
  ) => boolean
  checkFlagCollision: (
    playerRef: MutableRefObject<GameObject>,
    onLevelComplete: () => void
  ) => boolean
}

export const useGameLoop = ({
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
  checkFlagCollision
}: UseGameLoopProps) => {
  // Game loop
  useEffect(() => {
    if (isPaused || isGameOver) {
      cancelAnimationFrame(requestIdRef.current)
      return
    }

    const render = (time: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Calculate game time
      const deltaTime = time - gameTimeRef.current
      gameTimeRef.current = time

      // Clear canvas
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw background grid (retro style)
      ctx.strokeStyle = "#333333"
      ctx.lineWidth = 1
      const gridSize = 20
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Update obstacles
      generateObstacles(time, lastObstacleTimeRef, nextObstacleDelayRef, lastObstacleYRef)

      // Update obstacle positions and check collisions
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obstacle = obstaclesRef.current[i]
        obstacle.x -= obstacle.speed

        // Remove obstacles that are off-screen
        if (obstacle.x + obstacle.width < 0) {
          obstaclesRef.current.splice(i, 1)
          continue
        }

        // Draw obstacle with glow effect
        ctx.save()
        ctx.shadowBlur = 10
        ctx.shadowColor = "#FFFFFF"
        ctx.fillStyle = obstacle.color
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
        ctx.restore()
      }

      // Check for collisions
      checkCollisions(
        playerRef,
        onCollision,
        collisionCooldownRef,
        collisionFlashRef,
        collisionMessageRef
      )

      // Increase speed if configured
      if (mapConfig.increasingSpeed) {
        const elapsedSeconds = time / 1000
        const newSpeed = mapConfig.obstacleSpeed + Math.floor(elapsedSeconds / 10) * 0.5
        if (newSpeed !== currentSpeed) {
          setCurrentSpeed(newSpeed)
          obstaclesRef.current.forEach((obstacle) => {
            obstacle.speed = newSpeed
          })
          if (flagRef.current) {
            flagRef.current.speed = newSpeed
          }
        }
      }

      // Check flag collision
      checkFlagCollision(playerRef, onLevelComplete)

      // Update and draw flag if it exists
      if (flagRef.current) {
        const flag = flagRef.current
        flag.x -= flag.speed

        // Remove flag if it goes off-screen
        if (flag.x + flag.width < 0) {
          flagRef.current = null
        } else {
          // Draw flag with glow effect
          ctx.save()
          ctx.shadowBlur = 15
          ctx.shadowColor = "#FFFFFF"

          // Draw flag
          ctx.fillStyle = flag.color
          ctx.fillRect(flag.x, flag.y, flag.width, flag.height)

          // Draw flag pole
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(flag.x - 5, flag.y - 20, 5, flag.height + 20)

          ctx.restore()
        }
      }

      // Draw player with health-based opacity and collision flash effect
      ctx.save()
      const playerOpacity = getPlayerOpacity(health)

      if (collisionFlashRef.current > 0) {
        ctx.shadowBlur = 20
        ctx.shadowColor = "rgba(255, 0, 0, " + playerOpacity + ")"
        ctx.fillStyle =
          collisionFlashRef.current % 2 === 0
            ? `rgba(255, 0, 0, ${playerOpacity})`
            : `rgba(255, 255, 255, ${playerOpacity})`
        collisionFlashRef.current--
      } else {
        ctx.shadowBlur = 15
        ctx.shadowColor = `rgba(255, 255, 255, ${playerOpacity})`
        ctx.fillStyle = `rgba(255, 255, 255, ${playerOpacity})`
      }

      // Draw player trail effect
      const trail = 3
      for (let i = 0; i < trail; i++) {
        const trailOpacity = ((playerOpacity * (trail - i)) / trail) * 0.3
        ctx.beginPath()
        ctx.arc(
          playerRef.current.x + playerRef.current.width / 2,
          playerRef.current.y + playerRef.current.height / 2,
          playerRef.current.width / 2 + i * 2,
          0,
          Math.PI * 2,
        )
        ctx.fillStyle = `rgba(255, 255, 255, ${trailOpacity})`
        ctx.fill()
      }

      // Draw main player circle
      ctx.beginPath()
      ctx.arc(
        playerRef.current.x + playerRef.current.width / 2,
        playerRef.current.y + playerRef.current.height / 2,
        playerRef.current.width / 2,
        0,
        Math.PI * 2,
      )
      ctx.fill()
      ctx.restore()

      // Draw collision message if exists
      if (collisionMessageRef.current) {
        const msg = collisionMessageRef.current
        ctx.save()
        ctx.fillStyle = `rgba(255, 255, 255, ${msg.opacity})`
        ctx.font = "bold 20px Arial"
        ctx.fillText(msg.text, msg.x, msg.y)
        ctx.restore()

        // Update message position and opacity
        msg.y -= 1
        msg.opacity -= 0.02

        if (msg.opacity <= 0) {
          collisionMessageRef.current = null
        }
      }

      // Update player position
      updatePlayerPosition()

      requestIdRef.current = requestAnimationFrame(render)
    }

    requestIdRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(requestIdRef.current)
    }
  }, [
    isPaused,
    isGameOver,
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
  ])
} 