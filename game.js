/* --------------- imports & globals --------------- */
//, מהירות
import { User } from './Model/User.js';

let bullets        = [];
let enemyBullets   = [];
let enemies        = [];
let keys           = {};

let score   = 0;
let health  = 3;
let gameOver = false;
let win      = false;
let animationId = null;

let startTime           = Date.now();
let lastEnemyShootTime  = startTime;
let canShoot            = true;
let enemyDirection      = 1;        
let enemySpeed        = 2;
let enemyShootCooldown = 1000;        
let speedUps = 0; 
const maxSpeedUps = 4;
const speedUpInterval = 5000; 
let lastSpeedUpTime = Date.now();
let shootKey, duration;

/* --------------- canvas & assets --------------- */
const canvas = $('#gameCanvas')[0];
const ctx    = canvas.getContext('2d');

const shipImg = new Image();
shipImg.src   = 'images/spaceship.png';
const enemyImg = new Image();
enemyImg.src = 'images/enemy.png'

const fireSound = $('#fireSound')[0];
const hitSound  = $('#hitSound')[0];
const lostSound = $('#lose')[0];
const backgroundMusic = $('#backgroundMusic')[0];
const playerGotHitSound = $('#playerHitSound')[0];
backgroundMusic.loop = true;    // <-- loop forever
let currentUser   = null;  
let highScores    = [];   
const ship = { x: 0, y: 0, width: 80, height: 100, speed: 2, started: false };
// DB
const users   = [];
users.push(new User('p', 'testuser', 'test', 'user', 'test@bgu.ac.il', '2000‑01‑01'));

/* --------------- UI / login / register --------------- */
$(document).on('keydown',  e => keys[e.key] = true);
$(document).on('keyup',    e => delete keys[e.key]);

$('#welcomeBtnRegister').on('click', e => {
    showSection('register')
});

$('#welcomeBtnLogin').on('click', e => {
    showSection('login')
});

$('#submit_login').on('click', e => {
  e.preventDefault();
  const email = $('#email_login').val().trim();
  const pass  = $('#password_login').val().trim();
  if (!email || !pass) { alert('נא למלא את כל השדות'); return; }

  const user = users.find(u => u.login(email, pass));
  if (user) {
    
    $('.page-section').hide();
    $('#game-configuration').show();

        currentUser = user;       // Save the user
        highScores  = [];           // reset scores history
        resetGame();

  } else alert('אימייל או סיסמה שגויים');
  $('#email_login,#password_login').val('');
});



/* ---- register form ---- */
$('#submit_register').on('click', e => {
  e.preventDefault();
  const f = id => $(`#${id}`).val().trim();
  const account = f('register_account_name');
  const pass    = f('register_password');
  const vpass   = f('register_validate_password');
  const name    = f('register_name');
  const lname   = f('register_family_name');
  const email   = f('register_email');
  const dob     = f('register_dob');

  if (!account||!pass||!vpass||!name||!lname||!email||!dob) {
    alert('יש למלא את כלל השדות'); return;
  }
  if (/\d/.test(name)||/\d/.test(lname)) { alert('השם מכיל מספרים'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('אימייל לא תקין'); return; }
  if (!( /[A-Za-z]/.test(pass) && /\d/.test(pass) && pass.length>=8 )) {
    alert('סיסמה חייבת לפחות 8 תווים, אות ומספר'); return;
  }
  if (pass!==vpass){ alert('הסיסמאות אינן תואמות'); return; }

  users.push(new User(account,pass,name,lname,email,dob));
  $('.page-section').hide(); $('#game-configuration').show();
  $('#register_form input').val('');
});

/* --------------- game‑configuration form --------------- */
$('#submit_game_configuration').on('click', e =>{
  e.preventDefault();
  backgroundMusic.pause();
  const chosen = $('#shoot_key').val().trim();
  if (chosen) {
    shootKey = chosen === 'Space' ? ' ' : chosen;
  }

  duration     = +$('input[name="duration"]').val() || 2; 

  handleNewGame();

  $('.page-section').hide(); $('#game').show();
  loop();
});

$('#shoot_key').on('keydown', e=>{
  e.preventDefault();
  shootKey = e.key;
  $('#shoot_key').val(e.key===' ' ? 'Space' : e.key);
});

/* -------------- new Game btn(PANEL) --------------- */
$(document).ready(function() {
    $('#newGameButton').on('click', function() {
      handleNewGame();
      highScores = [];                  
    });
  });


  $(document).on('keydown', function(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      $('#myModal').hide();
    }
  });
  
/* -------------- new Game btn(EndGame Overlay) --------------- */

  $(document).ready(function() {
    $('#newGameBtn').on('click', function() {
      handleNewGame();
    });
  });
  

  
/* --------------- core functions --------------- */
function handleNewGame(){
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    $('#gameOverlay').hide();
    resetGame();
    loop();
  }
  

  // --- Reset game variables, Everytime before starting new game --- //
  
  function resetGame() {
    bullets = []; enemyBullets = []; enemies = [];
    score = 0;
    health = 3;
    gameOver = false;
    win = false;
    enemyDirection = 1;
    startTime = Date.now();
    lastEnemyShootTime = startTime;
    ship.started = false;
    speedUps = 0;
    lastSpeedUpTime = Date.now();
    enemySpeed = 2;         
    enemyShootCooldown = 1000; 
    


    ship.x = Math.random() * (canvas.width - ship.width);
    ship.y = canvas.height - ship.height;
  
    // Build enemy grid
    const scale = 1.5, radius = 10 * scale, spacing = 40 * scale, rows = 4, cols = 5;
    const baseSpeed = 0.8 * scale;  
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        let tint;
        if      (idx <  5) tint = 'red';
        else if (idx < 10) tint = 'purple';
        else if (idx < 15) tint = 'cyan';
        else               tint = 'white';

        enemies.push({
            x: 50 + c*spacing,
            y: 50 + r*spacing,
            radius,
            score: 20 - 5*r,
            dx:  baseSpeed,   
            dy:  baseSpeed ,   
            tintColor: tint    

          });
      }
    }
}

  function shoot() {
    if (!canShoot) return;
    const bulletSpeed = 1.5;
    bullets.push({
      x:  ship.x,
      y:  ship.y,
      vx: bulletSpeed,
      vy: -bulletSpeed
    });
    fireSound.play();
    canShoot = false;
    setTimeout(() => canShoot = true, 300);
  }

  function enemyShoot(){
    const now = Date.now();
    const ready = enemyBullets.length === 0
      || enemyBullets[0].y > canvas.height * 0.75;
  
    if (ready && now - lastEnemyShootTime > enemyShootCooldown) {
      const shooter = enemies[Math.floor(Math.random() * enemies.length)];
      if (shooter) {
        const speed = 1.5;    // halve it
        const dirX  = Math.random() < 0.5 ? -1 : 1;
        enemyBullets.push({
          x:  shooter.x,
          y:  shooter.y,
          vx: speed * dirX,   
          vy: speed           
        });
        lastEnemyShootTime = now;
      }
    }
  }
  

function update(){
  /* player movement */
  if(keys.ArrowLeft && ship.x>0) ship.x-=ship.speed;
  if(keys.ArrowRight&& ship.x<canvas.width-ship.width) ship.x+=ship.speed;
  if(keys.ArrowUp   && ship.y>canvas.height*0.6) ship.y-=ship.speed;
  if(keys.ArrowDown && ship.y<canvas.height-ship.height) ship.y+=ship.speed;

  /* shoot */
  if (keys[shootKey]) {
    shoot();
    delete keys[shootKey];
  }
  /* update bullets */
bullets.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
  });
  bullets = bullets.filter(b =>
    b.x >= 0 && b.x <= canvas.width &&
    b.y >= 0
  );
  

  /* collision bullets vs enemies */
  for(let i=enemies.length-1;i>=0;i--){
    for(let j=bullets.length-1;j>=0;j--){
      const dx=enemies[i].x-bullets[j].x, dy=enemies[i].y-bullets[j].y;
      if(Math.hypot(dx,dy)<enemies[i].radius){
        score   += enemies[i].score;        
        hitSound.play();
        enemies.splice(i,1); bullets.splice(j,1);
        break;
      }
    }
  }
  // --- enemies true-diagonal + bounded bounce ---
  const halfY = canvas.height * 0.5;
  enemies.forEach(e => {
    // step diagonally
    e.x += e.dx;
    e.y += e.dy;

    // if any hits left or right edge, flip horizontal direction
    if (e.x - e.radius <= 0 || e.x + e.radius >= canvas.width) {
      e.dx = -e.dx;
    }
    // if any hits the top (y ≤ 0), send it downwards
    if (e.y - e.radius <= 0) {
      e.dy = Math.abs(e.dy);
    }
    // if any hits the half-height line, send it upwards
    if (e.y + e.radius >= halfY) {
      e.dy = -Math.abs(e.dy);
    }
  });


  /* enemy shooting + move bullets */
  enemyShoot();
enemyBullets.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
  });

  enemyBullets = enemyBullets.filter(b =>
    b.x >= 0 && b.x <= canvas.width &&
    b.y <= canvas.height
  );
  
  /* collision enemy bullet vs player */
  for(let i=enemyBullets.length-1;i>=0;i--){
    const d=Math.hypot(enemyBullets[i].x-ship.x,enemyBullets[i].y-ship.y);
    if(d<ship.width/2){
      enemyBullets.splice(i,1);
       health--;
       playerGotHitSound.play();
      ship.x=Math.random()*(canvas.width-ship.width);
       ship.y=canvas.height-ship.height;
      if(health<=0) {
        gameOver=true;
        lostSound.play();
    }
    }
  }

  /* check speed up */
  const now = Date.now();
  if (now - lastSpeedUpTime > speedUpInterval && speedUps < maxSpeedUps) {
    enemySpeed += 2;       
    enemyBullets.forEach(bullet => bullet.speed += 1);
    lastSpeedUpTime = now;
    speedUps++;
  }

  /* win / time‑out */
  if(enemies.length===0){ gameOver=true; win=true; }
  const elapsed = (Date.now()-startTime)/1000;
  if(health<=0){
    lostSound.play();
    endGame('You Lost!');
    }
    else if (elapsed > duration * 60) {
        endGame(score < 100 ? `You can do better - ${score}` : 'Winner!');
      }
  else if(enemies.length===0 ){ 
    endGame('Champion!');
     win=true;
    }
    
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  /* ship */
  ctx.drawImage(shipImg, ship.x-ship.width/2, ship.y, ship.width, ship.height);

  /* player bullets */
  ctx.fillStyle='white';
  bullets.forEach(b=>{ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill();});

  enemies.forEach(e => {
    const size = e.radius * 2;
    // base image
    ctx.drawImage(enemyImg,
      e.x - e.radius, e.y - e.radius,
      size, size);

    // one-time tint
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle   = e.tintColor;
    ctx.fillRect(
      e.x - e.radius, e.y - e.radius,
      size, size
    );
    ctx.restore();
  });

  /* enemy bullets */
  ctx.fillStyle='red';
  enemyBullets.forEach(b=>{ctx.beginPath();
    ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();});

  /* score/time panel */
  const panel={x:canvas.width-230,y:10,w:220,h:90};
  ctx.fillStyle='white';
  ctx.fillRect(panel.x,panel.y,panel.w,panel.h);

  ctx.fillStyle = '#000';
  ctx.font = '18px Arial';
  ctx.color = 'blue'
  ctx.textAlign = 'center';       
  ctx.textBaseline = 'top';      

  const centerX = panel.x + panel.w/2;
  ctx.fillText(`-- ${score} points`, centerX, panel.y+10);  
  const remain = Math.max(duration*60 - Math.floor((Date.now()-startTime)/1000), 0);
  const m = String(Math.floor(remain/60)).padStart(2,'0');
  const s = String(remain%60).padStart(2,'0');
  ctx.fillText(`-- Time Left: ${m}:${s}`, centerX, panel.y+35);
  ctx.fillText('❤'.repeat(health), centerX, panel.y+60);
}

function loop() {
    if (!gameOver) {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    }
  }

function endGame(msg){               
    gameOver = true;
  
    if (msg && msg !== 'Game Cancelled') {
        highScores.push(score);
        highScores.sort((a, b) => b - a); 
    }
  
    $('#finalMsg').text(msg);
    const list = $('#scoreList').empty();
    highScores.forEach((s,i)=> list.append(`<li>${i+1}. ${s} pts</li>`));
    $('#gameOverlay').show();
    $('#newGameBtn').show();
  }
  
  
/* --------------- start first screen --------------- */
resetGame();
showSection('welcome');
// ------------------------------------
// MUSIC CONTROL: play only on #game
// ------------------------------------
const gameSection = document.getElementById('game');
const musicObserver = new MutationObserver(() => {
  const isVisible = window.getComputedStyle(gameSection).display !== 'none';
  if (isVisible) {
    backgroundMusic.currentTime = 0;
    backgroundMusic.play();
  } else {
    endGame(""); // stop the game when not showing game
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }
});
musicObserver.observe(gameSection, {
  attributes: true,
  attributeFilter: ['style', 'class']
});
