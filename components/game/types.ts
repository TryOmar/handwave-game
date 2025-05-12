export interface GameCanvasProps {
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

export interface GameObject {
  x: number
  y: number
  width: number
  height: number
  color: string
  speed: number
  type: "obstacle" | "player" | "flag"
}

export interface CollisionMessage {
  text: string
  x: number
  y: number
  opacity: number
} 