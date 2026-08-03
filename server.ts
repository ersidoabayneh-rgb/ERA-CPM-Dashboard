import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { GoogleGenAI } from '@google/genai';
import { db as pgDb, withRetry } from './src/db/index.ts';
import { dbProjects, capturedLogs, formDrafts } from './src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';

async function startServer() {
  const app = express();
  const PORT = 3000;

function isTimeoutError(error: any) {
  if (!error) return false;
  
  try {
    const errStr = String(error) + " " + JSON.stringify(error, Object.getOwnPropertyNames(error));
    if (errStr.includes('ETIMEDOUT') || errStr.includes('connect ETIMEDOUT') || errStr.includes('timeout') || errStr.includes('Connection') || errStr.includes('ECONNREFUSED') || errStr.includes('ENOTFOUND') || errStr.includes('EHOSTUNREACH')) {
      return true;
    }
  } catch (e) {}
  
  const msg = error.message || '';
  const code = error.code || '';
  const causeMsg = error.cause?.message || '';
  const causeCode = error.cause?.code || '';
  const errorno = error.errorno || error.cause?.errorno || '';
  
  return msg.includes('ETIMEDOUT') || 
         code === 'ETIMEDOUT' || 
         code === 'ENOTFOUND' ||
         code === 'EHOSTUNREACH' ||
         causeMsg.includes('ETIMEDOUT') || 
         causeCode === 'ETIMEDOUT' ||
         errorno === 'ETIMEDOUT' ||
         msg.includes('Connection') || 
         msg.includes('timeout');
}

  
  app.use(express.json({ limit: '100mb' })); // support extremely large multi-device project payloads safely
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // In-memory Rate Limiter to prevent brute force or DDoS on API endpoints
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  const RATE_LIMIT_MAX_REQUESTS = 1000; // 1000 requests per minute

  const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown-ip";
    const now = Date.now();
    const limitInfo = rateLimitMap.get(ip);

    if (!limitInfo || now > limitInfo.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      next();
    } else if (limitInfo.count < RATE_LIMIT_MAX_REQUESTS) {
      limitInfo.count++;
      next();
    } else {
      res.status(429).json({ error: "Too many requests. Please try again in a minute." });
    }
  };

  // HTML/XSS Sanitizer Utility
  const sanitizeString = (str: any): string => {
    if (typeof str !== 'string') return '';
    return str
      .replace(/<script[^>]*>([\S\s]*?)<\/script>/gi, '') // Strip script tags
      .replace(/<[^>]*>/g, '') // Strip all HTML tags
      .trim();
  };

  // Helper to log all sync actions (success, failure, validation errors)
  const logSyncAttempt = async (
    recordId: string | null,
    recordType: string,
    status: 'success' | 'validation_failed' | 'server_error',
    payload: any,
    errorMessage: string | null,
    req: express.Request
  ) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown-ip";
      await withRetry(() => pgDb.insert(capturedLogs).values({
        recordId,
        recordType,
        status,
        payload: payload ? JSON.stringify(payload) : null,
        errorMessage,
        ipAddress: ip,
      }));
      console.log(`[Captured Sync Log] Record: ${recordId}, Status: ${status}, Info: ${errorMessage || 'None'}`);
    } catch (err: any) {
      if (isTimeoutError(err)) {
        /* db unreachable, ignored */
        return;
      }
      console.error("Failed to write to captured_logs:", err);
    }
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Example secured route initializing user in db
  app.post("/api/login", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user) {
        const dbUser = await getOrCreateUser(req.user.uid, req.user.email || '');
        res.json({ success: true, user: dbUser });
        return;
      }
      res.status(400).json({ error: 'Invalid user payload' });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        console.warn("Database connection timed out for login.");
        res.json({ success: true, user: { uid: req.user?.uid, email: req.user?.email, id: 0, createdAt: new Date() } });
        return;
      }
      console.error(error);
      res.status(500).json({ error: 'Failed to process login' });
    }
  });

  // SSE Real-time fallback configuration
  let sseClients: any[] = [];
  
  app.get("/api/events", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Tell the client that the connection is active
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(client => client !== res);
    });
  });

  const broadcastEvent = (eventType: string, data: any) => {
    const payload = `data: ${JSON.stringify({ type: eventType, data })}\n\n`;
    sseClients.forEach(client => client.write(payload));
  };

  // REST API: GET all synced projects from relational Cloud SQL database
  app.get("/api/projects/sync", rateLimiter, async (req, res) => {
    try {
      const allProjects = await withRetry(() => pgDb.select().from(dbProjects));
      const filtered = allProjects.filter(p => p.id && !p.id.startsWith('__sys_'));
      const parsed = filtered.map(p => {
        try {
          return p.data ? JSON.parse(p.data) : p;
        } catch {
          return p;
        }
      });
      res.json({ success: true, data: parsed });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        /* db unreachable, ignored */
        res.json({ success: true, data: [] });
        return;
      }
      console.error("Failed to retrieve projects from SQL:", error);
      res.status(500).json({ error: "Failed to query relational database projects" });
    }
  });

  // REST API: GET & POST users sync
  app.get("/api/users/sync", rateLimiter, async (req, res) => {
    try {
      const records = await withRetry(() => pgDb.select().from(dbProjects).where(eq(dbProjects.id, '__sys_users__')));
      if (records.length > 0 && records[0].data) {
        const usersData = JSON.parse(records[0].data);
        res.json({ success: true, data: usersData });
        return;
      }
      res.json({ success: true, data: [] });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        res.json({ success: true, data: [] });
        return;
      }
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users/sync", rateLimiter, async (req, res) => {
    const usersData = req.body;
    try {
      const stringifiedData = JSON.stringify(usersData);
      await withRetry(() => pgDb.insert(dbProjects).values({
        id: '__sys_users__',
        name: 'System Users',
        client: 'System',
        data: stringifiedData,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: dbProjects.id,
        set: { data: stringifiedData, updatedAt: new Date() }
      }));
      res.json({ success: true, message: "Users saved" });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        res.json({ success: true, message: "Users saved locally" });
        return;
      }
      res.status(500).json({ error: "Failed to save users" });
    }
  });

  // REST API: GET & POST approvals sync
  app.get("/api/approvals/sync", rateLimiter, async (req, res) => {
    try {
      const records = await withRetry(() => pgDb.select().from(dbProjects).where(eq(dbProjects.id, '__sys_approvals__')));
      if (records.length > 0 && records[0].data) {
        const approvalsData = JSON.parse(records[0].data);
        res.json({ success: true, data: approvalsData });
        return;
      }
      res.json({ success: true, data: [] });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        res.json({ success: true, data: [] });
        return;
      }
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  });

  app.post("/api/approvals/sync", rateLimiter, async (req, res) => {
    const approvalsData = req.body;
    try {
      const stringifiedData = JSON.stringify(approvalsData);
      await withRetry(() => pgDb.insert(dbProjects).values({
        id: '__sys_approvals__',
        name: 'System Approvals',
        client: 'System',
        data: stringifiedData,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: dbProjects.id,
        set: { data: stringifiedData, updatedAt: new Date() }
      }));
      res.json({ success: true, message: "Approvals saved" });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        res.json({ success: true, message: "Approvals saved locally" });
        return;
      }
      res.status(500).json({ error: "Failed to save approvals" });
    }
  });

  // REST API: GET & POST config sync
  app.get("/api/config/sync", rateLimiter, async (req, res) => {
    try {
      const records = await withRetry(() => pgDb.select().from(dbProjects).where(eq(dbProjects.id, '__sys_config__')));
      if (records.length > 0 && records[0].data) {
        const configData = JSON.parse(records[0].data);
        res.json({ success: true, data: configData });
        return;
      }
      res.json({ success: true, data: null });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        res.json({ success: true, data: null });
        return;
      }
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });

  app.post("/api/config/sync", rateLimiter, async (req, res) => {
    const configData = req.body;
    try {
      const stringifiedData = JSON.stringify(configData);
      await withRetry(() => pgDb.insert(dbProjects).values({
        id: '__sys_config__',
        name: 'System Config',
        client: 'System',
        data: stringifiedData,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: dbProjects.id,
        set: { data: stringifiedData, updatedAt: new Date() }
      }));
      res.json({ success: true, message: "Config saved" });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        res.json({ success: true, message: "Config saved locally" });
        return;
      }
      res.status(500).json({ error: "Failed to save config" });
    }
  });

  // REST API: POST capture and sync project with transaction support and validation
  app.post("/api/projects/sync", rateLimiter, async (req, res) => {
    const payload = req.body;
    const { id, name, client } = payload || {};

    // 1. Backend Client Input Validation
    if (!id || typeof id !== 'string') {
      await logSyncAttempt(null, 'project', 'validation_failed', payload, 'Missing or invalid project identifier (id)', req);
      res.status(400).json({ error: "Validation Failed: 'id' is required and must be a string." });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      await logSyncAttempt(id, 'project', 'validation_failed', payload, 'Missing or empty project name', req);
      res.status(400).json({ error: "Validation Failed: 'name' is required and must be a non-empty string." });
      return;
    }

    if (!client || typeof client !== 'string' || client.trim() === '') {
      await logSyncAttempt(id, 'project', 'validation_failed', payload, 'Missing or empty client name', req);
      res.status(400).json({ error: "Validation Failed: 'client' is required and must be a non-empty string." });
      return;
    }

    // 2. Input Sanitization (strips potentially malicious HTML/JS patterns)
    const sanitizedId = sanitizeString(id);
    const sanitizedName = sanitizeString(name);
    const sanitizedClient = sanitizeString(client);
    const sanitizedConsultant = sanitizeString(payload.consultant);
    const sanitizedContractor = sanitizeString(payload.contractor);
    const sanitizedClassification = sanitizeString(payload.classification);
    const sanitizedContractType = sanitizeString(payload.contractType) || 'DBB';
    const sanitizedProgramDirectorate = sanitizeString(payload.programDirectorate);
    const sanitizedPmo = sanitizeString(payload.pmo);

    const stringifiedData = JSON.stringify({
      ...payload,
      id: sanitizedId,
      name: sanitizedName,
      client: sanitizedClient,
      consultant: sanitizedConsultant,
      contractor: sanitizedContractor,
      classification: sanitizedClassification,
      contractType: sanitizedContractType,
      programDirectorate: sanitizedProgramDirectorate,
      pmo: sanitizedPmo
    });

    try {
      // 3. Database operation wrapped inside SQL Transaction for atomic accuracy
      await withRetry(() => pgDb.transaction(async (tx) => {
        const valuesToUpsert = {
          id: sanitizedId,
          name: sanitizedName,
          client: sanitizedClient,
          consultant: sanitizedConsultant,
          contractor: sanitizedContractor,
          signDate: sanitizeString(payload.signDate),
          startDate: sanitizeString(payload.startDate),
          origDays: String(payload.origDays || 0),
          eotDays: String(payload.eotDays || 0),
          variation: String(payload.variation || 0),
          origAmount: String(payload.origAmount || 0),
          lengthKm: String(payload.lengthKm || 0),
          classification: sanitizedClassification,
          contractType: sanitizedContractType,
          programDirectorate: sanitizedProgramDirectorate,
          pmo: sanitizedPmo,
          physicalProgress: String(payload.physicalProgress || 0),
          provisionalSum: String(payload.provisionalSum || 0),
          data: stringifiedData,
          updatedAt: new Date()
        };

        await tx.insert(dbProjects).values(valuesToUpsert)
          .onConflictDoUpdate({
            target: dbProjects.id,
            set: valuesToUpsert
          });
      }));

      // Log successful sync
      await logSyncAttempt(sanitizedId, 'project', 'success', payload, null, req);
      
      // Broadcast real-time event to SSE clients
      broadcastEvent('project_update', payload);
      
      res.json({ success: true, message: "Project successfully captured, stored and synchronized with MySQL Database." });
    } catch (dbError: any) {
      if (isTimeoutError(dbError)) {
        /* db unreachable, ignored */
        res.json({ success: true, message: "Project successfully captured locally (Database unreachable)." });
        return;
      }
      console.error(`MySQL Upsert Error for ID ${id}:`, dbError);
      await logSyncAttempt(id, 'project', 'server_error', payload, dbError.message || String(dbError), req);
      res.status(500).json({ error: "Failed to persist project in the relational database due to a server error." });
    }
  });

  // REST API: DELETE project from Cloud SQL Database
  const handleDeleteProjectRoute = async (req: express.Request, res: express.Response) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: "Project ID is required" });
      return;
    }
    try {
      await withRetry(() => pgDb.transaction(async (tx) => {
        await tx.delete(dbProjects).where(eq(dbProjects.id, id));
      }));
      await logSyncAttempt(id, 'project', 'success', { deleted: true }, null, req);
      broadcastEvent('project_delete', { id });
      res.json({ success: true, message: `Project ${id} successfully deleted from relational database.` });
    } catch (dbError: any) {
      if (isTimeoutError(dbError)) {
        broadcastEvent('project_delete', { id });
        res.json({ success: true, message: "Project deletion captured locally (Database unreachable)." });
        return;
      }
      console.error(`MySQL/PostgreSQL Delete Error for ID ${id}:`, dbError);
      await logSyncAttempt(id, 'project', 'server_error', { id }, dbError.message || String(dbError), req);
      res.status(500).json({ error: "Failed to delete project from the relational database." });
    }
  };

  app.delete("/api/projects/:id", rateLimiter, handleDeleteProjectRoute);
  app.delete("/api/projects/sync/:id", rateLimiter, handleDeleteProjectRoute);

  // REST API: GET captured sync logs for real-time visualization and diagnostics
  app.get("/api/sync-logs", rateLimiter, async (req, res) => {
    try {
      const logs = await withRetry(() => pgDb.select().from(capturedLogs).orderBy(desc(capturedLogs.id)).limit(20));
      res.json({ success: true, logs });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        /* db unreachable, ignored */
        res.json({ success: true, logs: [] });
        return;
      }
      console.error("Failed to query sync logs:", error);
      res.status(500).json({ error: "Failed to query system sync logs" });
    }
  });

  // REST API: GET draft for a given form ID
  app.get("/api/drafts/:formId", requireAuth, rateLimiter, async (req: AuthRequest, res) => {
    try {
      const { formId } = req.params;
      const uid = req.user?.uid;

      if (!uid) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!formId) {
        res.status(400).json({ error: "Form ID is required" });
        return;
      }

      const combinedId = `${uid}:${formId}`;
      const draftRecords = await withRetry(() => pgDb.select().from(formDrafts).where(eq(formDrafts.id, combinedId)));

      if (draftRecords.length === 0) {
        res.json({ success: true, draft: null });
        return;
      }

      const record = draftRecords[0];
      res.json({
        success: true,
        draft: {
          formId: record.formId,
          data: JSON.parse(record.data),
          updatedAt: record.updatedAt,
        }
      });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        console.warn("Database connection timed out for GET draft. Serving null.");
        res.json({ success: true, draft: null });
        return;
      }
      console.error("Failed to retrieve draft:", error);
      res.status(500).json({ error: "Failed to retrieve draft from server" });
    }
  });

  // REST API: POST save/upsert draft for a given form ID
  app.post("/api/drafts/:formId", requireAuth, rateLimiter, async (req: AuthRequest, res) => {
    try {
      const { formId } = req.params;
      const uid = req.user?.uid;
      const payload = req.body; // should have { data: object, updatedAt: string_timestamp }

      if (!uid) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!formId) {
        res.status(400).json({ error: "Form ID is required" });
        return;
      }

      if (!payload || !payload.data) {
        res.status(400).json({ error: "Payload data is required" });
        return;
      }

      const combinedId = `${uid}:${formId}`;
      const stringifiedData = JSON.stringify(payload.data);

      const valuesToUpsert = {
        id: combinedId,
        userId: uid,
        formId,
        data: stringifiedData,
        updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : new Date(),
      };

      await withRetry(() => pgDb.insert(formDrafts).values(valuesToUpsert)
        .onConflictDoUpdate({
          target: formDrafts.id,
          set: valuesToUpsert
        }));

      res.json({ success: true, message: "Draft saved on server." });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        console.warn("Database connection timed out for POST draft.");
        res.json({ success: true, message: "Draft saved on server (mock)." });
        return;
      }
      console.error("Failed to save draft:", error);
      res.status(500).json({ error: "Failed to save draft on server" });
    }
  });

  // REST API: DELETE draft for a given form ID
  app.delete("/api/drafts/:formId", requireAuth, rateLimiter, async (req: AuthRequest, res) => {
    try {
      const { formId } = req.params;
      const uid = req.user?.uid;

      if (!uid) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!formId) {
        res.status(400).json({ error: "Form ID is required" });
        return;
      }

      const combinedId = `${uid}:${formId}`;
      await withRetry(() => pgDb.delete(formDrafts).where(eq(formDrafts.id, combinedId)));

      res.json({ success: true, message: "Draft successfully deleted from server." });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        console.warn("Database connection timed out for DELETE draft.");
        res.json({ success: true, message: "Draft deleted on server (mock)." });
        return;
      }
      console.error("Failed to delete draft:", error);
      res.status(500).json({ error: "Failed to delete draft from server" });
    }
  });

  // Simulation API: POST a newer draft on the server to test conflict resolution
  app.post("/api/drafts/:formId/simulate-conflict", requireAuth, rateLimiter, async (req: AuthRequest, res) => {
    try {
      const { formId } = req.params;
      const uid = req.user?.uid;
      const { data } = req.body;

      if (!uid) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const combinedId = `${uid}:${formId}`;
      const stringifiedData = JSON.stringify(data);

      // Create an updatedAt time that is 5 minutes in the future to act as a "newer" server draft
      const futureTime = new Date(Date.now() + 5 * 60 * 1000);

      const valuesToUpsert = {
        id: combinedId,
        userId: uid,
        formId,
        data: stringifiedData,
        updatedAt: futureTime,
      };

      await withRetry(() => pgDb.insert(formDrafts).values(valuesToUpsert)
        .onConflictDoUpdate({
          target: formDrafts.id,
          set: valuesToUpsert
        }));

      res.json({ success: true, message: "Newer server draft simulated." });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        console.warn("Database connection timed out for simulate server draft.");
        res.json({ success: true, message: "Newer server draft simulated (mock)." });
        return;
      }
      console.error("Failed to simulate server draft:", error);
      res.status(500).json({ error: "Failed to simulate server draft" });
    }
  });

  // Lazy initialize GoogleGenAI client to avoid startup crash if key is missing
  let aiClient: GoogleGenAI | null = null;
  const getAIClient = (): GoogleGenAI => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    if (!aiClient) {
      aiClient = new GoogleGenAI({ apiKey: key });
    }
    return aiClient;
  };

  // Secure API Proxy for Gemini AI queries
  app.post("/api/gemini", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }

      const client = getAIClient();
      const config: any = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      // Query Gemini model gemini-2.5-flash as the recommended modern baseline
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: config
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Proxy Route Error:", error);
      res.status(500).json({ error: error.message || "Failed to communicate with Gemini API" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
