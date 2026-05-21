/**
 * Mock CRM System
 * Simulates a customer relationship management system with
 * customers, leads, opportunities, and pipeline data.
 */

// In-memory CRM state
let crmState = getDefaultState();

function getDefaultState() {
  return {
    customers: [
      { id: 'C001', name: 'TechCorp Industries', region: 'Lahore', status: 'active', revenue: 450000, tier: 'gold', lastContact: '2026-04-15' },
      { id: 'C002', name: 'Global Traders Ltd', region: 'Karachi', status: 'active', revenue: 320000, tier: 'silver', lastContact: '2026-04-20' },
      { id: 'C003', name: 'PakLogistics Co', region: 'Islamabad', status: 'active', revenue: 180000, tier: 'bronze', lastContact: '2026-04-10' },
      { id: 'C004', name: 'Metro Supplies', region: 'Lahore', status: 'at-risk', revenue: 95000, tier: 'bronze', lastContact: '2026-03-25' },
      { id: 'C005', name: 'Digital Solutions Pvt', region: 'Lahore', status: 'active', revenue: 275000, tier: 'silver', lastContact: '2026-04-18' },
      { id: 'C006', name: 'NorthStar Enterprises', region: 'Peshawar', status: 'active', revenue: 150000, tier: 'bronze', lastContact: '2026-04-22' },
    ],
    leads: [
      { id: 'L001', company: 'FreshMart Chain', region: 'Lahore', score: 72, stage: 'qualified', value: 120000 },
      { id: 'L002', company: 'BuildRight Construction', region: 'Karachi', score: 45, stage: 'prospecting', value: 85000 },
      { id: 'L003', company: 'EduTech Academy', region: 'Islamabad', score: 88, stage: 'proposal', value: 200000 },
    ],
    opportunities: [
      { id: 'O001', name: 'TechCorp Annual Renewal', value: 450000, probability: 85, stage: 'negotiation', closeDate: '2026-06-15' },
      { id: 'O002', name: 'Global Traders Expansion', value: 150000, probability: 60, stage: 'proposal', closeDate: '2026-07-01' },
    ],
    pipeline: {
      totalValue: 1050000,
      deals: 5,
      avgDealSize: 210000,
      winRate: 0.42,
      regions: {
        'Lahore': { deals: 3, value: 540000, trend: 'declining' },
        'Karachi': { deals: 2, value: 320000, trend: 'stable' },
        'Islamabad': { deals: 1, value: 200000, trend: 'growing' },
        'Peshawar': { deals: 1, value: 150000, trend: 'stable' },
      }
    },
    campaigns: [],
    activities: [],
  };
}

export function getState() {
  return JSON.parse(JSON.stringify(crmState));
}

export function resetState() {
  crmState = getDefaultState();
  return getState();
}

export function updateCustomerStatus(customerId, newStatus) {
  const customer = crmState.customers.find(c => c.id === customerId);
  if (customer) {
    const oldStatus = customer.status;
    customer.status = newStatus;
    crmState.activities.push({
      type: 'status_change',
      entity: 'customer',
      id: customerId,
      from: oldStatus,
      to: newStatus,
      timestamp: new Date().toISOString(),
    });
    return { success: true, customer, activity: crmState.activities[crmState.activities.length - 1] };
  }
  return { success: false, error: 'Customer not found' };
}

export function addCampaign(campaign) {
  const newCampaign = {
    id: `CAMP${String(crmState.campaigns.length + 1).padStart(3, '0')}`,
    ...campaign,
    status: 'active',
    createdAt: new Date().toISOString(),
    metrics: {
      reach: campaign.projectedReach || 0,
      engagement: 0,
      conversions: 0,
    },
  };
  crmState.campaigns.push(newCampaign);
  crmState.activities.push({
    type: 'campaign_created',
    entity: 'campaign',
    id: newCampaign.id,
    details: newCampaign,
    timestamp: new Date().toISOString(),
  });
  return { success: true, campaign: newCampaign };
}

export function updatePipelineRegion(region, updates) {
  if (crmState.pipeline.regions[region]) {
    const before = { ...crmState.pipeline.regions[region] };
    Object.assign(crmState.pipeline.regions[region], updates);
    crmState.activities.push({
      type: 'pipeline_update',
      entity: 'region',
      region,
      from: before,
      to: crmState.pipeline.regions[region],
      timestamp: new Date().toISOString(),
    });
    return { success: true, before, after: crmState.pipeline.regions[region] };
  }
  return { success: false, error: 'Region not found' };
}

export function addLead(lead) {
  const newLead = {
    id: `L${String(crmState.leads.length + 1).padStart(3, '0')}`,
    ...lead,
    stage: 'prospecting',
    createdAt: new Date().toISOString(),
  };
  crmState.leads.push(newLead);
  crmState.activities.push({
    type: 'lead_created',
    entity: 'lead',
    id: newLead.id,
    details: newLead,
    timestamp: new Date().toISOString(),
  });
  return { success: true, lead: newLead };
}

export function getActivities() {
  return [...crmState.activities];
}

export default {
  getState,
  resetState,
  updateCustomerStatus,
  addCampaign,
  updatePipelineRegion,
  addLead,
  getActivities,
};
