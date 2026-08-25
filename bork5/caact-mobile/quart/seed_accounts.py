# seed_accounts.py - DEVELOPMENT ONLY
# Seeds stable dummy accounts used by the local app.

import uuid
import json
from datetime import datetime, timezone

from auth import hash_password
from database import get_db


SEEDED_CUSTOMER_ID = 'seed-customer-debug-001'
SEEDED_CUSTOMER_EMAIL = 'c@coldair-act.online'
SEEDED_TECHNICIAN_ID = 'seed-technician-debug-001'
SEEDED_CUSTOMER_UNIT = {
    'id': 'seed_customer_ac_unit_001',
    'unit_name': 'Living Room AC',
    'brand': 'Cold Air ACT',
    'model': 'Inverter Split Type 1.5HP',
    'serial_number': 'CAACT-AC-2026-001',
}

SEED_ACCOUNTS = [
    {
        'id': SEEDED_CUSTOMER_ID,
        'name_first': 'Debug',
        'name_last': 'Customer',
        'alias': 'debug_customer',
        'email': SEEDED_CUSTOMER_EMAIL,
        'phone': '09000000000',
        'password': SEEDED_CUSTOMER_EMAIL,
        'role': 'customer',
        'customer_onboarded_at': '2026-05-03T00:00:00.000Z',
    },
    {
        'id': SEEDED_TECHNICIAN_ID,
        'name_first': 'Debug',
        'name_last': 'Technician',
        'alias': 'debug_technician',
        'email': 't@coldair-act.online',
        'phone': '09000000000',
        'password': 't@coldair-act.online',
        'role': 'technician',
        'technician_onboarded_at': '2026-05-03T00:00:00.000Z',
    },
    {
        'name_first': 'Debug',
        'name_last': 'Manager',
        'alias': 'debug_manager',
        'email': 'm@coldair-act.online',
        'phone': '09000000000',
        'password': 'm@coldair-act.online',
        'role': 'admin',
    },
    {
        'name_first': 'Debug',
        'name_last': 'Owner',
        'alias': 'debug_owner',
        'email': 'o@coldair-act.online',
        'phone': '09000000000',
        'password': 'o@coldair-act.online',
        'role': 'super_admin',
    },
]

SEEDED_TASK = {
    'id': 'seed_task_ac_maintenance_001',
    'requestId': 'seed_request_ac_maintenance_001',
    'title': 'Preventive Maintenance',
    'description': 'Seeded task for the dummy customer AC unit.',
    'customerId': SEEDED_CUSTOMER_ID,
    'customerName': 'Debug Customer',
    'customerEmail': SEEDED_CUSTOMER_EMAIL,
    'customerPhone': '09000000000',
    'unitId': SEEDED_CUSTOMER_UNIT['id'],
    'unitName': SEEDED_CUSTOMER_UNIT['unit_name'],
    'unitType': SEEDED_CUSTOMER_UNIT['unit_name'],
    'address': 'Living Room, Debug Residence',
    'assignedTechnicianId': SEEDED_TECHNICIAN_ID,
    'assignedTechnicianName': 'Debug Technician',
    'priority': 'Normal',
    'scheduledDate': '2026-05-10',
    'status': 'Pending',
    'createdAt': '2026-05-03T00:00:00.000Z',
    'updatedAt': '2026-05-03T00:00:00.000Z',
}


def _utcnow_iso() -> str:
    return (
        datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]
        + 'Z'
    )


async def seed_debug_accounts() -> None:
    """
    Insert predefined debug accounts into the users table.

    The customer account is given a stable id so the frontend can seed the
    matching dummy AC unit in AsyncStorage and show its maintenance recommendation.
    """
    now = _utcnow_iso()

    async with get_db() as db:
        seeded_user_ids = {}
        for account in SEED_ACCOUNTS:
            email_lower = account['email'].lower()

            async with db.execute(
                'SELECT id FROM users WHERE LOWER(email) = ?', (email_lower,)
            ) as cursor:
                existing = await cursor.fetchone()

            if existing:
                seeded_user_ids[email_lower] = existing['id']
                await db.execute(
                    """
                    UPDATE users
                    SET role = ?,
                        customer_onboarded_at = COALESCE(customer_onboarded_at, ?),
                        technician_onboarded_at = COALESCE(technician_onboarded_at, ?),
                        alias = COALESCE(NULLIF(alias, ''), ?),
                        updated_at = ?
                    WHERE LOWER(email) = ?
                    """,
                    (
                        account['role'],
                        account.get('customer_onboarded_at'),
                        account.get('technician_onboarded_at'),
                        account['alias'],
                        now,
                        email_lower,
                    ),
                )
                continue

            user_id = account.get('id') or str(uuid.uuid4())
            seeded_user_ids[email_lower] = user_id
            hash_hex, salt = hash_password(account['password'])

            await db.execute(
                """
                INSERT INTO users
                    (id, name_first, name_last, suffix, alias, email, phone,
                     password_hash, salt, role, status,
                     address, landmark, plus_code, delivery_instructions,
                     customer_onboarded_at, technician_onboarded_at,
                     created_at, updated_at)
                VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, 'active',
                        '', '', '', '', ?, ?, ?, ?)
                """,
                (
                    user_id,
                    account['name_first'],
                    account['name_last'],
                    account['alias'],
                    account['email'],
                    account['phone'],
                    hash_hex,
                    salt,
                    account['role'],
                    account.get('customer_onboarded_at'),
                    account.get('technician_onboarded_at'),
                    now,
                    now,
                ),
            )
            print(
                f'[SEED] Created {account["role"]}: {account["email"]} '
                f'/ {account["password"]}'
            )

        print(
            '[SEED] Customer dummy unit prepared for frontend: '
            f'{SEEDED_CUSTOMER_UNIT["unit_name"]} '
            f'({SEEDED_CUSTOMER_UNIT["serial_number"]})'
        )
        seeded_task = {
            **SEEDED_TASK,
            'customerId': seeded_user_ids.get(
                SEEDED_CUSTOMER_EMAIL, SEEDED_CUSTOMER_ID
            ),
            'assignedTechnicianId': seeded_user_ids.get(
                't@coldair-act.online', SEEDED_TECHNICIAN_ID
            ),
        }
        await db.execute(
            """
            INSERT INTO technician_tasks
                (id, request_id, customer_id, assigned_technician_id,
                 unit_id, status, payload, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                payload = excluded.payload,
                assigned_technician_id = excluded.assigned_technician_id,
                status = excluded.status,
                updated_at = excluded.updated_at
            """,
            (
                seeded_task['id'],
                seeded_task['requestId'],
                seeded_task['customerId'],
                seeded_task['assignedTechnicianId'],
                seeded_task['unitId'],
                seeded_task['status'],
                json.dumps(seeded_task),
                seeded_task['createdAt'],
                now,
            ),
        )
        print(f'[SEED] Created technician task: {seeded_task["title"]}')
        await db.commit()
