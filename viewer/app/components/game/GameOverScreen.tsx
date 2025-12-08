"use client";

import { useGame } from "../../context/GameContext";

export default function GameOverScreen() {
  const { state, dispatch } = useGame();

  const handlePlayAgain = () => {
    dispatch({ type: "RESET_GAME" });
  };

  const maxPossible = state.totalRounds * 5000;
  const percentage = Math.round((state.totalScore / maxPossible) * 100);

  const getGrade = () => {
    if (percentage >= 90) return { letter: "A+", color: "text-green-400" };
    if (percentage >= 80) return { letter: "A", color: "text-green-400" };
    if (percentage >= 70) return { letter: "B", color: "text-blue-400" };
    if (percentage >= 60) return { letter: "C", color: "text-yellow-400" };
    if (percentage >= 50) return { letter: "D", color: "text-orange-400" };
    return { letter: "F", color: "text-red-400" };
  };

  const grade = getGrade();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-blue-950 text-white p-8">
      <div className="text-center w-full max-w-md">
        {/* Header */}
        <h1 className="text-3xl font-bold mb-2">Game Complete!</h1>
        <p className="text-gray-400 mb-8">Here&apos;s how you did</p>

        {/* Score card */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-center gap-6 mb-6">
            {/* Grade */}
            <div
              className={`text-6xl font-bold ${grade.color}`}
            >
              {grade.letter}
            </div>
            {/* Score */}
            <div className="text-left">
              <p className="text-4xl font-bold">{state.totalScore}</p>
              <p className="text-gray-500 text-sm">
                out of {maxPossible} points
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-gray-500 text-sm mt-2">{percentage}% accuracy</p>
        </div>

        {/* Round breakdown */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
          <h3 className="font-semibold text-sm text-gray-400 mb-3 text-left">
            Round Breakdown
          </h3>
          <div className="space-y-2">
            {state.rounds.map((round, index) => {
              const location = state.locations[index];
              const scorePercent = ((round.score ?? 0) / 5000) * 100;
              return (
                <div key={round.locationId} className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-4">{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300 truncate">
                        {location.name}
                      </span>
                      <span className="text-gray-400">{round.score ?? 0}</span>
                    </div>
                    <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Play again button */}
        <button
          onClick={handlePlayAgain}
          className="w-full py-4 bg-blue-500 hover:bg-blue-400 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02]"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
