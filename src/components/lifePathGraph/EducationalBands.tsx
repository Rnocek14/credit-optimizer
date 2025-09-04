import React from 'react';

interface EducationalBandsProps {
  height: number;
}

export const EducationalBands: React.FC<EducationalBandsProps> = ({ height }) => {
  const bands = [
    { id: 'foundations', title: 'Foundations', subtitle: '0-30 credits', y: 0, height: height * 0.2 },
    { id: 'lower-division', title: 'Lower Division', subtitle: '30-60 credits', y: height * 0.2, height: height * 0.2 },
    { id: 'upper-division', title: 'Upper Division', subtitle: '60-120 credits', y: height * 0.4, height: height * 0.3 },
    { id: 'credential', title: 'Credential', subtitle: 'Degrees • Certs', y: height * 0.7, height: height * 0.15 },
    { id: 'career', title: 'Career', subtitle: 'Jobs • Roles', y: height * 0.85, height: height * 0.15 }
  ];

  return (
    <div className="absolute left-0 top-0 w-full h-full pointer-events-none z-10">
      {bands.map((band, index) => (
        <div
          key={band.id}
          className="absolute left-0 right-0 border-b border-dashed border-border/20"
          style={{
            top: band.y,
            height: band.height,
            backgroundColor: index % 2 === 0 ? 'transparent' : 'hsl(var(--muted)/0.02)'
          }}
        >
          <div className="absolute left-2 top-2 text-xs font-medium text-muted-foreground">
            <div className="font-semibold">{band.title}</div>
            <div className="text-xs opacity-75">{band.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
};