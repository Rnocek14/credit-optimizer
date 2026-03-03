import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { TrackResumeData, ExportOptions } from '@/hooks/useTrackResumeExport';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #3B82F6',
    paddingBottom: 15,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 3,
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#3B82F6',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1F2937',
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 5,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  itemContainer: {
    marginBottom: 8,
    padding: 8,
    border: '1px solid #E5E7EB',
    borderRadius: 4,
    backgroundColor: '#FAFAFA',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#374151',
  },
  itemDescription: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 3,
  },
  itemMeta: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  badge: {
    fontSize: 8,
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    padding: '2 6',
    borderRadius: 2,
    marginRight: 4,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  skillBadge: {
    fontSize: 9,
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    padding: '3 8',
    borderRadius: 3,
    marginBottom: 3,
  },
});

interface TrackResumePDFProps {
  data: TrackResumeData;
  options?: Partial<ExportOptions>;
  isMultiTrack?: boolean;
}

export const TrackResumePDF = ({ data, options, isMultiTrack = false }: TrackResumePDFProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getProofIcon = (type: string) => {
    switch (type) {
      case 'course_completion': return '📚';
      case 'project': return '🚀';
      case 'certificate': return '🏆';
      default: return '✅';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{data.profile.name || 'Professional Resume'}</Text>
          <Text style={styles.subtitle}>
            {data.profile.role_title && `${data.profile.role_title} • `}
            Track: {data.track.track_name || data.track.title}
          </Text>
          <Text style={styles.subtitle}>
            {data.profile.location && `${data.profile.location} • `}
            {data.profile.email}
          </Text>
          {data.track.goal && (
            <Text style={styles.subtitle}>Goal: {data.track.goal}</Text>
          )}
        </View>

        {/* Track Overview */}
        <View style={styles.section}>
          <Text style={styles.trackTitle}>{data.track.track_name || data.track.title}</Text>
          {data.track.description && (
            <Text style={styles.itemDescription}>{data.track.description}</Text>
          )}
          
          {/* Statistics */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(data.completionRate)}%</Text>
              <Text style={styles.statLabel}>Completion</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.courses.filter(c => c.status === 'completed').length}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </View>
            {options?.includeXPProgress && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{data.totalXP}</Text>
                <Text style={styles.statLabel}>XP Earned</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.projects.length}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Summary</Text>
          <Text style={styles.itemDescription}>
            Dedicated professional with expertise in {data.track.track_name}, having completed {data.courses.filter(c => c.status === 'completed').length} courses 
            and {data.projects.length} hands-on projects. Demonstrated commitment to continuous learning with {Math.round(data.completionRate)}% track completion rate
            {options?.includeXPProgress && ` and ${data.totalXP} experience points earned`}.
          </Text>
        </View>

        {/* Skills Section */}
        {data.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical Skills</Text>
            <View style={styles.skillsGrid}>
              {data.skills.slice(0, 15).map((skill, index) => (
                <Text key={index} style={styles.skillBadge}>
                  {skill.skill_name || skill.name}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Completed Courses */}
        {data.courses.filter(c => c.status === 'completed').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed Courses</Text>
            {data.courses.filter(c => c.status === 'completed').slice(0, 8).map((course, index) => (
              <View key={index} style={styles.itemContainer}>
                <Text style={styles.itemTitle}>📚 {course.course_id}</Text>
                <Text style={styles.itemDescription}>
                  Progress: {course.progress_percentage}% • Track: {data.track.track_name}
                </Text>
                {course.completed_at && (
                  <Text style={styles.itemMeta}>
                    Completed: {formatDate(course.completed_at)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {data.projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects & Portfolio</Text>
            {data.projects.slice(0, 6).map((project, index) => (
              <View key={index} style={styles.itemContainer}>
                <Text style={styles.itemTitle}>🚀 {project.title}</Text>
                <Text style={styles.itemDescription}>{project.description}</Text>
                {project.skills_demonstrated && (
                  <Text style={styles.itemMeta}>
                    Skills: {Array.isArray(project.skills_demonstrated) 
                      ? project.skills_demonstrated.join(', ')
                      : project.skills_demonstrated}
                  </Text>
                )}
                {options?.includeProjectLinks && project.project_url && (
                  <Text style={styles.itemMeta}>Link: {project.project_url}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Achievements & Certificates */}
        {(data.achievements.length > 0 || data.certificates.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements & Certifications</Text>
            
            {data.certificates.map((cert, index) => (
              <View key={`cert_${index}`} style={styles.itemContainer}>
                <Text style={styles.itemTitle}>🏆 {cert.certificate_name}</Text>
                <Text style={styles.itemDescription}>Course: {cert.course_id}</Text>
                {cert.issued_at && (
                  <Text style={styles.itemMeta}>Issued: {formatDate(cert.issued_at)}</Text>
                )}
              </View>
            ))}
            
            {data.achievements.slice(0, 5).map((achievement, index) => (
              <View key={`ach_${index}`} style={styles.itemContainer}>
                <Text style={styles.itemTitle}>
                  {achievement.badges?.emoji || '🎖️'} {achievement.badges?.name || 'Achievement'}
                </Text>
                <Text style={styles.itemDescription}>
                  {achievement.badges?.description || 'Professional achievement'}
                </Text>
                {achievement.earned_at && (
                  <Text style={styles.itemMeta}>Earned: {formatDate(achievement.earned_at)}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Proof of Learning */}
        {data.proofItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proof of Learning</Text>
            {data.proofItems.slice(0, 6).map((proof, index) => (
              <View key={index} style={styles.itemContainer}>
                <Text style={styles.itemTitle}>
                  {getProofIcon(proof.type)} {proof.title}
                </Text>
                <Text style={styles.itemDescription}>{proof.description}</Text>
                <Text style={styles.itemMeta}>Track: {proof.trackName}</Text>
                {proof.completedAt && (
                  <Text style={styles.itemMeta}>Date: {formatDate(proof.completedAt)}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #E5E7EB' }}>
          <Text style={styles.itemMeta}>
            Generated by Pivot • Track-Focused Resume • {new Date().toLocaleDateString()}
          </Text>
          {options?.includeCRIScore && (
            <Text style={styles.itemMeta}>
              Professional profile validated through AI-powered Career Readiness assessment
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

// Multi-track version
interface MultiTrackResumePDFProps {
  data: any; // Multi-track merged data
  options: ExportOptions;
}

export const MultiTrackResumePDF = ({ data, options }: MultiTrackResumePDFProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{data.profile.name || 'Professional Resume'}</Text>
          <Text style={styles.subtitle}>Multi-Track Professional Portfolio</Text>
          <Text style={styles.subtitle}>
            {data.tracks.length} Career Tracks • {data.allCourses.filter((c: any) => c.status === 'completed').length} Completed Courses
          </Text>
          <Text style={styles.subtitle}>
            {data.profile.location && `${data.profile.location} • `}
            {data.profile.email}
          </Text>
        </View>

        {/* Multi-Track Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Career Track Portfolio</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.tracks.length}</Text>
              <Text style={styles.statLabel}>Active Tracks</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(data.averageCompletionRate)}%</Text>
              <Text style={styles.statLabel}>Avg Completion</Text>
            </View>
            {options.includeXPProgress && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{data.totalXP}</Text>
                <Text style={styles.statLabel}>Total XP</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.allProjects.length}</Text>
              <Text style={styles.statLabel}>Total Projects</Text>
            </View>
          </View>

          {/* Track List */}
          {data.tracks.map((track: any, index: number) => (
            <View key={index} style={styles.itemContainer}>
              <Text style={styles.itemTitle}>🎯 {track.track_name || track.title}</Text>
              <Text style={styles.itemDescription}>{track.description}</Text>
              <Text style={styles.itemMeta}>
                Completion: {Math.round(data.trackSpecificData[index]?.completionRate || 0)}%
                {options.includeXPProgress && ` • XP: ${data.trackSpecificData[index]?.totalXP || 0}`}
              </Text>
            </View>
          ))}
        </View>

        {/* Combined Skills */}
        {data.allSkills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical Skills (All Tracks)</Text>
            <View style={styles.skillsGrid}>
              {data.allSkills.slice(0, 20).map((skill: any, index: number) => (
                <Text key={index} style={styles.skillBadge}>
                  {skill.skill_name || skill.name}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Key Projects */}
        {data.allProjects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured Projects</Text>
            {data.allProjects.slice(0, 8).map((project: any, index: number) => (
              <View key={index} style={styles.itemContainer}>
                <Text style={styles.itemTitle}>🚀 {project.title}</Text>
                <Text style={styles.itemDescription}>{project.description}</Text>
                <Text style={styles.itemMeta}>Track: {project.track_name || 'Multi-track'}</Text>
                {options.includeProjectLinks && project.project_url && (
                  <Text style={styles.itemMeta}>Link: {project.project_url}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #E5E7EB' }}>
          <Text style={styles.itemMeta}>
            Generated by Pivot • Multi-Track Professional Resume • {new Date().toLocaleDateString()}
          </Text>
        </View>
      </Page>
    </Document>
  );
};