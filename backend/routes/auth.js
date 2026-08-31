const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../db');

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || 'development-secret-change-me';

// ---------------------------------------------
// LOGIN
// ---------------------------------------------

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        password_hash,
        role,
        worker_id
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        workerId: user.worker_id,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: '1h',
      }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workerId: user.worker_id,
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Login failed',
    });
  }
});

module.exports = router;