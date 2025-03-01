"use client"

import { useEffect, useRef, useState } from "react"

interface GameCanvasProps {
  mode: "keyboard" | "camera"
  mapConfig: {
    obstacleSpeed: number
    increasingSpeed: boolean
  }
  isPaused: boolean
  isGameOver: boolean
  handPosition: { x: number; y: number }
  progress: number
  onCollision: () => void
  onLevelComplete: () => void
  health: number
}

interface GameObject {
  x: number
  y: number
  width: number
  height: number
  color: string
  speed: number
  type: "obstacle" | "player" | "flag"
}

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
  const collisionMessageRef = useRef<{ text: string; x: number; y: number; opacity: number } | null>(null)
  const [currentSpeed, setCurrentSpeed] = useState<number>(mapConfig.obstacleSpeed)
  const flagSpawnThreshold = 80 // Show flag when progress reaches 80%
  const [isMovingUp, setIsMovingUp] = useState(false)
  const [isMovingDown, setIsMovingDown] = useState(false)
  const speedFactor = 2; // Adjust this value to control the speed of movement

  const lerp = (start: number, end: number, t: number) => {
    return start + (end - start) * t;
  };

  // Initialize game
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
    playerRef.current = {
      x: 50,
      y: 150,
      width: 20,
      height: 20,
      color: "#FFFFFF",
      speed: 8,
      type: "player",
    }
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
  }, [mode, mapConfig.obstacleSpeed, isPaused, isGameOver])

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
  }, [handPosition, mode, isPaused, isGameOver])

  // Spawn flag when progress reaches threshold
  useEffect(() => {
    if (progress >= flagSpawnThreshold && !flagRef.current && !isGameOver) {
      const canvas = canvasRef.current
      if (!canvas) return

      flagRef.current = {
        x: canvas.width,
        y: 0, // Start from the top of the canvas
        width: 30,
        height: canvas.height, // Make it cover the entire height
        color: "#FFFFFF",
        speed: currentSpeed,
        type: "flag",
      }
    }
  }, [progress, currentSpeed, isGameOver])

  // Update player opacity based on health
  const getPlayerOpacity = (health: number) => {
    switch (health) {
      case 3:
        return 1
      case 2:
        return 0.66
      case 1:
        return 0.33
      default:
        return 1
    }
  }

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
      if (time - lastObstacleTimeRef.current > 1000) {
        // Create new obstacle with increased height
        const minHeight = 80 // Minimum height increased
        const maxHeight = 160 // Maximum height increased
        const obstacleHeight = Math.random() * (maxHeight - minHeight) + minHeight
        const obstacleY = Math.random() * (canvas.height - obstacleHeight)

        obstaclesRef.current.push({
          x: canvas.width,
          y: obstacleY,
          width: 20,
          height: obstacleHeight,
          color: "#FFFFFF",
          speed: currentSpeed,
          type: "obstacle",
        })

        lastObstacleTimeRef.current = time
      }

      // Update obstacle positions and check collisions
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obstacle = obstaclesRef.current[i]
        obstacle.x -= obstacle.speed

        // Remove obstacles that are off-screen
        if (obstacle.x + obstacle.width < 0) {
          obstaclesRef.current.splice(i, 1)
          continue
        }

        // Check for collision with player
        if (
          !collisionCooldownRef.current &&
          playerRef.current.x < obstacle.x + obstacle.width &&
          playerRef.current.x + playerRef.current.width > obstacle.x &&
          playerRef.current.y < obstacle.y + obstacle.height &&
          playerRef.current.y + playerRef.current.height > obstacle.y
        ) {
          onCollision()
          collisionCooldownRef.current = true
          collisionFlashRef.current = 10 // Number of frames to flash

          // Create collision message
          collisionMessageRef.current = {
            text: "Ouch!",
            x: playerRef.current.x + playerRef.current.width,
            y: playerRef.current.y,
            opacity: 1.0,
          }

          setTimeout(() => {
            collisionCooldownRef.current = false
          }, 1000)
        }

        // Draw obstacle with glow effect
        ctx.save()
        ctx.shadowBlur = 10
        ctx.shadowColor = "#FFFFFF"
        ctx.fillStyle = obstacle.color
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
        ctx.restore()
      }

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

      // Update and draw flag if it exists
      if (flagRef.current) {
        const flag = flagRef.current
        flag.x -= flag.speed

        // Check for flag collision (level complete)
        if (
          playerRef.current.x < flag.x + flag.width &&
          playerRef.current.x + playerRef.current.width > flag.x &&
          playerRef.current.y < flag.y + flag.height &&
          playerRef.current.y + playerRef.current.height > flag.y
        ) {
          onLevelComplete()
        }

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

      // Update player position on each frame
      const player = playerRef.current
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

      requestIdRef.current = requestAnimationFrame(render)
    }

    requestIdRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(requestIdRef.current)
    }
  }, [
    isPaused,
    isGameOver,
    onCollision,
    onLevelComplete,
    mapConfig.increasingSpeed,
    mapConfig.obstacleSpeed,
    currentSpeed,
    health,
    isMovingUp,
    isMovingDown,
    progress,
  ])

  return <canvas ref={canvasRef} className="w-full h-full" />
}

