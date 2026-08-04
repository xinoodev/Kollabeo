import pool from './database.js';

export async function createNotification(userId, projectId, type, data = {}) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, project_id, type, data) VALUES ($1, $2, $3, $4)',
      [userId, projectId, type, JSON.stringify(data)]
    );
  } catch (error) {
    console.error('Create notification error:', error);
  }
}

export default createNotification;
