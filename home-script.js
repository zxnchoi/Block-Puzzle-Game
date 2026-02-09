// ═══════════════════════════════════════════════
//  HOME SCRIPT
// ═══════════════════════════════════════════════

let currentUser = null;

// ═══════════════════════════════════════════════
//  NAVIGATION FUNCTIONS
// ═══════════════════════════════════════════════
window.goToGame = function() {
  window.location.href = 'game-index.html';
};

window.openHTP = function() {
  document.getElementById('htp-overlay').classList.add('active');
};

window.closeHTP = function() {
  document.getElementById('htp-overlay').classList.remove('active');
};

window.goToLeaderboard = async function() {
  document.getElementById('lb-overlay').classList.add('active');
  await renderLeaderboard();
};

window.closeLeaderboard = function() {
  document.getElementById('lb-overlay').classList.remove('active');
};

window.logout = function() {
  if (confirm('Are you sure you want to logout?')) {
    DB.session.clear();
    window.location.href = 'Login.html';
  }
};

// ═══════════════════════════════════════════════
//  LEADERBOARD
// ═══════════════════════════════════════════════
async function renderLeaderboard() {
  const tbody = document.getElementById('lb-body');
  tbody.innerHTML = '<tr><td colspan="5" class="lb-empty">Loading...</td></tr>';
  
  try {
    const scores = await DB.leaderboard.getTop(10);
    
    tbody.innerHTML = '';
    
    if (!scores || !scores.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="lb-empty">No scores yet — play the game!</td></tr>';
      return;
    }
    
    scores.forEach((score, i) => {
      const rankClass = i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : '';
      const diffClass = score.difficulty || 'easy';
      
      tbody.innerHTML += `
        <tr>
          <td><span class="lb-rank ${rankClass}">${i + 1}</span></td>
          <td>${escHtml(score.name)}</td>
          <td style="font-size:.64rem">${escHtml(score.strand || 'N/A')}</td>
          <td><span class="lb-diff ${diffClass}">${(score.difficulty || 'easy').toUpperCase()}</span> · ${score.lines || 0}L</td>
          <td>${score.score}</td>
        </tr>`;
    });
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    tbody.innerHTML = '<tr><td colspan="5" class="lb-empty">Failed to load leaderboard</td></tr>';
  }
}

function escHtml(s) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
}

// ═══════════════════════════════════════════════
//  CANVAS ANIMATION (BACKUP)
// ═══════════════════════════════════════════════
/* function initCanvas(canvasId) {
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
*/

// ==========================================
//  NEW RAIN SYSTEM
//===========================================

function initCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  let blocks = [];
  const COLORS = ['#00f0ff', '#ff2d95', '#39ff14', '#ffe600', '#ff6a00', '#bf00ff', '#0080ff'];
  
  const isMobile = window.innerWidth <= 768;
  const maxBlocks = isMobile ? 5 : 12;     
  const spawnChance = isMobile ? 0.005 : 0.02;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawnBlock(initialY = -1) {
    if (blocks.length >= maxBlocks) return;

    const size = 14 + Math.random() * 18;
    blocks.push({
      x: Math.random() * canvas.width,
      y: initialY === -1 ? -size : initialY,
      size,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: 0.4 + Math.random() * 0.5,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - .5) * .04,
      opacity: .15 + Math.random() * .19
    });
  }
  
  for (let i = 0; i < (isMobile ? 1 : 3); i++) {
    spawnBlock(Math.random() * canvas.height);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      b.y += b.speed;
      b.rot += b.rotSpeed;
      if (b.y > canvas.height + b.size) {
        blocks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.globalAlpha = b.opacity;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = isMobile ? 4 : 8; 
      const s = b.size;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.globalAlpha = b.opacity * .4;
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.fillRect(-s / 2, -s / 2, s, s * .18);
      ctx.restore();
    }

    if (Math.random() < spawnChance) {
      spawnBlock();
    }

    requestAnimationFrame(draw);
  }
  draw();
}

// ═══════════════════════════════════════════════
//  INITIALIZE ON PAGE LOAD
// ═══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const session = DB.session.get();
  console.log('Session found:', session);
  
  if (!session) {
    console.log('No session found, redirecting to login');
    // Not logged in, redirect to login
    window.location.href = 'Login.html';
    return;
  }
  
  try {
    const user = await DB.users.getCurrentUser();
    console.log('User retrieved:', user);
    
    if (!user) {
      console.log('User not found, clearing session');
      // User not found, clear session and redirect
      DB.session.clear();
      window.location.href = 'Login.html';
      return;
    }
    
    // Set current user
    currentUser = user;
    
    // Hide loading overlay
    document.getElementById('loading-overlay').classList.add('hidden');
    
    // Update welcome message
    document.getElementById('home-welcome').textContent = `Welcome, ${currentUser.name}!`;
    
    // Initialize canvas animation
    initCanvas('home-canvas');
  } catch (error) {
    console.error('Session validation failed:', error);
    DB.session.clear();
    window.location.href = 'Login.html';
  }
});