import pool from './database.js';
import { getIO } from './socket.js';

export async function createNotification(userId, projectId, type, data = {}) {
  try {
    const result = await pool.query(
      'INSERT INTO notifications (user_id, project_id, type, data) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, projectId, type, JSON.stringify(data)]
    );

    const notification = result.rows[0];

    // Try to emit via Socket.IO if available
    try {
      const io = getIO();
      if (io) {
        io.to(`user_${userId}`).emit('notification', notification);
      }
    } catch (e) {
      console.error('Emit notification error:', e);
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
}

export default createNotification;
