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

    // Fixed time step for physics updates
    const fixedTimeStep = 16; // ~60fps
    let lastTime = 0;
    let accumulator = 0;
    let lastSpeedUpdateTime = 0;
    let frameCount = 0;
    let lastFrameTime = 0;
    const frameRateSmoothing = []; // To track frame times for adaptive physics
    
    // Adaptive physics updates - improved to handle varying frame rates better
    const MIN_PHYSICS_PER_FRAME = 1; // Always do at least one physics update
    const MAX_PHYSICS_PER_FRAME = 4; // Maximum number of physics updates per frame
    let adaptivePhysicsSteps = 2; // Start with 2 as a balanced value

    const render = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Calculate delta time since last frame with better capping
      let deltaTime = 0;
      if (lastTime > 0) {
        deltaTime = Math.min(time - lastTime, 100); // Cap at 100ms to avoid spiral of death
      }
      lastTime = time;
      
      // Track frame rate for adaptive physics
      frameCount++;
      if (time - lastFrameTime >= 1000) {
        // Calculate average frame time over the last second
        const frameRate = frameCount * 1000 / (time - lastFrameTime);
        frameCount = 0;
        lastFrameTime = time;
        
        // Adjust physics steps based on frame rate
        if (frameRate < 30) {
          // Low frame rate - reduce physics steps to prevent further slowdown
          adaptivePhysicsSteps = MIN_PHYSICS_PER_FRAME;
        } else if (frameRate > 55) {
          // High frame rate - can afford more physics steps
          adaptivePhysicsSteps = MAX_PHYSICS_PER_FRAME;
        } else {
          // Normal frame rate - balanced approach
          adaptivePhysicsSteps = 2;
        }
      }
      
      // Add deltaTime to accumulator, but prevent large jumps
      // This prevents the "spiral of death" where slow frames cause more physics work
      // which causes slower frames, etc.
      accumulator += Math.min(deltaTime, 50); 

      // Update game time for obstacle generation
      gameTimeRef.current = time;

      // Fixed time step update loop with adaptive steps
      let physicsStepCount = 0;
      const maxStepsThisFrame = Math.min(adaptivePhysicsSteps, MAX_PHYSICS_PER_FRAME);
      
      while (accumulator >= fixedTimeStep && physicsStepCount < maxStepsThisFrame) {
        // Update player position first (most important for responsiveness)
        updatePlayerPosition();
        
        // Update obstacle positions
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obstacle = obstaclesRef.current[i];
          obstacle.x -= obstacle.speed * (fixedTimeStep / 16); // Normalize by time step

          // Remove obstacles that are off-screen
          if (obstacle.x + obstacle.width < 0) {
            obstaclesRef.current.splice(i, 1);
          }
        }

        // Update flag position if it exists
        if (flagRef.current) {
          const flag = flagRef.current;
          flag.x -= flag.speed * (fixedTimeStep / 16); // Normalize by time step

          // Remove flag if it goes off-screen
          if (flag.x + flag.width < 0) {
            flagRef.current = null;
          }
        }

        // Generate obstacles - but not on every physics step to reduce load
        if (physicsStepCount === 0) {
          generateObstacles(time, lastObstacleTimeRef, nextObstacleDelayRef, lastObstacleYRef);
        }
        
        // Check for collisions
        checkCollisions(
          playerRef,
          onCollision,
          collisionCooldownRef,
          collisionFlashRef,
          collisionMessageRef
        );

        // Check flag collision
        checkFlagCollision(playerRef, onLevelComplete);

        // Decrease accumulator by the fixed time step
        accumulator -= fixedTimeStep;
        physicsStepCount++;
      }

      // If we need to clear the rest of accumulator to prevent falling behind,
      // do so when accumulator gets too large or frame rate is suffering
      if (accumulator > fixedTimeStep * 3) {
        accumulator = 0;
      }
      
      // Clear canvas
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background grid (retro style) - only if we have the performance budget for it
      if (adaptivePhysicsSteps > MIN_PHYSICS_PER_FRAME) {
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1;
        const gridSize = 20;
        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }

      // Increase speed if configured - limit this to reduce processing
      if (mapConfig.increasingSpeed && time - lastSpeedUpdateTime > 1000) { // Only check once per second
        lastSpeedUpdateTime = time;
        const elapsedSeconds = time / 1000;
        const newSpeed = mapConfig.obstacleSpeed + Math.floor(elapsedSeconds / 10) * 0.5;
        if (newSpeed !== currentSpeed) {
          setCurrentSpeed(newSpeed);
          obstaclesRef.current.forEach((obstacle) => {
            obstacle.speed = newSpeed;
          });
          if (flagRef.current) {
            flagRef.current.speed = newSpeed;
          }
        }
      }

      // Draw obstacles with batched operations for better performance
      if (obstaclesRef.current.length > 0) {
        ctx.save();
        // Reduce shadow blur under low performance conditions
        ctx.shadowBlur = adaptivePhysicsSteps > MIN_PHYSICS_PER_FRAME ? 10 : 5;
        ctx.shadowColor = "#FFFFFF";
        ctx.fillStyle = "#FFFFFF";
        
        for (const obstacle of obstaclesRef.current) {
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
        
        ctx.restore();
      }

      // Draw flag if it exists
      if (flagRef.current) {
        const flag = flagRef.current;
        // Draw flag with glow effect
        ctx.save();
        // Reduce shadow blur under low performance conditions
        ctx.shadowBlur = adaptivePhysicsSteps > MIN_PHYSICS_PER_FRAME ? 15 : 5;
        ctx.shadowColor = "#FFFFFF";

        // Draw flag
        ctx.fillStyle = flag.color;
        ctx.fillRect(flag.x, flag.y, flag.width, flag.height);

        // Draw flag pole
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(flag.x - 5, flag.y - 20, 5, flag.height + 20);

        ctx.restore();
      }

      // Draw player with health-based opacity and collision flash effect
      ctx.save();
      const playerOpacity = getPlayerOpacity(health);

      if (collisionFlashRef.current > 0) {
        // Reduce shadow blur under low performance conditions
        ctx.shadowBlur = adaptivePhysicsSteps > MIN_PHYSICS_PER_FRAME ? 20 : 10;
        ctx.shadowColor = "rgba(255, 0, 0, " + playerOpacity + ")";
        ctx.fillStyle =
          collisionFlashRef.current % 2 === 0
            ? `rgba(255, 0, 0, ${playerOpacity})`
            : `rgba(255, 255, 255, ${playerOpacity})`;
        collisionFlashRef.current--;
      } else {
        // Reduce shadow blur under low performance conditions
        ctx.shadowBlur = adaptivePhysicsSteps > MIN_PHYSICS_PER_FRAME ? 15 : 5;
        ctx.shadowColor = `rgba(255, 255, 255, ${playerOpacity})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${playerOpacity})`;
      }

      // Draw player trail effect - adjust based on performance
      const trail = adaptivePhysicsSteps > MIN_PHYSICS_PER_FRAME ? 3 : 1;
      for (let i = 0; i < trail; i++) {
        const trailOpacity = ((playerOpacity * (trail - i)) / trail) * 0.3;
        ctx.beginPath();
        ctx.arc(
          playerRef.current.x + playerRef.current.width / 2,
          playerRef.current.y + playerRef.current.height / 2,
          playerRef.current.width / 2 + i * 2,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${trailOpacity})`;
        ctx.fill();
      }

      // Draw main player circle
      ctx.beginPath();
      ctx.arc(
        playerRef.current.x + playerRef.current.width / 2,
        playerRef.current.y + playerRef.current.height / 2,
        playerRef.current.width / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();

      // Draw collision message if exists
      if (collisionMessageRef.current) {
        const msg = collisionMessageRef.current;
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${msg.opacity})`;
        ctx.font = "bold 20px Arial";
        ctx.fillText(msg.text, msg.x, msg.y);
        ctx.restore();

        // Update message position and opacity
        msg.y -= 1;
        msg.opacity -= 0.02;

        if (msg.opacity <= 0) {
          collisionMessageRef.current = null;
        }
      }

      // Schedule next frame with high priority
      requestIdRef.current = requestAnimationFrame(render);
    };

    // Start the render loop
    requestIdRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(requestIdRef.current);
    };
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
  ]);
}; 