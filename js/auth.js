/* MP Health Procurement — Authentication (Login / Signup / OTP) */

const DEMO_EMAIL_OTP = '123456';
const DEMO_PHONE_OTP = '789012';

/** All roles shown in signup (prototype catalogue). Only demo roles can complete registration. */
const AUTH_ROLE_OPTIONS = [
  'Resource Manager',
  'Vendor / Bidder',
  'Procurement Officer',
  'Finance / Budget Officer',
  'Stores / Warehouse Manager',
  'Inspection / Quality Officer',
  'Tender Evaluation Committee',
  'District CMO / Administrative Officer',
  'NHM Programme Officer',
  'Audit / Compliance Officer',
  'Indenting Department HOD',
  'System Administrator'
];

const AUTH_DEMO_ROLES = ['Resource Manager', 'Vendor / Bidder'];

const AUTH_USERS = [
  {
    id: 'gov-001',
    role: 'gov',
    name: 'Dr. Rajesh Sharma',
    email: 'gov.admin@mphp.gov.in',
    phone: '9876543210',
    password: 'Admin@2026',
    avatar: 'RS',
    title: 'Resource Manager'
  },
  {
    id: 'vnd-001',
    role: 'vendor',
    name: 'MediSupply India Pvt Ltd',
    email: 'vendor@medisupply.in',
    phone: '9123456780',
    password: 'Vendor@2026',
    avatar: 'MS',
    title: 'Vendor / Bidder',
    vendorId: 'VND-MP-000123'
  }
];

let authView = 'login';
let authPending = null;
let authSession = null;
let otpResendTimer = null;
let otpResendSeconds = 0;

function roleLabelToKey(label) {
  return label === 'Resource Manager' ? 'gov' : 'vendor';
}

function isDemoSignupRole(label) {
  return AUTH_DEMO_ROLES.includes(label);
}

function getRegisteredUsers() {
  try {
    return JSON.parse(sessionStorage.getItem('mph_registered_users') || '[]');
  } catch {
    return [];
  }
}

function saveRegisteredUser(user) {
  const users = getRegisteredUsers();
  users.push(user);
  sessionStorage.setItem('mph_registered_users', JSON.stringify(users));
}

function getAllUsers() {
  return [...AUTH_USERS, ...getRegisteredUsers()];
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function findUserByIdentifier(identifier) {
  const raw = identifier.trim().toLowerCase();
  const phone = normalizePhone(identifier);
  return getAllUsers().find(u =>
    u.email.toLowerCase() === raw ||
    u.phone === phone ||
    normalizePhone(u.phone) === phone
  );
}

function getAuthSession() {
  return authSession;
}

function clearAuthSession() {
  authSession = null;
  authPending = null;
  authView = 'login';
  stopOtpTimer();
}

function maskEmail(email) {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(user.length - 2, 2))}@${domain}`;
}

function maskPhone(phone) {
  const p = normalizePhone(phone);
  if (p.length < 4) return phone;
  return `+91 ${'•'.repeat(6)}${p.slice(-4)}`;
}

function initAuth() {
  renderAuthUI();
  bindAuthEvents();
}

function renderAuthUI() {
  const page = document.getElementById('authPage');
  if (!page) return;

  page.innerHTML = `
    <div class="auth-bg" aria-hidden="true"></div>
    <div class="auth-center">
      <header class="auth-top-brand">
        <div class="auth-top-logo"><i class="fa-solid fa-hospital"></i></div>
        <div>
          <h1>MP Health Procurement</h1>
          <p>Public-Sector Drug &amp; Medical Procurement Lifecycle</p>
        </div>
      </header>

      <div class="auth-card">
        <nav class="auth-steps" id="authSteps" aria-label="Authentication progress">
          <div class="auth-step auth-step--done" data-step="1">
            <span class="auth-step-num">1</span>
            <span class="auth-step-label">Credentials</span>
          </div>
          <div class="auth-step-line"></div>
          <div class="auth-step" data-step="2">
            <span class="auth-step-num">2</span>
            <span class="auth-step-label">OTP Verification</span>
          </div>
        </nav>

        <div class="auth-tabs" id="authTabs" role="tablist">
          <button type="button" class="auth-tab ${authView === 'login' ? 'active' : ''}" data-tab="login" role="tab" aria-selected="${authView === 'login'}">Sign In</button>
          <button type="button" class="auth-tab ${authView === 'signup' ? 'active' : ''}" data-tab="signup" role="tab" aria-selected="${authView === 'signup'}">Create Account</button>
        </div>

        <div id="authAlert" class="auth-alert hidden" role="alert"></div>
        <div class="auth-form-body" id="authFormBody"></div>
      </div>

      <footer class="auth-center-footer">
        <span>© 2026 MP Health Procurement · GFR 2017 Compliant</span>
        <div class="auth-panel-links">
          <a href="#" onclick="return false">Privacy</a>
          <a href="#" onclick="return false">Terms</a>
          <a href="#" onclick="return false">Help Desk</a>
        </div>
      </footer>
    </div>
  `;

  updateAuthContent();
}

function updateAuthContent() {
  const body = document.getElementById('authFormBody');
  const steps = document.getElementById('authSteps');
  const tabs = document.getElementById('authTabs');

  if (body) body.innerHTML = renderAuthView();

  const isOtp = authView === 'otp';
  steps?.classList.toggle('visible', isOtp);
  tabs?.classList.toggle('hidden', isOtp);

  if (!isOtp && tabs) {
    tabs.querySelectorAll('.auth-tab').forEach(btn => {
      const active = btn.dataset.tab === authView;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active);
    });
  }

  if (typeof initCustomSelects === 'function') initCustomSelects();

  if (isOtp) {
    steps?.querySelectorAll('.auth-step').forEach((el, i) => {
      el.classList.toggle('auth-step--done', i === 0);
      el.classList.toggle('auth-step--active', i === 1);
    });
    initOtpInputs();
    startOtpTimer();
  }
}

function renderAuthView() {
  if (authView === 'otp') return renderOtpView();
  if (authView === 'signup') return renderSignupView();
  return renderLoginView();
}

function renderLoginView() {
  return `
    <div class="auth-intro">
      <h2>Welcome back</h2>
      <p>Sign in with your registered email or mobile number. OTP verification follows.</p>
    </div>
    <form id="authLoginForm" class="auth-form" novalidate>
      <div class="form-group">
        <label for="loginIdentifier">Email or Mobile Number</label>
        <div class="auth-field">
          <i class="fa-solid fa-user"></i>
          <input type="text" id="loginIdentifier" name="identifier" placeholder="you@organization.gov.in" autocomplete="username" required>
        </div>
      </div>
      <div class="form-group">
        <label for="loginPassword">Password</label>
        <div class="auth-field">
          <i class="fa-solid fa-lock"></i>
          <input type="password" id="loginPassword" name="password" placeholder="Enter your password" autocomplete="current-password" required>
          <button type="button" class="auth-toggle-pw" data-target="loginPassword" aria-label="Show password"><i class="fa-solid fa-eye"></i></button>
        </div>
      </div>
      <div class="auth-form-row">
        <label class="auth-check"><input type="checkbox" id="loginRemember"> <span>Keep me signed in</span></label>
        <button type="button" class="auth-text-btn" id="btnForgotPassword">Forgot password?</button>
      </div>
      <button type="submit" class="btn-auth-submit">
        Continue
        <i class="fa-solid fa-arrow-right"></i>
      </button>
    </form>
    <p class="auth-switch-hint">New to the platform? <button type="button" class="auth-text-btn" data-tab="signup">Create an account</button></p>
  `;
}

function renderSignupView() {
  return `
    <div class="auth-intro">
      <h2>Create your account</h2>
      <p>Choose your account role to register. Demo portal access is enabled for Resource Manager and Vendor / Bidder.</p>
    </div>
    <form id="authSignupForm" class="auth-form" novalidate>
      ${customSelectHTML('Account Role', 'signupRole', AUTH_ROLE_OPTIONS, 'Vendor / Bidder')}
      <div class="form-group">
        <label for="signupName">Full Name / Organization</label>
        <div class="auth-field">
          <i class="fa-solid fa-id-card"></i>
          <input type="text" id="signupName" name="name" placeholder="Officer name or company legal name" required>
        </div>
      </div>
      <div class="auth-form-split">
        <div class="form-group">
          <label for="signupEmail">Work Email</label>
          <div class="auth-field">
            <i class="fa-solid fa-envelope"></i>
            <input type="email" id="signupEmail" name="email" placeholder="name@organization.in" autocomplete="email" required>
          </div>
        </div>
        <div class="form-group">
          <label for="signupPhone">Mobile Number</label>
          <div class="auth-field auth-field--phone">
            <span class="auth-prefix">+91</span>
            <input type="tel" id="signupPhone" name="phone" placeholder="10-digit number" maxlength="10" inputmode="numeric" required>
          </div>
        </div>
      </div>
      <div class="auth-form-split">
        <div class="form-group">
          <label for="signupPassword">Password</label>
          <div class="auth-field">
            <i class="fa-solid fa-lock"></i>
            <input type="password" id="signupPassword" name="password" placeholder="Minimum 8 characters" autocomplete="new-password" required>
            <button type="button" class="auth-toggle-pw" data-target="signupPassword" aria-label="Show password"><i class="fa-solid fa-eye"></i></button>
          </div>
        </div>
        <div class="form-group">
          <label for="signupConfirm">Confirm Password</label>
          <div class="auth-field">
            <i class="fa-solid fa-lock"></i>
            <input type="password" id="signupConfirm" name="confirm" placeholder="Re-enter password" autocomplete="new-password" required>
          </div>
        </div>
      </div>
      <label class="auth-check auth-check--block">
        <input type="checkbox" id="signupTerms" required>
        <span>I confirm the information is accurate and agree to the platform terms, privacy policy, and GFR 2017 guidelines.</span>
      </label>
      <button type="submit" class="btn-auth-submit">
        Create Account
        <i class="fa-solid fa-arrow-right"></i>
      </button>
    </form>
    <p class="auth-switch-hint">Already registered? <button type="button" class="auth-text-btn" data-tab="login">Sign in instead</button></p>
  `;
}

function renderOtpView() {
  const pending = authPending || {};
  const roleLabel = pending.title || (pending.role === 'gov' ? 'Resource Manager' : 'Vendor / Bidder');

  return `
    <div class="auth-intro">
      <button type="button" class="auth-back-btn" id="btnOtpBack"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <h2>Verify OTP</h2>
      <p>Enter the 6-digit codes sent to your email and mobile to complete authentication.</p>
    </div>

    <div class="auth-otp-profile">
      <div class="auth-otp-avatar auth-otp-avatar--${pending.role || 'vendor'}">
        <i class="fa-solid ${pending.role === 'gov' ? 'fa-landmark' : 'fa-building'}"></i>
      </div>
      <div class="auth-otp-profile-text">
        <strong>${pending.name || 'User'}</strong>
        <span>${roleLabel}</span>
      </div>
    </div>

    <div class="auth-otp-channels">
      <div class="auth-otp-channel">
        <i class="fa-solid fa-envelope"></i>
        <div>
          <span class="auth-otp-channel-label">Email</span>
          <span class="auth-otp-channel-value">${maskEmail(pending.email || '')}</span>
        </div>
      </div>
      <div class="auth-otp-channel">
        <i class="fa-solid fa-mobile-screen"></i>
        <div>
          <span class="auth-otp-channel-label">Mobile</span>
          <span class="auth-otp-channel-value">${maskPhone(pending.phone || '')}</span>
        </div>
      </div>
    </div>

    <form id="authOtpForm" class="auth-form auth-form--otp" novalidate>
      <div class="auth-otp-block">
        <label>Email OTP</label>
        <p class="auth-otp-sub">6-digit code from your inbox</p>
        <div class="auth-otp-inputs">
          ${[0, 1, 2, 3, 4, 5].map(i => `<input type="text" class="auth-otp-digit" maxlength="1" inputmode="numeric" pattern="[0-9]" data-otp="email" data-index="${i}" aria-label="Email OTP digit ${i + 1}">`).join('')}
        </div>
      </div>
      <div class="auth-otp-block">
        <label>Mobile OTP</label>
        <p class="auth-otp-sub">6-digit code from SMS</p>
        <div class="auth-otp-inputs">
          ${[0, 1, 2, 3, 4, 5].map(i => `<input type="text" class="auth-otp-digit" maxlength="1" inputmode="numeric" pattern="[0-9]" data-otp="phone" data-index="${i}" aria-label="Phone OTP digit ${i + 1}">`).join('')}
        </div>
      </div>
      <div class="auth-otp-resend">
        <span>Didn't receive the code?</span>
        <button type="button" class="auth-text-btn" id="btnResendOtp" disabled>Resend in <span id="otpTimer">30</span>s</button>
      </div>
      <button type="submit" class="btn-auth-submit">
        Verify &amp; Access Portal
        <i class="fa-solid fa-shield-halved"></i>
      </button>
    </form>
  `;
}

function bindAuthEvents() {
  if (window.__mphAuthBound) return;
  window.__mphAuthBound = true;

  document.addEventListener('click', e => {
    if (!e.target.closest('#authPage')) return;

    const tab = e.target.closest('[data-tab]');
    if (tab && (tab.classList.contains('auth-tab') || tab.classList.contains('auth-text-btn'))) {
      e.preventDefault();
      switchAuthTab(tab.dataset.tab);
      return;
    }

    const togglePw = e.target.closest('.auth-toggle-pw');
    if (togglePw) {
      const input = document.getElementById(togglePw.dataset.target);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      togglePw.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
      return;
    }

    if (e.target.closest('#btnForgotPassword')) {
      showAuthAlert('Password reset is handled by your department administrator. Contact the help desk for assistance.', 'info');
      return;
    }

    if (e.target.closest('#btnOtpBack')) {
      authView = authPending?.source || 'login';
      authPending = null;
      stopOtpTimer();
      updateAuthContent();
      return;
    }

    if (e.target.closest('#btnResendOtp') && !document.getElementById('btnResendOtp')?.disabled) {
      startOtpTimer();
      showAuthAlert('New verification codes have been sent to your email and mobile.', 'success');
    }
  });

  document.addEventListener('submit', e => {
    if (!e.target.closest('#authPage')) return;
    if (e.target.id === 'authLoginForm') {
      e.preventDefault();
      handleLoginSubmit();
    }
    if (e.target.id === 'authSignupForm') {
      e.preventDefault();
      handleSignupSubmit();
    }
    if (e.target.id === 'authOtpForm') {
      e.preventDefault();
      handleOtpSubmit();
    }
  });

  document.addEventListener('input', e => {
    if (!e.target.closest('#authPage')) return;
    if (e.target.classList.contains('auth-otp-digit')) {
      handleOtpDigitInput(e.target);
    }
  });

  document.addEventListener('keydown', e => {
    if (!e.target.closest('#authPage')) return;
    if (e.target.classList.contains('auth-otp-digit') && e.key === 'Backspace') {
      handleOtpDigitBackspace(e.target, e);
    }
  });
}

function switchAuthTab(tab) {
  authView = tab === 'signup' ? 'signup' : 'login';
  authPending = null;
  stopOtpTimer();
  hideAuthAlert();
  updateAuthContent();
}

function showAuthAlert(message, type = 'error') {
  const el = document.getElementById('authAlert');
  if (!el) return;
  el.className = `auth-alert auth-alert--${type}`;
  el.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : type === 'info' ? 'circle-info' : 'circle-exclamation'}"></i><span>${message}</span>`;
  el.classList.remove('hidden');
}

function hideAuthAlert() {
  document.getElementById('authAlert')?.classList.add('hidden');
}

function handleLoginSubmit() {
  hideAuthAlert();
  const identifier = document.getElementById('loginIdentifier')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;

  if (!identifier || !password) {
    showAuthAlert('Please enter your email or mobile number and password.');
    return;
  }

  const user = findUserByIdentifier(identifier);
  if (!user || user.password !== password) {
    showAuthAlert('Invalid email, mobile number, or password. Please try again.');
    return;
  }

  authPending = { ...user, source: 'login', isNewSignup: false };
  authView = 'otp';
  updateAuthContent();
  showAuthAlert(`Verification codes sent to ${maskEmail(user.email)} and ${maskPhone(user.phone)}.`, 'success');
}

function handleSignupSubmit() {
  hideAuthAlert();
  const name = document.getElementById('signupName')?.value.trim();
  const email = document.getElementById('signupEmail')?.value.trim().toLowerCase();
  const phone = normalizePhone(document.getElementById('signupPhone')?.value);
  const password = document.getElementById('signupPassword')?.value;
  const confirm = document.getElementById('signupConfirm')?.value;
  const roleLabel = typeof getCustomSelectValue === 'function'
    ? getCustomSelectValue('signupRole')
    : 'Vendor / Bidder';
  const role = roleLabelToKey(roleLabel);
  const terms = document.getElementById('signupTerms')?.checked;

  if (!name || !email || !phone || !password || !confirm) {
    showAuthAlert('Please complete all required fields.');
    return;
  }
  if (!roleLabel || !AUTH_ROLE_OPTIONS.includes(roleLabel)) {
    showAuthAlert('Please select an account role.');
    return;
  }
  if (!isDemoSignupRole(roleLabel)) {
    showAuthAlert(`${roleLabel} is listed for this prototype. Demo signup is currently available for Resource Manager and Vendor / Bidder only.`);
    return;
  }
  if (phone.length !== 10) {
    showAuthAlert('Please enter a valid 10-digit mobile number.');
    return;
  }
  if (password.length < 8) {
    showAuthAlert('Password must be at least 8 characters long.');
    return;
  }
  if (password !== confirm) {
    showAuthAlert('Passwords do not match. Please re-enter.');
    return;
  }
  if (!terms) {
    showAuthAlert('Please accept the terms and procurement guidelines to continue.');
    return;
  }

  const existing = getAllUsers().find(u => u.email === email || normalizePhone(u.phone) === phone);
  if (existing) {
    showAuthAlert('An account with this email or mobile already exists. Please sign in instead.');
    return;
  }

  const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'US';
  const newUser = {
    id: `usr-${Date.now()}`,
    role,
    name,
    email,
    phone,
    password,
    avatar: initials,
    title: roleLabel,
    vendorId: role === 'vendor' ? `VND-MP-${String(Math.floor(Math.random() * 900000) + 100000)}` : undefined
  };

  authPending = { ...newUser, source: 'signup', isNewSignup: true };
  authView = 'otp';
  updateAuthContent();
  showAuthAlert(`Verification codes sent to ${maskEmail(email)} and ${maskPhone(phone)}.`, 'success');
}

function getOtpValue(group) {
  return Array.from(document.querySelectorAll(`.auth-otp-digit[data-otp="${group}"]`))
    .map(el => el.value)
    .join('');
}

function handleOtpSubmit() {
  hideAuthAlert();
  const emailOtp = getOtpValue('email');
  const phoneOtp = getOtpValue('phone');

  if (emailOtp.length !== 6 || phoneOtp.length !== 6) {
    showAuthAlert('Please enter the complete 6-digit code for both email and mobile.');
    return;
  }
  if (emailOtp !== DEMO_EMAIL_OTP || phoneOtp !== DEMO_PHONE_OTP) {
    showAuthAlert('The verification code is incorrect. Please check your email and SMS and try again.');
    return;
  }

  if (!authPending) {
    showAuthAlert('Your session has expired. Please sign in again.');
    authView = 'login';
    updateAuthContent();
    return;
  }

  if (authPending.isNewSignup) {
    saveRegisteredUser({
      id: authPending.id,
      role: authPending.role,
      name: authPending.name,
      email: authPending.email,
      phone: authPending.phone,
      password: authPending.password,
      avatar: authPending.avatar,
      title: authPending.title,
      vendorId: authPending.vendorId
    });
  }

  authSession = { ...authPending };
  const role = authPending.role;
  authPending = null;
  stopOtpTimer();

  document.getElementById('authPage').style.display = 'none';
  if (typeof completeAuthLogin === 'function') {
    completeAuthLogin(role, authSession);
  }
}

function initOtpInputs() {
  document.querySelector('.auth-otp-digit[data-otp="email"][data-index="0"]')?.focus();
}

function handleOtpDigitInput(input) {
  input.value = input.value.replace(/\D/g, '').slice(0, 1);
  if (input.value) {
    const next = input.nextElementSibling;
    if (next?.classList.contains('auth-otp-digit')) next.focus();
  }
}

function handleOtpDigitBackspace(input, e) {
  if (!input.value && input.previousElementSibling?.classList.contains('auth-otp-digit')) {
    e.preventDefault();
    input.previousElementSibling.focus();
    input.previousElementSibling.value = '';
  }
}

function startOtpTimer() {
  stopOtpTimer();
  otpResendSeconds = 30;
  const btn = document.getElementById('btnResendOtp');
  if (!btn) return;

  btn.disabled = true;
  btn.innerHTML = `Resend in <span id="otpTimer">30</span>s`;
  otpResendTimer = setInterval(() => {
    otpResendSeconds -= 1;
    const timerEl = document.getElementById('otpTimer');
    if (timerEl) timerEl.textContent = String(otpResendSeconds);
    if (otpResendSeconds <= 0) {
      stopOtpTimer();
      btn.disabled = false;
      btn.textContent = 'Resend OTP';
    }
  }, 1000);
}

function stopOtpTimer() {
  if (otpResendTimer) {
    clearInterval(otpResendTimer);
    otpResendTimer = null;
  }
}
