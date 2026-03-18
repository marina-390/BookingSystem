// src/routes/reservations.routes.js
import express from "express";
import pool from "../db/pool.js";
import { logEvent } from "../services/log.service.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = express.Router();

/* =====================================================
   PUBLIC READ ALL
   GET /api/reservations/public/list
===================================================== */
router.get("/public/list", async (req, res) => {
  try {
    const sql = `
      SELECT
        r.id,
        r.start_time,
        r.end_time,
        res.name AS resource_name,
        r.status
      FROM reservations r
      JOIN resources res ON r.resource_id = res.id
      WHERE r.status = 'active'
      ORDER BY r.start_time DESC
    `;

    const { rows } = await pool.query(sql);

    return res.status(200).json({ ok: true, data: rows });

  } catch (err) {
    console.error("READ PUBLIC failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }
});

/* =====================================================
   CREATE
   POST /api/reservations
===================================================== */
router.post("/", requireAuth, async (req, res) => {
  const actorUserId = req.user.id;

  const {
    resourceId,
    startTime,
    endTime,
    note,
    status
  } = req.body;

  // Always use the logged-in user as the reservation owner
  const userId = req.user.id;

  try {
    const insertSql = `
      INSERT INTO reservations
      (resource_id, user_id, start_time, end_time, note, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const params = [
      Number(resourceId),
      Number(userId),
      startTime,
      endTime,
      note || null,
      status || "active"
    ];

    const { rows } = await pool.query(insertSql, params);

    await logEvent({
      actorUserId,
      action: "reserve",
      message: `Reservation created (ID ${rows[0].id})`,
      entityType: "reservation",
      entityId: rows[0].id,
    });

    return res.status(201).json({ ok: true, data: rows[0] });

  } catch (err) {
    console.error("DB insert failed:", err);

    if (err && err.code === "23514") {
      // CHECK constraint violation (usually start/end time ordering)
      return res.status(400).json({ ok: false, error: "End time must be after start time" });
    }

    if (err && err.code === "23503") {
      // Foreign key constraint violation
      if (err.detail.includes("user_id")) {
        return res.status(400).json({ ok: false, error: "User not found. Please log out and log back in." });
      }
      if (err.detail.includes("resource_id")) {
        return res.status(400).json({ ok: false, error: "Resource not found" });
      }
    }

    return res.status(500).json({ ok: false, error: "Database error" });
  }
});


/* =====================================================
   READ ALL
   GET /api/reservations
   - Reserver: sees only own reservations
   - Manager: sees all reservations
===================================================== */
router.get("/", requireAuth, async (req, res) => {

  try {

    let sql = `
      SELECT
        r.*,
        u.email AS user_email,
        res.name AS resource_name
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN resources res ON r.resource_id = res.id
    `;

    // Reserver role: only see own reservations
    if (req.user.role === 'reserver') {
      sql += ` WHERE r.user_id = $1`;
    }

    sql += ` ORDER BY r.start_time DESC`;

    const params = req.user.role === 'reserver' ? [req.user.id] : [];
    const { rows } = await pool.query(sql, params);

    return res.status(200).json({ ok: true, data: rows });

  } catch (err) {
    console.error("READ ALL failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }

});


/* =====================================================
   READ ONE
   GET /api/reservations/:id
   - Reserver: can only read own reservation
   - Manager: can read any reservation
===================================================== */
router.get("/:id", requireAuth, async (req, res) => {

  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ ok: false, error: "Invalid ID" });
  }

  try {

    const sql = `
      SELECT
        r.*,
        u.email AS user_email,
        res.name AS resource_name
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN resources res ON r.resource_id = res.id
      WHERE r.id = $1
    `;

    const { rows } = await pool.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Reservation not found" });
    }

    // Reserver role: can only access own reservations
    if (req.user.role === 'reserver' && rows[0].user_id !== req.user.id) {
      return res.status(403).json({ ok: false, error: "You can only access your own reservations" });
    }

    return res.status(200).json({ ok: true, data: rows[0] });

  } catch (err) {
    console.error("READ ONE failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }

});


/* =====================================================
   UPDATE
   PUT /api/reservations/:id
   - Reserver: can only update own reservation
   - Manager: can update any reservation
===================================================== */
router.put("/:id", requireAuth, async (req, res) => {

  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ ok: false, error: "Invalid ID" });
  }

  const actorUserId = req.user.id;

  const {
    resourceId,
    userId,
    startTime,
    endTime,
    note,
    status
  } = req.body;

  try {

    // First, check ownership if user is a reserver
    const ownershipCheck = `SELECT user_id FROM reservations WHERE id = $1`;
    const { rows: ownerRows } = await pool.query(ownershipCheck, [id]);

    if (ownerRows.length === 0) {
      return res.status(404).json({ ok: false, error: "Reservation not found" });
    }

    // Reserver role: can only edit own reservations
    if (req.user.role === 'reserver' && ownerRows[0].user_id !== req.user.id) {
      return res.status(403).json({ ok: false, error: "You can only edit your own reservations" });
    }

    const sql = `
      UPDATE reservations
      SET resource_id = $1,
          user_id = $2,
          start_time = $3,
          end_time = $4,
          note = $5,
          status = $6
      WHERE id = $7
      RETURNING *
    `;

    const params = [
      Number(resourceId),
      Number(userId),
      startTime,
      endTime,
      note || null,
      status || "active",
      id
    ];

    const { rows } = await pool.query(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Reservation not found" });
    }

    await logEvent({
      actorUserId,
      action: "reserve",
      message: `Reservation updated (ID ${id})`,
      entityType: "reservation",
      entityId: id,
    });

    return res.status(200).json({ ok: true, data: rows[0] });

  } catch (err) {
    console.error("UPDATE failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }

});


/* =====================================================
   DELETE
   DELETE /api/reservations/:id
   - Reserver: can only delete own reservation
   - Manager: can delete any reservation
===================================================== */
router.delete("/:id", requireAuth, async (req, res) => {

  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ ok: false, error: "Invalid ID" });
  }

  const actorUserId = req.user.id;

  try {

    // First, check ownership if user is a reserver
    const ownershipCheck = `SELECT user_id FROM reservations WHERE id = $1`;
    const { rows: ownerRows } = await pool.query(ownershipCheck, [id]);

    if (ownerRows.length === 0) {
      return res.status(404).json({ ok: false, error: "Reservation not found" });
    }

    // Reserver role: can only delete own reservations
    if (req.user.role === 'reserver' && ownerRows[0].user_id !== req.user.id) {
      return res.status(403).json({ ok: false, error: "You can only delete your own reservations" });
    }

    const { rowCount } = await pool.query(
      "DELETE FROM reservations WHERE id = $1",
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Reservation not found" });
    }

    await logEvent({
      actorUserId,
      action: "reserve",
      message: `Reservation deleted (ID ${id})`,
      entityType: "reservation",
      entityId: id,
    });

    return res.status(204).send();

  } catch (err) {
    console.error("DELETE failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }

});


export default router;