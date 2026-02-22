// ═══════════════════════════════════════════════
//  LOGIN SCRIPT
// ═══════════════════════════════════════════════

window.switchTab = function(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  
  document.querySelectorAll('.form-error, .form-success').forEach(e => e.classList.remove('show'));
  
  if (tab === 'login') {
    document.querySelectorAll('.auth-tab')[0].classList.add('active');
    document.getElementById('login-form').classList.add('active');
  } else {
    document.querySelectorAll('.auth-tab')[1].classList.add('active');
    document.getElementById('signup-form').classList.add('active');
  }
};

window.handleLogin = async function(e) {
  e.preventDefault();
  
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  
  if (!username) {
    showError('login-error', 'Please enter your username');
    return;
  }
  
  if (!password) {
    showError('login-error', 'Please enter your password');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'LOGGING IN...';
  
  try {
    const result = await DB.users.login(username, password);
    
    DB.session.set({
      user_id: result.user.id,
      username: result.user.username,
      session_token: result.user.session_token
    });
    
    btn.textContent = 'SUCCESS!';
    setTimeout(() => {
      btn.textContent = 'LOGIN';
      btn.disabled = false;
      window.location.href = 'index.html';
    }, 300);
  } catch (error) {
    showError('login-error', error.message || 'Login failed. Please try again.');
    btn.disabled = false;
    btn.textContent = 'LOGIN';
  }
};

window.handleSignup = async function(e) {
  e.preventDefault();
  
  const username = document.getElementById('signup-username').value.trim();
  const name = document.getElementById('signup-name').value.trim();
  const strand = document.getElementById('signup-strand').value.trim();
  const password = document.getElementById('signup-password').value;
  const btn = document.getElementById('signup-btn');
  
  if (!username || !name || !strand || !password) {
    showError('signup-error', 'Please fill in all fields');
    return;
  }
  
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    showError('signup-error', 'Username must be 3-20 characters and contain only letters, numbers, and underscores');
    return;
  }
  
  if (!/^[a-zA-Z. ]+$/.test(name)) {
    showError('signup-error', 'Full name can only contain letters, spaces, and periods');
    return;
  }
  
  if (password.length < 6) {
    showError('signup-error', 'Password must be at least 6 characters');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'CREATING ACCOUNT...';
  
  try {
    const result = await DB.users.create({ username, name, strand, password });
    
    DB.session.set({
      user_id: result.user.id,
      username: result.user.username,
      session_token: result.user.session_token
    });
    
    showSuccess('signup-success', 'Account created successfully! Your account has been created.');
    btn.textContent = 'SUCCESS!';
    
    // Auto-login after signup
    setTimeout(async () => {
      btn.textContent = 'LOGGING IN...';
      try {
        const result = await DB.users.login(username, password);
        DB.session.set({
          user_id: result.user.id,
          username: result.user.username,
          session_token: result.user.session_token
        });
        window.location.href = 'index.html';
      } catch (error) {
        // If auto-login fails, redirect to login
        btn.textContent = 'CREATE ACCOUNT';
        btn.disabled = false;
        switchTab('login');
        showError('login-error', 'Signup successful! Please login with your new account.');
      }
    }, 1000);
  } catch (error) {
    showError('signup-error', error.message || 'Signup failed. Please try again.');
    btn.disabled = false;
    btn.textContent = 'CREATE ACCOUNT';
  }
};

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

function showSuccess(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════════
//  CANVAS ANIMATION
// ═══════════════════════════════════════════════
function initCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  let blocks = [];
  const COLORS = ['#00f0ff', '#ff2d95', '#39ff14', '#ffe600', '#ff6a00', '#bf00ff', '#0080ff'];
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawnBlock() {
    const size = 14 + Math.random() * 18;
    blocks.push({
      x: Math.random() * canvas.width,
      y: -size,
      size,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: 0.4 + Math.random() * 0.7,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - .5) * .04,
      opacity: .15 + Math.random() * .25
    });
  }
  
  for (let i = 0; i < 18; i++) {
    spawnBlock();
    blocks[i].y = Math.random() * canvas.height;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    blocks.forEach((b, i) => {
      b.y += b.speed;
      b.rot += b.rotSpeed;
      if (b.y > canvas.height + b.size) {
        blocks.splice(i, 1);
        spawnBlock();
        return;
      }
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.globalAlpha = b.opacity;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      const s = b.size;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.globalAlpha = b.opacity * .4;
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.fillRect(-s / 2, -s / 2, s, s * .18);
      ctx.restore();
    });
    if (Math.random() < .04) spawnBlock();
    requestAnimationFrame(draw);
  }
  draw();
}

// ═══════════════════════════════════════════════
//  INITIALIZE ON PAGE LOAD
// ═══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', async () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  
  initCanvas('auth-canvas');
  
  try {
    await DB.init();
  } catch (e) {
    console.warn('Database initialization warning:', e);
  }
  
  const session = DB.session.get();
  if (session) {
    try {
      const valid = await DB.session.validate();
      if (valid) {
        window.location.href = 'index.html';
        return;
      } else {
        DB.session.clear();
      }
    } catch (e) {
      DB.session.clear();
    }
  }
  
  loadingOverlay.classList.add('hidden');
});
