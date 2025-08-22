import { useEffect, useRef, useState } from 'react';
import { logEvent } from '@/lib/analytics';

type UseCelebrationsParams = {
  currentLevel?: number | null;
  previousLevel?: number | null;
  currentStreak?: number;
};

export function useCelebrations({ currentLevel, previousLevel, currentStreak }: UseCelebrationsParams) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState<string>('Congrats!');
  const [subtitle, setSubtitle] = useState<string | undefined>();
  const [kind, setKind] = useState<'LEVEL_UP' | 'STREAK' | 'CHALLENGE'>('LEVEL_UP');

  const lastLevelRef = useRef<number | null | undefined>(previousLevel);

  useEffect(() => {
    // Level up celebration
    if (
      currentLevel != null &&
      lastLevelRef.current != null &&
      currentLevel > lastLevelRef.current
    ) {
      setKind('LEVEL_UP');
      setTitle(`Level Up! You are now Level ${currentLevel}`);
      setSubtitle('Keep your momentum going.');
      setOpen(true);
      logEvent('celebration_candidate', { kind: 'LEVEL_UP', currentLevel, prev: lastLevelRef.current });
    }
    lastLevelRef.current = currentLevel;
  }, [currentLevel]);

  useEffect(() => {
    // Streak milestones
    const milestones = [3, 7, 14, 30, 60, 100];
    if (currentStreak && milestones.includes(currentStreak)) {
      setKind('STREAK');
      setTitle(`🔥 ${currentStreak}-day streak!`);
      setSubtitle('Amazing consistency — you\'re on fire!');
      setOpen(true);
      logEvent('celebration_candidate', { kind: 'STREAK', currentStreak });
    }
  }, [currentStreak]);

  return { open, setOpen, title, subtitle, kind };
}