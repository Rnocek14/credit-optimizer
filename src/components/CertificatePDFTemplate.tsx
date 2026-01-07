import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Define styles for the PDF
// Note: react-pdf doesn't support CSS variables, so we use static colors
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#fafafa',
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7c3aed', // primary purple
    marginBottom: 10,
  },
  certificateTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#64748b', // muted-foreground
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  recipientSection: {
    textAlign: 'center',
    marginBottom: 40,
  },
  recipientText: {
    fontSize: 18,
    color: '#475569',
    marginBottom: 10,
  },
  recipientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
  },
  achievementText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  workflowTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    margin: '10 0',
  },
  metricsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    paddingTop: 20,
    borderTop: '2 solid #e2e8f0',
  },
  metric: {
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1 solid #e2e8f0',
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    flex: 1,
    textAlign: 'right',
  },
  certificateNumber: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Courier',
  },
  verificationCode: {
    fontSize: 12,
    color: '#1e293b',
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  issueDate: {
    fontSize: 10,
    color: '#64748b',
  },
  signature: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
});

interface CertificatePDFProps {
  certificate: {
    certificate_number: string;
    verification_code: string;
    workflow_title: string;
    workflow_description?: string;
    issued_at: string;
    maya_confidence_score: number;
    total_decisions: number;
    autonomous_steps: number;
    user_feedback_score?: number;
  };
  userName: string;
}

export const CertificatePDF = ({ certificate, userName }: CertificatePDFProps) => (
  <Document>
    <Page size="A4" style={styles.page} orientation="landscape">
      <View style={styles.header}>
        <Text style={styles.logo}>PathfindAI</Text>
        <Text style={styles.certificateTitle}>Maya Certified</Text>
        <Text style={styles.subtitle}>AI-Guided Career Development Achievement</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.recipientSection}>
          <Text style={styles.recipientText}>This certificate is presented to</Text>
          <Text style={styles.recipientName}>{userName}</Text>
          <Text style={styles.achievementText}>
            for successfully completing the autonomous workflow
          </Text>
          <Text style={styles.workflowTitle}>{certificate.workflow_title}</Text>
          {certificate.workflow_description && (
            <Text style={styles.achievementText}>
              {certificate.workflow_description}
            </Text>
          )}
          <Text style={styles.achievementText}>
            demonstrating excellence in AI-guided career development and achieving measurable outcomes 
            through intelligent automation and strategic decision-making.
          </Text>
        </View>

        <View style={styles.metricsSection}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{Math.round(certificate.maya_confidence_score)}%</Text>
            <Text style={styles.metricLabel}>Maya Confidence</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{certificate.total_decisions}</Text>
            <Text style={styles.metricLabel}>AI Decisions</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{certificate.autonomous_steps}</Text>
            <Text style={styles.metricLabel}>Autonomous Steps</Text>
          </View>
          {certificate.user_feedback_score && (
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{certificate.user_feedback_score}/5</Text>
              <Text style={styles.metricLabel}>User Rating</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.certificateNumber}>
            Certificate No: {certificate.certificate_number}
          </Text>
          <Text style={styles.verificationCode}>
            Verification: {certificate.verification_code}
          </Text>
          <Text style={styles.issueDate}>
            Issued: {new Date(certificate.issued_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.footerRight}>
          <Text style={styles.signature}>Maya AI</Text>
          <Text style={styles.signature}>Chief Intelligence Officer</Text>
          <Text style={styles.signature}>PathfindAI</Text>
        </View>
      </View>
    </Page>
  </Document>
);