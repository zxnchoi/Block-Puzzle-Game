# BLOCK PUZZLE GAME

## File Structure

```
Block Puzzle Game/
├── Login.html              # Login/Signup page
├── Login-style.css         # Login page styles
├── Login-script.js         # Login page JavaScript
├── Home-index.html         # Home page (after login)
├── Home-style.css          # Home page styles
├── Home-script.js          # Home page JavaScript
├── Game-index.html         # Game page
├── Game-style.css          # Game page styles
├── Game-script.js          # Game logic and mechanics
├── Database.js             # Database API client (PHP/MySQL)
├── api/
│   ├── config.php          # Database configuration
│   ├── users.php           # Users API endpoints
│   ├── leaderboard.php     # Leaderboard API endpoints
│   └── session.php         # Session management API
└── README.md               # This file
```

## Database Setup (MySQL)

### SQL Commands to Create Database

Run these commands in your MySQL database (phpMyAdmin, MySQL Workbench, or command line):

```sql
-- Create the database
CREATE DATABASE IF NOT EXISTS block_puzzle_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE block_puzzle_game;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    strand VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    games_played INT NOT NULL DEFAULT 0,
    total_score INT NOT NULL DEFAULT 0,
    high_score INT NOT NULL DEFAULT 0,
    INDEX idx_email (email),
    INDEX idx_high_score (high_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    INDEX idx_token (session_token),
    INDEX idx_expires (expires_at),
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- LEADERBOARD TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leaderboard (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    strand VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    score INT NOT NULL DEFAULT 0,
    lines INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'easy',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date DATE NOT NULL,
    INDEX idx_user (user_id),
    INDEX idx_score (score DESC),
    INDEX idx_user_score (user_id, score DESC),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Important Notes About Leaderboard

The leaderboard maintains **ONLY ONE entry per user** - the highest score. When a user submits a new score:
- If higher than current high score → Updates the existing entry
- If lower → Score is not added (only highest score is kept)

This is enforced by the API and can also be cleaned up using:

```sql
-- Clean up duplicate entries (keeps only highest score per user)
DELETE l1 FROM leaderboard l1
INNER JOIN leaderboard l2
WHERE l1.user_id = l2.user_id
AND l1.score < l2.score
AND l1.id != l2.id;
```

## Database Configuration

Edit `api/config.php` to configure your database connection:

```php
define('DB_HOST', 'localhost');     // Database host
define('DB_NAME', 'block_puzzle_game');  // Database name
define('DB_USER', 'root');           // Database username
define('DB_PASS', '');               // Database password
define('DB_CHARSET', 'utf8mb4');     // Character set
```

## API Endpoints

### Users API (`api/users.php`)

| Method | Action | Parameters | Description |
|--------|--------|------------|-------------|
| GET | `findByEmail` | `email` | Find user by email |
| GET | `getAll` | - | Get all users |
| GET | `current` | `session_token` | Get current user from session |
| POST | `create` | `name`, `strand`, `email` | Create new user account |
| POST | `login` | `email` | Login with email |
| PUT | - | `email`, `session_token`, fields to update | Update user data |
| DELETE | - | `session_token` | Logout |

### Leaderboard API (`api/leaderboard.php`)

| Method | Action | Parameters | Description |
|--------|--------|------------|-------------|
| GET | `getTop` | `limit` (optional, default 10) | Get top scores (1 per user) |
| GET | `getAll` | - | Get all scores (1 per user) |
| GET | `getByUser` | `user_id` | Get user's high score |
| POST | - | `user_id`, `name`, `strand`, `email`, `score`, `lines`, `level`, `difficulty`, `session_token` | Submit score |
| DELETE | - | `score_id`, `session_token` | Delete own score |
| PUT | `cleanup` | - | Clean up duplicate entries |

### Session API (`api/session.php`)

| Method | Action | Parameters | Description |
|--------|--------|------------|-------------|
| GET | - | `session_token` | Validate session |
| PUT | - | `session_token` | Refresh session expiry |
| DELETE | - | `session_token` | Logout/destroy session |

## How to Use

1. **Setup Database**: Run the SQL commands above in your MySQL database
2. **Configure**: Edit `api/config.php` with your database credentials
3. **Start Server**: Use a PHP-enabled server (XAMPP, WAMP, or built-in PHP server)
   ```bash
   cd /path/to/project
   php -S localhost:8000
   ```
4. **Access**: Open `http://localhost:8000/Login.html` in your browser

## Features

### Authentication
- Email-based signup/login
- Session-based authentication (7-day expiry)
- Automatic session validation

### Leaderboard
- Only highest score per user is displayed
- Real-time score updates
- Ranked by score (highest first)

### Game Mechanics
- Classic block puzzle gameplay
- Progressive difficulty quiz system
- Timer-based questions
- Score tracking and persistence

## Troubleshooting

### "Database connection failed"
- Check database credentials in `api/config.php`
- Ensure MySQL server is running
- Verify database exists

### "Session expired or invalid"
- Clear browser cookies and localStorage
- Log in again

### API returns 404
- Ensure URL rewriting is enabled (for clean URLs)
- Or access via `api/users.php?action=...`

## Security Considerations

1. **Password Hashing**: In production, add password authentication
2. **HTTPS**: Use SSL/TLS in production
3. **Input Validation**: All inputs are validated in the API
4. **Session Security**: Session tokens are cryptographically secure random bytes
5. **SQL Injection**: Uses prepared statements (PDO)

## Future Enhancements

1. Add password authentication with bcrypt
2. Implement email verification
3. Add social login (Google OAuth)
4. Real-time leaderboard with WebSocket
5. User profiles and statistics
6. Achievement system
7. Multiplayer mode
