"use client";

import { useGame } from "../../context/GameContext";

export default function StartScreen() {
  const { dispatch } = useGame();

  const handleStart = () => {
    dispatch({ type: "START_GAME", payload: { totalRounds: 5 } });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-blue-950 text-white p-8">
      <div className="text-center max-w-md">
        {/* Logo/Title */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Yale GeoGuessr
          </h1>
          <p className="text-gray-400 text-lg">
            Can you identify locations on campus?
          </p>
        </div>

        {/* How to play */}
        <div className="mb-8 text-left bg-white/5 rounded-2xl p-6 border border-white/10">
          <h3 className="font-semibold text-white mb-4">How to play</h3>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                1
              </span>
              <p>Explore the 360° panorama by dragging to look around</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                2
              </span>
              <p>Click the mini-map to open it and place your guess</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                3
              </span>
              <p>Score points based on how close your guess is</p>
            </div>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          className="w-full py-4 bg-blue-500 hover:bg-blue-400 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02]"
        >
          Start Game
        </button>

        {/* Game info */}
        <p className="mt-4 text-gray-500 text-sm">
          5 rounds • 5,000 points max per round
        </p>
      </div>
    </div>
  );
}
