/**
 * PDF Generator - Create compliance reports using @react-pdf/renderer
 */
import { pdf } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { PlanNode, ValidationResult, DegreeRequirements } from '../types/v4';
import { ComplianceMetrics } from './CreditPolicyEngine';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2pt solid #333',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '40%',
    fontWeight: 'bold',
  },
  value: {
    width: '60%',
  },
  moduleCard: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  moduleName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  courseItem: {
    fontSize: 10,
    marginLeft: 10,
    marginBottom: 2,
  },
  badge: {
    fontSize: 8,
    padding: '2 6',
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginLeft: 5,
  },
  errorBadge: {
    backgroundColor: '#fee',
    color: '#c00',
  },
  successBadge: {
    backgroundColor: '#efe',
    color: '#0a0',
  },
  warningBadge: {
    backgroundColor: '#ffc',
    color: '#c60',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    borderTop: '1pt solid #ccc',
    paddingTop: 10,
  },
});

interface PDFData {
  studentName: string;
  planNodes: PlanNode[];
  validation: ValidationResult;
  complianceMetrics: ComplianceMetrics;
  requirements: DegreeRequirements;
}

const PlanDocument = ({ studentName, planNodes, validation, complianceMetrics, requirements }: PDFData) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Degree Plan Report</Text>
        <Text style={styles.subtitle}>Student: {studentName}</Text>
        <Text style={styles.subtitle}>Export Date: {new Date().toLocaleDateString()}</Text>
      </View>

      {/* Compliance Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compliance Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Overall Score:</Text>
          <Text style={styles.value}>{complianceMetrics.overallScore}%</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Credits:</Text>
          <Text style={styles.value}>
            {validation.totalCredits.planned} / {validation.totalCredits.required}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Transfer Credits:</Text>
          <Text style={styles.value}>
            {complianceMetrics.transferCreditsUsed} / {complianceMetrics.transferCreditsMax}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Residency Credits:</Text>
          <Text style={styles.value}>
            {complianceMetrics.residencyCreditsEarned} / {complianceMetrics.residencyCreditsRequired}
          </Text>
        </View>
      </View>

      {/* Category Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Credits by Category</Text>
        {Array.from(validation.byCategory.entries()).map(([category, credits]) => (
          <View key={category} style={styles.row}>
            <Text style={styles.label}>{category}:</Text>
            <Text style={styles.value}>
              {credits.planned} / {credits.required}
            </Text>
          </View>
        ))}
      </View>

      {/* Module Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Module Completion</Text>
        {validation.bySubRequirement?.map((subReq) => (
          <View key={subReq.subReqId} style={styles.moduleCard}>
            <Text style={styles.moduleName}>
              {subReq.label} {subReq.isComplete && '✓'}
            </Text>
            {subReq.completed.length > 0 && (
              <View>
                <Text style={[styles.courseItem, { fontWeight: 'bold', marginTop: 4 }]}>
                  Completed:
                </Text>
                {subReq.completed.map((courseId) => (
                  <Text key={courseId} style={styles.courseItem}>
                    • {courseId}
                  </Text>
                ))}
              </View>
            )}
            {subReq.missing.length > 0 && (
              <View>
                <Text style={[styles.courseItem, { fontWeight: 'bold', marginTop: 4 }]}>
                  Missing:
                </Text>
                {subReq.missing.map((courseId) => (
                  <Text key={courseId} style={styles.courseItem}>
                    • {courseId}
                  </Text>
                ))}
              </View>
            )}
            {subReq.creditsNeeded > 0 && (
              <Text style={styles.courseItem}>
                Credits: {subReq.creditsEarned} / {subReq.creditsNeeded}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Policy Violations */}
      {complianceMetrics.violations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Policy Status</Text>
          {complianceMetrics.violations.filter(v => v.severity === 'error').length > 0 && (
            <View>
              <Text style={[styles.courseItem, { fontWeight: 'bold', color: '#c00' }]}>
                Errors:
              </Text>
              {complianceMetrics.violations
                .filter(v => v.severity === 'error')
                .map((violation, i) => (
                  <Text key={i} style={[styles.courseItem, { color: '#c00' }]}>
                    • {violation.message}
                  </Text>
                ))}
            </View>
          )}
          {complianceMetrics.violations.filter(v => v.severity === 'warning').length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.courseItem, { fontWeight: 'bold', color: '#c60' }]}>
                Warnings:
              </Text>
              {complianceMetrics.violations
                .filter(v => v.severity === 'warning')
                .map((violation, i) => (
                  <Text key={i} style={[styles.courseItem, { color: '#c60' }]}>
                    • {violation.message}
                  </Text>
                ))}
            </View>
          )}
        </View>
      )}

      {/* Florida Articulation */}
      {planNodes.some(n => n.data.policyStatus?.articulationId) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Florida Articulation</Text>
          {planNodes
            .filter(n => n.data.policyStatus?.articulationId)
            .map((node) => (
              <Text key={node.id} style={styles.courseItem}>
                • {node.data.label} - Guaranteed via {node.data.policyStatus?.articulationId}
              </Text>
            ))}
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Generated by EduTree V4 | UCF Policy Engine
      </Text>
    </Page>
  </Document>
);

export async function generatePDF(data: PDFData): Promise<void> {
  const blob = await pdf(<PlanDocument {...data} />).toBlob();
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `degree-plan-${data.studentName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
