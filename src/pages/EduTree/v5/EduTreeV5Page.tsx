import { useState } from 'react';
import { YearCard } from './components/YearCard';
import canonicalCourses from '@/fixtures/prereqs/canonical-courses.json';
import './styles/v5.css';

export default function EduTreeV5Page() {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  
  const toggleYear = (year: number) => {
    console.log('[V5 Page] Toggling year:', year);
    setCollapsed(prev => ({ 
      ...prev, 
      [year]: !prev[year] 
    }));
  };

  const handleCourseClick = (courseId: string) => {
    console.log('[V5 Page] Course clicked:', courseId);
  };

  // Mock course mapping to years
  const coursesByYear: Record<number, string[]> = {
    1: ['MATH-ALGEBRA-101', 'CS-INTRO-101'],
    2: ['MATH-CALCULUS-201', 'BIO-ANATOMY-201'],
    3: ['CS-DATA-STRUCTURES-301', 'BIO-ANATOMY-202'],
    4: ['BIO-MICROBIOLOGY-301']
  };

  const getCoursesForYear = (year: number) => {
    const courseIds = coursesByYear[year] || [];
    return courseIds.map(id => {
      const course = canonicalCourses.canonicalCourses[id as keyof typeof canonicalCourses.canonicalCourses];
      return {
        courseId: course.id,
        title: course.title,
        credits: course.credits,
        subject: course.subject
      };
    });
  };

  return (
    <div className="w-full h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">EduTree V5 - Year Spine</h1>
        <p className="text-sm text-muted-foreground">Click any year to collapse/expand</p>
        <div className="text-xs text-muted-foreground mt-2">
          Collapsed: {Object.entries(collapsed).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'none'}
        </div>
      </div>
      
      {/* Year Cards */}
      <div className="flex gap-4 items-start">
        {[1, 2, 3, 4].map(year => (
          <YearCard
            key={year}
            year={year}
            isCollapsed={collapsed[year] || false}
            onToggle={() => toggleYear(year)}
            courses={getCoursesForYear(year)}
            onCourseClick={handleCourseClick}
          />
        ))}
      </div>
    </div>
  );
}
