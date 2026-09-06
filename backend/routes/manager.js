const express = require('express');

const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');
const {
    sendSMS,
    sendWhatsApp
} = require('../services/notificationService');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

/*
=================================================
GET WORKER REGISTRATION REQUESTS
MINE MANAGER ONLY
=================================================
*/

router.get(
    '/worker-registrations',
    authenticateToken,
    requireRoles('MINE_MANAGER'),
    async (req, res) => {
        try {
            /*
            Get manager's mine.
            */

            const managerResult = await pool.query(
                `
                SELECT mine_id
                FROM users
                WHERE id = $1
                `,
                [req.user.userId]
            );

            if (managerResult.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Manager account not found.'
                });
            }

            const mineId = managerResult.rows[0].mine_id;

            if (!mineId) {
                return res.status(403).json({
                    status: 'error',
                    message:
                        'This manager is not assigned to a mine.'
                });
            }

            const result = await pool.query(
                `
                SELECT
                    r.id,
                    r.name,
                    r.email,
                    r.phone,
                    r.employee_id,
                    r.department,
                    r.designation,
                    r.requested_role,
                    r.mine_id,
                    m.name AS mine_name,
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
                        AND a.action = 'ADMIN_APPROVED'
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
                'Manager worker registrations error:',
                error
            );

            return res.status(500).json({
                status: 'error',
                message:
                    'Failed to fetch worker registrations.'
            });
        }
    }
);

/*
=================================================
APPROVE WORKER
MINE MANAGER ONLY

Rules:
1. Manager must be assigned to a mine.
2. Registration must be FIELD_WORKER.
3. Worker must belong to manager's mine.
4. Request must be pending/under review.
=================================================
*/

router.post(
    '/worker-registrations/:id/approve',
    authenticateToken,
    requireRoles('MINE_MANAGER'),
    async (req, res) => {
        const client = await pool.connect();
        let transactionCommitted = false;
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
            GET MANAGER
            -----------------------------------------
            */

            const managerResult = await client.query(
                `
                SELECT mine_id
                FROM users
                WHERE id = $1
                  AND role = 'MINE_MANAGER'
                `,
                [req.user.userId]
            );

            if (
                managerResult.rows.length === 0 ||
                !managerResult.rows[0].mine_id
            ) {
                await client.query('ROLLBACK');

                return res.status(403).json({
                    status: 'error',
                    message:
                        'Manager is not assigned to a mine.'
                });
            }

            const managerMineId =
                managerResult.rows[0].mine_id;

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
                        'Mine Managers can only approve Field Worker registrations.'
                });
            }

            /*
            -----------------------------------------
            MINE CHECK
            -----------------------------------------
            */

            if (
                registration.mine_id !==
                managerMineId
            ) {
                await client.query('ROLLBACK');

                return res.status(403).json({
                    status: 'error',
                    message:
                        'You can only approve workers from your assigned mine.'
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
                        'This registration has already been processed.'
                });
            }
            
            const adminApprovalResult = await client.query(
                `
                SELECT id
                FROM approval_actions
                WHERE registration_id = $1
                  AND action = 'ADMIN_APPROVED'
                LIMIT 1
                `,
                [registrationId]
            );
            
            if (adminApprovalResult.rows.length === 0) {
                await client.query('ROLLBACK');
            
                return res.status(409).json({
                    status: 'error',
                    message:
                        'Platform Admin approval is required before manager approval.'
                });
            }

            /*
            -----------------------------------------
            PREVENT DUPLICATE MANAGER APPROVAL
            -----------------------------------------
            */

            const previousApproval =
                await client.query(
                    `
                    SELECT id
                    FROM approval_actions
                    WHERE registration_id = $1
                      AND action = 'MANAGER_APPROVED'
                    `,
                    [registrationId]
                );

            if (previousApproval.rows.length > 0) {
                await client.query('ROLLBACK');

                return res.status(409).json({
                    status: 'error',
                    message:
                        'This worker has already been approved by a manager.'
                });
            }

            /*
            -----------------------------------------
            RECORD MANAGER APPROVAL
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
                    'MANAGER_APPROVED',
                    $3
                )
                `,
                [
                    registrationId,
                    req.user.userId,
                    `Worker approved by Mine Manager for mine ${managerMineId}`
                ]
            );

            /*
            -----------------------------------------
            UPDATE REQUEST
            -----------------------------------------
            */

            await client.query(
                `
                UPDATE registration_requests
                SET
                    status = 'UNDER_REVIEW',
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
            transactionCommitted = true;
            return res.status(200).json({
                status: 'success',
                message:
                    'Worker approved by Mine Manager. Safety verification is now required.'
            });
        } catch (error) {
            if (!transactionCommitted) {
                await client.query('ROLLBACK');
            }

            console.error(
                'Manager worker approval error:',
                error
            );

            return res.status(500).json({
                status: 'error',
                message:
                    'Failed to approve worker.'
            });
        } finally {
            client.release();
        }
    }
);

/*
=================================================
REJECT WORKER
MINE MANAGER ONLY
=================================================
*/

router.post(
    '/worker-registrations/:id/reject',
    authenticateToken,
    requireRoles('MINE_MANAGER'),
    async (req, res) => {
        const client = await pool.connect();
        let transactionCommitted = false;
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

            const managerResult = await client.query(
                `
                SELECT mine_id
                FROM users
                WHERE id = $1
                  AND role = 'MINE_MANAGER'
                `,
                [req.user.userId]
            );

            if (
                managerResult.rows.length === 0 ||
                !managerResult.rows[0].mine_id
            ) {
                await client.query('ROLLBACK');

                return res.status(403).json({
                    status: 'error',
                    message:
                        'Manager is not assigned to a mine.'
                });
            }

            const managerMineId =
                managerResult.rows[0].mine_id;

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
                        'Mine Managers can only reject Field Worker registrations.'
                });
            }

            if (
                registration.mine_id !==
                managerMineId
            ) {
                await client.query('ROLLBACK');

                return res.status(403).json({
                    status: 'error',
                    message:
                        'You can only reject workers from your assigned mine.'
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
            transactionCommitted = true;
            
            // Send rejection notification
const rejectionMessage =
    `MINEMEXA: Your registration has been rejected by the Mine Manager.\n\n` +
    `Reason: ${reason}\n\n` +
    `Please contact the mine administrator for further information.`;
            let emailNotification = null;
            let smsNotification = null;
            let whatsappNotification = null;
            
            if (registration.email) {
                try {
                    emailNotification = await sendEmail({
                        to: registration.email,
                       subject: 'MINEMEXA Registration Rejected',
text:
    `Hello ${registration.name},\n\n` +
    `Your MINEMEXA Field Worker registration has been rejected by the Mine Manager.\n\n` +
    `Reason:\n${reason}\n\n` +
    `Regards,\n` +
    `MINEMEXA Platform Team`
                    });
                } catch (emailError) {
                    console.error(
                        'Manager rejection email failed:',
                        emailError.message
                    );
                }
            } else if (registration.phone) {
                try {
                    smsNotification = await sendSMS({
                        workerId: null,
                        phone: registration.phone,
                        notificationType: 'APPLICATION_REJECTED',
                        message: rejectionMessage
                    });
                } catch (notificationError) {
                    console.error(
                        'Manager rejection SMS failed:',
                        notificationError.message
                    );
                }
            
                try {
                    whatsappNotification = await sendWhatsApp({
                        workerId: null,
                        phone: registration.phone,
                        notificationType: 'APPLICATION_REJECTED',
                        message: rejectionMessage
                    });
                } catch (notificationError) {
                    console.error(
                        'Manager rejection WhatsApp failed:',
                        notificationError.message
                    );
                }
            }
            
            return res.status(200).json({
                status: 'success',
                message: 'Worker registration rejected.',
                notifications: {
                    email: emailNotification
                        ? 'SENT'
                        : 'NOT_SENT',
                    sms: smsNotification
                        ? 'SENT'
                        : 'NOT_SENT',
                    whatsapp: whatsappNotification
                        ? 'SENT'
                        : 'NOT_SENT'
                }
            });
        } catch (error) {
            if (!transactionCommitted) {
                await client.query('ROLLBACK');
            }

            console.error(
                'Manager worker rejection error:',
                error
            );

            return res.status(500).json({
                status: 'error',
                message:
                    'Failed to reject worker.'
            });
        } finally {
            client.release();
        }
    }
);

module.exports = router;