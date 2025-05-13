# HandWave Game

A modern web-based game where you dodge obstacles and survive using either keyboard controls or webcam-based hand tracking.

![HandWave Game](https://i.imgur.com/s1ndnhs.png)

## Features

- **Dual Control Modes**:
  - **Keyboard Mode**: Use arrow keys or W/S to navigate
  - **Camera Mode**: Control with hand gestures via webcam tracking
  
- **Multiple Maps**: Progress through 4 challenging maps with increasing difficulty
  - Each map unlocks as you complete the previous one
  - Maps increase in speed and obstacle complexity

- **Hand Tracking**: Advanced hand detection using MediaPipe's HandLandmarker
  - Real-time hand position tracking
  - No additional hardware required beyond a webcam

- **Responsive Design**: Play on any device with a modern browser
  - Clean, minimalist UI with dark theme

- **Persistent Progress**: Game automatically saves your progress for each map

## Technologies Used

- **Next.js**: React framework for building the application
- **TypeScript**: Type-safe JavaScript for reliable code
- **MediaPipe**: Google's ML solution for hand tracking
- **Canvas API**: For game rendering and animations
- **Tailwind CSS**: For UI styling and responsive design
- **Radix UI**: Accessible UI components

## Getting Started

### Prerequisites

- Node.js 18+ 
- A modern web browser
- A webcam (for camera control mode)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/TryOmar/handwave-game.git
   cd handwave-game
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Play

1. Choose your control mode: Keyboard or Camera
2. Select a map (you start with Map 1)
3. In Keyboard mode, use W/S or arrow keys to move up and down
4. In Camera mode, move your hand up and down in front of the webcam
5. Avoid obstacles to survive longer and increase your progress
6. Complete a map by reaching 100% progress
7. Unlock new maps as you progress

## Development

Built by Omar Abbas using Next.js and modern web technologies. The game focuses on providing an accessible and fun experience with innovative control options.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 