const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class Database {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'kabini_ai',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      console.log('Connected to PostgreSQL database.');
      client.release();
      
      // Initialize tables after connection
      await this.initializeTables();
    } catch (err) {
      console.error('Error connecting to database:', err);
      throw err;
    }
  }

  async initializeTables() {
    const client = await this.pool.connect();
    
    try {
      console.log('Initializing database tables...');

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

      // AI visibility runs (per competitor, per run) - use _v2 to avoid type conflicts
      await client.query(`
        CREATE TABLE IF NOT EXISTS ai_visibility_runs_v2 (
          id TEXT PRIMARY KEY,
          company TEXT NOT NULL,
          competitor TEXT NOT NULL,
          total_score REAL NOT NULL,
          ai_scores JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Visibility logs for period badges (metric/value time-series)
      await client.query(`
        CREATE TABLE IF NOT EXISTS visibility_logs (
          id TEXT PRIMARY KEY,
          competitor TEXT NOT NULL,
          metric TEXT NOT NULL,
          value REAL NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_vis_runs_competitor_v2 ON ai_visibility_runs_v2(competitor)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_vis_runs_created_at_v2 ON ai_visibility_runs_v2(created_at)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_vis_logs_competitor ON visibility_logs(competitor)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_vis_logs_metric ON visibility_logs(metric)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_vis_logs_created_at ON visibility_logs(created_at)`);

      console.log('Database tables initialized successfully!');
    } catch (err) {
      console.error('Error initializing tables:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  // User Integrations (OAuth) Methods
  async saveOrUpdateIntegration({ userId, provider, accessToken, refreshToken, expiresAt, scope, siteId, siteName, data }) {
    const client = await this.pool.connect();
    
    try {
      const id = require('crypto').randomUUID();
      const query = `
        INSERT INTO user_integrations (id, user_id, provider, access_token, refresh_token, expires_at, scope, site_id, site_name, data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT(user_id, provider) DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          expires_at = EXCLUDED.expires_at,
          scope = EXCLUDED.scope,
          site_id = COALESCE(EXCLUDED.site_id, user_integrations.site_id),
          site_name = COALESCE(EXCLUDED.site_name, user_integrations.site_name),
          data = EXCLUDED.data,
          updated_at = CURRENT_TIMESTAMP
      `;

      const result = await client.query(query, [
        id,
        userId,
        provider,
        accessToken || '',
        refreshToken || null,
        expiresAt || null,
        Array.isArray(scope) ? scope.join(' ') : (scope || null),
        siteId || null,
        siteName || null,
        data ? JSON.stringify(data) : null
      ]);

      return result.rows[0]?.id || id;
    } finally {
      client.release();
    }
  }

  async getIntegration(userId, provider) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM user_integrations WHERE user_id = $1 AND provider = $2 LIMIT 1',
        [userId, provider]
      );
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      try {
        row.data = row.data ? JSON.parse(row.data) : null;
      } catch { 
        row.data = null; 
      }
      
      return row;
    } finally {
      client.release();
    }
  }

  // User Management Methods
  async createOrUpdateUser(userData) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO users 
        (id, email, name, display_name, tenant_id, roles, is_active, last_login_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT(id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          display_name = EXCLUDED.display_name,
          tenant_id = EXCLUDED.tenant_id,
          roles = EXCLUDED.roles,
          is_active = EXCLUDED.is_active,
          last_login_at = EXCLUDED.last_login_at,
          updated_at = EXCLUDED.updated_at
      `;

      const result = await client.query(query, [
        userData.id,
        userData.email,
        userData.name,
        userData.displayName,
        userData.tenantId,
        JSON.stringify(userData.roles),
        true, // is_active
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      return result.rows[0]?.id || userData.id;
    } finally {
      client.release();
    }
  }

  // Create user for local authentication
  async createUser(userData) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO users 
        (id, email, name, display_name, password, tenant_id, roles, is_active, email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      const result = await client.query(query, [
        userData.id,
        userData.email,
        userData.name,
        userData.displayName,
        userData.password,
        userData.tenantId || null,
        JSON.stringify(userData.roles),
        userData.isActive ? true : false,
        userData.emailVerified ? true : false,
        userData.createdAt,
        userData.updatedAt
      ]);

      return result.rows[0]?.id || userData.id;
    } finally {
      client.release();
    }
  }

  // Update user email verification status
  async updateEmailVerificationStatus(userId, isVerified) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET email_verified = $1, updated_at = NOW()
        WHERE id = $2
      `;

      await client.query(query, [isVerified, userId]);
      return true;
    } finally {
      client.release();
    }
  }

  // Get user by email verification token
  async getUserByVerificationToken(token) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT u.*, vt.expires_at as token_expires_at
        FROM users u
        JOIN email_verification_tokens vt ON u.id = vt.user_id
        WHERE vt.token = $1 AND vt.used = false
      `;

      const result = await client.query(query, [token]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Create email verification token
  async createEmailVerificationToken(userId, token, expiresAt) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO email_verification_tokens (user_id, token, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
        token = EXCLUDED.token,
        expires_at = EXCLUDED.expires_at,
        used = false,
        created_at = NOW()
      `;

      await client.query(query, [userId, token, expiresAt]);
      return true;
    } finally {
      client.release();
    }
  }

  // Mark email verification token as used
  async markEmailVerificationTokenAsUsed(token) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE email_verification_tokens 
        SET used = true, used_at = NOW()
        WHERE token = $1
      `;

      const result = await client.query(query, [token]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  // Update user last login
  async updateUserLastLogin(userId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET last_login_at = $1, updated_at = $2
        WHERE id = $3
      `;

      const result = await client.query(query, [
        new Date().toISOString(),
        new Date().toISOString(),
        userId
      ]);

      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async getUserById(userId) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      row.roles = JSON.parse(row.roles || '["user"]');
      return row;
    } finally {
      client.release();
    }
  }

  async getUserByEmail(email) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        ...row,
        roles: JSON.parse(row.roles || '["user"]')
      };
    } finally {
      client.release();
    }
  }

  async saveUserSession(userId, refreshToken, expiresAt) {
    const client = await this.pool.connect();
    
    try {
      const sessionId = require('crypto').randomUUID();
      const query = `
        INSERT INTO user_sessions 
        (id, user_id, refresh_token, expires_at)
        VALUES ($1, $2, $3, $4)
      `;

      const result = await client.query(query, [sessionId, userId, refreshToken, expiresAt]);
      return result.rows[0]?.id || sessionId;
    } finally {
      client.release();
    }
  }

  async getUserSessionByRefreshToken(refreshToken) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('SELECT * FROM user_sessions WHERE refresh_token = $1', [refreshToken]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async deleteUserSession(refreshToken) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('DELETE FROM user_sessions WHERE refresh_token = $1', [refreshToken]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async deleteExpiredUserSessions() {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('DELETE FROM user_sessions WHERE expires_at < $1', [new Date().toISOString()]);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  // Password reset token methods
  async createPasswordResetToken(userId, token, expiresAt) {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const result = await client.query(
        'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
        [id, userId, token, expiresAt]
      );
      return id;
    } finally {
      client.release();
    }
  }

  async getPasswordResetToken(token) {
    const client = await this.pool.connect();
    
    try {
      console.log('🔍 [Database] Looking up token:', `${token.substring(0, 10)}...`);
      
      const result = await client.query(
        'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW() AT TIME ZONE \'UTC\'',
        [token]
      );
      
      console.log('🔍 [Database] Query result:', {
        found: result.rows.length > 0,
        token: result.rows[0] ? {
          id: result.rows[0].id,
          user_id: result.rows[0].user_id,
          used: result.rows[0].used,
          expires_at: result.rows[0].expires_at,
          created_at: result.rows[0].created_at
        } : null
      });
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async markPasswordResetTokenAsUsed(token) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'UPDATE password_reset_tokens SET used = true WHERE token = $1',
        [token]
      );
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async deleteExpiredPasswordResetTokens() {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM password_reset_tokens WHERE expires_at < NOW() AT TIME ZONE \'UTC\' OR used = true'
      );
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  async updateUserPassword(userId, hashedPassword) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, userId]
      );
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  // Private method for saving session without transaction (for bulk operations)
  async _saveSessionWithoutTransaction(sessionData) {
    const client = await this.pool.connect();
    
    try {
      // Insert session
      const sessionResult = await client.query(`
        INSERT INTO sessions 
        (id, user_id, name, type, timestamp, model, question_provider, question_model, answer_provider, answer_model, blog_content, blog_url, total_input_tokens, total_output_tokens)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        sessionData.id,
        sessionData.userId,
        sessionData.name,
        sessionData.type,
        sessionData.timestamp,
        sessionData.model,
        sessionData.questionProvider || null,
        sessionData.questionModel || null,
        sessionData.answerProvider || null,
        sessionData.answerModel || null,
        sessionData.blogContent,
        sessionData.blogUrl,
        sessionData.totalInputTokens,
        sessionData.totalOutputTokens
      ]);

      // Insert session statistics
      const stats = sessionData.statistics || {};
      await client.query(`
        INSERT INTO session_statistics 
        (session_id, total_questions, avg_accuracy, total_cost)
        VALUES ($1, $2, $3, $4)
      `, [
        sessionData.id,
        typeof stats.totalQuestions === 'number' ? stats.totalQuestions : 0,
        typeof stats.avgAccuracy === 'number' ? stats.avgAccuracy : 0,
        typeof stats.totalCost === 'number' ? stats.totalCost : 0
      ]);

      // Insert QA data
      const qaArray = Array.isArray(sessionData.qaData) ? sessionData.qaData : [];
      for (let i = 0; i < qaArray.length; i++) {
        const qa = qaArray[i];
        await client.query(`
          INSERT INTO qa_data 
          (session_id, question, answer, accuracy, sentiment, input_tokens, output_tokens, total_tokens, cost, question_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          sessionData.id,
          qa.question || '',
          qa.answer || '',
          qa.accuracy || '',
          qa.sentiment || '',
          qa.inputTokens || 0,
          qa.outputTokens || 0,
          qa.totalTokens || 0,
          qa.cost || 0,
          i
        ]);
      }

      return sessionData.id;
    } finally {
      client.release();
    }
  }

  // Updated Session Management Methods
  async saveSession(sessionData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      try {
        const result = await this._saveSessionWithoutTransaction(sessionData);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } finally {
      client.release();
    }
  }

  async getSessionsByType(type, userId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT s.*, ss.total_questions, ss.avg_accuracy, ss.total_cost
        FROM sessions s
        LEFT JOIN session_statistics ss ON s.id = ss.session_id
        WHERE s.type = $1 AND s.user_id = $2
        ORDER BY s.timestamp DESC
      `;

      const result = await client.query(query, [type, userId]);
      
      const sessions = [];
      for (const row of result.rows) {
        const qaData = await this.getQADataBySessionId(row.id);
        sessions.push({
          id: row.id,
          name: row.name,
          type: row.type,
          timestamp: row.timestamp,
          model: row.model,
          questionProvider: row.question_provider,
          questionModel: row.question_model,
          answerProvider: row.answer_provider,
          answerModel: row.answer_model,
          blogContent: row.blog_content,
          blogUrl: row.blog_url,
          totalInputTokens: row.total_input_tokens,
          totalOutputTokens: row.total_output_tokens,
          qaData,
          statistics: {
            totalQuestions: row.total_questions,
            avgAccuracy: row.avg_accuracy,
            totalCost: row.total_cost
          }
        });
      }
      
      return sessions;
    } finally {
      client.release();
    }
  }

  async getSessionsByTypeWithFilters(type, userId, filters) {
    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT s.*, ss.total_questions, ss.avg_accuracy, ss.total_cost
        FROM sessions s
        LEFT JOIN session_statistics ss ON s.id = ss.session_id
        WHERE s.type = $1 AND s.user_id = $2
      `;

      const params = [type, userId];
      const conditions = [];
      let paramIndex = 3;

      // Date range filters
      if (filters.fromDate) {
        conditions.push(`s.timestamp >= $${paramIndex++}`);
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        conditions.push(`s.timestamp <= $${paramIndex++}`);
        params.push(filters.toDate + 'T23:59:59');
      }

      // LLM Provider filter
      if (filters.llmProvider) {
        if (type === 'question') {
          conditions.push(`s.question_provider = $${paramIndex++}`);
        } else {
          conditions.push(`s.answer_provider = $${paramIndex++}`);
        }
        params.push(filters.llmProvider);
      }

      // LLM Model filter
      if (filters.llmModel) {
        if (type === 'question') {
          conditions.push(`s.question_model = $${paramIndex++}`);
        } else {
          conditions.push(`s.answer_model = $${paramIndex++}`);
        }
        params.push(filters.llmModel);
      }

      // Blog link filter
      if (filters.blogLink) {
        conditions.push(`s.blog_url LIKE $${paramIndex++}`);
        params.push(`%${filters.blogLink}%`);
      }

      // Search filter (for date/time text search)
      if (filters.search) {
        conditions.push(`s.timestamp LIKE $${paramIndex++}`);
        params.push(`%${filters.search}%`);
      }

      // Add conditions to query
      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      query += ' ORDER BY s.timestamp DESC';

      const result = await client.query(query, params);
      
      const sessions = [];
      for (const row of result.rows) {
        const qaData = await this.getQADataBySessionId(row.id);
        sessions.push({
          id: row.id,
          name: row.name,
          type: row.type,
          timestamp: row.timestamp,
          model: row.model,
          questionProvider: row.question_provider,
          questionModel: row.question_model,
          answerProvider: row.answer_provider,
          answerModel: row.answer_model,
          blogContent: row.blog_content,
          blogUrl: row.blog_url,
          totalInputTokens: row.total_input_tokens,
          totalOutputTokens: row.total_output_tokens,
          qaData,
          statistics: {
            totalQuestions: row.total_questions,
            avgAccuracy: row.avg_accuracy,
            totalCost: row.total_cost
          }
        });
      }
      
      return sessions;
    } finally {
      client.release();
    }
  }

  async getSessionById(sessionId, userId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT s.*, ss.total_questions, ss.avg_accuracy, ss.total_cost
        FROM sessions s
        LEFT JOIN session_statistics ss ON s.id = ss.session_id
        WHERE s.id = $1 AND s.user_id = $2
      `;

      const result = await client.query(query, [sessionId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const qaData = await this.getQADataBySessionId(row.id);
      
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        timestamp: row.timestamp,
        model: row.model,
        questionProvider: row.question_provider,
        questionModel: row.question_model,
        answerProvider: row.answer_provider,
        answerModel: row.answer_model,
        blogContent: row.blog_content,
        blogUrl: row.blog_url,
        totalInputTokens: row.total_input_tokens,
        totalOutputTokens: row.total_output_tokens,
        qaData,
        statistics: {
          totalQuestions: row.total_questions,
          avgAccuracy: row.avg_accuracy,
          totalCost: row.total_cost
        }
      };
    } finally {
      client.release();
    }
  }

  async deleteSession(sessionId, userId) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('DELETE FROM sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async getSessionCount(type, userId) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM sessions WHERE type = $1 AND user_id = $2', [type, userId]);
      return parseInt(result.rows[0]?.count || '0');
    } finally {
      client.release();
    }
  }

  // Get QA data for a specific session
  async getQADataBySessionId(sessionId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          question, answer, accuracy, sentiment, 
          input_tokens, output_tokens, total_tokens, cost
        FROM qa_data 
        WHERE session_id = $1 
        ORDER BY question_order
      `;

      const result = await client.query(query, [sessionId]);
      
      return result.rows.map(row => ({
        question: row.question,
        answer: row.answer,
        accuracy: row.accuracy,
        sentiment: row.sentiment,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        totalTokens: row.total_tokens,
        cost: row.cost
      }));
    } finally {
      client.release();
    }
  }

  // Bulk save sessions
  async bulkSaveSessions(sessions) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      let successful = 0;
      let failed = 0;

      try {
        for (const sessionData of sessions) {
          try {
            await this._saveSessionWithoutTransaction(sessionData);
            results.push({ id: sessionData.id, success: true });
            successful++;
          } catch (error) {
            results.push({ id: sessionData.id, success: false, error: error.message });
            failed++;
          }
        }
        
        await client.query('COMMIT');
        
        return {
          success: true,
          results,
          summary: {
            total: sessions.length,
            successful,
            failed
          }
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } finally {
      client.release();
    }
  }

  // Competitor Analysis Methods
  async saveCompetitorAnalysis(analysisData) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO competitor_analyses 
        (id, user_id, domain, url, analysis, content_length, title, description, last_updated, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      const result = await client.query(query, [
        analysisData.id,
        analysisData.userId,
        analysisData.domain,
        analysisData.url,
        JSON.stringify(analysisData.analysis),
        analysisData.contentLength,
        analysisData.title,
        analysisData.description,
        analysisData.lastUpdated,
        analysisData.createdAt
      ]);

      return result.rows[0]?.id || analysisData.id;
    } finally {
      client.release();
    }
  }

  async getCompetitorAnalyses(userId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM competitor_analyses 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [userId]);
      
      return result.rows.map(row => ({
        ...row,
        analysis: JSON.parse(row.analysis || '{}')
      }));
    } finally {
      client.release();
    }
  }

  async getCompetitorAnalysis(id, userId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM competitor_analyses 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await client.query(query, [id, userId]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        ...row,
        analysis: JSON.parse(row.analysis || '{}')
      };
    } finally {
      client.release();
    }
  }

  async deleteCompetitorAnalysis(id, userId) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM competitor_analyses WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  // Comprehensive Analysis Methods
  async saveComprehensiveAnalysis(analysisData) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO comprehensive_analyses 
        (id, user_id, domain, competitors, industry, total_competitors, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const result = await client.query(query, [
        analysisData.id,
        analysisData.userId,
        analysisData.domain,
        JSON.stringify(analysisData.competitors),
        analysisData.industry,
        analysisData.totalCompetitors,
        analysisData.createdAt
      ]);

      return result.rows[0]?.id || analysisData.id;
    } finally {
      client.release();
    }
  }

  async getComprehensiveAnalyses(userId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM comprehensive_analyses 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [userId]);
      
      return result.rows.map(row => ({
        ...row,
        competitors: JSON.parse(row.competitors || '[]')
      }));
    } finally {
      client.release();
    }
  }

  async getComprehensiveAnalysis(id, userId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM comprehensive_analyses 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await client.query(query, [id, userId]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        ...row,
        competitors: JSON.parse(row.competitors || '[]')
      };
    } finally {
      client.release();
    }
  }

  async deleteComprehensiveAnalysis(id, userId) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM comprehensive_analyses WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  // Smart Analysis Methods
  async saveSmartAnalysis(analysisData) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO smart_analyses 
        (id, user_id, target_domain, target_analysis, competitors, user_position, total_analyzed, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      const result = await client.query(query, [
        analysisData.id,
        analysisData.userId,
        analysisData.targetDomain,
        JSON.stringify(analysisData.targetAnalysis),
        JSON.stringify(analysisData.competitors),
        analysisData.userPosition,
        analysisData.totalAnalyzed,
        analysisData.createdAt
      ]);

      return result.rows[0]?.id || analysisData.id;
    } finally {
      client.release();
    }
  }

  async getSmartAnalyses(userId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM smart_analyses 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [userId]);
      
      return result.rows.map(row => ({
        ...row,
        targetAnalysis: JSON.parse(row.target_analysis || '{}'),
        competitors: JSON.parse(row.competitors || '[]')
      }));
    } finally {
      client.release();
    }
  }

  async getSmartAnalysis(id, userId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM smart_analyses 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await client.query(query, [id, userId]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        ...row,
        targetAnalysis: JSON.parse(row.target_analysis || '{}'),
        competitors: JSON.parse(row.competitors || '[]')
      };
    } finally {
      client.release();
    }
  }

  async deleteSmartAnalysis(id, userId) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM smart_analyses WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  // Structure Analysis Methods
  async saveStructureAnalysis(analysisData) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO structure_analyses 
        (id, user_id, url, content_hash, analysis, full_page_html, original_content)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT(id) DO UPDATE SET
          url = EXCLUDED.url,
          content_hash = EXCLUDED.content_hash,
          analysis = EXCLUDED.analysis,
          full_page_html = EXCLUDED.full_page_html,
          original_content = EXCLUDED.original_content,
          last_accessed = CURRENT_TIMESTAMP
      `;

      const result = await client.query(query, [
        analysisData.id,
        analysisData.userId,
        analysisData.url || null,
        analysisData.contentHash,
        JSON.stringify(analysisData.analysis),
        analysisData.fullPageHtml || null,
        analysisData.originalContent || null
      ]);

      return result.rows[0]?.id || analysisData.id;
    } finally {
      client.release();
    }
  }

  async getLastStructureAnalysis(userId, url) {
    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT * FROM structure_analyses 
        WHERE user_id = $1
      `;
      const params = [userId];

      if (url) {
        query += ` AND url = $2`;
        params.push(url);
      }

      query += ` ORDER BY last_accessed DESC LIMIT 1`;

      const result = await client.query(query, params);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        url: row.url,
        contentHash: row.content_hash,
        analysis: JSON.parse(row.analysis || '{}'),
        fullPageHtml: row.full_page_html,
        originalContent: row.original_content,
        lastAccessed: row.last_accessed,
        createdAt: row.created_at
      };
    } finally {
      client.release();
    }
  }

  async getStructureAnalysisById(id, userId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM structure_analyses 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await client.query(query, [id, userId]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        url: row.url,
        contentHash: row.content_hash,
        analysis: JSON.parse(row.analysis || '{}'),
        fullPageHtml: row.full_page_html,
        originalContent: row.original_content,
        lastAccessed: row.last_accessed,
        createdAt: row.created_at
      };
    } finally {
      client.release();
    }
  }

  async deleteStructureAnalysis(id, userId) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM structure_analyses WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  // AI Visibility Runs Methods
  async saveAiVisibilityRun({ id, company, competitor, totalScore, aiScores }) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO ai_visibility_runs_v2 (id, company, competitor, total_score, ai_scores)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(query, [id, company, competitor, totalScore, JSON.stringify(aiScores || {})]);
      return id;
    } finally {
      client.release();
    }
  }

  async getAiVisibilityRunsByCompetitorBetween(competitor, fromIso, toIso) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT company, competitor, total_score, ai_scores, created_at
        FROM ai_visibility_runs_v2
        WHERE competitor = $1 AND created_at BETWEEN $2 AND $3
        ORDER BY created_at DESC
      `;
      const res = await client.query(query, [competitor, fromIso, toIso]);
      return res.rows.map(r => ({
        company: r.company,
        competitor: r.competitor,
        totalScore: Number(r.total_score) || 0,
        aiScores: (() => { try { return typeof r.ai_scores === 'object' ? r.ai_scores : JSON.parse(r.ai_scores || '{}'); } catch { return {}; } })(),
        createdAt: r.created_at
      }));
    } finally {
      client.release();
    }
  }

  // Visibility Logs Methods
  async saveVisibilityLog({ id, competitor, metric, value }) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO visibility_logs (id, competitor, metric, value)
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(query, [id, competitor, metric, value]);
      return id;
    } finally { client.release(); }
  }

  async getVisibilityLogsBetween(competitor, metric, fromIso, toIso) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT value, created_at FROM visibility_logs
        WHERE competitor = $1 AND metric = $2 AND created_at BETWEEN $3 AND $4
        ORDER BY created_at DESC
      `;
      const res = await client.query(query, [competitor, metric, fromIso, toIso]);
      return res.rows.map(r => ({ value: Number(r.value) || 0, createdAt: r.created_at }));
    } finally { client.release(); }
  }

  close() {
    return this.pool.end();
  }
}

module.exports = Database;
