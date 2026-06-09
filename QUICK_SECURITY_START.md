# Quick Security Start Guide

> **TL;DR**: Read this to get the system secure and running immediately.

---

## 🚀 Quick Setup (5 minutes)

### 1. Generate Strong JWT Secret
```bash
# macOS/Linux
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32))
```

### 2. Copy Environment Template
```bash
cp .env.example .env.production
# OR
cp .env.production.example .env.production
```

### 3. Update .env.production
Replace these placeholders:
```env
JWT_SECRET=<paste-generated-secret-here>
APP_ENV=production
DATABASE_URL=<your-postgres-url>
MAIL_HOST=<smtp-host>
MAIL_USERNAME=<email>
MAIL_PASSWORD=<password>
AT_USERNAME=<sms-provider>
AT_API_KEY=<sms-key>
ALLOWED_ORIGINS=https://yourdomain.com
```

### 4. Test Authentication Flow
```bash
# Register guest
curl -X POST http://localhost:5000/api/auth/register-guest \
  -H "Content-Type: application/json" \
  -d '{"phone":"+250788123456"}'

# Verify phone (use code from response)
curl -X POST http://localhost:5000/api/auth/verify-guest-phone \
  -H "Content-Type: application/json" \
  -d '{"phone":"+250788123456","code":"123456"}'
```

### 5. Run Security Audit
```bash
npm audit
npm audit fix
```

---

## ✅ Security Checklist

### Before Going to Production
- [ ] Change JWT_SECRET
- [ ] Set APP_ENV=production
- [ ] Configure database credentials
- [ ] Configure email service
- [ ] Configure SMS provider
- [ ] Set ALLOWED_ORIGINS
- [ ] Enable HTTPS
- [ ] Test all auth flows
- [ ] Run npm audit
- [ ] Set up backups
- [ ] Configure monitoring

### Monthly
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Run npm audit
- [ ] Test disaster recovery
- [ ] Review access logs

---

## 🔒 Key Security Features

### What's Protected
| Feature | What It Does |
|---------|-------------|
| **Rate Limiting** | Blocks 100+ requests/15min from same IP |
| **Input Validation** | Rejects invalid emails, weak passwords, etc. |
| **Password Security** | Requires 8+ chars with uppercase, numbers, symbols |
| **Error Messages** | Production hides error details (development shows all) |
| **CORS** | Only allows requests from `ALLOWED_ORIGINS` |
| **JWT Tokens** | Expire after 7 days, verified on every request |
| **HTTPS** | Forces secure connections in production |
| **Logging** | Records all API requests for audit trail |

### What's NOT Protected Yet (Do Later)
- [ ] 2FA/MFA authentication
- [ ] Account lockout after failed logins
- [ ] CAPTCHA
- [ ] IP whitelisting
- [ ] WAF (Web Application Firewall)

---

## ⚠️ Critical Don'ts

```
❌ DON'T:
  - Commit JWT_SECRET to git
  - Use default passwords
  - Skip HTTPS in production
  - Log passwords or tokens
  - Trust unvalidated input
  - Expose error stacks to users
  - Use weak random values for secrets
  - Store secrets in code

✅ DO:
  - Use environment variables
  - Rotate secrets regularly
  - Validate all input server-side
  - Use HTTPS everywhere
  - Keep dependencies updated
  - Monitor security logs
  - Test security regularly
  - Back up important data
```

---

## 🚨 If Hacked/Breached

### Immediate Actions (First 24 hours)
1. **Change JWT_SECRET** - Invalidates all tokens
   ```env
   JWT_SECRET=<new-random-secret>
   ```

2. **Change Database Password** - Prevent data access
   ```env
   PGPASSWORD=<new-password>
   ```

3. **Change Email/SMS Credentials** - Stop unauthorized sends
   ```env
   MAIL_PASSWORD=<new-password>
   AT_API_KEY=<new-key>
   ```

4. **Review Logs** - See what happened
   ```bash
   tail -f logs/error.log
   tail -f logs/combined.log
   ```

5. **Notify Users** - If passwords exposed
   - Send password reset emails
   - Require password change
   - Monitor accounts for suspicious activity

### Follow-up Actions (Week 1)
1. Conduct security audit
2. Update all dependencies
3. Review access logs
4. Implement additional protections
5. Document what happened

---

## 🔧 Common Security Tasks

### Change JWT Secret (Monthly)
```env
# In .env.production
JWT_SECRET=<new-secret-here>
```
Then restart the app.

### Enable 2FA (When Available)
```env
ENABLE_2FA=true
SMS_PROVIDER=africastalking
```

### Increase Rate Limits for API Users
```env
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=3600000  # 1 hour
```

### Review Security Logs
```bash
# Last 100 auth attempts
grep "auth" logs/combined.log | tail -100

# Failed logins
grep "INVALID_CREDENTIALS" logs/error.log

# Rate limit hits
grep "429" logs/combined.log

# Errors
tail -f logs/error.log
```

---

## 📞 Emergency Contacts

**Security Issue Found?**
1. Email: security@yourdomain.com
2. Give 90 days to fix
3. Don't disclose publicly
4. Include proof of concept if possible

**System Down?**
1. Check logs: `tail -f logs/error.log`
2. Check database: `nc -zv db-host 5432`
3. Check email service: Test SMTP connection
4. Check SMS service: Verify API credentials
5. Restart app: `npm start`

---

## 🎓 Learn More

**For Details, Read:**
- `SECURITY_GUIDE.md` - Comprehensive security guide
- `SECURITY_IMPLEMENTATION_SUMMARY.md` - What was implemented
- `PACKAGES_RECOMMENDED.md` - Recommended security packages
- `.env.production.example` - All configuration options

**External Resources:**
- OWASP Top 10: https://owasp.org/Top10/
- Node.js Security: https://nodejs.org/en/docs/guides/security/
- Express Security: https://expressjs.com/en/advanced/best-practice-security.html

---

## ✨ Success Indicators

### System is Secure When:
✓ All auth tests pass  
✓ Rate limiting works  
✓ No npm audit warnings  
✓ HTTPS enabled  
✓ Logs show all requests  
✓ Error messages don't leak info  
✓ All tests pass  

### System is Ready for Users When:
✓ All above ✓  
✓ Backups working  
✓ Monitoring configured  
✓ Runbooks documented  
✓ Disaster recovery tested  
✓ Security audit passed  

---

## 🔐 Password Reset Flow

When user forgets password:
```
1. User clicks "Forgot Password"
2. Enters email
3. System sends reset email (15 min expiry)
4. User clicks link, enters new password
5. System validates password strength
6. User logs in with new password
```

Example:
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

---

## 📊 Monitoring Dashboard

Essential metrics to track:
```
Daily:
  - Failed login attempts
  - Rate limit hits (429 errors)
  - New user registrations
  - API response times

Weekly:
  - Error rate trends
  - Most common errors
  - Unusual API patterns
  - Database performance

Monthly:
  - Security audit results
  - Dependency update status
  - User engagement metrics
  - Performance trends
```

---

## 🎯 30-Day Security Roadmap

### Week 1
- [ ] Complete setup above
- [ ] Test all auth flows
- [ ] Verify email delivery
- [ ] Verify SMS delivery
- [ ] Run npm audit

### Week 2
- [ ] Deploy to production
- [ ] Enable monitoring
- [ ] Document procedures
- [ ] Train team

### Week 3
- [ ] First security audit
- [ ] Review logs
- [ ] Performance test
- [ ] Disaster recovery drill

### Week 4
- [ ] Install recommended packages
- [ ] Plan 2FA implementation
- [ ] Plan account lockout feature
- [ ] Schedule security review

---

## 💡 Pro Tips

### Tip 1: Rotate Secrets Regularly
Change JWT_SECRET, database passwords, and API keys monthly.

### Tip 2: Monitor Rate Limits
If you see many 429 errors, you might be under attack.

### Tip 3: Test Backups
Backups are useless if you can't restore from them.

### Tip 4: Log Everything
Good logs help you understand what went wrong.

### Tip 5: Keep Secrets Secret
Use environment variables, not code. Use a secrets manager in production.

---

## ❓ FAQ

**Q: Is the system production-ready?**  
A: Yes, with .env.production configured.

**Q: How do I know if I'm under attack?**  
A: Check logs for 429 errors and failed logins.

**Q: Can I disable rate limiting?**  
A: Yes, but not recommended. Remove `createRateLimiter()` from app.js.

**Q: What's the password policy?**  
A: 8+ chars with uppercase, lowercase, numbers, and symbols.

**Q: Do passwords expire?**  
A: No, but users must change after password reset.

**Q: Is data encrypted?**  
A: In transit (HTTPS): Yes. At rest: No (yet). Implement in Phase 2.

**Q: How long do verification codes last?**  
A: 15 minutes. Change in config: `VERIFICATION_CODE_EXPIRY`.

**Q: Can I change rate limits?**  
A: Yes, in app.js: `createRateLimiter(100, 15 * 60 * 1000)`.

---

## 🚀 You're Ready!

Your system is now:
- ✓ Validated
- ✓ Sanitized
- ✓ Rate limited
- ✓ Logged
- ✓ Secured
- ✓ Protected
- ✓ Documented
- ✓ Production-ready

**Next Steps:**
1. Configure .env.production
2. Deploy to production
3. Monitor for issues
4. Keep dependencies updated
5. Plan Phase 2 enhancements

---

**Questions?** Read SECURITY_GUIDE.md  
**Technical Details?** Read SECURITY_IMPLEMENTATION_SUMMARY.md  
**Need More Packages?** Read PACKAGES_RECOMMENDED.md

**Good luck! 🎉**
