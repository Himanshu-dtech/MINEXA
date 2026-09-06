const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');

const router = express.Router();

router.get(
    '/me',
    authenticateToken,
    requireRoles('FIELD_WORKER'),
    async (req, res) => {
        try {
            const result = await pool.query(
                `
                SELECT
    u.id,
    u.name,
    u.email,
    u.login_id,
    u.role,
    u.worker_id,
    u.mine_id,
    u.account_status,
    u.is_verified,
    w.employee_code,
    w.phone AS worker_phone,
    m.name AS mine_name,
    m.mine_code,
    m.location
FROM users u
LEFT JOIN workers w
    ON w.id = u.worker_id
LEFT JOIN mines m
    ON m.id = u.mine_id
WHERE u.id = $1
                `,
                [req.user.userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Worker profile not found.'
                });
            }

            const worker = result.rows[0];

            return res.status(200).json({
                status: 'success',
                worker: {
                    id: worker.id,
                    name: worker.name,
                    loginId: worker.login_id,
                    email: worker.email,
                    phone: worker.worker_phone,
                    employeeCode: worker.employee_code,
                    role: worker.role,
                    accountStatus: worker.account_status,
                    isVerified: worker.is_verified,
                    mine: {
                        id: worker.mine_id,
                        name: worker.mine_name,
                        code: worker.mine_code,
                        location: worker.location
                    }
                }
            });
        } catch (error) {
            console.error('Worker profile error:', error);

            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch worker profile.'
            });
        }
    }
);

router.put(
    '/me',
    authenticateToken,
    requireRoles('FIELD_WORKER'),
    async (req, res) => {
        try {
            const name = String(req.body.name || '').trim();
            const phone = String(req.body.phone || '').trim();

            if (!name) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Name is required.'
                });
            }

            if (!phone) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Phone number is required.'
                });
            }

            const result = await pool.query(
                `
                UPDATE workers w
                SET
                    name = $1,
                    phone = $2
                FROM users u
                WHERE u.id = $3
                  AND u.worker_id = w.id
                RETURNING
                    w.id,
                    w.name,
                    w.employee_code,
                    w.phone,
                    w.mine_id
                `,
                [name, phone, req.user.userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Worker profile not found.'
                });
            }

            return res.status(200).json({
                status: 'success',
                message: 'Worker profile updated successfully.',
                worker: result.rows[0]
            });
        } catch (error) {
            console.error('Worker profile update error:', error);

            return res.status(500).json({
                status: 'error',
                message: 'Failed to update worker profile.'
            });
        }
    }
);

module.exports = router;

