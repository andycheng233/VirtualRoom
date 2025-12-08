"use client";

import MapContainer from "../map/MapContainer";

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuessPlaced: (lat: number, lng: number) => void;
  guessCoords: { lat: number; lng: number } | null;
  onSubmit: () => void;
}

export default function MapModal({
  isOpen,
  onClose,
  onGuessPlaced,
  guessCoords,
  onSubmit,
}: MapModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[90vw] h-[80vh] max-w-4xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4 bg-gradient-to-b from-gray-900 to-transparent">
          <h2 className="text-white text-lg font-semibold">
            Click to place your guess
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Map */}
        <div className="w-full h-full">
          <MapContainer
            mode="guess"
            onGuessPlaced={onGuessPlaced}
            guessCoords={guessCoords}
          />
        </div>

        {/* Submit button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent">
          <button
            onClick={onSubmit}
            disabled={!guessCoords}
            className={`w-full py-3 rounded-xl text-lg font-semibold transition-all ${
              guessCoords
                ? "bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/25"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {guessCoords ? "Submit Guess" : "Click on the map to guess"}
          </button>
        </div>
      </div>
    </div>
  );
}
