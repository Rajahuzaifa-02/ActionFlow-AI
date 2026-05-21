/**
 * Mock Campaign Manager
 * Simulates marketing campaign creation and management.
 */

let campaignState = getDefaultState();

function getDefaultState() {
  return {
    campaigns: [
      {
        id: 'CAMP001',
        name: 'Q2 Retention Drive',
        type: 'retention',
        status: 'active',
        region: 'all',
        budget: 500000,
        spent: 235000,
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        audience: { size: 15000, segment: 'existing_customers' },
        metrics: { reach: 8500, engagement: 1200, conversions: 340, roi: 1.8 },
      },
    ],
    budgetPool: 2000000,
    budgetAllocated: 500000,
    history: [],
  };
}

export function getState() {
  return JSON.parse(JSON.stringify(campaignState));
}

export function resetState() {
  campaignState = getDefaultState();
  return getState();
}

export function createCampaign({ name, type, region, budget, duration, audience, discount }) {
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + (duration || 30) * 86400000).toISOString().split('T')[0];

  const campaign = {
    id: `CAMP${String(campaignState.campaigns.length + 1).padStart(3, '0')}`,
    name,
    type: type || 'promotional',
    status: 'active',
    region: region || 'all',
    budget: budget || 100000,
    spent: 0,
    startDate,
    endDate,
    discount: discount || null,
    audience: {
      size: audience?.size || 5000,
      segment: audience?.segment || 'all_users',
    },
    metrics: {
      reach: 0,
      engagement: 0,
      conversions: 0,
      roi: 0,
      projectedReach: Math.round((audience?.size || 5000) * 0.65),
      projectedConversions: Math.round((audience?.size || 5000) * 0.08),
      projectedRevenue: Math.round((audience?.size || 5000) * 0.08 * 22000),
    },
    createdAt: new Date().toISOString(),
  };

  campaignState.campaigns.push(campaign);
  campaignState.budgetAllocated += campaign.budget;

  campaignState.history.push({
    type: 'campaign_created',
    campaignId: campaign.id,
    details: campaign,
    timestamp: new Date().toISOString(),
  });

  return { success: true, campaign };
}

export function updateCampaignMetrics(campaignId, metrics) {
  const campaign = campaignState.campaigns.find(c => c.id === campaignId);
  if (campaign) {
    const before = { ...campaign.metrics };
    Object.assign(campaign.metrics, metrics);
    campaignState.history.push({
      type: 'metrics_update',
      campaignId,
      from: before,
      to: campaign.metrics,
      timestamp: new Date().toISOString(),
    });
    return { success: true, before, after: campaign.metrics };
  }
  return { success: false, error: 'Campaign not found' };
}

export function pauseCampaign(campaignId) {
  const campaign = campaignState.campaigns.find(c => c.id === campaignId);
  if (campaign) {
    campaign.status = 'paused';
    campaignState.history.push({
      type: 'campaign_paused',
      campaignId,
      timestamp: new Date().toISOString(),
    });
    return { success: true, campaign };
  }
  return { success: false, error: 'Campaign not found' };
}

export function getHistory() {
  return [...campaignState.history];
}

export default {
  getState,
  resetState,
  createCampaign,
  updateCampaignMetrics,
  pauseCampaign,
  getHistory,
};
