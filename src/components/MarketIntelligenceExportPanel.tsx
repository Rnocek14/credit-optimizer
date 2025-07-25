import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Table, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import React from 'react';
import { useMarketIntelligence } from "@/hooks/useMarketIntelligence";

interface ExportPanelProps {
  selectedCareerPath?: string;
  selectedLocation?: string;
  marketData: any[];
  analysisData?: any;
  isLoading?: boolean;
  onRefreshData?: () => Promise<any>;
}

export const MarketIntelligenceExportPanel = ({ 
  selectedCareerPath, 
  selectedLocation, 
  marketData, 
  analysisData,
  isLoading = false,
  onRefreshData
}: ExportPanelProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [localMarketData, setLocalMarketData] = useState(marketData);
  const { fetchMarketTrends } = useMarketIntelligence();

  // Update local data when props change
  React.useEffect(() => {
    if (marketData && marketData.length > 0) {
      setLocalMarketData(marketData);
      console.log('✅ Market data updated in export panel:', marketData.length, 'records');
    }
  }, [marketData]);

  // Fallback data fetching function
  const ensureDataAvailable = async () => {
    const currentData = localMarketData || marketData;
    
    if (!currentData || currentData.length === 0) {
      console.log('🔄 No market data available, attempting to fetch...');
      
      try {
        // Try using the parent's refresh function first
        if (onRefreshData) {
          await onRefreshData();
          return;
        }
        
        // Fallback to direct fetch
        const freshData = await fetchMarketTrends();
        if (freshData && freshData.length > 0) {
          setLocalMarketData(freshData);
          console.log('✅ Fresh market data fetched:', freshData.length, 'records');
          return freshData;
        }
        
        throw new Error('No market data returned from fetch');
      } catch (error) {
        console.error('❌ Failed to fetch market data:', error);
        toast.error('Unable to load market data for export. Please refresh the page and try again.');
        return null;
      }
    }
    
    return currentData;
  };

  const generatePDFReport = async () => {
    setIsExporting(true);
    try {
      // Ensure we have data before generating report
      const dataToExport = await ensureDataAvailable();
      if (!dataToExport) {
        setIsExporting(false);
        return;
      }
      // Create a comprehensive market report
      const reportData = {
        title: `Market Intelligence Report`,
        subtitle: selectedCareerPath && selectedLocation 
          ? `${selectedCareerPath} in ${selectedLocation}` 
          : 'Market Overview',
        generatedAt: new Date().toLocaleDateString(),
        summary: analysisData || {},
        marketTrends: (dataToExport || []).slice(0, 10), // Top 10 trends
        insights: [
          'Market demand is showing positive growth trends',
          'Remote work opportunities are expanding rapidly',
          'Technology skills continue to command premium salaries',
          'Healthcare and green energy sectors show strong growth'
        ]
      };

      // Generate PDF content
      const pdfContent = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <header style="text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0;">${reportData.title}</h1>
            <h2 style="color: #6b7280; margin: 10px 0;">${reportData.subtitle}</h2>
            <p style="color: #9ca3af;">Generated on ${reportData.generatedAt}</p>
          </header>

          <section style="margin-bottom: 30px;">
            <h3 style="color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Executive Summary</h3>
            ${analysisData ? `
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                  <h4 style="margin: 0; color: #374151;">Demand Trend</h4>
                  <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #059669;">
                    ${analysisData.marketTrends?.aiInsights?.demandTrend || 'N/A'}
                  </p>
                </div>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                  <h4 style="margin: 0; color: #374151;">Salary Trend</h4>
                  <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #059669;">
                    ${analysisData.marketTrends?.aiInsights?.salaryTrend || 'N/A'}
                  </p>
                </div>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                  <h4 style="margin: 0; color: #374151;">Growth Rate</h4>
                  <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #0891b2;">
                    ${analysisData.marketTrends?.aiInsights?.growthRate || 'N/A'}%
                  </p>
                </div>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                  <h4 style="margin: 0; color: #374151;">Market Saturation</h4>
                  <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #dc2626;">
                    ${analysisData.marketTrends?.aiInsights?.marketSaturation || 'N/A'}
                  </p>
                </div>
              </div>
            ` : '<p>No analysis data available. Please run market analysis first.</p>'}
          </section>

          <section style="margin-bottom: 30px;">
            <h3 style="color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Market Trends Data</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Career Path</th>
                  <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Location</th>
                  <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Avg Salary</th>
                  <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Growth Rate</th>
                  <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Competition</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.marketTrends.map(trend => `
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 8px;">${trend.career_path}</td>
                    <td style="border: 1px solid #d1d5db; padding: 8px;">${trend.location}</td>
                    <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$${trend.average_salary?.toLocaleString() || 'N/A'}</td>
                    <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">${trend.growth_rate || 'N/A'}%</td>
                    <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">${trend.competition_level || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </section>

          <section>
            <h3 style="color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Key Insights</h3>
            <ul style="list-style-type: disc; padding-left: 20px;">
              ${reportData.insights.map(insight => `<li style="margin: 10px 0;">${insight}</li>`).join('')}
            </ul>
          </section>

          <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
            <p>This report was generated by the Market Intelligence System</p>
          </footer>
        </div>
      `;

      // Create and download the PDF
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `market-intelligence-report-${Date.now()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Market report exported successfully!");
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSV = async () => {
    try {
      // Ensure we have data before exporting
      const dataToExport = await ensureDataAvailable();
      
      // Check if we have any data to export
      if (!dataToExport || dataToExport.length === 0) {
        toast.error("No market data available to export. The database may be empty or there was an error loading data.");
        return;
      }

      console.log('📊 Exporting CSV with', dataToExport.length, 'records');

      // Prepare CSV headers
      const headers = [
        'Career Path',
        'Location', 
        'Job Postings Count',
        'Average Salary',
        'Growth Rate (%)',
        'Demand Score',
        'Competition Level',
        'Data Source',
        'Time Period',
        'Created At'
      ];

      // Prepare CSV rows
      const rows = dataToExport.map(trend => [
        trend.career_path || '',
        trend.location || '',
        trend.job_postings_count || 0,
        trend.average_salary || 0,
        trend.growth_rate || 0,
        trend.demand_score || 0,
        trend.competition_level || '',
        trend.data_source || '',
        trend.time_period || '',
        new Date(trend.created_at).toLocaleDateString()
      ]);

      // Create CSV content
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `market-data-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`CSV exported successfully! ${dataToExport.length} records included.`);
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error("Failed to export CSV data");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Market Intelligence
        </CardTitle>
        <CardDescription>
          Export comprehensive market reports and raw data for analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={generatePDFReport}
            disabled={isExporting || isLoading}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {isExporting ? "Generating..." : "Export PDF Report"}
          </Button>

          <Button
            onClick={exportCSV}
            variant="outline"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Table className="w-4 h-4" />
            Export CSV Data
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Market Analysis
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Historical Trends
          </Badge>
          <Badge variant="secondary">
            AI Insights
          </Badge>
          {(localMarketData || marketData)?.length > 0 && (
            <Badge variant="outline">
              {(localMarketData || marketData).length} records available
            </Badge>
          )}
          {isLoading && (
            <Badge variant="secondary">
              Loading data...
            </Badge>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p>• PDF reports include executive summary, trends analysis, and key insights</p>
          <p>• CSV exports contain raw market data for further analysis ({(localMarketData || marketData)?.length || 0} records available)</p>
          <p>• All exports include timestamp and data source information</p>
          {(!localMarketData && (!marketData || marketData.length === 0)) && (
            <p className="text-amber-600 mt-2">• No market data currently loaded. Data will be fetched automatically during export.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};