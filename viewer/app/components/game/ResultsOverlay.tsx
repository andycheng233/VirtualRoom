"use client";

import { useGame } from "../../context/GameContext";
import MapContainer from "../map/MapContainer";

interface ResultsOverlayProps {
  onNext: () => void;
  guessCoords: { lat: number; lng: number } | null;
  actualCoords: { lat: number; lng: number };
}

export default function ResultsOverlay({
  onNext,
  guessCoords,
  actualCoords,
}: ResultsOverlayProps) {
  const { state } = useGame();
  const currentRound = state.rounds[state.currentRound];
  const location = state.locations[state.currentRound];

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 4000) return "text-green-400";
    if (score >= 2000) return "text-yellow-400";
    if (score >= 500) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
        {/* Map showing result */}
        <div className="h-64 w-full">
          <MapContainer
            mode="result"
            guessCoords={guessCoords}
            actualCoords={actualCoords}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Location name */}
          <h2 className="text-2xl font-bold text-white mb-1">{location.name}</h2>
          <p className="text-gray-400 text-sm mb-6">
            Round {state.currentRound + 1} of {state.totalRounds}
          </p>

          {/* Stats */}
          <div className="flex gap-8 mb-6">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                Distance
              </p>
              <p className="text-2xl font-bold text-blue-400">
                {currentRound.distance !== null
                  ? formatDistance(currentRound.distance)
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                Points
              </p>
              <p
                className={`text-2xl font-bold ${getScoreColor(currentRound.score ?? 0)}`}
              >
                +{currentRound.score ?? 0}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                Total
              </p>
              <p className="text-2xl font-bold text-white">{state.totalScore}</p>
            </div>
          </div>

          {/* Next button */}
          <button
            onClick={onNext}
            className="w-full py-3 bg-blue-500 hover:bg-blue-400 rounded-xl text-white text-lg font-semibold transition-all"
          >
            {state.currentRound + 1 < state.totalRounds
              ? "Next Round"
              : "See Final Results"}
          </button>
        </div>
      </div>
    </div>
  );
}
