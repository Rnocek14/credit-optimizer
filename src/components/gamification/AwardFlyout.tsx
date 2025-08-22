import { useEffect, useState } from 'react';

export default function AwardFlyout({ xp }: { xp: number }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1200);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="absolute -top-6 right-0 translate-y-0 animate-[fly_1.2s_ease-in-out] text-primary font-semibold text-sm">
      +{xp} XP
    </div>
  );
}