# Security Deployment Checklist

> Use this checklist before deploying to production. Print it and check off each item.

---

## 🔐 PRE-DEPLOYMENT (Before First Production Deploy)

### Environment Configuration
- [ ] JWT_SECRET is at least 32 random characters
- [ ] APP_ENV is set to `production`
- [ ] FRONTEND_URL matches your domain
- [ ] DATABASE_URL uses secure connection (postgresql:// or with ?sslmode=require)
- [ ] MAIL_HOST and MAIL_PASSWORD are configured
- [ ] AT_USERNAME and AT_API_KEY are configured (or SMS_PROVIDER is set)
- [ ] ALLOWED_ORIGINS contains only your domain(s)
- [ ] All sensitive values are NOT in .env.example
- [ ] .env.production file is in .gitignore
- [ ] No hardcoded secrets in code (grep for "password", "secret", "key")

### Security Headers
- [ ] HSTS header is enabled (Strict-Transport-Security)
- [ ] X-Frame-Options is set to DENY
- [ ] X-Content-Type-Options is set to nosniff
- [ ] Content-Security-Policy is configured
- [ ] X-XSS-Protection is enabled

### Authentication
- [ ] JWT token expiration is reasonable (7 days default)
- [ ] Password validation requires 8+ characters
- [ ] Password requires uppercase, lowercase, numbers, symbols
- [ ] Email verification is required before login
- [ ] Phone verification works for guest users
- [ ] Password reset flow includes verification
- [ ] Tokens are stored in HTTPOnly cookies

### Rate Limiting
- [ ] Rate limiting is enabled (100 req/15min)
- [ ] Rate limiting applies to auth endpoints
- [ ] Rate limiting applies to API endpoints
- [ ] Rate limit responses include Retry-After header
- [ ] Rate limit store cleanup is implemented

### Input Validation
- [ ] Email validation matches RFC 5322 standard
- [ ] Phone validation accepts valid formats
- [ ] Password validation is enforced
- [ ] Name/username has length limits (2-255)
- [ ] Verification codes are exactly 6 digits
- [ ] All inputs are sanitized

### Error Handling
- [ ] Production errors don't expose stack traces
- [ ] Error messages don't leak database info
- [ ] Error messages don't leak file paths
- [ ] Validation errors are clear but safe
- [ ] 404 errors don't confirm resource existence
- [ ] 500 errors have generic messages

### Database
- [ ] Database uses strong password (16+ chars)
- [ ] Database connection uses SSL/TLS
- [ ] Database user has minimal required permissions
- [ ] Password hashing uses bcryptjs or argon2
- [ ] All queries use parameterized statements
- [ ] No SQL errors in production logs

### CORS Configuration
- [ ] CORS whitelist contains only required origins
- [ ] Wildcard (*) is NOT in ALLOWED_ORIGINS
- [ ] Localhost is NOT in production ALLOWED_ORIGINS
- [ ] CORS allows only needed HTTP methods
- [ ] CORS allows only needed headers

### HTTPS/TLS
- [ ] HTTPS is enforced for all endpoints
- [ ] SSL certificate is valid and not self-signed
- [ ] HSTS header has appropriate max-age
- [ ] TLS 1.2 or higher is required
- [ ] Weak ciphers are disabled

### Logging & Monitoring
- [ ] Logging is configured for all auth attempts
- [ ] Sensitive data (passwords, tokens) is never logged
- [ ] Error logs include timestamps
- [ ] Logs are retained for at least 30 days
- [ ] Log access is restricted
- [ ] Log rotation is configured

### Dependencies
- [ ] npm audit shows no critical vulnerabilities
- [ ] npm audit shows no high vulnerabilities
- [ ] All dependencies are at latest patch version
- [ ] No deprecated packages are used
- [ ] Dependency licenses are acceptable

### Code Quality
- [ ] No console.log statements left in code
- [ ] No TODO comments in critical paths
- [ ] No hardcoded values in code
- [ ] Code follows security best practices
- [ ] Security linter (eslint-plugin-security) runs clean

### Documentation
- [ ] SECURITY_GUIDE.md is complete
- [ ] .env.production.example documents all variables
- [ ] Team knows security procedures
- [ ] Incident response plan is documented
- [ ] Emergency contacts are documented

---

## 🚀 DEPLOYMENT (Day 1)

### Pre-Deployment Testing
- [ ] Run npm audit and fix all issues
- [ ] Run npm test (if tests exist)
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Test password reset flow
- [ ] Test guest signup flow
- [ ] Test rate limiting (send 100+ requests)
- [ ] Test CORS from allowed origin
- [ ] Test CORS rejection from other origin
- [ ] Test email delivery
- [ ] Test SMS delivery

### Server Setup
- [ ] Server has adequate resources (CPU, RAM, disk)
- [ ] Server has public IP/domain
- [ ] SSL certificate is installed and valid
- [ ] Reverse proxy (Nginx/Apache) is configured
- [ ] SSL is enforced (redirect HTTP to HTTPS)
- [ ] Port 443 (HTTPS) is open
- [ ] Port 80 (HTTP) can be closed after setup

### Database Setup
- [ ] Database is running and accessible
- [ ] Database user is created with strong password
- [ ] Database user permissions are limited
- [ ] Database is backed up daily
- [ ] Backup restoration is tested
- [ ] Database SSL/TLS is enabled
- [ ] Database connection timeout is set
- [ ] Database pool is configured

### Email Service
- [ ] Email service credentials are working
- [ ] Test email is sent successfully
- [ ] Email templates are configured
- [ ] Email from address is branded
- [ ] Unsubscribe links work (if applicable)

### SMS Service
- [ ] SMS service credentials are working
- [ ] Test SMS is sent successfully
- [ ] SMS sender ID is configured
- [ ] SMS rate limits are understood
- [ ] SMS delivery is monitored

### Monitoring & Alerts
- [ ] Error tracking (Sentry) is configured
- [ ] Uptime monitoring is configured
- [ ] Log aggregation is configured
- [ ] Alerts are set for critical errors
- [ ] Team receives alerts

### Backups & Recovery
- [ ] Automated backups are running
- [ ] Backups are encrypted
- [ ] Backup restoration is tested
- [ ] Backup retention policy is set
- [ ] Off-site backup exists

---

## 📋 WEEK 1 (Ongoing Monitoring)

### Daily
- [ ] Check error logs for issues
- [ ] Check rate limit hits (for attacks)
- [ ] Check failed auth attempts
- [ ] Monitor API response times
- [ ] Monitor uptime

### First Week
- [ ] Review all auth flows with real users
- [ ] Monitor error patterns
- [ ] Check email deliverability
- [ ] Check SMS deliverability
- [ ] Monitor database performance
- [ ] Review security logs
- [ ] Test disaster recovery
- [ ] Verify backups are working
- [ ] Document any issues
- [ ] Train support team

### After First Week
- [ ] Conduct security audit
- [ ] Review logs thoroughly
- [ ] Update documentation
- [ ] Plan Phase 2 improvements
- [ ] Schedule monthly reviews

---

## 🔄 MONTHLY MAINTENANCE

### Security
- [ ] Update all dependencies (`npm update`)
- [ ] Run `npm audit` and fix issues
- [ ] Review security logs
- [ ] Review access logs
- [ ] Rotate JWT_SECRET (optional but recommended)
- [ ] Rotate database password (optional)
- [ ] Check SSL certificate expiration

### Operations
- [ ] Review error logs
- [ ] Check backup status
- [ ] Test backup restoration
- [ ] Review database performance
- [ ] Check API response times
- [ ] Monitor storage usage

### Maintenance
- [ ] Update system packages
- [ ] Update Node.js if needed
- [ ] Clean up old logs
- [ ] Review and update documentation
- [ ] Team security training

---

## 🆘 INCIDENT RESPONSE

### If Hacked/Breached
- [ ] **IMMEDIATELY**: Stop the attack (if possible)
- [ ] **IMMEDIATELY**: Change JWT_SECRET in .env.production
- [ ] **IMMEDIATELY**: Change database password
- [ ] **IMMEDIATELY**: Change email/SMS credentials
- [ ] **IMMEDIATELY**: Restart application
- [ ] Within 1 hour: Review logs to determine scope
- [ ] Within 1 hour: Notify security team
- [ ] Within 24 hours: Notify affected users
- [ ] Within 24 hours: Document what happened
- [ ] Within 1 week: Complete security audit
- [ ] Within 1 week: Implement fixes
- [ ] Within 2 weeks: Follow-up audit

### If Database is Compromised
- [ ] Invalidate all user passwords
- [ ] Send password reset emails to all users
- [ ] Force password change on next login
- [ ] Monitor accounts for suspicious activity
- [ ] Check backup integrity
- [ ] Restore from backup if needed

### If Credentials are Exposed
- [ ] Change all affected credentials
- [ ] Rotate API keys
- [ ] Check for unauthorized usage
- [ ] Update logs and audit trail
- [ ] Monitor for further unauthorized access

---

## ✅ READY FOR PRODUCTION?

### Checklist Complete If All Boxes Checked:
- [ ] All PRE-DEPLOYMENT items checked
- [ ] All DEPLOYMENT items checked
- [ ] All WEEK 1 items checked
- [ ] Incident response plan documented
- [ ] Team is trained
- [ ] Monitoring is active
- [ ] Backups are working
- [ ] Documentation is complete

### If Any Box is Unchecked:
- [ ] Fix the issue
- [ ] Test the fix
- [ ] Verify the fix
- [ ] Check the box
- [ ] Move to next item

---

## 📞 Support & Escalation

### Can't Start App?
1. Check `.env.production` exists and has all variables
2. Check database is running
3. Check database credentials are correct
4. Run `npm install` again
5. Check Node.js version
6. Check logs for errors

### 429 Errors (Rate Limiting)?
1. Normal if testing with scripts
2. May indicate attack if from users
3. Check logs for IP pattern
4. Consider adjusting limits if needed

### Auth Not Working?
1. Check JWT_SECRET is set
2. Check database has users table
3. Check email service is working
4. Check password validation requirements
5. Check tokens haven't expired

### Email Not Delivering?
1. Check MAIL_HOST and MAIL_PASSWORD
2. Check email isn't in spam folder
3. Check email service rate limits
4. Check email address is valid
5. Check logs for delivery errors

### SMS Not Delivering?
1. Check AT_USERNAME and AT_API_KEY
2. Check phone number format
3. Check SMS provider status
4. Check SMS balance/credits
5. Check logs for delivery errors

---

## 📊 Quick Reference

### Security Metrics
- Rate Limit: 100 requests per 15 minutes
- Password Min Length: 8 characters
- JWT Expiry: 7 days
- Code Expiry: 15 minutes
- Session Cookie Age: 7 days
- Backup Retention: 30 days
- Log Retention: 30 days

### Port Numbers
- HTTP (redirect): 80
- HTTPS: 443
- PostgreSQL: 5432
- MySQL: 3306
- Redis: 6379
- Node App: 5000 (dev) or 3001 (prod)

### File Locations
- Env Config: `.env.production`
- Security Middleware: `api-lib/middleware/security.js`
- Auth Service: `api-lib/services/authService.js`
- Logs: `logs/` directory
- Backups: Off-site or S3

---

## 🎯 Success Criteria

Your system is **SECURE** when:
✓ All checklist items are checked  
✓ Tests pass  
✓ No npm audit warnings  
✓ Logs show normal activity  
✓ Users can auth successfully  
✓ Monitoring is active  
✓ Backups are working  
✓ Team understands procedures  

Your system is **RESILIENT** when:
✓ Backups can be restored  
✓ Database failover works  
✓ Monitoring alerts work  
✓ Incident response is tested  
✓ Recovery time is < 1 hour  
✓ No single point of failure  

---

## 📝 Sign-Off

**Checklist Completed By:** ________________  
**Date:** ________________  
**System Ready for Production:** [ ] Yes [ ] No  

**Security Review Sign-Off:** ________________  
**Date:** ________________  

**Operations Approval:** ________________  
**Date:** ________________  

---

**Print this and keep in your server room!**
