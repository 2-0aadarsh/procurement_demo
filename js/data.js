/* Mock Data for MP Health Procurement Prototype */

const CATEGORIES = ['All', 'Drugs', 'Equipment', 'Services', 'Consumables', 'Others'];

const GOV_WORKFLOW = [
  { id: 1, name: 'Need Identification', desc: 'Stock levels, patient load, disease burden and gap analysis are auto-populated from integrated health & inventory APIs to determine requirements.', status: 'done' },
  { id: 2, name: 'Stock Check', desc: 'Verify existing warehouse stock, other locations, approved open POs, and redistributable inventory.', status: 'done' },
  { id: 3, name: 'Indent Raised', desc: 'Store Manager searches stock, checks open orders, raises indent only if stock unavailable.', status: 'done' },
  { id: 4, name: 'Demand Consolidation', desc: 'Stock Manager checks duplicates, consolidates district requirements for optimization.', status: 'active' },
  { id: 5, name: 'PR & Budget Approval', desc: 'Purchase requisition with budget head allocation and administrative/financial sanction.', status: 'pending' },
  { id: 6, name: 'Tender Preparation', desc: 'Draft NIT/RFP with scope, BOQ, eligibility, EMD, timelines and evaluation method.', status: 'pending' },
  { id: 7, name: 'Contract Approval', desc: 'Contract approval and execution must occur before PO generation.', status: 'pending' },
  { id: 8, name: 'Bid Evaluation', desc: 'Technical and financial evaluation using L1 or QCBS methodology.', status: 'pending' },
  { id: 9, name: 'Award', desc: 'Issue LOA to L1 bidder, obtain PBG, sign formal contract.', status: 'pending' },
  { id: 10, name: 'Purchase Order', desc: 'Generate PO after contract execution with delivery schedule and terms.', status: 'pending' },
  { id: 11, name: 'GRN & Inspection', desc: 'Goods receipt, quality testing, batch verification and acceptance certificate.', status: 'pending' },
  { id: 12, name: 'Invoice Matching', desc: 'Three-way match: PO, GRN, and invoice verification.', status: 'pending' },
  { id: 13, name: 'Payment', desc: 'Process payment within contract terms, apply LD if applicable.', status: 'pending' }
];

const WORKFLOW_GUIDE_PATH = 'assets/MP-Health-Procurement-Lifecycle-Guide.html';

const VENDOR_STAGE_CHECKLIST = {
  1: ['Company profile & contact details', 'GSTIN, PAN, incorporation certificate', 'Category & product line declaration', 'Authorized signatory letter'],
  2: ['Bank account verification (cancelled cheque)', 'KYC documents & regulatory licenses', 'Address proof & signatory ID', 'Respond to verification queries within 48 hours'],
  3: ['Department review of registration & KYC', 'Confirm vendor code assignment (e.g. VND-MP-000123)', 'Approval notification on portal', 'Link approved profile to bidding'],
  4: ['Technical bid documents uploaded', 'Financial bid sealed separately', 'EMD paid (₹3,20,000 for current tender)', 'Submission receipt confirmed before deadline'],
  5: ['Receive Letter of Award (LOA) notification', 'Review award terms & timelines', 'Acknowledge LOA on portal', 'Note PBG submission deadline'],
  6: ['Submit Performance Bank Guarantee (PBG)', 'Sign contract agreement', 'Confirm delivery schedule & SLA', 'Contract activation on portal'],
  7: ['Dispatch with delivery challan', 'Batch / serial & expiry documentation', 'Cold chain logs (if applicable)', 'Update delivery status on portal'],
  8: ['Raise invoice with GRN reference', 'Attach delivery & acceptance proof', 'Submit invoice on portal', 'Track invoice verification status'],
  9: ['Monitor payment processing', 'Confirm credit to bank account', 'Download payment advice / receipt', 'Close invoice cycle']
};

const GOV_STAGE_CHECKLIST = {
  1: ['Assess stock levels & patient load', 'Gap analysis by facility', 'Disease burden review'],
  2: ['Warehouse stock verification', 'Inter-facility redistribution check', 'Open PO & redistributable inventory'],
  3: ['Search existing stock & open orders', 'Raise indent if unavailable', 'CMO / competent authority approval'],
  4: ['Duplicate demand check', 'District consolidation', 'Stock optimization before fresh procurement'],
  5: ['Purchase requisition with budget head', 'Administrative sanction', 'Financial approval'],
  6: ['Draft NIT/RFP with BOQ', 'Eligibility, EMD, timelines', 'Evaluation method (L1/QCBS)'],
  7: ['Contract draft approval', 'Legal & finance review', 'Contract before PO gate'],
  8: ['Technical evaluation committee', 'Financial bid opening', 'L1/QCBS scoring'],
  9: ['Issue LOA to L1 bidder', 'PBG collection', 'Contract signing'],
  10: ['PO generation post-contract', 'Delivery schedule & terms', 'Vendor notification'],
  11: ['GRN & quality inspection', 'Batch verification', 'Acceptance certificate'],
  12: ['Three-way match: PO, GRN, Invoice', 'Deductions / LD if applicable', 'Finance verification'],
  13: ['Payment processing', 'Audit trail entry', 'Contract closure records']
};

const VENDOR_STAGE_TIPS = {
  1: 'Ensure GSTIN matches bank account name exactly — mismatches delay KYC.',
  2: 'Respond to verification queries within 48 hours to avoid registration delays.',
  3: 'Vendor approval unlocks bidding — keep profile documents current.',
  4: 'You can revisit Stages 1–3 to update documents before bid submission.',
  5: 'Acknowledge LOA promptly; PBG is usually due within 15–21 days.',
  6: 'Submit PBG (5–10% of contract value) via SFMS/e-BG within the LOA timeline.',
  8: 'Invoice must reference GRN and delivery proof for three-way match.',
  9: 'Track payment status on the portal; escalate delays through helpdesk.'
};

const GOV_STAGE_TIPS = {
  4: 'Optimize from warehouse and inter-facility stock before fresh procurement.',
  7: 'Contract approval must precede PO generation per policy.',
  8: 'Commercial bids open only for technically qualified vendors.',
  12: 'Three-way match: PO, GRN, and Invoice before payment release.'
};

/**
 * Stage 1 — Need Identification payload (simulates integrated API response).
 * In production this would come from DHIS2 / e-Aushadhi / facility EMR feeds.
 */
const NEED_IDENTIFICATION_API = {
  meta: {
    source: 'DHIS2 + e-Aushadhi Stock API',
    endpoint: '/api/v1/need-identification',
    lastSynced: '03-09-2026 02:45 IST',
    syncedBy: 'SYSTEM',
    district: 'Bhopal Division',
    facilities: 12,
    assessmentPeriod: 'Aug 2026',
    status: 'Synced'
  },
  stockLevels: {
    label: 'Stock Levels',
    summary: 'Warehouse + facility on-hand vs reorder point',
    overallFillRate: '68%',
    criticalSkus: 14,
    belowReorder: 28,
    daysOfCover: 11,
    status: 'Attention',
    rows: [
      { facility: 'Gandhi Medical College', sku: 'Paracetamol 500mg', onHand: 42000, reorder: 80000, coverDays: 8, status: 'Critical' },
      { facility: 'M.Y. Hospital Indore', sku: 'IV Fluids (NS)', onHand: 18500, reorder: 25000, coverDays: 12, status: 'Low' },
      { facility: 'NSCB Jabalpur', sku: 'Insulin 40 IU', onHand: 9200, reorder: 15000, coverDays: 9, status: 'Critical' },
      { facility: 'GR Medical Gwalior', sku: 'Amoxicillin 250mg', onHand: 61000, reorder: 45000, coverDays: 22, status: 'Adequate' }
    ]
  },
  patientLoad: {
    label: 'Patient Load',
    summary: 'OPD + IPD footfall driving consumption forecast',
    opdMonthly: '4.2 Lakh',
    ipdOccupancy: '86%',
    growthYoY: '+6.4%',
    highLoadFacilities: 5,
    status: 'Elevated',
    rows: [
      { facility: 'Gandhi Medical College', opd: 48500, ipdBedOcc: '92%', trend: '↑ 8%', category: 'Tertiary' },
      { facility: 'M.Y. Hospital Indore', opd: 52100, ipdBedOcc: '89%', trend: '↑ 5%', category: 'Tertiary' },
      { facility: 'District Hospital Rewa', opd: 18200, ipdBedOcc: '78%', trend: '↑ 3%', category: 'Secondary' },
      { facility: 'CHC Sehore', opd: 9400, ipdBedOcc: '71%', trend: '→ 0%', category: 'CHC' }
    ]
  },
  diseaseBurden: {
    label: 'Disease Burden',
    summary: 'Priority disease programmes influencing formulary demand',
    topConditions: 4,
    seasonalAlert: 'Monsoon vector-borne peak',
    programmeSkus: 36,
    riskScore: 'High',
    status: 'High',
    rows: [
      { condition: 'Seasonal Influenza / ARI', cases: '28,400', trend: '↑', skuFocus: 'Antipyretics, Antibiotics', priority: 'High' },
      { condition: 'Vector-borne (Dengue / Malaria)', cases: '6,120', trend: '↑', skuFocus: 'IV Fluids, Antimalarials', priority: 'Critical' },
      { condition: 'NCD — Diabetes', cases: '41,800', trend: '↑', skuFocus: 'Insulin, Oral hypoglycemics', priority: 'High' },
      { condition: 'Maternal & Child Health', cases: '12,600', trend: '→', skuFocus: 'Iron, Vaccines, ORS', priority: 'Medium' }
    ]
  },
  gapAnalysis: {
    label: 'Gap Analysis',
    summary: 'Requirement gap after stock + open PO netting',
    netGapValue: '₹18.6 Cr',
    lineItems: 47,
    fulfillFromStock: 28,
    freshProcurement: 19,
    estimatedSavings: '₹2.1 Cr',
    status: 'Action Required',
    rows: [
      { item: 'Paracetamol 500mg Tab', required: '12.0 L packs', available: '4.2 L', openPo: '1.5 L', gap: '6.3 L', action: 'Fresh tender' },
      { item: 'IV Normal Saline 500ml', required: '2.8 L units', available: '1.1 L', openPo: '0.4 L', gap: '1.3 L', action: 'Fresh tender' },
      { item: 'Insulin 40 IU Vial', required: '45,000', available: '18,200', openPo: '8,000', gap: '18,800', action: 'Rate contract top-up' },
      { item: 'Surgical Gloves (pair)', required: '9.5 L', available: '6.2 L', openPo: '2.0 L', gap: '1.3 L', action: 'Redistribute + PO' }
    ]
  }
};

const AUDIT_TRAIL_VENDOR = [
  { id: 'AUD-V-2026-0142', time: '2026-09-04 14:32:10', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Bid Draft Saved', stage: 'Bid Submission', stageId: 4, module: 'Vendor Lifecycle', detail: 'Technical bid documents updated for TND-2026-MP-0055', ref: 'TND-2026-MP-0055', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0141', time: '2026-09-04 11:05:44', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'EMD Payment Initiated', stage: 'Bid Submission', stageId: 4, module: 'Payments', detail: 'EMD of ₹3,20,000 initiated via e-BG portal — pending bank confirmation', ref: 'EMD-TND-0055', ip: '103.24.18.92', status: 'Pending' },
  { id: 'AUD-V-2026-0129', time: '2026-08-28 14:22:51', user: 'SYSTEM', userName: 'MP Health Portal', action: 'Vendor Approved', stage: 'Vendor Approval', stageId: 3, module: 'Vendor Registry', detail: 'Vendor code VND-MP-000123 approved and activated for bidding', ref: 'VND-MP-000123', ip: '10.0.0.1', status: 'Success' },
  { id: 'AUD-V-2026-0124', time: '2026-08-27 11:07:33', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'KYC Verified', stage: 'KYC Verification', stageId: 2, module: 'Vendor Lifecycle', detail: 'Bank account HDFC ****4567 verified; drug license DL-MH-2024-0892 validated', ref: 'KYC-2026-441', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0120', time: '2026-08-26 15:55:18', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'KYC Documents Uploaded', stage: 'KYC Verification', stageId: 2, module: 'Vendor Lifecycle', detail: 'Cancelled cheque, address proof, and signatory ID submitted', ref: 'KYC-2026-441', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0115', time: '2026-08-25 10:12:40', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Registration Submitted', stage: 'Registration', stageId: 1, module: 'Vendor Lifecycle', detail: 'Company profile, GSTIN 23AABCM1234A1Z5, PAN AABCM1234A registered', ref: 'REG-2026-1187', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0114', time: '2026-08-25 10:08:22', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Profile Created', stage: 'Registration', stageId: 1, module: 'Authentication', detail: 'Vendor portal account created — email verified', ref: 'USR-VND-8891', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0108', time: '2026-08-20 17:30:00', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Financial Bid Sealed', stage: 'Bid Submission', stageId: 4, module: 'Bid Management', detail: 'Commercial bid encrypted and sealed — opening scheduled post technical evaluation', ref: 'BID-FIN-0055', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0102', time: '2026-08-15 09:00:00', user: 'SYSTEM', userName: 'MP Health Portal', action: 'Session Login', stage: 'Registration', stageId: 1, module: 'Authentication', detail: 'Successful login from registered device', ref: 'SES-99201', ip: '103.24.18.92', status: 'Success' }
];

const AUDIT_TRAIL_GOV = [
  { id: 'AUD-G-2026-0088', time: '2026-09-04 15:10:22', user: 'GOV-PROC-014', userName: 'Dr. Sharma (Procurement)', action: 'Evaluation Committee Formed', stage: 'Bid Evaluation', stageId: 8, module: 'Tender Management', detail: 'Committee assigned for TND-2026-MP-0055 — technical opening completed', ref: 'TND-2026-MP-0055', ip: '10.24.8.45', status: 'Success' },
  { id: 'AUD-G-2026-0085', time: '2026-09-03 11:22:18', user: 'GOV-STORE-022', userName: 'Store Manager — Bhopal', action: 'Demand Consolidated', stage: 'Demand Consolidation', stageId: 4, module: 'Inventory', detail: 'District drug demand consolidated — 28 items optimizable from stock', ref: 'DEM-MP-2026-334', ip: '10.24.8.12', status: 'Success' },
  { id: 'AUD-G-2026-0080', time: '2026-09-01 14:05:55', user: 'GOV-FIN-007', userName: 'Finance Controller', action: 'Budget Sanctioned', stage: 'PR & Budget Approval', stageId: 5, module: 'Finance', detail: 'Administrative sanction for ₹4.2 Cr — Drugs category FY 2026-27', ref: 'BUD-MP-DRG-092', ip: '10.24.8.33', status: 'Success' },
  { id: 'AUD-G-2026-0076', time: '2026-08-29 10:40:11', user: 'GOV-PROC-014', userName: 'Dr. Sharma (Procurement)', action: 'NIT Published', stage: 'Tender Preparation', stageId: 6, module: 'Tender Management', detail: 'TND-2026-MP-0055 published — EMD ₹3,20,000, deadline 2026-09-05', ref: 'TND-2026-MP-0055', ip: '10.24.8.45', status: 'Success' },
  { id: 'AUD-G-2026-0070', time: '2026-08-25 09:15:00', user: 'GOV-STORE-022', userName: 'Store Manager — Bhopal', action: 'Indent Raised', stage: 'Indent Raised', stageId: 3, module: 'Inventory', detail: 'Critical stock indent for oncology drugs — 14 SKUs below reorder level', ref: 'IND-BPL-2026-089', ip: '10.24.8.12', status: 'Success' },
  { id: 'AUD-G-2026-0065', time: '2026-08-22 16:48:30', user: 'GOV-ADMIN-003', userName: 'CMO Office', action: 'Need Assessment Approved', stage: 'Need Identification', stageId: 1, module: 'Planning', detail: 'Quarterly need assessment for district hospitals approved', ref: 'NEED-MP-Q3-26', ip: '10.24.8.01', status: 'Success' }
];

const VENDOR_RESOURCE_DETAILS = {
  'bid-sealing': {
    title: 'Commercial Bid Sealing',
    icon: 'fa-lock',
    status: 'Sealed',
    statusClass: 'badge-info',
    summary: 'Your financial bid for TND-2026-MP-0055 is encrypted and stored separately from the technical bid until the authorized commercial opening stage.',
    stats: [
      { label: 'Tender Reference', value: 'TND-2026-MP-0055' },
      { label: 'Sealed On', value: '2026-08-20 17:30 IST' },
      { label: 'Opening Stage', value: 'Post technical qualification' },
      { label: 'Encryption', value: 'AES-256 + portal key' }
    ],
    steps: [
      'Technical bid evaluated first by the procurement committee',
      'Only technically qualified vendors proceed to commercial evaluation',
      'Financial bids are opened in a scheduled session with audit witnesses',
      'L1 / QCBS ranking computed after opening — vendors notified on portal'
    ],
    note: 'You cannot view or edit the sealed amount after submission. Contact procurement helpdesk for pre-deadline corrections only.'
  },
  'compliance-matrix': {
    title: 'Compliance Matrix',
    icon: 'fa-clipboard-list',
    status: '93% Complete',
    statusClass: 'badge-warning',
    summary: 'Map every tender requirement from the NIT/RFP to your submitted evidence. Gaps flagged before evaluation reduce disqualification risk.',
    stats: [
      { label: 'Tender', value: 'TND-2026-MP-0055' },
      { label: 'Requirements', value: '45 total' },
      { label: 'Mapped', value: '42 compliant' },
      { label: 'Pending', value: '3 clarifications' }
    ],
    rows: [
      { req: 'WHO-GMP certification', response: 'Certificate GMP/IN/2024/0892', status: 'Compliant' },
      { req: 'Minimum turnover ₹10 Cr', response: '₹12.5 Cr (FY 2025-26)', status: 'Compliant' },
      { req: 'Past supply to govt. hospitals', response: '8 years — annexure attached', status: 'Compliant' },
      { req: 'Cold chain capability', response: 'Clarification requested', status: 'Pending' },
      { req: 'EMD submission', response: 'e-BG initiated — pending', status: 'Pending' }
    ],
    note: 'Update eligibility proofs in Stage 4 if you receive clarification requests during evaluation.'
  },
  'emd-pbg': {
    title: 'EMD / Performance Bank Guarantee',
    icon: 'fa-building-columns',
    status: 'EMD Pending',
    statusClass: 'badge-warning',
    summary: 'Earnest Money Deposit (EMD) is required with bid submission. Performance Bank Guarantee (PBG) is submitted after award via SFMS/e-BG.',
    stats: [
      { label: 'EMD Amount', value: '₹3,20,000' },
      { label: 'EMD Status', value: 'Payment initiated' },
      { label: 'PBG (post-award)', value: '5–10% of contract value' },
      { label: 'PBG Channel', value: 'SFMS / e-BG portal' }
    ],
    steps: [
      'Pay EMD before bid deadline — DD, e-BG, or online transfer as per NIT',
      'EMD validity must cover evaluation period plus 45 days',
      'On award, submit PBG within LOA timeline (typically 15–21 days)',
      'PBG released after defect liability period and no-dues clearance'
    ],
    note: 'Failed EMD forfeiture applies if you withdraw after bid opening or fail to sign contract after award.'
  }
};

const VENDOR_WORKFLOW = [
  { id: 1, name: 'Registration', desc: 'Submit company profile and mandatory registration documents on the vendor portal.', status: 'done' },
  { id: 2, name: 'KYC Verification', desc: 'Complete KYC, bank account verification, and regulatory compliance checks.', status: 'done' },
  { id: 3, name: 'Vendor Approval', desc: 'Department reviews and approves vendor registration; vendor code is activated for bidding.', status: 'done' },
  { id: 4, name: 'Bid Submission', desc: 'Submit technical and financial bids with EMD before the tender deadline.', status: 'active' },
  { id: 5, name: 'Award Notification', desc: 'Receive Letter of Award (LOA) and review award terms on the portal.', status: 'pending' },
  { id: 6, name: 'Contract Execution', desc: 'Submit PBG, sign the contract agreement, and activate delivery terms.', status: 'pending' },
  { id: 7, name: 'Delivery', desc: 'Dispatch goods with challans, batch records, and required documentation.', status: 'pending' },
  { id: 8, name: 'Invoice Submission', desc: 'Raise invoice with GRN reference and delivery proof for payment processing.', status: 'pending' },
  { id: 9, name: 'Payment Tracking', desc: 'Track payment status, receive payment advice, and close the invoice cycle.', status: 'pending' }
];

const VENDORS = [
  { id: 'VND-MP-000123', name: 'MediSupply India Pvt Ltd', quality: 92, leadTime: 88, cost: 85, regulatory: 95, satisfaction: 90, overall: 90.1, status: 'Preferred', category: 'Drugs' },
  { id: 'VND-MP-000456', name: 'HealthTech Solutions', quality: 85, leadTime: 78, cost: 92, regulatory: 88, satisfaction: 82, overall: 84.8, status: 'Active', category: 'Equipment' },
  { id: 'VND-MP-000789', name: 'PharmaCare Distributors', quality: 78, leadTime: 72, cost: 88, regulatory: 80, satisfaction: 75, overall: 78.6, status: 'Active', category: 'Drugs' },
  { id: 'VND-MP-001012', name: 'BioMed Instruments', quality: 95, leadTime: 82, cost: 75, regulatory: 98, satisfaction: 88, overall: 88.4, status: 'Preferred', category: 'Equipment' },
  { id: 'VND-MP-001345', name: 'CarePlus Consumables', quality: 70, leadTime: 65, cost: 90, regulatory: 72, satisfaction: 68, overall: 72.1, status: 'Watch', category: 'Consumables' },
  { id: 'VND-MP-001678', name: 'Digital Health IT', quality: 88, leadTime: 90, cost: 80, regulatory: 92, satisfaction: 85, overall: 86.8, status: 'Active', category: 'Services' }
];

const ALERTS_GOV = [
  { id: 1, type: 'expiry', title: 'Drug License Expiring Soon', msg: 'VND-MP-000789 - Wholesale Drug License expires in 15 days', date: '2026-09-17', impact: 'Cannot participate in drug tenders', action: 'Renew license immediately', unread: true },
  { id: 2, type: 'corrigendum', title: 'Tender Corrigendum Issued', msg: 'TND-2026-MP-0042 - BOQ quantity amended for Paracetamol 500mg', date: '2026-09-01', impact: 'Bid submission deadline extended', action: 'Review and update bid', unread: true },
  { id: 3, type: 'approval', title: 'PR Pending Approval', msg: 'PR-2026-1187 - District Hospital Bhopal equipment procurement', date: '2026-09-02', impact: 'Tender cannot proceed', action: 'Review and approve PR', unread: true },
  { id: 4, type: 'quality', title: 'Quality Observation', msg: 'GRN-2026-0892 - Batch QC failed for IV Fluids', date: '2026-08-30', impact: 'Payment on hold', action: 'Initiate vendor communication', unread: true },
  { id: 5, type: 'expiry', title: 'PBG Expiry Alert', msg: 'Contract CNT-2025-0234 - Performance Bank Guarantee expires in 30 days', date: '2026-10-02', impact: 'Contract compliance risk', action: 'Request PBG renewal', unread: false },
  { id: 6, type: 'approval', title: 'Contract Milestone', msg: 'CNT-2026-0089 - Delivery milestone due in 5 days', date: '2026-09-07', impact: 'LD clause may apply', action: 'Follow up with vendor', unread: true },
  { id: 7, type: 'corrigendum', title: 'Restrictive Notice', msg: 'Vendor VND-MP-001345 suspended pending compliance review', date: '2026-08-28', impact: 'Cannot bid on new tenders', action: 'Review suspension order', unread: true }
];

const ALERTS_VENDOR = [
  { id: 1, type: 'corrigendum', title: 'Corrigendum Published', msg: 'TND-2026-MP-0042 - Technical specifications updated', date: '2026-09-01', impact: 'Update technical bid', action: 'Download corrigendum', unread: true },
  { id: 2, type: 'approval', title: 'Bid Submission Reminder', msg: 'TND-2026-MP-0055 closes in 3 days', date: '2026-09-05', impact: 'Miss deadline = rejection', action: 'Complete bid submission', unread: true },
  { id: 3, type: 'expiry', title: 'Document Expiry', msg: 'ISO 13485 certificate expires in 22 days', date: '2026-09-24', impact: 'Eligibility at risk', action: 'Upload renewed certificate', unread: true },
  { id: 4, type: 'approval', title: 'LOA Received', msg: 'TND-2026-MP-0038 - Letter of Award issued', date: '2026-08-29', impact: 'Submit PBG within 15 days', action: 'Acknowledge LOA', unread: true }
];

/** Official notices pushed from Government / Resource Manager to Vendor portal — shown as load-time modal */
const GOV_NOTICES = [
  {
    id: 'GN-2026-041',
    priority: 'critical',
    category: 'Corrigendum',
    title: 'Corrigendum — Essential Medicines Rate Contract',
    msg: 'BOQ quantity and technical specs updated for Paracetamol 500mg under TND-2026-MP-0042. Vendors must revise sealed bids before the extended deadline.',
    date: '2026-09-01',
    time: '11:20 IST',
    from: 'Procurement Cell, MP Health',
    ref: 'TND-2026-MP-0042',
    actionLabel: 'Open Tender Discovery',
    actionPage: 'tenders',
    unread: true
  },
  {
    id: 'GN-2026-038',
    priority: 'high',
    category: 'Deadline',
    title: 'Bid Closing Reminder — CT Scanner Procurement',
    msg: 'TND-2026-MP-0055 closes on 05 Sep 2026, 17:00 IST. Incomplete technical or financial bids will be rejected without further notice.',
    date: '2026-09-02',
    time: '09:00 IST',
    from: 'Tender Management Unit',
    ref: 'TND-2026-MP-0055',
    actionLabel: 'Go to Bid Submission',
    actionPage: 'bids',
    unread: true
  },
  {
    id: 'GN-2026-035',
    priority: 'high',
    category: 'Award',
    title: 'Letter of Award Issued',
    msg: 'LOA issued for Hospital Linen Supply (TND-2026-MP-0038). Acknowledge LOA and submit Performance Bank Guarantee within 15 calendar days.',
    date: '2026-08-29',
    time: '16:45 IST',
    from: 'Contract Award Committee',
    ref: 'LOA-2026-0038',
    actionLabel: 'View Contracts',
    actionPage: 'contracts',
    unread: true
  },
  {
    id: 'GN-2026-029',
    priority: 'medium',
    category: 'Compliance',
    title: 'Certificate Renewal Advisory',
    msg: 'ISO 13485 certificate for MediSupply India Pvt Ltd expires in 22 days. Upload renewed certificate under Registration / KYC to avoid eligibility blocks.',
    date: '2026-08-28',
    time: '10:15 IST',
    from: 'Vendor Registry',
    ref: 'KYC-CERT-13485',
    actionLabel: 'Open Registration',
    actionPage: 'registration',
    unread: false
  }
];

const TENDERS = [
  { id: 'TND-2026-MP-0042', title: 'Essential Medicines Rate Contract', category: 'Drugs', value: '₹12.5 Cr', status: 'Evaluation', bids: 8, deadline: '2026-09-15' },
  { id: 'TND-2026-MP-0055', title: 'CT Scanner Procurement', category: 'Equipment', value: '₹3.2 Cr', status: 'Open', bids: 4, deadline: '2026-09-05' },
  { id: 'TND-2026-MP-0038', title: 'Hospital Linen Supply', category: 'Consumables', value: '₹85 L', status: 'Awarded', bids: 12, deadline: '2026-08-20' },
  { id: 'TND-2026-MP-0061', title: 'HMIS Software Upgrade', category: 'Services', value: '₹1.8 Cr', status: 'Draft', bids: 0, deadline: '2026-10-01' },
  { id: 'TND-2026-MP-0072', title: 'Surgical Instruments Kit', category: 'Equipment', value: '₹45 L', status: 'Open', bids: 6, deadline: '2026-09-20' },
  { id: 'TND-2026-MP-0078', title: 'Paracetamol 500mg Bulk', category: 'Drugs', value: '₹2.1 Cr', status: 'Open', bids: 10, deadline: '2026-09-18' },
  { id: 'TND-2026-MP-0085', title: 'Ambulance Fleet Maintenance', category: 'Others', value: '₹32 L', status: 'Evaluation', bids: 3, deadline: '2026-09-12' },
  { id: 'TND-2026-MP-0091', title: 'Disposable Gloves Supply', category: 'Consumables', value: '₹28 L', status: 'Open', bids: 7, deadline: '2026-09-22' },
  { id: 'TND-2026-MP-0098', title: 'Oncology Drug Supply 2026', category: 'Drugs', value: '₹8.4 Cr', status: 'Awarded', bids: 15, deadline: '2026-08-10' },
  { id: 'TND-2026-MP-0102', title: 'Digital X-Ray Machines', category: 'Equipment', value: '₹2.8 Cr', status: 'Awarded', bids: 9, deadline: '2026-07-28' },
  { id: 'TND-2026-MP-0108', title: 'IV Fluid & Saline Supply', category: 'Drugs', value: '₹1.2 Cr', status: 'Open', bids: 11, deadline: '2026-09-25' },
  { id: 'TND-2026-MP-0115', title: 'Pathology Lab Reagents', category: 'Consumables', value: '₹56 L', status: 'Evaluation', bids: 5, deadline: '2026-09-14' },
  { id: 'TND-2026-MP-0120', title: 'Ambulance Vehicle Purchase', category: 'Equipment', value: '₹4.5 Cr', status: 'Draft', bids: 0, deadline: '2026-10-15' },
  { id: 'TND-2026-MP-0126', title: 'Telemedicine Platform', category: 'Services', value: '₹95 L', status: 'Open', bids: 3, deadline: '2026-09-28' },
  { id: 'TND-2026-MP-0133', title: 'Waste Management Services', category: 'Others', value: '₹42 L', status: 'Awarded', bids: 6, deadline: '2026-08-05' },
  { id: 'TND-2026-MP-0140', title: 'Insulin & Diabetic Care Kit', category: 'Drugs', value: '₹3.6 Cr', status: 'Evaluation', bids: 7, deadline: '2026-09-16' },
  { id: 'TND-2026-MP-0147', title: 'Patient Monitoring Systems', category: 'Equipment', value: '₹1.1 Cr', status: 'Open', bids: 8, deadline: '2026-09-30' },
  { id: 'TND-2026-MP-0154', title: 'CSSD Sterilization Supply', category: 'Consumables', value: '₹38 L', status: 'Draft', bids: 0, deadline: '2026-10-08' },
  { id: 'TND-2026-MP-0161', title: 'Hospital Security Services', category: 'Services', value: '₹72 L', status: 'Awarded', bids: 4, deadline: '2026-07-20' },
  { id: 'TND-2026-MP-0168', title: 'Medical Oxygen Plant O&M', category: 'Others', value: '₹1.5 Cr', status: 'Open', bids: 5, deadline: '2026-10-05' }
];

const VENDOR_REGISTRATIONS = [
  { id: 'REG-2026-0891', name: 'Sunrise Pharma Ltd', category: 'Drugs', kyc: 'Verified', documents: 'Complete', submitted: '2026-08-28' },
  { id: 'REG-2026-0892', name: 'MedEquip Solutions', category: 'Equipment', kyc: 'Pending', documents: '3/5 uploaded', submitted: '2026-08-30' },
  { id: 'REG-2026-0893', name: 'CleanCare Supplies', category: 'Consumables', kyc: 'Verified', documents: 'Complete', submitted: '2026-09-01' },
  { id: 'REG-2026-0894', name: 'TechHealth IT', category: 'Services', kyc: 'In Review', documents: '4/6 uploaded', submitted: '2026-09-02' },
  { id: 'REG-2026-0895', name: 'Apex Surgical India', category: 'Equipment', kyc: 'Verified', documents: 'Complete', submitted: '2026-09-02' },
  { id: 'REG-2026-0896', name: 'GenericMed Corp', category: 'Drugs', kyc: 'Pending', documents: '2/5 uploaded', submitted: '2026-09-03' },
  { id: 'REG-2026-0897', name: 'LabPro Reagents', category: 'Others', kyc: 'In Review', documents: '3/6 uploaded', submitted: '2026-09-03' },
  { id: 'REG-2026-0898', name: 'SafeHands Consumables', category: 'Consumables', kyc: 'Pending', documents: '1/5 uploaded', submitted: '2026-09-04' },
  { id: 'REG-2026-0899', name: 'CloudCare Systems', category: 'Services', kyc: 'Verified', documents: 'Complete', submitted: '2026-09-04' },
  { id: 'REG-2026-0900', name: 'MediTrans Logistics', category: 'Others', kyc: 'Pending', documents: '2/5 uploaded', submitted: '2026-09-05' }
];

const BIDS = [
  { tenderId: 'TND-2026-MP-0055', category: 'Equipment', technical: 'Complete', financial: 'Sealed', emd: 'Pending', deadline: '2026-09-05', status: 'Draft' },
  { tenderId: 'TND-2026-MP-0042', category: 'Drugs', technical: 'Submitted', financial: 'Submitted', emd: 'Paid', deadline: '2026-09-15', status: 'Under Evaluation' },
  { tenderId: 'TND-2026-MP-0061', category: 'Services', technical: 'In Progress', financial: 'Sealed', emd: 'Pending', deadline: '2026-10-01', status: 'Draft' },
  { tenderId: 'TND-2026-MP-0078', category: 'Drugs', technical: 'Complete', financial: 'Sealed', emd: 'Paid', deadline: '2026-09-18', status: 'Draft' },
  { tenderId: 'TND-2026-MP-0091', category: 'Consumables', technical: 'Submitted', financial: 'Submitted', emd: 'Paid', deadline: '2026-09-22', status: 'Under Evaluation' }
];

const CONTRACTS = [
  { id: 'CNT-2026-0089', tenderId: 'TND-2026-MP-0038', category: 'Consumables', value: '₹85 L', pbg: 'Active', delivery: 'Milestone due in 5 days', status: 'In Progress' },
  { id: 'CNT-2025-0234', tenderId: 'TND-2025-MP-0198', category: 'Drugs', value: '₹3.35 Cr', pbg: 'Expiring', delivery: 'Completed', status: 'Active' },
  { id: 'CNT-2026-0095', tenderId: 'TND-2026-MP-0061', category: 'Services', value: '₹1.8 Cr', pbg: 'Active', delivery: 'Go-Live in 30 days', status: 'In Progress' }
];

const CLARIFICATIONS = [
  { id: 'CL-0891', tenderId: 'TND-2026-MP-0055', category: 'Equipment', subject: 'Technical spec clarification', status: 'Answered', response: 'View' },
  { id: 'CL-0892', tenderId: 'TND-2026-MP-0042', category: 'Drugs', subject: 'BOQ quantity amendment', status: 'Corrigendum Issued', response: 'View' },
  { id: 'CL-0893', tenderId: 'TND-2026-MP-0061', category: 'Services', subject: 'SLA uptime requirement', status: 'Pending', response: '—' }
];

const DELIVERIES = [
  { id: 'DEL-2026-0456', po: 'PO-2026-0089', category: 'Consumables', items: 'Hospital Linen - Batch 3', grn: 'Accepted', invoice: 'INV-0892', payment: 'Processing' },
  { id: 'DEL-2026-0457', po: 'PO-2025-0234', category: 'Drugs', items: 'Essential Medicines Q3', grn: 'Accepted', invoice: 'INV-0893', payment: 'Paid' },
  { id: 'DEL-2026-0458', po: 'PO-2026-0095', category: 'Services', items: 'HMIS Module - Phase 1', grn: 'Pending', invoice: '—', payment: '—' }
];

const TOR_ENTRIES = [
  { id: 'TOR-2026-0042', tenderId: 'TND-2026-MP-0042', category: 'Drugs', coverage: '92%', flags: 2, status: 'Review' },
  { id: 'TOR-2026-0055', tenderId: 'TND-2026-MP-0055', category: 'Equipment', coverage: '100%', flags: 0, status: 'Approved' },
  { id: 'TOR-2026-0061', tenderId: 'TND-2026-MP-0061', category: 'Services', coverage: '78%', flags: 2, status: 'Blocked' },
  { id: 'TOR-2026-0085', tenderId: 'TND-2026-MP-0085', category: 'Others', coverage: '85%', flags: 1, status: 'Review' }
];

const CATEGORY_WEIGHTS = {
  All: 1,
  Drugs: 0.42,
  Equipment: 0.28,
  Services: 0.15,
  Consumables: 0.10,
  Others: 0.05
};

const MASTER_DATA_COUNTS = {
  Drugs: 248,
  Equipment: 156,
  Services: 89,
  Consumables: 312,
  Others: 45
};

const NAV_GOV = [
  { section: 'Overview' },
  { id: 'dashboard', icon: 'fa-chart-line', label: 'Analytics Dashboard', badge: 0 },
  { section: 'Procurement Lifecycle' },
  { id: 'workflow', icon: 'fa-arrows-rotate', label: 'Need Identification to Pay', badge: 3 },
  { id: 'vendor-reg', icon: 'fa-clipboard-list', label: 'Vendor Registration', badge: 10 },
  { id: 'sourcing', icon: 'fa-bullseye', label: 'Sourcing & Award', badge: 0 },
  { section: 'Operations' },
  { id: 'work-queue', icon: 'fa-bell', label: 'Alerts & Work Queue', badge: 0 },
  { id: 'sla-desk', icon: 'fa-headset', label: 'SLA Communication', badge: 0 },
  { section: 'Performance' },
  { id: 'vendor-matrix', icon: 'fa-chart-bar', label: 'Vendor Performance Matrix', badge: 0 },
  { id: 'reports', icon: 'fa-file-lines', label: 'Reports & Analytics', badge: 0 },
  { id: 'settings', icon: 'fa-gear', label: 'Settings & Branding', badge: 0 }
];

const NAV_VENDOR = [
  { section: 'Overview' },
  { id: 'dashboard', icon: 'fa-chart-line', label: 'My Dashboard', badge: 0 },
  { section: 'Vendor Lifecycle' },
  { id: 'workflow', icon: 'fa-arrows-rotate', label: 'Registration', badge: 0 },
  { id: 'registration', icon: 'fa-id-card', label: 'Profile & KYC', badge: 0 },
  { id: 'tenders', icon: 'fa-magnifying-glass', label: 'Tender Discovery', badge: 0 },
  { id: 'bids', icon: 'fa-paper-plane', label: 'Bid Submission', badge: 0 },
  { id: 'clarifications', icon: 'fa-comments', label: 'Clarifications', badge: 0 },
  { id: 'work-queue', icon: 'fa-bell', label: 'Alerts & Work Queue', badge: 0 },
  { section: 'Execution' },
  { id: 'contracts', icon: 'fa-file-contract', label: 'Contracts & POs', badge: 0 },
  { id: 'delivery', icon: 'fa-truck', label: 'Delivery & Invoices', badge: 0 },
  { id: 'sla-desk', icon: 'fa-headset', label: 'SLA Communication', badge: 0 },
  { id: 'performance', icon: 'fa-star', label: 'Performance Score', badge: 0 },
  { section: 'Analytics' },
  { id: 'reports', icon: 'fa-file-lines', label: 'My Reports', badge: 0 }
];

/** Vendor Alerts & Work Queue — severity-grouped actionable items */
const VENDOR_WORK_QUEUE = [
  {
    id: 'WQ-001',
    category: 'sla',
    severity: 'high',
    unread: true,
    title: 'Response Time SLA breach needs disposition',
    detail: 'CNT-2026-0089 — Owner: Contract Manager — Cure ends 13-09-2026',
    timeline: 'Today',
    owner: 'Contract Manager',
    ref: 'CNT-2026-0089',
    actionPage: 'sla-desk'
  },
  {
    id: 'WQ-002',
    category: 'payments',
    severity: 'high',
    unread: true,
    title: 'Invoice INV-0892 is awaiting finance verification',
    detail: '₹4,25,000 — Owner: GM Finance — Delivery proof attached',
    timeline: 'Today',
    owner: 'GM Finance',
    ref: 'INV-0892',
    actionPage: 'delivery'
  },
  {
    id: 'WQ-003',
    category: 'milestones',
    severity: 'medium',
    unread: true,
    title: 'Contract CNT-2025-0234 PBG renewal decision is due',
    detail: 'Vendor: MediSupply India — PBG status: Expiring',
    timeline: '30 days',
    owner: 'Contract Manager',
    ref: 'CNT-2025-0234',
    actionPage: 'contracts'
  },
  {
    id: 'WQ-004',
    category: 'milestones',
    severity: 'medium',
    unread: true,
    title: 'Bid deadline approaching for CT Scanner Procurement',
    detail: 'TND-2026-MP-0055 closes 05-09-2026 17:00 IST',
    timeline: '2 days',
    owner: 'Vendor',
    ref: 'TND-2026-MP-0055',
    actionPage: 'bids'
  },
  {
    id: 'WQ-005',
    category: 'system',
    severity: 'info',
    unread: true,
    title: 'ISO 13485 certificate uploaded — awaiting verification',
    detail: 'Uploaded by MediSupply India — Version 1 — Vendor Registry',
    timeline: '2 days',
    owner: 'Vendor Registry',
    ref: 'KYC-CERT-13485',
    actionPage: 'registration'
  },
  {
    id: 'WQ-006',
    category: 'sla',
    severity: 'medium',
    unread: false,
    title: 'Delivery milestone SLA — linen batch 3 dispatch window',
    detail: 'CNT-2026-0089 — Owner: Stores Officer — Expected within contract schedule',
    timeline: '5 days',
    owner: 'Stores Officer',
    ref: 'CNT-2026-0089',
    actionPage: 'sla-desk'
  },
  {
    id: 'WQ-007',
    category: 'payments',
    severity: 'info',
    unread: false,
    title: 'Payment advice generated for INV-0893',
    detail: 'Essential Medicines Q3 — Status: Paid — HDFC ****4567',
    timeline: '7 days',
    owner: 'GM Finance',
    ref: 'INV-0893',
    actionPage: 'delivery'
  },
  {
    id: 'WQ-008',
    category: 'system',
    severity: 'info',
    unread: false,
    title: 'Corrigendum published for Essential Medicines Rate Contract',
    detail: 'TND-2026-MP-0042 — Technical specs updated — Review before evaluation close',
    timeline: 'Read',
    owner: 'Procurement Cell',
    ref: 'TND-2026-MP-0042',
    actionPage: 'tenders'
  }
];

/** Resource Manager — Alerts & Work Queue (aligned with Analytics action queue) */
const GOV_WORK_QUEUE = [
  {
    id: 'GWQ-001',
    category: 'sla',
    severity: 'high',
    unread: true,
    title: 'Vendor SLA breach — response overdue',
    detail: 'MediSupply India · CNT-2026-0089 · 48-hour response window exceeded',
    timeline: 'Today',
    owner: 'Contract Manager',
    ref: 'SLA-2026-014',
    actionPage: 'sla-desk'
  },
  {
    id: 'GWQ-002',
    category: 'approvals',
    severity: 'high',
    unread: true,
    title: 'Financial sanction pending — Oncology Drug Top-up',
    detail: 'PR-2026-1220 · Drugs · ₹2.8 Cr · Owner: GM Finance · 6 days',
    timeline: 'Today',
    owner: 'GM Finance',
    ref: 'PR-2026-1220',
    actionPage: 'sourcing'
  },
  {
    id: 'GWQ-003',
    category: 'payments',
    severity: 'high',
    unread: true,
    title: 'Payment delay — PharmaCare invoice overdue',
    detail: 'INV-0901 · ₹48.0 L · 8 days overdue · GRN batch discrepancy',
    timeline: 'Today',
    owner: 'GM Finance',
    ref: 'INV-0901',
    actionPage: 'sourcing'
  },
  {
    id: 'GWQ-004',
    category: 'tenders',
    severity: 'medium',
    unread: true,
    title: 'Open tender evaluation due — CT Scanner',
    detail: 'TND-2026-MP-0055 · Equipment · 4 bids · Deadline 05-09-2026',
    timeline: '2 days',
    owner: 'Technical Committee',
    ref: 'TND-2026-MP-0055',
    actionPage: 'sourcing'
  },
  {
    id: 'GWQ-005',
    category: 'vendors',
    severity: 'medium',
    unread: true,
    title: 'Vendor KYC pending review',
    detail: 'MedEquip Solutions · Equipment · 3/5 documents uploaded',
    timeline: '2 days',
    owner: 'Vendor Registry',
    ref: 'REG-2026-0892',
    actionPage: 'vendor-reg'
  },
  {
    id: 'GWQ-006',
    category: 'approvals',
    severity: 'medium',
    unread: false,
    title: 'Administrative approval — CT Scanner Replacement',
    detail: 'PR-2026-1190 · Equipment · ₹3.2 Cr · 5 days in queue',
    timeline: '5 days',
    owner: 'Director Procurement',
    ref: 'PR-2026-1190',
    actionPage: 'sourcing'
  },
  {
    id: 'GWQ-007',
    category: 'sla',
    severity: 'medium',
    unread: false,
    title: 'Vendor escalation — invoice verification delay',
    detail: 'SLA-2026-011 · MediSupply India · INV-0892 · In progress',
    timeline: '3 days',
    owner: 'GM Finance',
    ref: 'SLA-2026-011',
    actionPage: 'sla-desk'
  },
  {
    id: 'GWQ-008',
    category: 'tenders',
    severity: 'info',
    unread: false,
    title: 'Corrigendum issued — Essential Medicines RC',
    detail: 'TND-2026-MP-0042 · Drugs · BOQ amendment published',
    timeline: 'Read',
    owner: 'Procurement Cell',
    ref: 'TND-2026-MP-0042',
    actionPage: 'sourcing'
  }
];

/** Internal gov response chain for SLA desk (vendor-facing) */
const GOV_SLA_HIERARCHY = [
  { level: 1, role: 'Stores Officer', org: 'Receiving Facility', sla: 'Acknowledge vendor delivery queries within 24 hrs', contact: 'stores.bhopal@mphp.gov.in' },
  { level: 2, role: 'Contract Manager', org: 'Procurement Cell', sla: 'Respond to vendor SLA threads within 5 working days', contact: 'contracts@mphp.gov.in' },
  { level: 3, role: 'GM Finance', org: 'Finance Wing', sla: 'Clear invoice / payment escalations within 7 working days', contact: 'finance.gm@mphp.gov.in' },
  { level: 4, role: 'Director (Procurement)', org: 'DoPHFW, GoMP', sla: 'Critical vendor escalations within 10 working days', contact: 'dir.proc@mphp.gov.in' }
];

/** SLA hierarchy — vendor ↔ government escalation chain communication */
const SLA_HIERARCHY = [
  { level: 1, role: 'Stores Officer', org: 'Receiving Facility', sla: 'Acknowledge delivery queries within 24 hrs', contact: 'stores.bhopal@mphp.gov.in' },
  { level: 2, role: 'Contract Manager', org: 'MP Health Procurement', sla: 'Resolve contract/SLA disputes within 5 working days', contact: 'contracts@mphp.gov.in' },
  { level: 3, role: 'GM Finance', org: 'Finance Wing', sla: 'Payment / invoice escalations within 7 working days', contact: 'finance.gm@mphp.gov.in' },
  { level: 4, role: 'Director (Procurement)', org: 'DoPHFW, GoMP', sla: 'Critical escalations within 10 working days', contact: 'dir.proc@mphp.gov.in' }
];

const SLA_THREADS = [
  {
    id: 'SLA-2026-014',
    subject: 'Response Time SLA breach — CNT-2026-0089',
    contractId: 'CNT-2026-0089',
    level: 2,
    status: 'Open',
    priority: 'High',
    lastUpdate: '03-09-2026',
    messages: [
      { from: 'vendor', name: 'MediSupply India', role: 'Vendor', time: '02-09-2026 14:20', text: 'We raised a dispatch clarification on 28-08-2026. No response received within the 48-hour SLA. Requesting Contract Manager intervention.' },
      { from: 'gov', name: 'Rohit Sharma', role: 'Contract Manager', time: '02-09-2026 17:05', text: 'Acknowledged. Stores Officer has been notified. Please share LR copy and expected delivery date for cure plan.' },
      { from: 'vendor', name: 'MediSupply India', role: 'Vendor', time: '03-09-2026 09:40', text: 'LR-88912 attached via Delivery stage. Expected delivery 06-09-2026. Kindly confirm SLA cure clock pause.' }
    ]
  },
  {
    id: 'SLA-2026-011',
    subject: 'Invoice verification delay — INV-0892',
    contractId: 'CNT-2026-0089',
    level: 3,
    status: 'In Progress',
    priority: 'Medium',
    lastUpdate: '01-09-2026',
    messages: [
      { from: 'vendor', name: 'MediSupply India', role: 'Vendor', time: '30-08-2026 11:10', text: 'Invoice INV-0892 submitted with GRN reference. Payment status still under verification beyond stated timeline.' },
      { from: 'gov', name: 'Ananya Gupta', role: 'GM Finance', time: '01-09-2026 16:30', text: 'Three-way match in progress. Finance will update within 2 working days.' }
    ]
  },
  {
    id: 'SLA-2026-008',
    subject: 'PBG acknowledgement pending — CNT-2025-0234',
    contractId: 'CNT-2025-0234',
    level: 2,
    status: 'Resolved',
    priority: 'Low',
    lastUpdate: '25-08-2026',
    messages: [
      { from: 'vendor', name: 'MediSupply India', role: 'Vendor', time: '20-08-2026 10:00', text: 'Renewed PBG uploaded. Request acknowledgement to avoid contract compliance flag.' },
      { from: 'gov', name: 'Rohit Sharma', role: 'Contract Manager', time: '25-08-2026 12:15', text: 'PBG verified via SFMS. Ticket closed. Thank you.' }
    ]
  }
];

const PERF_METRICS = [
  { key: 'quality', label: 'Quality', weight: 30, icon: 'fa-award', color: '#0d47a1' },
  { key: 'leadTime', label: 'Lead Time', weight: 20, icon: 'fa-clock', color: '#00897b' },
  { key: 'cost', label: 'Cost', weight: 20, icon: 'fa-indian-rupee-sign', color: '#f57c00' },
  { key: 'regulatory', label: 'Regulatory', weight: 20, icon: 'fa-shield-halved', color: '#7b1fa2' },
  { key: 'satisfaction', label: 'User Satisfaction', weight: 10, icon: 'fa-face-smile', color: '#d32f2f' }
];

const CHART_DATA = {
  spend: {
    year: { labels: ['FY16-17', 'FY17-18', 'FY18-19', 'FY19-20', 'FY20-21', 'FY21-22', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'], data: [98, 112, 125, 138, 142, 155, 168, 185, 198, 215] },
    quarter: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: [48, 52, 58, 57] },
    month: { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], data: [16, 18, 14, 19, 17, 15, 18, 20, 16, 14, 17, 19] }
  },
  procurement: {
    year: { labels: ['FY16-17', 'FY17-18', 'FY18-19', 'FY19-20', 'FY20-21', 'FY21-22', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'], data: [62, 71, 78, 85, 90, 96, 102, 112, 124, 134] },
    quarter: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: [28, 32, 38, 36] },
    month: { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], data: [9, 11, 8, 12, 10, 9, 11, 13, 10, 8, 10, 12] }
  },
  vendorPerf: {
    year: { labels: ['FY16-17', 'FY17-18', 'FY18-19', 'FY19-20', 'FY20-21', 'FY21-22', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'], data: [72, 74, 76, 78, 79, 81, 82, 84, 86, 88] },
    quarter: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: [85, 87, 88, 90] },
    month: { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], data: [86, 87, 88, 89, 88, 90, 89, 91, 90, 88, 89, 92] }
  },
  savings: {
    year: { labels: ['FY16-17', 'FY17-18', 'FY18-19', 'FY19-20', 'FY20-21', 'FY21-22', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'], data: [6, 8, 9, 11, 12, 14, 15, 17, 19, 22] },
    quarter: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: [5, 6, 5.5, 5.5] },
    month: { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], data: [1.8, 1.6, 1.7, 1.9, 1.8, 1.7, 1.9, 2.0, 1.8, 1.6, 1.8, 2.1] }
  },
  categorySpend: {
    labels: ['Drugs', 'Equipment', 'Services', 'Consumables', 'Others'],
    data: [42, 28, 15, 10, 5],
    unit: '%',
    description: 'Share of total procurement spend by category'
  },
  /** Item-wise comparison mock (category items) */
  itemCompare: {
    labels: ['Paracetamol 500mg', 'CT Scanner', 'Hospital Linen', 'HMIS Module', 'IV Fluids'],
    quality: [92, 88, 85, 90, 87],
    leadTime: [86, 78, 91, 84, 80],
    cost: [81, 75, 88, 79, 83]
  },
  /** Tender pipeline progress — processed / pending / delayed */
  tenderProgress: {
    year: {
      labels: ['FY16-17', 'FY17-18', 'FY18-19', 'FY19-20', 'FY20-21', 'FY21-22', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'],
      processed: [88, 95, 102, 108, 115, 122, 128, 135, 142, 148],
      pending: [24, 22, 20, 19, 18, 17, 16, 15, 14, 12],
      delayed: [14, 13, 12, 11, 10, 9, 8, 7, 6, 5]
    },
    quarter: {
      labels: ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'],
      processed: [32, 36, 39, 41],
      pending: [10, 9, 8, 7],
      delayed: [5, 4, 4, 3]
    },
    month: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      processed: [10, 11, 11, 12, 12, 12, 13, 13, 14, 13, 14, 15],
      pending: [3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1],
      delayed: [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    }
  }
};

const ANALYTICS_QUARTER_OPTIONS = [
  { id: 'Q1', label: 'Q1', range: 'Jan–Mar' },
  { id: 'Q2', label: 'Q2', range: 'Apr–Jun' },
  { id: 'Q3', label: 'Q3', range: 'Jul–Sep' },
  { id: 'Q4', label: 'Q4', range: 'Oct–Dec' }
];

const ANALYTICS_MONTH_OPTIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ANALYTICS_FY_OPTIONS = [
  'all',
  'FY16-17', 'FY17-18', 'FY18-19', 'FY19-20', 'FY20-21',
  'FY21-22', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'
];

const SCORE_WEIGHTS = [
  { label: 'Quality', weight: 30 },
  { label: 'Lead Time', weight: 20 },
  { label: 'Cost', weight: 20 },
  { label: 'Regulatory', weight: 20 },
  { label: 'User Satisfaction', weight: 10 }
];

/** Item / drug types by category — used in analytics drill-downs */
const CATEGORY_ITEM_TYPES = {
  Drugs: [
    { name: 'Paracetamol 500mg', type: 'Analgesic', tenders: 2, spend: '₹2.1 Cr', facilities: 48 },
    { name: 'Oncology Drug Pack', type: 'Oncology', tenders: 1, spend: '₹8.4 Cr', facilities: 12 },
    { name: 'IV Fluids & Saline', type: 'Infusion', tenders: 1, spend: '₹1.2 Cr', facilities: 62 },
    { name: 'Insulin & Diabetic Care', type: 'Chronic Care', tenders: 1, spend: '₹3.6 Cr', facilities: 35 },
    { name: 'Essential Medicines RC', type: 'Formulary', tenders: 1, spend: '₹12.5 Cr', facilities: 90 }
  ],
  Equipment: [
    { name: 'CT Scanner', type: 'Imaging', tenders: 1, spend: '₹3.2 Cr', facilities: 4 },
    { name: 'Digital X-Ray', type: 'Imaging', tenders: 1, spend: '₹2.8 Cr', facilities: 8 },
    { name: 'Patient Monitors', type: 'Critical Care', tenders: 1, spend: '₹1.1 Cr', facilities: 22 },
    { name: 'Surgical Instruments', type: 'OT', tenders: 1, spend: '₹45 L', facilities: 18 }
  ],
  Services: [
    { name: 'HMIS Upgrade', type: 'IT', tenders: 1, spend: '₹1.8 Cr', facilities: 51 },
    { name: 'Telemedicine Platform', type: 'Digital Health', tenders: 1, spend: '₹95 L', facilities: 30 },
    { name: 'Hospital Security', type: 'Facility', tenders: 1, spend: '₹72 L', facilities: 14 }
  ],
  Consumables: [
    { name: 'Hospital Linen', type: 'Textile', tenders: 1, spend: '₹85 L', facilities: 40 },
    { name: 'Disposable Gloves', type: 'PPE', tenders: 1, spend: '₹28 L', facilities: 75 },
    { name: 'Pathology Reagents', type: 'Lab', tenders: 1, spend: '₹56 L', facilities: 20 }
  ],
  Others: [
    { name: 'Ambulance Fleet O&M', type: 'Transport', tenders: 1, spend: '₹32 L', facilities: 16 },
    { name: 'Medical Oxygen Plant', type: 'Infrastructure', tenders: 1, spend: '₹1.5 Cr', facilities: 6 },
    { name: 'Waste Management', type: 'Facility', tenders: 1, spend: '₹42 L', facilities: 25 }
  ]
};

const PENDING_APPROVALS = [
  { id: 'PR-2026-1182', title: 'Essential Medicines Indent — Bhopal', category: 'Drugs', stage: 'Financial Sanction', amount: '₹4.2 Cr', age: '3 days', owner: 'GM Finance' },
  { id: 'PR-2026-1190', title: 'CT Scanner Replacement', category: 'Equipment', stage: 'Administrative Approval', amount: '₹3.2 Cr', age: '5 days', owner: 'Director Procurement' },
  { id: 'PR-2026-1194', title: 'IV Fluids Bulk Indent', category: 'Drugs', stage: 'Budget Head Check', amount: '₹1.1 Cr', age: '1 day', owner: 'Stores Officer' },
  { id: 'PR-2026-1201', title: 'HMIS Phase-2 Budget', category: 'Services', stage: 'Financial Sanction', amount: '₹95 L', age: '7 days', owner: 'GM Finance' },
  { id: 'PR-2026-1208', title: 'PPE Consumables Q3', category: 'Consumables', stage: 'CMO Approval', amount: '₹28 L', age: '2 days', owner: 'CMO Indore' },
  { id: 'PR-2026-1215', title: 'Oxygen Plant O&M Renewal', category: 'Others', stage: 'Contract Review', amount: '₹1.5 Cr', age: '4 days', owner: 'Legal Cell' },
  { id: 'PR-2026-1220', title: 'Oncology Drug Top-up', category: 'Drugs', stage: 'Financial Sanction', amount: '₹2.8 Cr', age: '6 days', owner: 'GM Finance' },
  { id: 'PR-2026-1224', title: 'Patient Monitor Cluster', category: 'Equipment', stage: 'Technical Vetting', amount: '₹1.1 Cr', age: '2 days', owner: 'Biomedical Engg' }
];

const PAYMENT_DELAYS = [
  { id: 'INV-0892', vendor: 'MediSupply India', category: 'Consumables', amount: '₹12.4 L', daysOverdue: 12, reason: 'Three-way match pending', contractId: 'CNT-2026-0089' },
  { id: 'INV-0901', vendor: 'PharmaCare Distributors', category: 'Drugs', amount: '₹48.0 L', daysOverdue: 8, reason: 'GRN batch discrepancy', contractId: 'CNT-2025-0234' },
  { id: 'INV-0910', vendor: 'MedEquip Solutions', category: 'Equipment', amount: '₹6.5 L', daysOverdue: 5, reason: 'PBG verification hold', contractId: 'CNT-2026-0095' },
  { id: 'INV-0918', vendor: 'CleanCare Supplies', category: 'Consumables', amount: '₹3.2 L', daysOverdue: 15, reason: 'Invoice vs PO mismatch', contractId: 'CNT-2026-0089' },
  { id: 'INV-0925', vendor: 'GenericMed Corp', category: 'Drugs', amount: '₹22.1 L', daysOverdue: 3, reason: 'Finance queue', contractId: 'CNT-2025-0234' },
  { id: 'INV-0930', vendor: 'TechHealth IT', category: 'Services', amount: '₹9.8 L', daysOverdue: 9, reason: 'Milestone acceptance pending', contractId: 'CNT-2026-0095' }
];

const DISTRICT_SPEND = [
  { district: 'Bhopal', facility: 'Gandhi Medical College', drugs: 18.2, equipment: 9.4, services: 4.1, consumables: 3.2, others: 1.5 },
  { district: 'Indore', facility: 'M.Y. Hospital', drugs: 16.8, equipment: 11.2, services: 3.8, consumables: 2.9, others: 1.2 },
  { district: 'Jabalpur', facility: 'NSCB Medical College', drugs: 12.4, equipment: 7.6, services: 2.9, consumables: 2.1, others: 0.9 },
  { district: 'Gwalior', facility: 'GR Medical College', drugs: 11.1, equipment: 6.8, services: 2.5, consumables: 1.8, others: 0.8 },
  { district: 'Rewa', facility: 'Sanjay Gandhi Hospital', drugs: 8.6, equipment: 5.2, services: 2.1, consumables: 1.5, others: 0.6 }
];
