/**
 * Mock Pricing Engine
 * Simulates a product/delivery pricing system.
 */

let pricingState = getDefaultState();

function getDefaultState() {
  return {
    products: [
      { id: 'P001', name: 'Standard Delivery', basePrice: 250, currentPrice: 250, unit: 'PKR', category: 'delivery' },
      { id: 'P002', name: 'Express Delivery', basePrice: 500, currentPrice: 500, unit: 'PKR', category: 'delivery' },
      { id: 'P003', name: 'Same Day Delivery', basePrice: 800, currentPrice: 800, unit: 'PKR', category: 'delivery' },
      { id: 'P004', name: 'Bulk Shipping', basePrice: 150, currentPrice: 150, unit: 'PKR/kg', category: 'logistics' },
      { id: 'P005', name: 'Warehouse Storage', basePrice: 5000, currentPrice: 5000, unit: 'PKR/month', category: 'storage' },
    ],
    discountRules: [
      { id: 'D001', name: 'Volume Discount', threshold: 10, discountPercent: 5, active: true },
      { id: 'D002', name: 'Loyalty Discount', threshold: null, discountPercent: 10, active: true, condition: 'gold_tier' },
    ],
    priceHistory: [],
    margins: {
      delivery: { target: 0.25, current: 0.22 },
      logistics: { target: 0.30, current: 0.28 },
      storage: { target: 0.40, current: 0.38 },
    },
  };
}

export function getState() {
  return JSON.parse(JSON.stringify(pricingState));
}

export function resetState() {
  pricingState = getDefaultState();
  return getState();
}

export function updatePrice(productId, newPrice, reason) {
  const product = pricingState.products.find(p => p.id === productId);
  if (product) {
    const oldPrice = product.currentPrice;
    product.currentPrice = newPrice;
    const change = {
      productId,
      productName: product.name,
      oldPrice,
      newPrice,
      changePercent: ((newPrice - oldPrice) / oldPrice * 100).toFixed(1),
      reason: reason || 'manual_update',
      timestamp: new Date().toISOString(),
    };
    pricingState.priceHistory.push(change);
    return { success: true, change };
  }
  return { success: false, error: 'Product not found' };
}

export function addDiscountRule(rule) {
  const newRule = {
    id: `D${String(pricingState.discountRules.length + 1).padStart(3, '0')}`,
    ...rule,
    active: true,
    createdAt: new Date().toISOString(),
  };
  pricingState.discountRules.push(newRule);
  return { success: true, rule: newRule };
}

export function applyBulkPriceChange(category, changePercent, reason) {
  const affected = pricingState.products.filter(p => p.category === category);
  const changes = affected.map(product => {
    const oldPrice = product.currentPrice;
    const newPrice = Math.round(oldPrice * (1 + changePercent / 100));
    product.currentPrice = newPrice;
    const change = {
      productId: product.id,
      productName: product.name,
      oldPrice,
      newPrice,
      changePercent: changePercent.toFixed(1),
      reason,
      timestamp: new Date().toISOString(),
    };
    pricingState.priceHistory.push(change);
    return change;
  });
  return { success: true, changes };
}

export function getPriceHistory() {
  return [...pricingState.priceHistory];
}

export default {
  getState,
  resetState,
  updatePrice,
  addDiscountRule,
  applyBulkPriceChange,
  getPriceHistory,
};
