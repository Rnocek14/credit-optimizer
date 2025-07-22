import React from 'react';

interface TrackDividersProps {
  tracks: Array<{
    name: string;
    color: string;
    icon: string;
    x: number;
    width: number;
  }>;
  containerHeight: number;
  zoomLevel: number;
  panOffset: { x: number; y: number };
}

export const TrackDividers: React.FC<TrackDividersProps> = ({
  tracks,
  containerHeight,
  zoomLevel,
  panOffset
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {tracks.map((track, index) => (
        <div key={track.name}>
          {/* Vertical divider line */}
          <div
            className="absolute bg-border/30"
            style={{
              left: (track.x * zoomLevel) + panOffset.x - 1,
              top: 0,
              width: 2,
              height: containerHeight,
              transform: `scaleX(${1 / zoomLevel})`,
              transformOrigin: 'left'
            }}
          />
          
          {/* Track header */}
          <div
            className="absolute top-4 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-sm"
            style={{
              left: (track.x * zoomLevel) + panOffset.x + 10,
              transform: `scale(${Math.max(0.8, 1 / zoomLevel)})`,
              transformOrigin: 'left top'
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{track.icon}</span>
              <div>
                <div className="font-semibold text-sm capitalize">
                  {track.name}
                </div>
              </div>
            </div>
          </div>

          {/* Subtle background column */}
          <div
            className="absolute opacity-5"
            style={{
              left: (track.x * zoomLevel) + panOffset.x,
              top: 0,
              width: (track.width * zoomLevel),
              height: containerHeight,
              backgroundColor: track.color
            }}
          />
        </div>
      ))}
    </div>
  );
};