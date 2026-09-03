const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();
const authenticateToken = require('./middleware/auth');
const PORT = 3000;
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const managerRoutes = require('./routes/manager');
const { requireRoles } = require('./middleware/roles');

const safetyRoutes = require('./routes/safety');

app.use(cors({
  origin: 'http://localhost:8080',
}));

app.use(express.json());
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/safety', safetyRoutes);

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MINEXA API',
    message: 'Backend is running successfully',
    timestamp: new Date().toISOString(),
  });
});
app.get('/api/v1/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      status: 'ok',
      message: 'PostgreSQL connected successfully',
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error('Database connection error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});
app.get('/api/v1/workers', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, employee_code FROM workers ORDER BY id'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Worker fetch error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch workers',
    });
  }
});
app.post(
  '/api/v1/leave-requests',
  authenticateToken,
  async (req, res) => {
    try {
      const {
        leaveType,
        startDate,
        endDate,
        days,
        reason,
      } = req.body;

      const workerId = req.user.workerId;

      if (!workerId) {
        return res.status(403).json({
          status: 'error',
          message: 'This account is not linked to a worker',
        });
      }

      if (
        !leaveType ||
        !startDate ||
        !endDate ||
        !days ||
        !reason
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'All fields are required',
        });
      }

      const result = await pool.query(
        `
        INSERT INTO leave_requests
        (
          worker_id,
          leave_type,
          start_date,
          end_date,
          days,
          reason,
          status
        )
        VALUES
        ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          worker_id,
          leave_type,
          start_date,
          end_date,
          days,
          reason,
          status,
          submitted_at
        `,
        [
          workerId,
          leaveType,
          startDate,
          endDate,
          days,
          reason,
          'pending',
        ]
      );

      return res.status(201).json({
        status: 'success',
        message: 'Leave request created successfully',
        request: result.rows[0],
      });
    } catch (error) {
      console.error(
        'Leave request creation error:',
        error
      );

      return res.status(500).json({
        status: 'error',
        message: 'Failed to create leave request',
      });
    }
  }
);
app.get(
  '/api/v1/leave-requests',
  authenticateToken,
  async (req, res) => {
    try {
      const workerId = req.user.workerId;

      if (!workerId) {
        return res.status(403).json({
          status: 'error',
          message: 'This account is not linked to a worker',
        });
      }

      const result = await pool.query(
        `
        SELECT
          id,
          worker_id,
          leave_type,
          start_date,
          end_date,
          days,
          reason,
          status,
          submitted_at
        FROM leave_requests
        WHERE worker_id = $1
        ORDER BY submitted_at DESC
        `,
        [workerId]
      );

      return res.status(200).json({
        status: 'success',
        requests: result.rows,
      });
    } catch (error) {
      console.error(
        'Error fetching leave requests:',
        error
      );

      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch leave requests',
      });
    }
  }
);
app.patch(
  '/api/v1/leave-requests/:id/cancel',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const workerId = req.user.workerId;

      if (!workerId) {
        return res.status(403).json({
          status: 'error',
          message: 'This account is not linked to a worker',
        });
      }

      const result = await pool.query(
        `
        UPDATE leave_requests
        SET status = 'cancelled'
        WHERE id = $1
          AND worker_id = $2
          AND status = 'pending'
        RETURNING
          id,
          worker_id,
          leave_type,
          start_date,
          end_date,
          days,
          reason,
          status,
          submitted_at
        `,
        [id, workerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message:
            'Leave request not found, not yours, or cannot be cancelled.',
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Leave request cancelled successfully',
        request: result.rows[0],
      });
    } catch (error) {
      console.error(
        'Cancel leave request error:',
        error
      );

      return res.status(500).json({
        status: 'error',
        message: 'Failed to cancel leave request',
      });
    }
  }
);

app.use('/api/v1/auth', authRoutes);
app.get(
  '/api/v1/admin/test',
  authenticateToken,
  requireRoles('PLATFORM_ADMIN'),
  (req, res) => {
    res.json({
      status: 'success',
      message:
        'Platform Admin access confirmed',
      user: req.user,
    });
  },
);

app.get(
  '/api/v1/mines',
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          name,
          mine_code,
          location,
          status
        FROM mines
        WHERE status = 'ACTIVE'
        ORDER BY name
      `);

      return res.status(200).json({
        status: 'success',
        mines: result.rows,
      });
    } catch (error) {
      console.error(
        'Mine fetch error:',
        error
      );

      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch mines',
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(`MINEXA API running on http://localhost:${PORT}`);
});
