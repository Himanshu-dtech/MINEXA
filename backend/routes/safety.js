const express = require('express');

const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');

const router = express.Router();

/*
=================================================
GET WORKERS WAITING FOR SAFETY VERIFICATION
=================================================
Only Safety Officers can access this.
Only workers from the Safety Officer's own mine
are returned.
=================================================
*/

router.get(
    '/worker-registrations',
    authenticateToken,
    requireRoles('SAFETY_OFFICER'),
    async (req, res) => {
        try {
            const officerResult = await pool.query(
                `
                SELECT mine_id
                FROM users
                WHERE id = $1
                  AND role = 'SAFETY_OFFICER'
                `,
                [req.user.userId]
            );

            if (officerResult.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Safety Officer account not found.'
                });
            }

            const mineId = officerResult.rows[0].mine_id;

            if (!mineId) {
                return res.status(403).json({
                    status: 'error',
                    message:
                        'Safety Officer is not assigned to a mine.'
                });
            }

            /*
            Return only requests that have reached the
            safety verification stage.
            */

            const result = await pool.query(
                `
                SELECT
                    r.id,
                    r.name,
                    r.email,
                    r.phone,
                    r.requested_role,
                    r.mine_id,
                    m.name AS mine_name,
                    r.employee_id,
                    r.department,
                    r.designation,
                    r.certification_number,
                    r.safety_training_id,
                    r.status,
                    r.submitted_at
                FROM registration_requests r
                LEFT JOIN mines m
                    ON m.id = r.mine_id
                WHERE r.requested_role = 'FIELD_WORKER'
                  AND r.mine_id = $1
                  AND r.status = 'UNDER_REVIEW'
                  AND EXISTS (
                      SELECT 1
                      FROM approval_actions a
                      WHERE a.registration_id = r.id
                        AND a.action = 'MANAGER_APPROVED'
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM approval_actions a
                      WHERE a.registration_id = r.id
                        AND a.action = 'SAFETY_VERIFIED'
                  )
                ORDER BY r.submitted_at ASC
                `,
                [mineId]
            );

            return res.status(200).json({
                status: 'success',
                registrations: result.rows
            });
        } catch (error) {
            console.error(
                'Safety worker registrations error:',
                error
            );

            return res.status(500).json({
                status: 'error',
                message:
                    'Failed to fetch safety verification requests.'
            });
        }
    }
);

/*
=================================================
VERIFY WORKER SAFETY
=================================================

Requirements:
1. User must be SAFETY_OFFICER.
2. Same mine.
3. FIELD_WORKER registration.
4. MANAGER_APPROVED must exist.
5. SAFETY_VERIFIED must not already exist.

After successful verification:
- Create workers record.
- Create users record.
- Set account ACTIVE.
- Mark registration APPROVED.
- Record SAFETY_VERIFIED.
=================================================
*/

router.post(
    '/worker-registrations/:id/verify',
    authenticateToken,
    requireRoles('SAFETY_OFFICER'),
    async (req, res) => {
        const client = await pool.connect();

        try {
            const registrationId = Number(
                req.params.id
            );

            if (
                !Number.isInteger(registrationId) ||
                registrationId <= 0
            ) {
                return res.status(400).json({
                    status: 'error',
                    message:
                        'Invalid registration ID.'
                });
            }

            await client.query('BEGIN');

            /*
            -----------------------------------------
            GET SAFETY OFFICER
            -----------------------------------------
            */

            const officerResult = await client.query(
                `
                SELECT
                    id,
                    mine_id
                FROM users
                WHERE id = $1
                  AND role = 'SAFETY_OFFICER'
                `,
                [req.user.userId]
            );

            if (
                officerResult.rows.length === 0 ||
                !officerResult.rows[0].mine_id
            ) {
                await client.query('ROLLBACK');

                return res.status(403).json({
                    status: 'error',
                    message:
                        'Safety Officer is not assigned to a mine.'
                });
            }

            const officerMineId =
                officerResult.rows[0].mine_id;

            /*
            -----------------------------------------
            GET REGISTRATION
            -----------------------------------------
            */

            const registrationResult =
                await client.query(
                    `
                    SELECT *
                    FROM registration_requests
                    WHERE id = $1
                    FOR UPDATE
                    `,
                    [registrationId]
                );

            if (
                registrationResult.rows.length === 0
            ) {
                await client.query('ROLLBACK');

                return res.status(404).json({
                    status: 'error',
                    message:
                        'Registration request not found.'
                });
            }

            const registration =
                registrationResult.rows[0];

            /*
            -----------------------------------------
            ROLE CHECK
            -----------------------------------------
            */

            if (
                registration.requested_role !==
                'FIELD_WORKER'
            ) {
                await client.query('ROLLBACK');

                return res.status(403).json({
                    status: 'error',
                    message:
                        'Safety Officers can only verify Field Worker registrations.'
                });
            }

            /*
            -----------------------------------------
            MINE CHECK
            -----------------------------------------
            */

            if (
                registration.mine_id !==
                officerMineId
            ) {
                await client.query('ROLLBACK');

                return res.status(403).json({
                    status: 'error',
                    message:
                        'You can only verify workers from your assigned mine.'
                });
            }

            /*
            -----------------------------------------
            STATUS CHECK
            -----------------------------------------
            */

            if (registration.status !== 'UNDER_REVIEW') {
                await client.query('ROLLBACK');

                return res.status(409).json({
                    status: 'error',
                    message:
                        'This worker is not currently waiting for safety verification.'
                });
            }

            /*
            -----------------------------------------
            MANAGER APPROVAL CHECK
            -----------------------------------------
            */

            const managerApprovalResult =
                await client.query(
                    `
                    SELECT id
                    FROM approval_actions
                    WHERE registration_id = $1
                      AND action = 'MANAGER_APPROVED'
                    LIMIT 1
                    `,
                    [registrationId]
                );

            if (
                managerApprovalResult.rows.length === 0
            ) {
                await client.query('ROLLBACK');

                return res.status(409).json({
                    status: 'error',
                    message:
                        'Manager approval is required before safety verification.'
                });
            }

            /*
            -----------------------------------------
            DUPLICATE SAFETY CHECK
            -----------------------------------------
            */

            const previousSafetyVerification =
                await client.query(
                    `
                    SELECT id
                    FROM approval_actions
                    WHERE registration_id = $1
                      AND action = 'SAFETY_VERIFIED'
                    LIMIT 1
                    `,
                    [registrationId]
                );

            if (
                previousSafetyVerification.rows.length > 0
            ) {
                await client.query('ROLLBACK');

                return res.status(409).json({
                    status: 'error',
                    message:
                        'This worker has already been safety verified.'
                });
            }

            /*
            -----------------------------------------
            CHECK DUPLICATE EMPLOYEE ID
            -----------------------------------------
            */

            const employeeResult = await client.query(
                `
                SELECT id
                FROM workers
                WHERE employee_code = $1
                `,
                [registration.employee_id]
            );

            if (employeeResult.rows.length > 0) {
                await client.query('ROLLBACK');

                return res.status(409).json({
                    status: 'error',
                    message:
                        'This employee ID is already registered.'
                });
            }

            /*
            -----------------------------------------
            CHECK DUPLICATE EMAIL
            -----------------------------------------
            */

            const emailResult = await client.query(
                `
                SELECT id
                FROM users
                WHERE LOWER(email) = LOWER($1)
                `,
                [registration.email]
            );

            if (emailResult.rows.length > 0) {
                await client.query('ROLLBACK');

                return res.status(409).json({
                    status: 'error',
                    message:
                        'A user account with this email already exists.'
                });
            }

            /*
            -----------------------------------------
            CREATE WORKER
            -----------------------------------------
            */

            const workerResult = await client.query(
                `
                INSERT INTO workers
                (
                    name,
                    employee_code,
                    mine_id
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                RETURNING id, name, employee_code, mine_id
                `,
                [
                    registration.name,
                    registration.employee_id,
                    registration.mine_id
                ]
            );

            const worker =
                workerResult.rows[0];

            /*
            -----------------------------------------
            CREATE ACTIVE USER
            -----------------------------------------
            */

            const userResult = await client.query(
                `
                INSERT INTO users
                (
                    name,
                    email,
                    password_hash,
                    role,
                    worker_id,
                    mine_id,
                    account_status,
                    is_verified,
                    verified_at,
                    mfa_enabled
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    'FIELD_WORKER',
                    $4,
                    $5,
                    'ACTIVE',
                    TRUE,
                    CURRENT_TIMESTAMP,
                    FALSE
                )
                RETURNING
                    id,
                    name,
                    email,
                    role,
                    worker_id,
                    mine_id,
                    account_status
                `,
                [
                    registration.name,
                    registration.email,
                    registration.password_hash,
                    worker.id,
                    registration.mine_id
                ]
            );

            const user =
                userResult.rows[0];

            /*
            -----------------------------------------
            RECORD SAFETY VERIFICATION
            -----------------------------------------
            */

            await client.query(
                `
                INSERT INTO approval_actions
                (
                    registration_id,
                    reviewer_id,
                    action,
                    comments
                )
                VALUES
                (
                    $1,
                    $2,
                    'SAFETY_VERIFIED',
                    $3
                )
                `,
                [
                    registrationId,
                    req.user.userId,
                    'Worker safety credentials verified.'
                ]
            );

            /*
            -----------------------------------------
            MARK REGISTRATION APPROVED
            -----------------------------------------
            */

            await client.query(
                `
                UPDATE registration_requests
                SET
                    status = 'APPROVED',
                    reviewed_at = CURRENT_TIMESTAMP,
                    reviewed_by = $1
                WHERE id = $2
                `,
                [
                    req.user.userId,
                    registrationId
                ]
            );

            await client.query('COMMIT');

            return res.status(200).json({
                status: 'success',
                message:
                    'Worker safety verified. Account is now active.',
                worker,
                user
            });
        } catch (error) {
            await client.query('ROLLBACK');

            console.error(
                'Safety verification error:',
                error
            );

            return res.status(500).json({
                status: 'error',
                message:
                    'Failed to verify worker safety.'
            });
        } finally {
            client.release();
        }
    }
);

/*
=================================================
REJECT WORKER SAFETY
=================================================
*/

router.post(
    '/worker-registrations/:id/reject',
    authenticateToken,
    requireRoles('SAFETY_OFFICER'),
    async (req, res) => {
        const client = await pool.connect();

        try {
            const registrationId = Number(
                req.params.id
            );

            const reason = String(
                req.body.reason || ''
            ).trim();

            if (
                !Number.isInteger(registrationId) ||
                registrationId <= 0
            ) {
                return res.status(400).json({
                    status: 'error',
                    message:
                        'Invalid registration ID.'
                });
            }

            if (!reason) {
                return res.status(400).json({
                    status: 'error',
                    message:
                        'A rejection reason is required.'
                });
            }

            await client.query('BEGIN');

            const officerResult = await client.query(
                `
                SELECT mine_id
                FROM users
                WHERE id = $1
                  AND role = 'SAFETY_OFFICER'
                `,
                [req.user.userId]
            );

            if (
                officerResult.rows.length === 0 ||
                !officerResult.rows[0].mine_id
            ) {
                await client.query('ROLLBACK');

                return res.status(403).json({
                    status: 'error',
                    message:
                        'Safety Officer is not assigned to a mine.'
                });
            }

            const officerMineId =
                officerResult.rows[0].mine_id;

            const registrationResult =
                await client.query(
                    `
                    SELECT *
                    FROM registration_requests
                    WHERE id = $1
                    FOR UPDATE
                    `,
                    [registrationId]
                );

            if (
                registrationResult.rows.length === 0
            ) {
                await client.query('ROLLBACK');

                return res.status(404).json({
                    status: 'error',
                    message:
                        'Registration request not found.'
                });
            }

            const registration =
                registrationResult.rows[0];

            if (
                registration.requested_role !==
                'FIELD_WORKER'
            ) {
                await client.query('ROLLBACK');

                return res.status(403).json({
                    status: 'error',
                    message:
                        'Safety Officers can only reject Field Worker registrations.'
                });
            }

            if (
                registration.mine_id !==
                officerMineId
            ) {
                await client.query('ROLLBACK');

                return res.status(403).json({
                    status: 'error',
                    message:
                        'You can only reject workers from your assigned mine.'
                });
            }

            if (registration.status !== 'UNDER_REVIEW') {
                await client.query('ROLLBACK');

                return res.status(409).json({
                    status: 'error',
                    message:
                        'This registration is not currently under safety review.'
                });
            }

            await client.query(
                `
                UPDATE registration_requests
                SET
                    status = 'REJECTED',
                    rejection_reason = $1,
                    reviewed_at = CURRENT_TIMESTAMP,
                    reviewed_by = $2
                WHERE id = $3
                `,
                [
                    reason,
                    req.user.userId,
                    registrationId
                ]
            );

            await client.query(
                `
                INSERT INTO approval_actions
                (
                    registration_id,
                    reviewer_id,
                    action,
                    comments
                )
                VALUES
                (
                    $1,
                    $2,
                    'REJECTED',
                    $3
                )
                `,
                [
                    registrationId,
                    req.user.userId,
                    reason
                ]
            );

            await client.query('COMMIT');

            return res.status(200).json({
                status: 'success',
                message:
                    'Worker failed safety verification and was rejected.'
            });
        } catch (error) {
            await client.query('ROLLBACK');

            console.error(
                'Safety rejection error:',
                error
            );

            return res.status(500).json({
                status: 'error',
                message:
                    'Failed to reject worker registration.'
            });
        } finally {
            client.release();
        }
    }
);

module.exports = router;