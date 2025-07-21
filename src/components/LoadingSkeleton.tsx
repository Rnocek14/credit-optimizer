import React from 'react';

interface LoadingSkeletonProps {
  nodeCount?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ nodeCount = 12 }) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 animate-pulse" style={{ height: 800, width: '100%' }}>
      {/* Loading Stats */}
      <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm border rounded-lg p-3 shadow">
        <div className="text-sm space-y-1">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-14"></div>
        </div>
      </div>

      {/* Loading Controls */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-9 w-20 bg-white border rounded shadow"></div>
        ))}
      </div>

      {/* Skeleton Nodes */}
      <div className="absolute inset-0 p-8">
        <div className="grid grid-cols-4 gap-8">
          {Array.from({ length: nodeCount }, (_, i) => (
            <div
              key={i}
              className="w-28 h-20 bg-white border-2 border-gray-200 rounded-lg shadow-lg animate-pulse"
              style={{ 
                animationDelay: `${i * 100}ms`,
                animationDuration: '1.5s'
              }}
            >
              <div className="p-2 space-y-1">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                <div className="h-1 bg-gray-100 rounded w-full mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading skill tree...</p>
        </div>
      </div>
    </div>
  );
};