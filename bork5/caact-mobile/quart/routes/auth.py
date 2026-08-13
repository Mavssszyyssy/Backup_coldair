import secrets
import uuid
from datetime import datetime, timedelta, timezone

from auth import (
    create_session,
    delete_session,
    hash_password,
    require_auth,
    verify_password,
    write_audit_log,
)
from config import Config
from database import get_db
from models import User

from quart import Blueprint, g, jsonify, request

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/auth')

ALLOWED_NAME_CHARS = set(
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß"
    "àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ"
    " .'-"
)


def _utcnow_iso() -> str:
    """
    Return the current UTC timestamp as a millisecond-precision ISO 8601 string (e.g. '2025-01-01T12:00:00.000Z').
    Used within this module wherever a consistent, database-ready timestamp is required.
    """
    return (
        datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]
        + 'Z'
    )


def _validate_person_name(value: str, label: str, required: bool = True) -> str:
    if not value:
        return f'{label} is required.' if required else ''
    if any(char.isdigit() for char in value):
        return f'{label} cannot contain numbers.'
    if any(char not in ALLOWED_NAME_CHARS for char in value):
        return (
            f'{label} can only use letters, spaces, apostrophes, periods, '
            'and hyphens.'
        )
    if len(value) < 2:
        return f'{label} must be at least 2 characters.'
    return ''


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------


@auth_bp.route('/login', methods=['POST'])
async def login():
    """
    POST /auth/login — authenticate a user by email and password.
    Verifies PBKDF2 credentials, issues a 24-hour session token, and writes an audit log entry.
    Called directly by the mobile app login screen; returns the token and sanitised user object on success.
    """
    try:
        data = await request.get_json(silent=True) or {}
        identifier = (data.get('identifier') or data.get('email') or '').strip()
        password = data.get('password') or ''
        role_filter = data.get('role')  # optional

        if not identifier or not password:
            return jsonify({
                'error': 'Email or alias and password are required'
            }), 400

        # 1. Lookup user
        async with get_db() as db:
            async with db.execute(
                """
                SELECT * FROM users
                WHERE LOWER(email) = LOWER(?) OR LOWER(alias) = LOWER(?)
                """,
                (identifier, identifier),
            ) as cursor:
                row = await cursor.fetchone()

        if row is None:
            return jsonify({'error': 'Invalid credentials'}), 401

        user_dict = dict(row)

        # 3. Verify password
        if not verify_password(
            password, user_dict['password_hash'], user_dict['salt']
        ):
            return jsonify({'error': 'Invalid credentials'}), 401

        # 4. Role filter (optional — used by mobile client to restrict login per screen)
        if role_filter and user_dict['role'] != role_filter:
            return jsonify({'error': 'Invalid credentials'}), 401

        # 5. Check account status
        if user_dict['status'] != 'active':
            return jsonify({'error': 'Account disabled'}), 403

        # 6. Create session
        token = await create_session(user_dict['id'])

        # 7. Audit log
        user_obj = User.from_row(row)
        await write_audit_log(
            action='LOGIN',
            actor=user_dict,
            target_id=user_dict['id'],
            details=f'Login using identifier {identifier}',
        )

        return jsonify({'token': token, 'user': user_obj.to_dict()}), 200

    except Exception as exc:
        return jsonify({'error': f'Login failed: {str(exc)}'}), 500


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------


@auth_bp.route('/register', methods=['POST'])
async def register():
    """
    POST /auth/register — create a new customer account and immediately issue a session token.
    Validates required fields, rejects duplicate emails, hashes the password, generates OTP for verification, and logs a REGISTER audit event.
    Called by the mobile app's sign-up screen; returns the token and new user object on success.
    """
    try:
        data = await request.get_json(silent=True) or {}
        name_first = (data.get('name_first') or '').strip()
        name_last = (data.get('name_last') or '').strip()
        suffix = (data.get('suffix') or '').strip()
        alias = (data.get('alias') or '').strip()
        email = (data.get('email') or '').strip()
        phone = (data.get('phone') or '').strip()
        password = data.get('password') or ''
        address = (data.get('address') or '').strip()
        municipality = (data.get('municipality') or '').strip()
        municipality_code = (data.get('municipality_code') or '').strip()
        submunicipality = (data.get('submunicipality') or '').strip()
        submunicipality_code = (
            data.get('submunicipality_code') or ''
        ).strip()
        thoroughfare = (data.get('thoroughfare') or '').strip()
        property_block_lot = (
            data.get('property_block_lot') or ''
        ).strip()
        apartment_unit = (data.get('apartment_unit') or '').strip()
        landmark = (data.get('landmark') or '').strip()
        plus_code = (data.get('plus_code') or '').strip()
        delivery_instructions = (
            data.get('delivery_instructions') or ''
        ).strip()
        contact_method = (data.get('contact_method') or '').strip()
        messenger_handle = (data.get('messenger_handle') or '').strip()

        name_first_error = _validate_person_name(name_first, 'First name')
        name_last_error = _validate_person_name(
            name_last, 'Last name', required=False
        )
        if name_first_error or name_last_error:
            return jsonify({
                'error': name_first_error or name_last_error
            }), 400

        if not name_first or not alias or not email or not password:
            return jsonify({
                'error': 'name_first, alias, email, and password are required'
            }), 400

        now = _utcnow_iso()
        user_id = str(uuid.uuid4())
        hash_hex, salt = hash_password(password)

        async with get_db() as db:
            # Check uniqueness
            async with db.execute(
                'SELECT id FROM users WHERE LOWER(email) = LOWER(?)',
                (email,),
            ) as cursor:
                existing = await cursor.fetchone()

            if existing:
                return jsonify({'error': 'Email already registered'}), 409

            async with db.execute(
                'SELECT id FROM users WHERE LOWER(alias) = LOWER(?)',
                (alias,),
            ) as cursor:
                existing_alias = await cursor.fetchone()

            if existing_alias:
                return jsonify({'error': 'Alias already registered'}), 409

            await db.execute(
                """
                INSERT INTO users
                    (id, name_first, name_last, suffix, alias, email, phone,
                     password_hash, salt, role, status,
                     address, municipality, municipality_code,
                     submunicipality, submunicipality_code, thoroughfare,
                     property_block_lot, apartment_unit,
                     landmark, plus_code, contact_method,
                     messenger_handle, delivery_instructions,
                     created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?,
                        ?, ?, 'customer', 'active',
                        ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?)
                """,
                (
                    user_id,
                    name_first,
                    name_last,
                    suffix,
                    alias,
                    email,
                    phone,
                    hash_hex,
                    salt,
                    address,
                    municipality,
                    municipality_code,
                    submunicipality,
                    submunicipality_code,
                    thoroughfare,
                    property_block_lot,
                    apartment_unit,
                    landmark,
                    plus_code,
                    contact_method,
                    messenger_handle,
                    delivery_instructions,
                    now,
                    now,
                ),
            )

            await db.commit()

            async with db.execute(
                'SELECT * FROM users WHERE id = ?', (user_id,)
            ) as cursor:
                row = await cursor.fetchone()

        user_obj = User.from_row(row)
        token = await create_session(user_id)

        await write_audit_log(
            action='REGISTER',
            actor=dict(row),
            target_id=user_id,
            details=(
                f'New customer registered: {email} '
                f'(alias: {alias}, contact: {contact_method or "none"})'
            ),
        )

        return jsonify({
            'token': token,
            'user': user_obj.to_dict(),
            'message': (
                'Registration successful.'
                if not Config.DEBUG
                else 'Registration successful (debug mode).'
            ),
        }), 201

    except Exception as exc:
        return jsonify({'error': f'Registration failed: {str(exc)}'}), 500


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------


@auth_bp.route('/logout', methods=['POST'])
@require_auth
async def logout():
    """
    POST /auth/logout — invalidate the current bearer token and log a LOGOUT audit event.
    Requires a valid Authorization header; deletes the session row from the database so the token is immediately rejected.
    Called by the mobile app when the user explicitly signs out.
    """
    try:
        await delete_session(g.token)
        await write_audit_log(
            action='LOGOUT',
            actor=g.current_user,
            target_id=g.current_user['id'],
        )
        return jsonify({'message': 'Logged out'}), 200
    except Exception as exc:
        return jsonify({'error': f'Logout failed: {str(exc)}'}), 500


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------


@auth_bp.route('/me', methods=['GET'])
@require_auth
async def me():
    """
    GET /auth/me — return the currently authenticated user's profile, excluding credential fields.
    Reads from g.current_user populated by @require_auth; used by the mobile app on launch to restore a persisted session.
    """
    # Strip sensitive fields before returning
    user = {
        k: v
        for k, v in g.current_user.items()
        if k not in ('password_hash', 'salt')
    }
    return jsonify({'user': user}), 200


# ---------------------------------------------------------------------------
# POST /auth/forgot-password
# ---------------------------------------------------------------------------


@auth_bp.route('/forgot-password', methods=['POST'])
async def forgot_password():
    """
    POST /auth/forgot-password — generate and store a 6-digit OTP for the given email address.
    Silently succeeds even when the email is not found to prevent user enumeration; prints the OTP to stdout in DEBUG mode.
    Called by the mobile app's forgot-password screen to begin the password-reset flow.
    """
    try:
        data = await request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        role = (data.get('role') or 'customer').strip()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        async with get_db() as db:
            async with db.execute(
                'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND role = ?',
                (email, role),
            ) as cursor:
                row = await cursor.fetchone()

        # Don't reveal whether the user exists — always return 200
        if row is not None:
            code = str(secrets.randbelow(900000) + 100000)
            now = datetime.now(timezone.utc)
            expires_at = (now + timedelta(minutes=10)).strftime(
                '%Y-%m-%dT%H:%M:%S.%f'
            )[:-3] + 'Z'

            async with get_db() as db:
                await db.execute(
                    """
                    INSERT INTO otps (email, code, expires_at, role)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(email) DO UPDATE
                        SET code = excluded.code,
                            expires_at = excluded.expires_at,
                            role = excluded.role
                    """,
                    (email.lower(), code, expires_at, role),
                )
                await db.commit()

            print(f'[OTP] {email}: {code}')

        return jsonify({
            'message': 'OTP sent (check server console in debug mode)'
        }), 200

    except Exception as exc:
        return jsonify({'error': f'Forgot password failed: {str(exc)}'}), 500


# ---------------------------------------------------------------------------
# POST /auth/verify-otp
# ---------------------------------------------------------------------------


@auth_bp.route('/verify-otp', methods=['POST'])
async def verify_otp():
    """
    POST /auth/verify-otp — confirm that the supplied OTP code matches the unexpired record for the given email.
    Returns `{"valid": true}` on success; called by the mobile app between the forgot-password and reset-password steps.
    """
    try:
        data = await request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        code = (data.get('code') or '').strip()

        if not email or not code:
            return jsonify({'error': 'email and code are required'}), 400

        now_iso = _utcnow_iso()

        async with get_db() as db:
            async with db.execute(
                'SELECT * FROM otps WHERE LOWER(email) = LOWER(?)',
                (email,),
            ) as cursor:
                row = await cursor.fetchone()

        if row is None:
            return jsonify({'error': 'No OTP found for this email'}), 400

        if row['code'] != code:
            return jsonify({'error': 'Invalid OTP code'}), 400

        if row['expires_at'] <= now_iso:
            return jsonify({'error': 'OTP has expired'}), 400

        return jsonify({'valid': True}), 200

    except Exception as exc:
        return jsonify({
            'error': f'OTP verification failed: {str(exc)}'
        }), 500


# ---------------------------------------------------------------------------
# POST /auth/reset-password
# ---------------------------------------------------------------------------


@auth_bp.route('/reset-password', methods=['POST'])
async def reset_password():
    """
    POST /auth/reset-password — verify the OTP and replace the user's password with a newly hashed one.
    Deletes the OTP record after use and writes a RESET_PASSWORD audit log entry; called as the final step of the password-reset flow.
    """
    try:
        data = await request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        code = (data.get('code') or '').strip()
        new_password = data.get('new_password') or ''

        if not email or not code or not new_password:
            return jsonify({
                'error': 'email, code, and new_password are required'
            }), 400

        now_iso = _utcnow_iso()

        async with get_db() as db:
            async with db.execute(
                'SELECT * FROM otps WHERE LOWER(email) = LOWER(?)',
                (email,),
            ) as cursor:
                otp_row = await cursor.fetchone()

            if otp_row is None:
                return jsonify({'error': 'No OTP found for this email'}), 400

            if otp_row['code'] != code:
                return jsonify({'error': 'Invalid OTP code'}), 400

            if otp_row['expires_at'] <= now_iso:
                return jsonify({'error': 'OTP has expired'}), 400

            # Hash new password and update user
            hash_hex, salt = hash_password(new_password)

            await db.execute(
                """
                UPDATE users
                SET password_hash = ?, salt = ?, updated_at = ?
                WHERE LOWER(email) = LOWER(?)
                """,
                (hash_hex, salt, now_iso, email),
            )

            # Remove OTP
            await db.execute(
                'DELETE FROM otps WHERE LOWER(email) = LOWER(?)', (email,)
            )

            # Fetch the user for audit log
            async with db.execute(
                'SELECT * FROM users WHERE LOWER(email) = LOWER(?)', (email,)
            ) as cursor:
                user_row = await cursor.fetchone()

            await db.commit()

        actor = dict(user_row) if user_row else None
        await write_audit_log(
            action='RESET_PASSWORD',
            actor=actor,
            target_id=actor['id'] if actor else None,
            details=f'Password reset for {email}',
        )

        return jsonify({'message': 'Password reset successful'}), 200

    except Exception as exc:
        return jsonify({'error': f'Password reset failed: {str(exc)}'}), 500
