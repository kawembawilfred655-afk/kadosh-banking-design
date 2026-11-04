"use strict";

const { createClient } = require("@supabase/supabase-js");

const validTypes = new Set(["transfer", "deposit", "savings_contribution", "withdrawal"]);
const allowedMethods = new Set(["GET", "POST", "OPTIONS"]);

function setCors(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!origin || !allowedOrigins.includes(origin)) {
    res.status(403).json({ error: "This app origin is not allowed." });
    return false;
  }

  if (!allowedMethods.has(req.method)) {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed." });
    return false;
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return false;
  }

  return true;
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    const error = new Error("Supabase server environment is not configured.");
    error.status = 503;
    throw error;
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function getDemoUser(req, client) {
  const match = (req.headers.authorization || "").match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    const error = new Error("A Supabase demo session is required.");
    error.status = 401;
    throw error;
  }

  const { data, error: authError } = await client.auth.getUser(match[1]);
  if (authError || !data.user || !data.user.is_anonymous) {
    const error = new Error("A valid anonymous demo session is required.");
    error.status = 401;
    throw error;
  }

  return data.user;
}

function sendError(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error("Demo transaction API failed.", error);
  res.status(status).json({
    error: status >= 500 ? "The demo transaction service is unavailable." : error.message
  });
}

module.exports = async function handler(req, res) {
  if (!setCors(req, res)) return;

  try {
    const client = getAdminClient();
    const user = await getDemoUser(req, client);

    if (req.method === "GET") {
      const { data, error } = await client
        .from("demo_transactions")
        .select("id, kind, title, detail, amount_ugx, reference, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      res.status(200).json({ transactions: data });
      return;
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST, OPTIONS");
      res.status(405).json({ error: "Method not allowed." });
      return;
    }

    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({ error: "A transaction object is required." });
      return;
    }

    const { kind, title, detail = "", amount, reference } = body;
    if (!validTypes.has(kind)) {
      res.status(400).json({ error: "Unsupported demo transaction type." });
      return;
    }
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000) {
      res.status(400).json({ error: "Amount must be a whole UGX value within the demo limit." });
      return;
    }
    if (typeof title !== "string" || title.trim().length < 1 || title.length > 80) {
      res.status(400).json({ error: "A short transaction title is required." });
      return;
    }
    if (typeof detail !== "string" || detail.length > 120) {
      res.status(400).json({ error: "Transaction details are too long." });
      return;
    }
    if (typeof reference !== "string" || !/^KDL-DEMO-[A-Za-z0-9-]{1,24}$/.test(reference)) {
      res.status(400).json({ error: "A demo-only reference is required." });
      return;
    }

    const { data, error } = await client
      .from("demo_transactions")
      .insert({
        user_id: user.id,
        kind,
        title: title.trim(),
        detail,
        amount_ugx: amount,
        reference
      })
      .select("id, kind, title, detail, amount_ugx, reference, created_at")
      .single();
    if (error) throw error;
    res.status(201).json({ transaction: data });
  } catch (error) {
    sendError(res, error);
  }
};
