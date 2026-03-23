// WinSpect API integration for real inspection report data

const API_BASE_URL = import.meta.env.VITE_WINSPECT_API_URL || 'https://staging.winspectdev.com/be/reportwriter/api/v1';

interface WinSpectReportResponse {
  status: number;
  message: string;
  body: {
    zip: string;
    totalReports: number;
    totalServices: number;
    items: Array<{
      serviceId: string;
      serviceName: string;
      usageCount: number;
      remarkCount: number;
      categories: Array<{
        categoryName: string;
        remarkCount: number;
        subcategories: Array<{
          subCategoryName: string;
          remarkCount: number;
          remarks: Array<{
            remarkTitle: string;
            severity: string;
            count: number;
          }>;
        }>;
      }>;
    }>;
  };
}

export interface InspectionReport {
  zip: string;
  propertyAge?: number;
  issues?: {
    radon?: boolean;
    mold?: boolean;
    windMitigation?: boolean;
    fourPoint?: boolean;
    sewer?: boolean;
    hvac?: boolean;
    foundation?: boolean;
    crawlSpace?: boolean;
  };
  services?: string[];
  totalCost?: number;
  inspectionDate?: string;
  [key: string]: any; // Allow additional fields
}

export interface AggregatedZipData {
  zip: string;
  totalInspections: number;
  serviceFrequencies: {
    [serviceName: string]: number; // Percentage
  };
  avgHomeAge: number;
  avgRevenue: number;
  commonIssues: {
    [issue: string]: number; // Percentage
  };
  // New: detailed issue breakdown
  topIssues?: Array<{
    serviceName: string;
    categoryName: string;
    subCategoryName: string;
    remarkTitle: string;
    severity: string;
    count: number;
    percentage: number; // Of total reports
  }>;
  // New: services with most findings
  servicesWithMostFindings?: Array<{
    serviceName: string;
    usageCount: number;
    remarkCount: number;
    usagePercentage: number;
  }>;
}

/**
 * Fetch inspection reports for a specific ZIP code
 */
export async function fetchReportsByZip(zip: string): Promise<InspectionReport[]> {
  console.log('[WinSpect API] fetchReportsByZip called with ZIP:', zip);
  console.log('[WinSpect API] API_BASE_URL:', API_BASE_URL);

  try {
    const url = `${API_BASE_URL}/poc-report/list`;
    console.log('[WinSpect API] Making POST request to:', url);
    console.log('[WinSpect API] Request body:', JSON.stringify({ zip }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'client_type': 'Desktop',
      },
      body: JSON.stringify({ zip }),
    });

    console.log('[WinSpect API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WinSpect API] Error response body:', errorText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: WinSpectReportResponse = await response.json();
    console.log('[WinSpect API] Response data:', data);

    // Parse and transform the response
    const parsed = parseReports(data);
    console.log('[WinSpect API] Parsed reports count:', parsed.length);
    return parsed;
  } catch (error) {
    console.error('[WinSpect API] Error fetching reports:', error);
    throw error;
  }
}

/**
 * Parse raw API response into structured InspectionReport format
 * The API returns aggregated service data, not individual reports
 */
function parseReports(response: WinSpectReportResponse): InspectionReport[] {
  if (!response.body || !response.body.items) {
    console.error('[WinSpect API] Invalid response structure:', response);
    return [];
  }

  // The API gives us aggregated service data
  // We'll create pseudo-reports for aggregation purposes
  const { zip, items } = response.body;
  const reports: InspectionReport[] = [];

  // Store the service data for use in aggregation
  (reports as any).__serviceData = {
    zip,
    totalReports: response.body.totalReports,
    items: items,
  };

  // Return array with metadata attached
  return reports;
}

/**
 * Aggregate service data from WinSpect API into useful statistics
 */
export function aggregateReportData(reports: InspectionReport[]): AggregatedZipData | null {
  // Extract the service data attached to reports array
  const serviceData = (reports as any).__serviceData;

  if (!serviceData) {
    console.error('[aggregateReportData] No service data found in reports');
    return null;
  }

  const { zip, totalReports, items } = serviceData;

  console.log('[aggregateReportData] Processing', items.length, 'services for', totalReports, 'reports');

  // Calculate service frequencies from API data
  const serviceFrequencies: { [key: string]: number } = {};

  items.forEach((service: any) => {
    const percentage = Math.round((service.usageCount / totalReports) * 100);
    serviceFrequencies[service.serviceName] = percentage;
    console.log(`[aggregateReportData] ${service.serviceName}: ${service.usageCount}/${totalReports} = ${percentage}%`);
  });

  // Extract all detailed issues from the nested structure
  const allIssues: Array<{
    serviceName: string;
    categoryName: string;
    subCategoryName: string;
    remarkTitle: string;
    severity: string;
    count: number;
    percentage: number;
    serviceUsageCount: number;
  }> = [];

  items.forEach((service: any) => {
    if (service.categories && service.categories.length > 0) {
      service.categories.forEach((category: any) => {
        if (category.subcategories) {
          category.subcategories.forEach((subcategory: any) => {
            if (subcategory.remarks) {
              subcategory.remarks.forEach((remark: any) => {
                allIssues.push({
                  serviceName: service.serviceName,
                  categoryName: category.categoryName,
                  subCategoryName: subcategory.subCategoryName,
                  remarkTitle: remark.remarkTitle,
                  severity: remark.severity,
                  count: remark.count,
                  percentage: Math.round((remark.count / totalReports) * 100),
                  serviceUsageCount: service.usageCount, // Add service usage for weighting
                });
              });
            }
          });
        }
      });
    }
  });

  // Filter to ONLY show "Repairs Recommended" severity
  const repairIssues = allIssues.filter(issue =>
    issue.severity === 'Repairs Recommended'
  );

  console.log('[aggregateReportData] Found', allIssues.length, 'total issues');
  console.log('[aggregateReportData] Filtered to', repairIssues.length, 'repair-level issues');

  // Group repair issues by CATEGORY NAME (Roof, Electrical, Plumbing, etc.)
  const issuesByCategory: { [categoryName: string]: typeof repairIssues } = {};
  repairIssues.forEach(issue => {
    if (!issuesByCategory[issue.categoryName]) {
      issuesByCategory[issue.categoryName] = [];
    }
    issuesByCategory[issue.categoryName].push(issue);
  });

  // For each category, pick the most common issue across ALL services
  const topCategoryIssues = Object.entries(issuesByCategory).map(([_categoryName, issues]) => {
    // Sort issues within this category by count (most common first)
    const sortedIssues = issues.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      // If counts are equal, prefer issues from more-used services
      return b.serviceUsageCount - a.serviceUsageCount;
    });

    // Pick the most common issue in this category
    const topIssue = sortedIssues[0];

    // Calculate total repair issues across this category
    const totalCategoryRepairs = issues.reduce((sum, issue) => sum + issue.count, 0);

    // Calculate percentage at CATEGORY level, not individual issue level
    const categoryPercentage = Math.round((totalCategoryRepairs / totalReports) * 100);

    return {
      ...topIssue,
      totalCategoryRepairs, // Total repairs in this category across all services
      percentage: categoryPercentage, // Override with category-level percentage
    };
  });

  // Sort categories by total repair count
  topCategoryIssues.sort((a, b) => {
    return b.totalCategoryRepairs - a.totalCategoryRepairs;
  });

  // Get top 5 categories with their most critical issue
  const topIssues = topCategoryIssues.slice(0, 5);

  console.log('[aggregateReportData] Grouped into', Object.keys(issuesByCategory).length, 'unique categories');
  console.log('[aggregateReportData] Top 5 categories by repair issues:', topIssues.map(i =>
    `${i.categoryName} (${i.totalCategoryRepairs} total repairs) - ${i.serviceName}: ${i.remarkTitle} (${i.count}x)`
  ));

  // Extract common issues by category
  const commonIssues: { [key: string]: number } = {};
  const issueCategories = ['Mold', 'Radon', 'HVAC', 'Foundation', 'Sewer', 'Roof', 'Electrical', 'Plumbing'];

  issueCategories.forEach(issueName => {
    let remarkCount = 0;

    items.forEach((service: any) => {
      if (service.categories) {
        service.categories.forEach((category: any) => {
          if (category.categoryName.toLowerCase().includes(issueName.toLowerCase())) {
            remarkCount += category.remarkCount || 0;
          }
        });
      }
    });

    if (remarkCount > 0) {
      commonIssues[issueName] = Math.round((remarkCount / totalReports) * 100);
    }
  });

  // Identify services with most findings (high remarkCount)
  const servicesWithMostFindings = items
    .filter((service: any) => service.remarkCount > 0)
    .map((service: any) => ({
      serviceName: service.serviceName,
      usageCount: service.usageCount,
      remarkCount: service.remarkCount,
      usagePercentage: Math.round((service.usageCount / totalReports) * 100),
    }))
    .sort((a: any, b: any) => b.remarkCount - a.remarkCount)
    .slice(0, 10);

  console.log('[aggregateReportData] Services with most findings:',
    servicesWithMostFindings.map((s: any) => `${s.serviceName} (${s.remarkCount} findings)`).join(', ')
  );

  // Estimate average home age and revenue
  const avgHomeAge = 35; // Default - could be enhanced with property API data
  const avgRevenue = 350; // Default - could calculate from service costs

  return {
    zip,
    totalInspections: totalReports,
    serviceFrequencies,
    avgHomeAge,
    avgRevenue,
    commonIssues,
    topIssues,
    servicesWithMostFindings,
  };
}

/**
 * Convert aggregated data to the format expected by the app
 */
export function convertToZipData(aggregated: AggregatedZipData, city: string, state: string): any {
  // Determine humidity based on common patterns (you can enhance this)
  let humidity: 'low' | 'medium' | 'high' | 'very high' = 'medium';
  if (aggregated.commonIssues['Mold'] > 30) humidity = 'high';
  if (aggregated.commonIssues['Mold'] > 40) humidity = 'very high';

  return {
    zip: aggregated.zip,
    city,
    state,
    homeProfile: {
      avgAge: aggregated.avgHomeAge,
      humidity,
      floodZone: 'X', // Default, can be enhanced with external API
      predominantFoundation: 'Slab', // Default, can be enhanced
    },
    riskFactors: generateRiskFactors(aggregated),
    serviceFrequencies: Object.entries(aggregated.serviceFrequencies)
      .map(([name, frequency]) => ({
        serviceName: name,
        frequency,
        avgRevenue: Math.round(aggregated.avgRevenue * 0.3), // Estimate
        description: getServiceDescription(name),
      }))
      .filter(s => s.frequency > 0)
      .sort((a, b) => b.frequency - a.frequency),
    avgAddOnRevenue: aggregated.avgRevenue,
    // Include the rich data for AI coaching
    topIssues: aggregated.topIssues,
    servicesWithMostFindings: aggregated.servicesWithMostFindings,
    totalReports: aggregated.totalInspections,
  };
}

/**
 * Generate risk factors based on aggregated data
 */
function generateRiskFactors(aggregated: AggregatedZipData): any[] {
  const factors: any[] = [];

  if (aggregated.commonIssues['Mold'] > 25) {
    factors.push({
      name: 'Mold Risk',
      severity: aggregated.commonIssues['Mold'] > 40 ? 'high' : 'medium',
      description: 'Moisture and mold issues common in this area',
      statValue: `${aggregated.commonIssues['Mold']}% of inspections`,
    });
  }

  if (aggregated.commonIssues['Radon'] > 20) {
    factors.push({
      name: 'Radon Risk',
      severity: aggregated.commonIssues['Radon'] > 40 ? 'high' : 'medium',
      description: 'Elevated radon levels detected',
      statValue: `${aggregated.commonIssues['Radon']}% above EPA limits`,
    });
  }

  if (aggregated.avgHomeAge > 35) {
    factors.push({
      name: 'Aging Infrastructure',
      severity: aggregated.avgHomeAge > 45 ? 'high' : 'medium',
      description: 'Older homes may have dated systems',
      statValue: `${aggregated.avgHomeAge} years average`,
    });
  }

  return factors;
}

/**
 * Get service description - handles various service name formats from API
 */
function getServiceDescription(serviceName: string): string {
  const normalized = serviceName.toLowerCase();

  if (normalized.includes('wind') || normalized.includes('mitigation')) {
    return 'Insurance discounts for wind-resistant features';
  }
  if (normalized.includes('radon')) {
    return 'EPA-recommended testing for radioactive gas';
  }
  if (normalized.includes('4-point') || normalized.includes('four point')) {
    return 'Insurance requirement for homes 30+ years';
  }
  if (normalized.includes('mold')) {
    return 'Detect moisture and mold issues';
  }
  if (normalized.includes('sewer')) {
    return 'Camera inspection of sewer lines';
  }
  if (normalized.includes('pool') || normalized.includes('spa')) {
    return 'Pool and spa equipment inspection';
  }
  if (normalized.includes('wdo') || normalized.includes('wdi') || normalized.includes('pest')) {
    return 'Wood destroying organism inspection';
  }
  if (normalized.includes('pre-listing')) {
    return 'Pre-sale property inspection';
  }
  if (normalized.includes('infrared') || normalized.includes('ir')) {
    return 'Thermal imaging inspection';
  }
  if (normalized.includes('new construction')) {
    return 'New home construction phase inspections';
  }
  if (normalized.includes('re-inspection')) {
    return 'Follow-up inspection after repairs';
  }
  if (normalized.includes('trec')) {
    return 'Texas Real Estate Commission inspection';
  }
  if (normalized.includes('water quality')) {
    return 'Water testing for contaminants';
  }
  if (normalized.includes('well')) {
    return 'Well water flow and quality testing';
  }
  if (normalized.includes('manufactured') || normalized.includes('mobile')) {
    return 'Manufactured/mobile home inspection';
  }
  if (normalized.includes('townhome')) {
    return 'Townhouse property inspection';
  }

  return 'Professional inspection service';
}
