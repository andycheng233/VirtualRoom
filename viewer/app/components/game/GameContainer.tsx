"use client";

import { useState } from "react";
import { useGame } from "../../context/GameContext";
import PanoramaViewer from "../PanoramaViewer";
import MapContainer from "../map/MapContainer";
import MapModal from "./MapModal";
import ResultsOverlay from "./ResultsOverlay";

export default function GameContainer() {
  const { state, dispatch } = useGame();
  const [guessCoords, setGuessCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const currentLocation = state.locations[state.currentRound];
  const isResultMode = state.status === "round_result";

  const handleGuessPlaced = (lat: number, lng: number) => {
    if (!isResultMode) {
      setGuessCoords({ lat, lng });
    }
  };

  const handleSubmitGuess = () => {
    if (guessCoords) {
      dispatch({ type: "SUBMIT_GUESS", payload: guessCoords });
      setIsMapOpen(false);
    }
  };

  const handleNextRound = () => {
    setGuessCoords(null);
    dispatch({ type: "NEXT_ROUND" });
  };

  return (
    <div className="relative h-screen w-screen bg-gray-900 overflow-hidden">
      {/* Full-screen Panorama */}
      <div className="absolute inset-0">
        <PanoramaViewer image={currentLocation.panoramaPath} />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-4">
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-white text-sm font-medium">
            Round {state.currentRound + 1} / {state.totalRounds}
          </div>
        </div>
        <div className="px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-white text-sm font-medium">
          Score: <span className="text-green-400">{state.totalScore}</span>
        </div>
      </div>

      {/* Mini Map (floating, top-right) */}
      {!isResultMode && (
        <div className="absolute top-20 right-4 z-10">
          <button
            onClick={() => setIsMapOpen(true)}
            className="group relative w-48 h-48 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 hover:border-white/40 transition-all hover:scale-105"
          >
            <MapContainer
              mode="guess"
              onGuessPlaced={() => setIsMapOpen(true)}
              guessCoords={guessCoords}
            />
            {/* Overlay to indicate clickable */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              {!guessCoords && (
                <span className="text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full">
                  Click to guess
                </span>
              )}
            </div>
          </button>
          {guessCoords && (
            <button
              onClick={() => setIsMapOpen(true)}
              className="mt-2 w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white text-sm font-medium transition-colors"
            >
              Adjust guess
            </button>
          )}
        </div>
      )}

      {/* Submit button (bottom center) */}
      {!isResultMode && guessCoords && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={handleSubmitGuess}
            className="px-8 py-3 bg-green-500 hover:bg-green-400 rounded-full text-white text-lg font-semibold shadow-lg shadow-green-500/30 transition-all hover:scale-105"
          >
            Submit Guess
          </button>
        </div>
      )}

      {/* Map Modal */}
      <MapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onGuessPlaced={handleGuessPlaced}
        guessCoords={guessCoords}
        onSubmit={handleSubmitGuess}
      />

      {/* Results overlay */}
      {isResultMode && (
        <ResultsOverlay
          onNext={handleNextRound}
          guessCoords={guessCoords}
          actualCoords={currentLocation.coordinates}
        />
      )}
    </div>
  );
}
