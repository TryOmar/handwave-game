"use client"

import { useEffect, RefObject, MutableRefObject, useState } from "react"
import { GameObject, CollisionMessage } from "../types"

interface UseObstaclesProps {
  canvasRef: RefObject<HTMLCanvasElement>
  obstaclesRef: MutableRefObject<GameObject[]>
  flagRef: MutableRefObject<GameObject | null>
  progress: number
  currentSpeed: number
  isGameOver: boolean
  mode: "keyboard" | "camera" // Add mode parameter
}

export const useObstacles = ({
  canvasRef,
  obstaclesRef,
  flagRef,
  progress,
  currentSpeed,
  isGameOver,
  mode, // Use the mode parameter
}: UseObstaclesProps) => {
  const flagSpawnThreshold = 80 // Show flag when progress reaches 80%
  
  // Reduce max obstacles in camera mode
  const [maxActiveObstacles] = useState(mode === "camera" ? 8 : 15);

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
  }, [progress, currentSpeed, isGameOver, canvasRef, flagRef])

  // Generate obstacles based on time
  const generateObstacles = (
    time: number, 
    lastObstacleTimeRef: MutableRefObject<number>,
    nextObstacleDelayRef: MutableRefObject<number>,
    lastObstacleYRef: MutableRefObject<number | null>
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return false
    
    // Limit total number of obstacles for performance
    if (obstaclesRef.current.length >= maxActiveObstacles) {
      return false;
    }
    
    if (time - lastObstacleTimeRef.current > nextObstacleDelayRef.current) {
      const minHeight = 40 // Allow smaller obstacles
      const maxHeight = 180 // Allow larger obstacles
      const canvasMid = canvas.height / 2
      let spawnType = Math.random()
      let obstaclesToAdd = []
      
      // Reduce tunnel obstacles in camera mode by half
      const tunnelThreshold = mode === "camera" ? 0.1 : 0.2;
      
      // 20% chance to spawn a tunnel (gap in the middle) in keyboard mode
      // 10% chance in camera mode
      if (spawnType < tunnelThreshold) {
        // Make gap bigger in camera mode
        const gapHeight = mode === "camera" 
          ? 80 + Math.random() * 40 // 80-120px gap in camera mode
          : 60 + Math.random() * 40; // 60-100px gap in keyboard mode
        
        // Ensure the gap can appear anywhere in the canvas height
        // Divide the canvas into 3 sections and randomize which section the gap appears in
        const section = Math.floor(Math.random() * 3); // 0 = top, 1 = middle, 2 = bottom
        let gapY;
        
        if (section === 0) {
          // Gap in top third
          gapY = Math.random() * (canvas.height / 3 - gapHeight);
        } else if (section === 1) {
          // Gap in middle third
          gapY = canvas.height / 3 + Math.random() * (canvas.height / 3 - gapHeight);
        } else {
          // Gap in bottom third
          gapY = (canvas.height * 2 / 3) + Math.random() * (canvas.height / 3 - gapHeight);
        }
        
        // Top obstacle
        if (gapY > 10) {
          obstaclesToAdd.push({
            x: canvas.width,
            y: 0,
            width: 20,
            height: gapY,
            color: "#FFFFFF",
            speed: currentSpeed,
            type: "obstacle" as const,
          })
        }
        // Bottom obstacle
        if (gapY + gapHeight < canvas.height - 10) {
          obstaclesToAdd.push({
            x: canvas.width,
            y: gapY + gapHeight,
            width: 20,
            height: canvas.height - (gapY + gapHeight),
            color: "#FFFFFF",
            speed: currentSpeed,
            type: "obstacle" as const,
          })
        }
      } else {
        // Single obstacle, more variety in position and height
        const obstacleHeight = Math.random() * (maxHeight - minHeight) + minHeight
        let obstacleY;
        
        // Divide canvas into 5 vertical zones for better distribution
        // 1/5 chance for each zone
        const zone = Math.floor(Math.random() * 5);
        const zoneHeight = canvas.height / 5;
        
        if (zone === 0) {
          // Top zone - force obstacle to be at the top
          obstacleY = 0;
        } else if (zone === 4) {
          // Bottom zone - force obstacle to be at the bottom
          obstacleY = canvas.height - obstacleHeight;
        } else {
          // Middle zones - place obstacle within the selected zone
          const zoneStart = zone * zoneHeight;
          obstacleY = zoneStart + Math.random() * (zoneHeight - obstacleHeight);
          obstacleY = Math.min(obstacleY, canvas.height - obstacleHeight);
        }
        
        // Avoid same y as last obstacle
        if (lastObstacleYRef.current !== null && Math.abs(obstacleY - lastObstacleYRef.current) < 40) {
          // If too similar to last position, move to a completely different zone
          obstacleY = (obstacleY < canvasMid) ? 
            canvasMid + Math.random() * (canvas.height - canvasMid - obstacleHeight) : 
            Math.random() * (canvasMid - obstacleHeight);
        }
        
        lastObstacleYRef.current = obstacleY;
        obstaclesToAdd.push({
          x: canvas.width,
          y: obstacleY,
          width: 20,
          height: obstacleHeight,
          color: "#FFFFFF",
          speed: currentSpeed,
          type: "obstacle" as const,
        })
      }
      
      // Add new obstacles while respecting the maximum count
      for (const obs of obstaclesToAdd) {
        if (obs.height > 10 && obstaclesRef.current.length < maxActiveObstacles) {
          obstaclesRef.current.push(obs)
        }
      }
      
      // Randomize next spawn interval
      // Increase delay for camera mode (700-1200ms) vs keyboard mode (400-800ms)
      if (mode === "camera") {
        nextObstacleDelayRef.current = 700 + Math.random() * 500
      } else {
        nextObstacleDelayRef.current = 400 + Math.random() * 400
      }
      
      lastObstacleTimeRef.current = time
      return true
    }
    return false
  }

  // Update obstacle positions and check for collisions
  const updateObstacles = (onCollision: () => void, collisionCooldownRef: MutableRefObject<boolean>) => {
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obstacle = obstaclesRef.current[i]
      
      // Remove obstacles that are off-screen
      if (obstacle.x + obstacle.width < 0) {
        obstaclesRef.current.splice(i, 1)
      }
    }
  }

  // Check for collisions with player
  const checkCollisions = (
    playerRef: MutableRefObject<GameObject>,
    onCollision: () => void,
    collisionCooldownRef: MutableRefObject<boolean>,
    collisionFlashRef: MutableRefObject<number>,
    collisionMessageRef: MutableRefObject<CollisionMessage | null>
  ) => {
    for (const obstacle of obstaclesRef.current) {
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
        
        return true
      }
    }
    return false
  }

  // Check for flag collision
  const checkFlagCollision = (playerRef: MutableRefObject<GameObject>, onLevelComplete: () => void) => {
    if (flagRef.current) {
      const flag = flagRef.current

      // Check for flag collision (level complete)
      if (
        playerRef.current.x < flag.x + flag.width &&
        playerRef.current.x + playerRef.current.width > flag.x &&
        playerRef.current.y < flag.y + flag.height &&
        playerRef.current.y + playerRef.current.height > flag.y
      ) {
        onLevelComplete()
        return true
      }
      
      return false
    }
    return false
  }

  return {
    generateObstacles,
    updateObstacles,
    checkCollisions,
    checkFlagCollision
  }
} 