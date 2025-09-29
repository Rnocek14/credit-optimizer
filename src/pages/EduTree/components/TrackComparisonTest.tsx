// Test component to verify enhanced track comparison styling
import React from 'react';

export default function TrackComparisonTest() {
  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold">Enhanced Track Comparison Styles Test</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <h3 className="font-semibold">Node Highlight Classes</h3>
          
          <div className="p-4 bg-white border rounded-lg hl--primary">
            <div className="font-medium">Primary Track Node</div>
            <div className="text-sm text-gray-600">Solid border, elevated</div>
          </div>
          
          <div className="p-4 bg-white border rounded-lg hl--comparison">
            <div className="font-medium">Comparison Track Node</div>
            <div className="text-sm text-gray-600">Dashed border, elevated</div>
          </div>
          
          <div className="p-4 bg-white border rounded-lg hl--both">
            <div className="font-medium">Shared Node</div>
            <div className="text-sm text-gray-600">Double border, highly elevated</div>
          </div>
          
          <div className="p-4 bg-white border rounded-lg hl--dim">
            <div className="font-medium">Dimmed Node</div>
            <div className="text-sm text-gray-600">Low opacity, grayscale</div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-semibold">Program-Specific Classes</h3>
          
          <div className="p-4 bg-white border rounded-lg hl--primary node--program-cs">
            <div className="font-medium">CS Program Node</div>
            <div className="text-sm text-gray-600">CS badge in corner</div>
          </div>
          
          <div className="p-4 bg-white border rounded-lg hl--comparison node--program-it">
            <div className="font-medium">IT Program Node</div>
            <div className="text-sm text-gray-600">IT badge in corner</div>
          </div>
          
          <div className="p-4 bg-white border rounded-lg hl--primary node--program-cs node--track-se">
            <div className="font-medium">CS Software Engineering</div>
            <div className="text-sm text-gray-600">CS badge + SE left border</div>
          </div>
          
          <div className="p-4 bg-white border rounded-lg hl--primary node--program-cs node--track-ds">
            <div className="font-medium">CS Data Science</div>
            <div className="text-sm text-gray-600">CS badge + DS left border</div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="font-semibold">Edge Style Preview</h3>
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-16 h-1 bg-track-primary"></div>
            <span className="text-sm">Primary Track Edge</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-16 h-1 border-t-2 border-dashed border-track-comparison"></div>
            <span className="text-sm">Comparison Track Edge</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-16 h-2 bg-track-shared"></div>
            <span className="text-sm">Shared Edge</span>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Implementation Status</h4>
        <ul className="text-sm space-y-1">
          <li>✅ Enhanced CSS classes with better visual distinction</li>
          <li>✅ Program-specific badges and track indicators</li>
          <li>✅ Improved hover effects and animations</li>
          <li>✅ Better edge styling with enhanced contrast</li>
          <li>✅ Debug utilities for development</li>
          <li>✅ Clean utility functions for class management</li>
        </ul>
      </div>
    </div>
  );
}