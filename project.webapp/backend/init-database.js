const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kabini_ai',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

console.log('Initializing PostgreSQL database...');

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL database.');

    // Users table for both Microsoft Entra ID and local authentication
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        password TEXT,
        tenant_id TEXT,
        roles TEXT DEFAULT '["user"]',
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User sessions table for refresh tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Password reset tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('question', 'answer')),
        timestamp TEXT NOT NULL,
        model TEXT NOT NULL,
        question_provider TEXT,
        question_model TEXT,
        answer_provider TEXT,
        answer_model TEXT,
        blog_content TEXT,
        blog_url TEXT,
        total_input_tokens INTEGER DEFAULT 0,
        total_output_tokens INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // User integrations (OAuth tokens and provider metadata)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_integrations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at TIMESTAMP,
        scope TEXT,
        site_id TEXT,
        site_name TEXT,
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, provider),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Session statistics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_statistics (
        session_id TEXT PRIMARY KEY,
        total_questions INTEGER DEFAULT 0,
        avg_accuracy TEXT DEFAULT '',
        total_cost TEXT DEFAULT '0',
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // QA data table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qa_data (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT DEFAULT '',
        accuracy TEXT DEFAULT '',
        sentiment TEXT DEFAULT '',
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        question_order INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // Competitor analyses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS competitor_analyses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        domain TEXT NOT NULL,
        url TEXT NOT NULL,
        analysis TEXT NOT NULL,
        content_length INTEGER DEFAULT 0,
        title TEXT DEFAULT '',
        description TEXT DEFAULT '',
        last_updated TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Comprehensive analyses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comprehensive_analyses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        domain TEXT NOT NULL,
        competitors TEXT NOT NULL,
        industry TEXT,
        total_competitors INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Smart analyses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS smart_analyses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        target_domain TEXT NOT NULL,
        target_analysis TEXT NOT NULL,
        competitors TEXT NOT NULL,
        user_position INTEGER,
        total_analyzed INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Structure analyses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS structure_analyses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT,
        content_hash TEXT NOT NULL,
        analysis TEXT NOT NULL,
        full_page_html TEXT,
        original_content TEXT,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_qa_data_session_id ON qa_data(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_competitor_analyses_user_id ON competitor_analyses(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_competitor_analyses_domain ON competitor_analyses(domain)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_comprehensive_analyses_user_id ON comprehensive_analyses(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_comprehensive_analyses_domain ON comprehensive_analyses(domain)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_smart_analyses_user_id ON smart_analyses(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_smart_analyses_target_domain ON smart_analyses(target_domain)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_structure_analyses_user_id ON structure_analyses(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_structure_analyses_content_hash ON structure_analyses(content_hash)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_structure_analyses_url ON structure_analyses(url)`);

    console.log('Database tables created successfully!');
  } catch (err) {
    console.error('Error creating tables:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run the initialization
initializeDatabase()
  .then(() => {
    console.log('Database initialization completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  }); 