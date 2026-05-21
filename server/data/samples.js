/**
 * Sample inputs for demo and testing — Business Operations domain focus.
 */

export function getSamples() {
  return [
    {
      id: 'sales-decline',
      title: 'Regional Sales Decline',
      category: 'Sales & Revenue',
      icon: '📉',
      content: `QUARTERLY SALES REPORT — Q1 2026
Region: Lahore Division
Prepared by: Regional Sales Manager

Executive Summary:
Sales performance in the Lahore region has shown a significant decline in Q1 2026 compared to the previous quarter. Total orders dropped by 25% from 1,650 to 1,237 orders. Revenue fell from PKR 36.5M to PKR 27.5M, representing a 24.7% decrease.

Key Metrics:
- Total Orders: 1,237 (down 25% from Q4 2025)
- Revenue: PKR 27.5M (down 24.7%)
- Average Order Value: PKR 22,230 (up 1.2%)
- New Customer Acquisition: 45 (down 38% from 73)
- Customer Churn Rate: 12.5% (up from 7.2%)
- Customer Satisfaction Score: 3.8/5 (down from 4.2/5)

Regional Breakdown:
- Lahore City Center: -30% orders (most affected)
- Lahore Cantonment: -15% orders
- Lahore Suburbs: -22% orders

Contributing Factors:
1. Increased competition from two new market entrants in January
2. Supply chain disruptions causing 3-5 day delivery delays
3. Price sensitivity — competitors offering 10-15% lower prices
4. Reduced marketing spend in Q1 (budget cut by 40%)
5. Key account manager for Lahore resigned in February (unfilled position)

Top Customer Impact:
- TechCorp Industries: Orders down 20%, considering switching vendors
- Metro Supplies: Account flagged as at-risk, no orders in March
- Digital Solutions Pvt: Requesting volume discounts to stay

Inventory Status:
- Warehouse utilization at 78% (up from 65% — unsold stock accumulating)
- 15% of inventory is aging beyond 60 days`,
    },
    {
      id: 'employee-attrition',
      title: 'Employee Attrition Crisis',
      category: 'HR & Workforce',
      icon: '👥',
      content: `HR ANALYTICS REPORT — Q1 2026
Department: Engineering & Product Development
Prepared by: HR Business Partner

Attrition Summary:
The Engineering department has experienced a concerning attrition spike in Q1 2026. A total of 18 employees resigned out of a 120-person department, yielding a 15% quarterly attrition rate — nearly triple the company average of 5.5%.

Departures by Seniority:
- Senior Engineers (5+ yrs): 6 departures (33% of senior cohort)
- Mid-level Engineers (2-5 yrs): 8 departures (18% of mid cohort)
- Junior Engineers (<2 yrs): 4 departures (8% of junior cohort)

Exit Interview Findings:
- 72% cited below-market compensation as primary reason
- 56% mentioned lack of career growth opportunities
- 44% referenced poor work-life balance (average 52-hour work weeks)
- 33% received offers from competitors at 25-40% salary premium

Impact on Operations:
- 3 critical projects now understaffed (Project Atlas, Project Nova, Client Portal 2.0)
- Sprint velocity dropped 35% in March across affected teams
- Knowledge transfer gaps in 4 key system components
- Remaining team morale score: 3.1/5 (down from 4.0/5 in Q4)

Financial Impact:
- Estimated cost per replacement: PKR 800,000 (recruitment + onboarding + ramp-up)
- Total replacement cost for 18 positions: PKR 14.4M
- Revenue at risk from delayed projects: PKR 22M
- Overtime costs for remaining staff: PKR 2.1M/month

Competitor Intelligence:
- TechVentures Inc offered 30% salary premium to 4 of our senior devs
- GlobalSoft opened Lahore office, aggressively hiring with stock options
- Market salary benchmarks show our compensation is 18-25% below median

Current Open Positions: 22 (18 replacements + 4 planned new hires)
Average Time to Fill: 45 days (up from 28 days last year)`,
    },
    {
      id: 'customer-complaints',
      title: 'Customer Complaint Surge',
      category: 'Customer Experience',
      icon: '⚠️',
      content: `CUSTOMER EXPERIENCE REPORT — April 2026
Channel: Support Tickets, Social Media, NPS Surveys
Prepared by: Customer Success Team

Alert: Complaint Volume at 6-Month High

Overall Metrics:
- Total complaints received: 847 (up 62% from March's 523)
- Average resolution time: 72 hours (up from 36 hours)
- First response time: 8.5 hours (SLA target: 4 hours)
- Customer Satisfaction (CSAT): 2.9/5 (down from 3.8/5)
- Net Promoter Score (NPS): -12 (down from +18)

Complaint Categories:
1. Delivery Delays: 312 complaints (37%)
   - Average delay: 4.2 days beyond promised date
   - Worst affected: Karachi region (48% of delay complaints)
   - Root cause: Warehouse staffing shortage + carrier capacity issues

2. Product Quality Issues: 198 complaints (23%)
   - Defective products: 134 cases
   - Wrong items shipped: 64 cases  
   - Return rate jumped to 8.3% (from 4.1%)

3. Billing & Pricing Errors: 156 complaints (18%)
   - Overcharges: 89 cases
   - Failed refunds: 67 cases
   - Average overcharge amount: PKR 3,450

4. Customer Service Experience: 181 complaints (22%)
   - Long hold times: average 22 minutes
   - Unresolved tickets reopened: 34% reopen rate
   - Agent knowledge gaps reported in 45% of escalations

Social Media Impact:
- 23 negative mentions on Twitter/X with >1000 impressions each
- 2 viral complaint threads (combined 45,000 views)
- Google review rating dropped from 4.1 to 3.6 stars

At-Risk Revenue:
- 156 customers have explicitly threatened to switch
- Combined annual revenue of at-risk accounts: PKR 48M
- 12 B2B accounts have requested formal service improvement plans`,
    },
    {
      id: 'inventory-overstocking',
      title: 'Inventory & Cash Flow Alert',
      category: 'Operations & Finance',
      icon: '📦',
      content: `INVENTORY & CASH FLOW ANALYSIS — May 2026
Department: Supply Chain & Finance
Prepared by: Operations Controller

Critical Alert: Working Capital Strain

Inventory Status:
- Total inventory value: PKR 125M (up 40% from PKR 89M in January)
- Warehouse capacity utilization: 92% (critical threshold: 85%)
- Slow-moving inventory (>90 days): PKR 35M (28% of total)
- Dead stock (>180 days): PKR 12M (9.6% of total)
- Days of Inventory Outstanding (DIO): 68 days (target: 45 days)

Top Overstocked Categories:
1. Electronics Accessories: PKR 28M (142 days supply vs 30 day target)
2. Office Equipment: PKR 18M (95 days supply vs 40 day target)
3. Seasonal Products (winter): PKR 15M (should have been cleared by March)

Cash Flow Impact:
- Cash conversion cycle: 82 days (up from 55 days)
- Accounts Payable due in 30 days: PKR 45M
- Available cash reserves: PKR 18M
- Projected cash shortfall by June 15: PKR 12M
- Credit line utilization: 78% of PKR 50M facility

Revenue vs. Procurement Mismatch:
- Q1 procurement: PKR 85M
- Q1 sales revenue: PKR 62M
- Procurement exceeds sales by 37%
- Purchasing team ordered based on Q4 forecasts (which assumed 15% growth)
- Actual growth: -8%

Warehouse Operations:
- 3 temporary storage units rented (PKR 450,000/month each)
- Pick-and-pack efficiency dropped 20% due to overcrowding
- Damage rate increased to 2.3% (from 0.8%) due to stacking constraints

Supplier Relationships:
- 4 suppliers offering early payment discounts (2-3%) expiring this month
- 2 suppliers have flagged credit hold risk if payments delayed beyond 45 days`,
    },
  ];
}

export default { getSamples };
