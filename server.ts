import express from "express";
import path from "path";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' })); // support extremely large multi-device project payloads safely
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Cross-Origin Resource Sharing (CORS) middleware for eradashboard.com.et and external domains
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

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

  // Captured sync logs in-memory buffer
  const capturedLogsMemory: any[] = [];

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
      const logEntry = {
        id: capturedLogsMemory.length + 1,
        recordId,
        recordType,
        status,
        payload: payload ? JSON.stringify(payload) : null,
        errorMessage,
        ipAddress: ip,
        createdAt: new Date().toISOString()
      };
      capturedLogsMemory.unshift(logEntry);
      if (capturedLogsMemory.length > 50) capturedLogsMemory.pop();
      console.log(`[Captured Sync Log] Record: ${recordId}, Status: ${status}, Info: ${errorMessage || 'None'}`);
    } catch (err: any) {
      console.error("Failed to write to captured_logs:", err);
    }
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Example secured route initializing user
  app.post("/api/login", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user) {
        res.json({
          success: true,
          user: { uid: req.user.uid, email: req.user.email || '', id: 1, createdAt: new Date() }
        });
        return;
      }
      res.status(400).json({ error: 'Invalid user payload' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process login' });
    }
  });

  // In-memory backend storage for fallback when SQL DB is unreachable or disconnected
  const inMemoryProjects = new Map<string, any>();
  let inMemoryUsers: any[] = [
    { username: 'ersidoabay', password: 'Helikina@#045536', role: 'admin', accessibleProjects: [], status: 'Active', isPendingApproval: false },
    { username: 'Ersido Abayneh', password: 'Helikina@#045536', role: 'admin', accessibleProjects: [], status: 'Active', isPendingApproval: false },
    { username: 'user', password: 'user123', role: 'editor', accessibleProjects: [], status: 'Active', isPendingApproval: false },
    { username: 'viewer', password: 'view123', role: 'viewer', accessibleProjects: [], status: 'Active', isPendingApproval: false },
    { username: 'approver', password: '12345', role: 'approver', accessibleProjects: [], status: 'Active', isPendingApproval: false },
    { username: 'proj_1781786415663', password: 'password123', role: 'admin', accessibleProjects: [], status: 'Active', isPendingApproval: false }
  ];
  let inMemoryApprovals: any[] = [];
  let inMemoryConfig: any = null;

  // Real-time communication: Open-Ended WebSocket and SSE streaming configuration
  let sseClients: any[] = [];
  const wsClients = new Set<WebSocket>();

  // WebSocket Server attached to httpServer
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws: WebSocket) => {
    wsClients.add(ws);
    // Send immediate connection confirmation
    ws.send(JSON.stringify({ type: 'connected', protocol: 'websocket' }));

    ws.on("message", (msgStr: string) => {
      try {
        const parsed = JSON.parse(msgStr.toString());
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        } else if (parsed.type && parsed.data) {
          broadcastEvent(parsed.type, parsed.data);
        }
      } catch (e) {
        /* Ignore non-JSON socket messages */
      }
    });

    ws.on("close", () => {
      wsClients.delete(ws);
    });

    ws.on("error", () => {
      wsClients.delete(ws);
    });
  });

  // Upgrade HTTP connections to WebSocket on /ws or /api/ws
  httpServer.on("upgrade", (request, socket, head) => {
    try {
      const pathname = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`).pathname;
      if (pathname === '/ws' || pathname === '/api/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    } catch (err) {
      /* ignore invalid upgrade requests */
    }
  });

  // SSE Stream Endpoint with keep-alive
  app.get("/api/events", (req, res) => {
    try {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*'
      });

      // Send connection active message
      res.write(`data: ${JSON.stringify({ type: 'connected', protocol: 'sse' })}\n\n`);

      sseClients.push(res);

      res.on('error', () => {
        sseClients = sseClients.filter(client => client !== res);
      });

      req.on('close', () => {
        sseClients = sseClients.filter(client => client !== res);
      });
    } catch (e) {
      console.warn('[SSE] Endpoint connection setup error:', e);
    }
  });

  // Open-Ended Keep-Alive Ping Loop (fires every 10s to keep proxies & sockets open indefinitely)
  setInterval(() => {
    sseClients = sseClients.filter(client => {
      try {
        if (!client.writableEnded && !client.destroyed) {
          client.write(': ping\n\n');
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    });

    wsClients.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      } catch (e) {}
    });
  }, 10000);

  // Unified broadcast function across WebSocket clients and SSE streams
  const broadcastEvent = (eventType: string, data: any) => {
    const rawPayload = JSON.stringify({ type: eventType, data });
    const ssePayload = `data: ${rawPayload}\n\n`;

    sseClients = sseClients.filter(client => {
      try {
        if (!client.writableEnded && !client.destroyed) {
          client.write(ssePayload);
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    });

    wsClients.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(rawPayload);
        }
      } catch (e) {
        /* socket disconnected */
      }
    });
  };

  // In-memory drafts map (key: `${uid}:${formId}`)
  const inMemoryDrafts = new Map<string, { formId: string; data: any; updatedAt: Date }>();

  // REST API: GET all synced projects from memory
  app.get("/api/projects/sync", rateLimiter, async (req, res) => {
    const data = Array.from(inMemoryProjects.values());
    res.json({ success: true, data });
  });

  // REST API: GET & POST users sync
  app.get("/api/users/sync", rateLimiter, async (req, res) => {
    res.json({ success: true, data: inMemoryUsers });
  });

  app.post("/api/users/sync", rateLimiter, async (req, res) => {
    const usersData = req.body;
    if (Array.isArray(usersData)) {
      const map = new Map<string, any>();
      inMemoryUsers.forEach(u => { if (u?.username) map.set(u.username.toLowerCase(), u); });
      usersData.forEach(u => { if (u?.username) map.set(u.username.toLowerCase(), u); });
      inMemoryUsers = Array.from(map.values());
    }

    broadcastEvent('users_update', inMemoryUsers);
    res.json({ success: true, message: "Users saved in backend memory", data: inMemoryUsers });
  });

  // REST API: GET & POST approvals sync
  app.get("/api/approvals/sync", rateLimiter, async (req, res) => {
    res.json({ success: true, data: inMemoryApprovals });
  });

  app.post("/api/approvals/sync", rateLimiter, async (req, res) => {
    const approvalsData = req.body;
    if (Array.isArray(approvalsData)) {
      const map = new Map<string, any>();
      inMemoryApprovals.forEach(a => { if (a?.id) map.set(a.id, a); });
      approvalsData.forEach(a => { if (a?.id) map.set(a.id, a); });
      inMemoryApprovals = Array.from(map.values());
    }

    broadcastEvent('approvals_update', inMemoryApprovals);
    res.json({ success: true, message: "Approvals saved in backend memory", data: inMemoryApprovals });
  });

  // REST API: GET & POST config sync
  app.get("/api/config/sync", rateLimiter, async (req, res) => {
    res.json({ success: true, data: inMemoryConfig });
  });

  app.post("/api/config/sync", rateLimiter, async (req, res) => {
    const configData = req.body;
    inMemoryConfig = configData;

    broadcastEvent('config_update', inMemoryConfig);
    res.json({ success: true, message: "Config saved in backend memory", data: inMemoryConfig });
  });

  // REST API: POST capture and sync project with validation
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

    // 2. Input Sanitization
    const sanitizedId = sanitizeString(id);
    const sanitizedName = sanitizeString(name);
    const sanitizedClient = sanitizeString(client);
    const sanitizedConsultant = sanitizeString(payload.consultant);
    const sanitizedContractor = sanitizeString(payload.contractor);
    const sanitizedClassification = sanitizeString(payload.classification);
    const sanitizedContractType = sanitizeString(payload.contractType) || 'DBB';
    const sanitizedProgramDirectorate = sanitizeString(payload.programDirectorate);
    const sanitizedPmo = sanitizeString(payload.pmo);

    const sanitizedProjectPayload = {
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
    };

    // Save into in-memory store
    inMemoryProjects.set(sanitizedId, sanitizedProjectPayload);

    // Broadcast real-time event
    broadcastEvent('project_update', sanitizedProjectPayload);

    await logSyncAttempt(sanitizedId, 'project', 'success', payload, null, req);
    res.json({ success: true, message: "Project successfully captured in backend memory.", data: sanitizedProjectPayload });
  });

  // REST API: DELETE project
  const handleDeleteProjectRoute = async (req: express.Request, res: express.Response) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: "Project ID is required" });
      return;
    }

    inMemoryProjects.delete(id);
    broadcastEvent('project_delete', { id });
    await logSyncAttempt(id, 'project', 'success', { deleted: true }, null, req);
    res.json({ success: true, message: `Project ${id} deleted from backend memory.` });
  };

  app.delete("/api/projects/:id", rateLimiter, handleDeleteProjectRoute);
  app.delete("/api/projects/sync/:id", rateLimiter, handleDeleteProjectRoute);

  // REST API: GET captured sync logs
  app.get("/api/sync-logs", rateLimiter, async (req, res) => {
    res.json({ success: true, logs: capturedLogsMemory });
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
      const record = inMemoryDrafts.get(combinedId);

      if (!record) {
        res.json({ success: true, draft: null });
        return;
      }

      res.json({
        success: true,
        draft: {
          formId: record.formId,
          data: record.data,
          updatedAt: record.updatedAt,
        }
      });
    } catch (error: any) {
      console.error("Failed to retrieve draft:", error);
      res.status(500).json({ error: "Failed to retrieve draft from server" });
    }
  });

  // REST API: POST save/upsert draft for a given form ID
  app.post("/api/drafts/:formId", requireAuth, rateLimiter, async (req: AuthRequest, res) => {
    try {
      const { formId } = req.params;
      const uid = req.user?.uid;
      const payload = req.body;

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
      const draftRecord = {
        formId,
        data: payload.data,
        updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : new Date(),
      };

      inMemoryDrafts.set(combinedId, draftRecord);

      res.json({ success: true, message: "Draft saved on server." });
    } catch (error: any) {
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
      inMemoryDrafts.delete(combinedId);

      res.json({ success: true, message: "Draft successfully deleted from server." });
    } catch (error: any) {
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
      const futureTime = new Date(Date.now() + 5 * 60 * 1000);

      inMemoryDrafts.set(combinedId, {
        formId,
        data,
        updatedAt: futureTime,
      });

      res.json({ success: true, message: "Newer server draft simulated." });
    } catch (error: any) {
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
