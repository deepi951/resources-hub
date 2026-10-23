export const adminStats = [
  {
    label: 'Gross Revenue',
    value: '₹24.8L',
    change: '+18.2%',
    hint: 'vs last month',
    tone: 'primary'
  },
  {
    label: 'Active Users',
    value: '8,420',
    change: '+12.6%',
    hint: 'new this month',
    tone: 'success'
  },
  {
    label: 'Orders',
    value: '1,284',
    change: '+9.4%',
    hint: 'across categories',
    tone: 'info'
  },
  {
    label: 'Refund Rate',
    value: '1.8%',
    change: '-0.7%',
    hint: 'improved',
    tone: 'warning'
  }
]

export const recentUsers = [
  { id: 'USR-2401', name: 'Aarav Sharma', email: 'aarav@example.com', plan: 'Pro Seller', status: 'Active', joinedAt: '2026-09-14' },
  { id: 'USR-2402', name: 'Meera Patel', email: 'meera@example.com', plan: 'Premium', status: 'Verified', joinedAt: '2026-09-12' },
  { id: 'USR-2403', name: 'Karan Singh', email: 'karan@example.com', plan: 'Basic', status: 'Pending', joinedAt: '2026-09-09' },
  { id: 'USR-2404', name: 'Niha Shah', email: 'niha@example.com', plan: 'Pro Seller', status: 'Active', joinedAt: '2026-09-07' },
  { id: 'USR-2405', name: 'Rohit Nair', email: 'rohit@example.com', plan: 'Basic', status: 'Blocked', joinedAt: '2026-09-04' }
]

export const adminProducts = [
  { id: 'PRD-1024', title: 'AI Notes Bundle', category: 'Study Tools', seller: 'Nova Studio', price: 1299, stock: 48, status: 'Live' },
  { id: 'PRD-1025', title: 'Data Structures Pack', category: 'Programming', seller: 'CodeHub', price: 899, stock: 31, status: 'Live' },
  { id: 'PRD-1026', title: 'Design Portfolio Kit', category: 'Design', seller: 'Pixel Works', price: 1499, stock: 18, status: 'Review' },
  { id: 'PRD-1027', title: 'Interview Prep Course', category: 'Career', seller: 'CareerLift', price: 2199, stock: 14, status: 'Draft' },
  { id: 'PRD-1028', title: 'Machine Learning Lab', category: 'AI', seller: 'LearnLabs', price: 2599, stock: 9, status: 'Live' }
]

export const adminOrders = [
  { id: 'ORD-1094', customer: 'Ananya Rao', item: 'AI Notes Bundle', amount: 1299, status: 'Paid', date: '2026-09-18' },
  { id: 'ORD-1095', customer: 'Dev Verma', item: 'Machine Learning Lab', amount: 2599, status: 'Processing', date: '2026-09-18' },
  { id: 'ORD-1096', customer: 'Sana Khan', item: 'Design Portfolio Kit', amount: 1499, status: 'Shipped', date: '2026-09-17' },
  { id: 'ORD-1097', customer: 'Ritesh Iyer', item: 'Interview Prep Course', amount: 2199, status: 'Refunded', date: '2026-09-15' },
  { id: 'ORD-1098', customer: 'Pooja Nair', item: 'Data Structures Pack', amount: 899, status: 'Paid', date: '2026-09-14' }
]

export const salesTrend = [
  { month: 'Jan', revenue: 420000 },
  { month: 'Feb', revenue: 510000 },
  { month: 'Mar', revenue: 495000 },
  { month: 'Apr', revenue: 680000 },
  { month: 'May', revenue: 720000 },
  { month: 'Jun', revenue: 830000 },
  { month: 'Jul', revenue: 910000 },
  { month: 'Aug', revenue: 980000 },
  { month: 'Sep', revenue: 1180000 }
]

export const inventoryAlerts = [
  { item: 'AI Notes Bundle', stock: 12, severity: 'Low stock' },
  { item: 'Design Portfolio Kit', stock: 18, severity: 'Low stock' },
  { item: 'Machine Learning Lab', stock: 9, severity: 'Critical' },
  { item: 'Career Booster Pack', stock: 22, severity: 'Watchlist' }
]

export const supportTickets = [
  { id: 'TCK-120', customer: 'Kavya D.', issue: 'Unable to download purchased files', priority: 'High', status: 'Open' },
  { id: 'TCK-121', customer: 'Tushar M.', issue: 'Payment failed after successful checkout', priority: 'Medium', status: 'In Review' },
  { id: 'TCK-122', customer: 'Naina S.', issue: 'Seller payout mismatch', priority: 'High', status: 'Escalated' }
]

export const platformSettings = [
  { name: 'Marketplace status', value: 'Open', description: 'Public listings are enabled' },
  { name: 'Verification mode', value: 'Required', description: 'Seller verification is enforced' },
  { name: 'Auto payouts', value: 'Enabled', description: 'Weekly settlement is active' },
  { name: 'Fraud alerts', value: 'Monitoring', description: 'High-risk transactions are flagged' }
]
