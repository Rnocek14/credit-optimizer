import React, { useEffect } from 'react';
import { EduTreeCanvas } from './EduTree/EduTreeCanvas';

export default function EduTreeMulti() {
  useEffect(() => {
    // Force enable multipath overlay via URL parameter
    const url = new URL(window.location.href);
    if (!url.searchParams.get('eduTreeMultiPathOverlay')) {
      url.searchParams.set('eduTreeMultiPathOverlay', 'true');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return <EduTreeCanvas />;
}