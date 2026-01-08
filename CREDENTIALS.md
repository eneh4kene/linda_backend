# Linda Platform - Demo Credentials

## ⚠️ IMPORTANT SECURITY NOTICE

These are DEMO credentials for initial testing only.

**MUST DO BEFORE GOING LIVE:**
1. Change all passwords immediately
2. Use strong, unique passwords (minimum 16 characters)
3. Enable 2FA for admin accounts (future feature)
4. Regularly rotate credentials
5. Never share credentials via email or unsecured channels

---

## Demo User Accounts

### Admin Account
- **Email:** `admin@linda.com`
- **Password:** `TestPassword123!`
- **Access:** Full system access, all facilities
- **Use Case:** System administration, configuration, user management

### Manager Account
- **Email:** `manager@sunnymeadows.com`
- **Password:** `TestPassword123!`
- **Facility:** Sunny Meadows Care Home
- **Access:** Facility-level management, staff oversight
- **Use Case:** Care home manager operations

### Staff Account
- **Email:** `staff@sunnymeadows.com`
- **Password:** `TestPassword123!`
- **Facility:** Sunny Meadows Care Home
- **Access:** Day-to-day operations, resident interactions
- **Use Case:** Care staff daily tasks

---

## Database Seeding

To populate the database with these demo accounts:

```bash
npm run db:seed
```

This creates:
- 3 user accounts (admin, manager, staff)
- 1 facility (Sunny Meadows Care Home)
- All with hashed passwords

---

## Production Setup

### For Care Home Clients:

1. **Admin creates facility:**
   - Login as admin@linda.com
   - Create new facility for the care home

2. **Admin creates manager account:**
   - Email: `manager@[carehome].com`
   - Assign to their facility
   - Generate strong password
   - Send credentials securely (not via email)

3. **Manager creates staff accounts:**
   - Manager can create staff users
   - All staff belong to same facility

### Password Requirements (Future):
- Minimum 12 characters
- Must include: uppercase, lowercase, number, special character
- Cannot reuse last 5 passwords
- Expires every 90 days (configurable)

---

## Credential Distribution

**Recommended secure methods:**
1. Password manager (1Password, LastPass, Bitwarden)
2. Encrypted messaging (Signal, WhatsApp)
3. In-person handoff
4. Temporary password with forced reset on first login

**NEVER:**
- ❌ Send passwords via email
- ❌ Write passwords in Slack/Teams
- ❌ Store in plain text files
- ❌ Share passwords between users

---

## Emergency Access

If locked out:
1. Contact AI4E1 support team
2. Verify identity through established channels
3. Support will create temporary admin access
4. Change password immediately after regaining access

---

**Last Updated:** January 8, 2026
**Contact:** support@ai4e1.net
