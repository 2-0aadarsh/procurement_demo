/* Mock Data for MP Health Procurement Prototype */

const CATEGORIES = ['All', 'Drugs', 'Equipment', 'Services', 'Consumables', 'Others'];

const GOV_WORKFLOW = [
  { id: 1, name: 'Need Identification', desc: 'Departments assess stock levels, patient load, disease burden and gap analysis to determine requirements.', status: 'done' },
  { id: 2, name: 'Indent Raised', desc: 'Store Manager searches stock, checks open orders, raises indent only if stock unavailable.', status: 'done' },
  { id: 3, name: 'Stock Check', desc: 'Verify existing warehouse stock, other locations, approved open POs, and redistributable inventory.', status: 'done' },
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
  2: ['Bank account verification (cancelled cheque)', 'KYC documents & regulatory licenses', 'Address proof & signatory ID', 'Respond to verification queries'],
  3: ['Confirm vendor code (e.g. VND-MP-000123)', 'Link code to portal profile', 'Update profile if business details change'],
  4: ['Turnover & experience certificates', 'Compliance matrix vs tender criteria', 'Blacklist / debarment self-declaration', 'Category certifications (GMP, ISO, etc.)'],
  5: ['Technical bid documents uploaded', 'Financial bid sealed separately', 'EMD paid (₹3,20,000 for current tender)', 'Submission receipt confirmed before deadline'],
  6: ['Respond to evaluation clarifications', 'Attend technical presentation if scheduled', 'Monitor evaluation status on portal'],
  7: ['Acknowledge Letter of Award (LOA)', 'Submit Performance Bank Guarantee', 'Sign contract agreement'],
  8: ['Dispatch with delivery challan', 'Batch / serial & expiry documentation', 'Cold chain logs (if applicable)'],
  9: ['Support inspection & quality testing', 'Meet SLA / warranty obligations', 'Rectify observations within timeline'],
  10: ['Raise invoice with GRN reference', 'Attach delivery & acceptance proof', 'Track payment status'],
  11: ['Review weighted performance score', 'Quality, lead time, cost, regulatory metrics', 'Maintain Preferred Vendor status (≥85)'],
  12: ['PBG release after defect liability', 'No-dues certificate & closure', 'Renew or re-register for new cycles']
};

const GOV_STAGE_CHECKLIST = {
  1: ['Assess stock levels & patient load', 'Gap analysis by facility', 'Disease burden review'],
  2: ['Search existing stock & open orders', 'Raise indent if unavailable', 'CMO / competent authority approval'],
  3: ['Warehouse stock verification', 'Inter-facility redistribution check', 'Open PO & redistributable inventory'],
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
  4: 'Build your compliance matrix against the NIT/RFP before bidding.',
  5: 'You can revisit Stages 1–4 to update documents if your profile changed before bid submission.',
  7: 'Submit PBG (5–10% of contract value) via SFMS/e-BG within the LOA timeline.',
  11: 'Preferred vendor status is awarded at weighted score ≥ 85.'
};

const GOV_STAGE_TIPS = {
  4: 'Optimize from warehouse and inter-facility stock before fresh procurement.',
  7: 'Contract approval must precede PO generation per policy.',
  8: 'Commercial bids open only for technically qualified vendors.',
  12: 'Three-way match: PO, GRN, and Invoice before payment release.'
};

const AUDIT_TRAIL_VENDOR = [
  { id: 'AUD-V-2026-0142', time: '2026-09-04 14:32:10', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Bid Draft Saved', stage: 'Bid Submission', stageId: 5, module: 'Vendor Lifecycle', detail: 'Technical bid documents updated for TND-2026-MP-0055', ref: 'TND-2026-MP-0055', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0141', time: '2026-09-04 11:05:44', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'EMD Payment Initiated', stage: 'Bid Submission', stageId: 5, module: 'Payments', detail: 'EMD of ₹3,20,000 initiated via e-BG portal — pending bank confirmation', ref: 'EMD-TND-0055', ip: '103.24.18.92', status: 'Pending' },
  { id: 'AUD-V-2026-0138', time: '2026-09-03 16:18:22', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Eligibility Proofs Updated', stage: 'Eligibility Validation', stageId: 4, module: 'Vendor Lifecycle', detail: 'ISO 13485 certificate and turnover statement uploaded', ref: 'ELG-2026-089', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0135', time: '2026-09-02 09:41:03', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Compliance Matrix Saved', stage: 'Eligibility Validation', stageId: 4, module: 'Tender Response', detail: '42 of 45 NIT requirements mapped — 3 pending clarifications', ref: 'CMX-TND-0055', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0129', time: '2026-08-28 14:22:51', user: 'SYSTEM', userName: 'MP Health Portal', action: 'Vendor Code Assigned', stage: 'Vendor Code', stageId: 3, module: 'Vendor Registry', detail: 'Unique vendor code VND-MP-000123 generated and linked to profile', ref: 'VND-MP-000123', ip: '10.0.0.1', status: 'Success' },
  { id: 'AUD-V-2026-0124', time: '2026-08-27 11:07:33', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'KYC Verified', stage: 'KYC & Bank Verification', stageId: 2, module: 'Vendor Lifecycle', detail: 'Bank account HDFC ****4567 verified; drug license DL-MH-2024-0892 validated', ref: 'KYC-2026-441', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0120', time: '2026-08-26 15:55:18', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'KYC Documents Uploaded', stage: 'KYC & Bank Verification', stageId: 2, module: 'Vendor Lifecycle', detail: 'Cancelled cheque, address proof, and signatory ID submitted', ref: 'KYC-2026-441', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0115', time: '2026-08-25 10:12:40', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Registration Submitted', stage: 'Registration', stageId: 1, module: 'Vendor Lifecycle', detail: 'Company profile, GSTIN 23AABCM1234A1Z5, PAN AABCM1234A registered', ref: 'REG-2026-1187', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0114', time: '2026-08-25 10:08:22', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Profile Created', stage: 'Registration', stageId: 1, module: 'Authentication', detail: 'Vendor portal account created — email verified', ref: 'USR-VND-8891', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0108', time: '2026-08-20 17:30:00', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Financial Bid Sealed', stage: 'Bid Submission', stageId: 5, module: 'Bid Management', detail: 'Commercial bid encrypted and sealed — opening scheduled post technical evaluation', ref: 'BID-FIN-0055', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0102', time: '2026-08-15 09:00:00', user: 'SYSTEM', userName: 'MP Health Portal', action: 'Session Login', stage: 'Registration', stageId: 1, module: 'Authentication', detail: 'Successful login from registered device', ref: 'SES-99201', ip: '103.24.18.92', status: 'Success' }
];

const AUDIT_TRAIL_GOV = [
  { id: 'AUD-G-2026-0088', time: '2026-09-04 15:10:22', user: 'GOV-PROC-014', userName: 'Dr. Sharma (Procurement)', action: 'Evaluation Committee Formed', stage: 'Bid Evaluation', stageId: 8, module: 'Tender Management', detail: 'Committee assigned for TND-2026-MP-0055 — technical opening completed', ref: 'TND-2026-MP-0055', ip: '10.24.8.45', status: 'Success' },
  { id: 'AUD-G-2026-0085', time: '2026-09-03 11:22:18', user: 'GOV-STORE-022', userName: 'Store Manager — Bhopal', action: 'Demand Consolidated', stage: 'Demand Consolidation', stageId: 4, module: 'Inventory', detail: 'District drug demand consolidated — 28 items optimizable from stock', ref: 'DEM-MP-2026-334', ip: '10.24.8.12', status: 'Success' },
  { id: 'AUD-G-2026-0080', time: '2026-09-01 14:05:55', user: 'GOV-FIN-007', userName: 'Finance Controller', action: 'Budget Sanctioned', stage: 'PR & Budget Approval', stageId: 5, module: 'Finance', detail: 'Administrative sanction for ₹4.2 Cr — Drugs category FY 2026-27', ref: 'BUD-MP-DRG-092', ip: '10.24.8.33', status: 'Success' },
  { id: 'AUD-G-2026-0076', time: '2026-08-29 10:40:11', user: 'GOV-PROC-014', userName: 'Dr. Sharma (Procurement)', action: 'NIT Published', stage: 'Tender Preparation', stageId: 6, module: 'Tender Management', detail: 'TND-2026-MP-0055 published — EMD ₹3,20,000, deadline 2026-09-05', ref: 'TND-2026-MP-0055', ip: '10.24.8.45', status: 'Success' },
  { id: 'AUD-G-2026-0070', time: '2026-08-25 09:15:00', user: 'GOV-STORE-022', userName: 'Store Manager — Bhopal', action: 'Indent Raised', stage: 'Indent Raised', stageId: 2, module: 'Inventory', detail: 'Critical stock indent for oncology drugs — 14 SKUs below reorder level', ref: 'IND-BPL-2026-089', ip: '10.24.8.12', status: 'Success' },
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
      { label: 'Opening Stage', value: 'Post technical qualification (Stage 6)' },
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
  { id: 1, name: 'Registration', desc: 'Submit registration evidence, company profile, and mandatory documents.', status: 'done' },
  { id: 2, name: 'KYC & Bank Verification', desc: 'Complete KYC, bank account verification, and regulatory compliance checks.', status: 'done' },
  { id: 3, name: 'Vendor Code', desc: 'System generates unique vendor ID (e.g., VND-MP-000123) for all transactions.', status: 'done' },
  { id: 4, name: 'Eligibility Validation', desc: 'Verify turnover, experience, certifications against tender criteria.', status: 'done' },
  { id: 5, name: 'Bid Submission', desc: 'Submit technical and financial bids with EMD before deadline.', status: 'active' },
  { id: 6, name: 'Evaluation', desc: 'Technical and commercial evaluation by government committee.', status: 'pending' },
  { id: 7, name: 'Award & Contract', desc: 'Receive LOA, submit PBG, sign contract agreement.', status: 'pending' },
  { id: 8, name: 'Delivery', desc: 'Dispatch goods with challans, batch records, expiry details.', status: 'pending' },
  { id: 9, name: 'Quality & SLA', desc: 'Meet quality standards, SLA targets, warranty obligations.', status: 'pending' },
  { id: 10, name: 'Invoice & Payment', desc: 'Raise invoice with delivery proof, track payment status.', status: 'pending' },
  { id: 11, name: 'Performance Score', desc: 'Weighted performance score based on quality, lead time, cost, compliance.', status: 'pending' },
  { id: 12, name: 'Renewal / Closure', desc: 'Contract renewal, re-tender decision, or formal closure.', status: 'pending' }
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
  { id: 'sourcing', icon: 'fa-bullseye', label: 'Sourcing & Award', badge: 5 },
  { id: 'master-data', icon: 'fa-database', label: 'Master Data & Workflow', badge: 2 },
  { id: 'tor', icon: 'fa-triangle-exclamation', label: 'TOR Coverage & Red Flags', badge: 4 },
  { section: 'Performance' },
  { id: 'vendor-matrix', icon: 'fa-chart-bar', label: 'Vendor Performance Matrix', badge: 0 },
  { id: 'reports', icon: 'fa-file-lines', label: 'Reports & Analytics', badge: 1 },
  { id: 'settings', icon: 'fa-gear', label: 'Settings & Branding', badge: 0 }
];

const NAV_VENDOR = [
  { section: 'Overview' },
  { id: 'dashboard', icon: 'fa-chart-line', label: 'My Dashboard', badge: 0 },
  { section: 'Vendor Lifecycle' },
  { id: 'workflow', icon: 'fa-arrows-rotate', label: 'Registration', badge: 2 },
  { id: 'registration', icon: 'fa-id-card', label: 'Registration & KYC', badge: 1 },
  { id: 'tenders', icon: 'fa-magnifying-glass', label: 'Tender Discovery', badge: 6 },
  { id: 'bids', icon: 'fa-paper-plane', label: 'Bid Submission', badge: 3 },
  { id: 'clarifications', icon: 'fa-comments', label: 'Clarifications', badge: 2 },
  { section: 'Execution' },
  { id: 'contracts', icon: 'fa-file-contract', label: 'Contracts & POs', badge: 1 },
  { id: 'delivery', icon: 'fa-truck', label: 'Delivery & Invoices', badge: 2 },
  { id: 'performance', icon: 'fa-star', label: 'Performance Score', badge: 0 }
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
    year: { labels: ['FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'], data: [145, 168, 192, 215] },
    quarter: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: [48, 52, 58, 57] },
    month: { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], data: [16, 18, 14, 19, 17, 15] }
  },
  procurement: {
    year: { labels: ['FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'], data: [89, 102, 118, 134] },
    quarter: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: [28, 32, 38, 36] },
    month: { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], data: [9, 11, 8, 12, 10, 9] }
  },
  vendorPerf: {
    year: { labels: ['FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'], data: [78, 82, 85, 88] },
    quarter: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: [85, 87, 88, 90] },
    month: { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], data: [86, 87, 88, 89, 88, 90] }
  },
  savings: {
    year: { labels: ['FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'], data: [12, 15, 18, 22] },
    quarter: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: [5, 6, 5.5, 5.5] },
    month: { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], data: [1.8, 1.6, 1.7, 1.9, 1.8, 1.7] }
  },
  categorySpend: {
    labels: ['Drugs', 'Equipment', 'Services', 'Consumables', 'Others'],
    data: [42, 28, 15, 10, 5],
    unit: '%',
    description: 'Share of total procurement spend by category'
  }
};

const SCORE_WEIGHTS = [
  { label: 'Quality', weight: 30 },
  { label: 'Lead Time', weight: 20 },
  { label: 'Cost', weight: 20 },
  { label: 'Regulatory', weight: 20 },
  { label: 'User Satisfaction', weight: 10 }
];
