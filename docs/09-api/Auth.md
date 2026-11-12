# Authentication

## Purpose
Define authentication and authorisation.

---

## Flow

1. User registers with email/password
2. User logs in → receives JWT token
3. Token included in all API requests
4. Token expires after configurable time

---

## JWT Payload

```json
{
  "user_id": "uuid",
  "business_id": "uuid",
  "role": "owner|accountant",
  "exp": 1234567890
}

Endpoints
Method	Endpoint	Description
POST	/auth/register	Register
POST	/auth/login	Login
POST	/auth/logout	Logout
POST	/auth/refresh	Refresh token
POST	/auth/reset-password	Reset password