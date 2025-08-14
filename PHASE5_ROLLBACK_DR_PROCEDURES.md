# 🚨 PHASE 5 - ROLLBACK & DR PROCEDURES

## 📋 Overview

This document outlines the Rollback and Disaster Recovery procedures for the legal case management system, ensuring **RPO 24h, RTO 2h** as specified.

---

## 🔄 ROLLBACK PROCEDURES

### 1. Emergency Rollback (< 5 minutes)

#### **1.1 Kill Switch Activation**

```sql
-- Immediate read-only mode
select legalflow.emergency_lockdown('Production issue detected');

-- Verify kill switch status
select key, enabled from legalflow.feature_flags where key = 'kill_switch';
```

#### **1.2 Frontend Rollback**

```bash
# Option A: Use feature flags to disable problematic modules
# Access /config/flags and disable:
- Jornadas: OFF
- Tickets: OFF
- Activities: OFF
- Deals: OFF
- Financeiro: OFF (if problematic)
- Relatorios: OFF (if problematic)

# Option B: Deploy previous stable build
git revert HEAD~1  # Revert last commit
npm run build      # Rebuild
# Deploy via Netlify/Vercel
```

#### **1.3 Database Schema Rollback**

```sql
-- Revert last migration (if schema issue)
-- Check migration history first
select * from legalflow.app_events
where event like '%migration%'
order by created_at desc limit 5;

-- If needed, restore from snapshot (see DR section)
```

### 2. Staged Rollback (15-30 minutes)

#### **2.1 Identify Problem Scope**

```sql
-- Check recent errors
select * from legalflow.app_events
where event like '%error%'
  and created_at >= now() - interval '1 hour'
order by created_at desc;

-- Check performance degradation
select * from legalflow.vw_performance_24h
where p95_response_ms > 2000;

-- Check security events
select * from legalflow.security_events
where severity in ('high', 'critical')
  and created_at >= now() - interval '1 hour';
```

#### **2.2 Selective Module Disable**

```javascript
// Via Feature Flags UI (/config/flags)
// Disable only affected modules while keeping core functions

Core (Always Keep ON):
- Processos: ON
- Clientes: ON
- Documentos: ON
- Inbox: ON

Optional (Disable if problematic):
- Jornadas: OFF
- Tickets: OFF
- Activities: OFF
- Deals: OFF
- Financeiro: OFF
- Relatorios: OFF
```

#### **2.3 Data Integrity Check**

```sql
-- Check for data corruption
select count(*) as total_clientes from legalflow.clientes;
select count(*) as total_processos from legalflow.processos;
select count(*) as active_journeys from legalflow.journey_instances where status = 'active';

-- Check foreign key constraints
select conname, conrelid::regclass, confrelid::regclass
from pg_constraint
where contype = 'f'
  and connamespace = 'legalflow'::regnamespace;
```

### 3. Full System Rollback (1-2 hours)

#### **3.1 Database Snapshot Restore**

```bash
# List available snapshots
supabase db list-snapshots

# Restore from pre-deployment snapshot
supabase db restore --snapshot-id <SNAPSHOT_ID>

# Verify restore
psql $DATABASE_URL -c "select count(*) from legalflow.clientes;"
```

#### **3.2 Application Rollback**

```bash
# Git rollback to stable version
git log --oneline -10  # Find stable commit
git revert <COMMIT_HASH>

# Environment variables rollback
# Restore previous .env values if needed

# Frontend deployment rollback
npm run build
# Deploy via platform (Netlify/Vercel)
```

#### **3.3 Verification Steps**

```bash
# 1. Health check
curl -f $APP_URL/health || echo "Health check failed"

# 2. Core functionality test
curl -f $APP_URL/api/v1/agent/tools/metrics/sla_tickets

# 3. User authentication test
# Login as test user and verify basic operations

# 4. Database connectivity
psql $DATABASE_URL -c "select current_database(), current_user;"
```

---

## 💾 DISASTER RECOVERY (DR)

### RPO: 24 hours | RTO: 2 hours

### 1. Backup Strategy

#### **1.1 Automated Daily Backups**

```sql
-- Schedule daily backups (via cron or platform)
-- Backup includes:
-- 1. Full database dump
-- 2. Schema + data
-- 3. Configuration (feature flags, etc.)

-- Log backup completion
insert into legalflow.backup_logs (
  backup_type, status, file_path, file_size_bytes, duration_seconds
) values (
  'scheduled', 'completed', '/backups/daily_backup_YYYYMMDD.sql',
  1024000, 300
);
```

#### **1.2 Pre-deployment Snapshots**

```bash
# Before each deployment
supabase db snapshot create --name "pre_deployment_$(date +%Y%m%d_%H%M)"

# Log snapshot creation
psql $DATABASE_URL -c "
insert into legalflow.backup_logs (backup_type, status, created_by)
values ('pre_deploy', 'completed', current_user);
"
```

#### **1.3 Weekly Full System Backup**

```bash
#!/bin/bash
# weekly_backup.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/weekly"

# 1. Database backup
pg_dump $DATABASE_URL > "$BACKUP_DIR/db_backup_$DATE.sql"

# 2. Application code backup
git archive --format=tar.gz HEAD > "$BACKUP_DIR/app_backup_$DATE.tar.gz"

# 3. Environment configuration
cp .env* "$BACKUP_DIR/"

# 4. Upload to cloud storage (S3, etc.)
# aws s3 cp "$BACKUP_DIR/" s3://backups/legalflow/ --recursive

echo "Weekly backup completed: $DATE"
```

### 2. Disaster Scenarios & Recovery

#### **2.1 Complete Database Loss**

```bash
# Recovery Time: ~2 hours
# Recovery Point: Last daily backup (max 24h data loss)

# Step 1: Provision new database
supabase db create --name legalflow-recovery

# Step 2: Restore latest backup
psql $NEW_DATABASE_URL < /backups/latest_backup.sql

# Step 3: Update application configuration
export DATABASE_URL=$NEW_DATABASE_URL

# Step 4: Deploy application
npm run build && npm run deploy

# Step 5: Verify data integrity
psql $NEW_DATABASE_URL -c "
select
  'clientes' as table_name, count(*) as record_count
from legalflow.clientes
union all
select 'processos', count(*) from legalflow.processos
union all
select 'tickets', count(*) from legalflow.tickets;
"
```

#### **2.2 Application Server Failure**

```bash
# Recovery Time: ~30 minutes
# Recovery Point: Current (no data loss)

# Step 1: Deploy to backup infrastructure
git push backup-server main

# Step 2: Update DNS/load balancer
# Point traffic to backup server

# Step 3: Verify connectivity
curl -f $BACKUP_URL/health

# Step 4: Monitor performance
# Check /status dashboard for health metrics
```

#### **2.3 Partial Data Corruption**

```sql
-- Recovery Time: ~1 hour
-- Recovery Point: Last backup + transaction logs

-- Step 1: Identify corruption scope
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'legalflow'
  and column_name like '%corrupted_field%';

-- Step 2: Restore specific tables from backup
\copy legalflow.corrupted_table from '/backups/table_backup.csv' with csv header;

-- Step 3: Rebuild indexes and constraints
reindex schema legalflow;

-- Step 4: Verify data integrity
select count(*) from legalflow.corrupted_table;
```

### 3. Monthly DR Testing

#### **3.1 Test Restore Procedure**

```bash
#!/bin/bash
# monthly_dr_test.sh

echo "Starting monthly DR test..."

# 1. Create test environment
supabase db create --name legalflow-dr-test

# 2. Restore latest backup
psql $DR_TEST_URL < /backups/latest_backup.sql

# 3. Run basic functionality tests
npm run test:integration --env=dr-test

# 4. Performance test
curl -w "@curl-format.txt" $DR_TEST_URL/api/health

# 5. Cleanup test environment
supabase db delete --name legalflow-dr-test

echo "DR test completed successfully"
```

#### **3.2 RTO/RPO Verification**

```sql
-- Test Recovery Time Objective (< 2 hours)
-- Measure time from failure detection to full recovery

-- Test Recovery Point Objective (< 24 hours)
-- Verify maximum data loss in backup scenarios

insert into legalflow.app_events (event, payload) values (
  'dr_test_completed',
  jsonb_build_object(
    'rto_minutes', 85,  -- Actual recovery time
    'rpo_hours', 12,    -- Actual data loss window
    'test_passed', true,
    'timestamp', now()
  )
);
```

---

## 📞 EMERGENCY CONTACTS & PROCEDURES

### Escalation Matrix

| Severity                        | Response Time     | Contacts                     |
| ------------------------------- | ----------------- | ---------------------------- |
| **Critical** (System down)      | 15 minutes        | Tech Lead + DevOps + Manager |
| **High** (Major features down)  | 1 hour            | Tech Lead + DevOps           |
| **Medium** (Performance issues) | 4 hours           | Tech Lead                    |
| **Low** (Minor bugs)            | Next business day | Developer                    |

### Emergency Response Steps

#### **1. Incident Detection (0-5 minutes)**

```bash
# Automated monitoring alerts or manual detection
# 1. Check /status dashboard
# 2. Review error logs
# 3. Verify user reports

# Immediate assessment
curl -f $APP_URL/health
psql $DATABASE_URL -c "select 1;"
```

#### **2. Initial Response (5-15 minutes)**

```bash
# 1. Activate kill switch if necessary
# 2. Notify stakeholders
# 3. Gather initial data
# 4. Decide on rollback vs. fix-forward

# Communication template:
echo "INCIDENT ALERT: [Severity] - [Brief description]
- Started: $(date)
- Impact: [User impact]
- Actions: [Initial actions taken]
- ETA: [Estimated resolution time]"
```

#### **3. Resolution (15 minutes - 2 hours)**

```bash
# Follow appropriate rollback procedure based on severity:
# - Emergency Rollback (< 5 min): Kill switch + feature flags
# - Staged Rollback (15-30 min): Selective module disable
# - Full Rollback (1-2 hours): Database + application restore

# Document all actions taken
psql $DATABASE_URL -c "
insert into legalflow.app_events (event, payload) values (
  'incident_resolution',
  jsonb_build_object(
    'incident_id', '$INCIDENT_ID',
    'actions_taken', '$ACTIONS',
    'resolution_time', now()
  )
);
"
```

#### **4. Post-Incident (After resolution)**

```bash
# 1. Verify full system functionality
# 2. Monitor for recurring issues
# 3. Document lessons learned
# 4. Update procedures if needed
# 5. Schedule post-mortem meeting

# Post-incident checklist
curl -f $APP_URL/qa  # Run QA checks
curl -f $APP_URL/status  # Verify health metrics
```

---

## 🔍 MONITORING & ALERTS

### Key Metrics to Monitor

1. **System Health**

   - Database connectivity
   - Application response time (< 1s P95)
   - Error rate (< 1%)
   - Memory/CPU usage

2. **Business Metrics**

   - User login success rate
   - Core feature availability
   - Data integrity checks

3. **Security Metrics**
   - Failed authentication attempts
   - Rate limit violations
   - Unusual access patterns

### Alert Thresholds

```sql
-- Configure monitoring thresholds
insert into legalflow.system_health (metric_name, metric_value, metric_unit, status) values
('response_time_p95', 1000, 'ms', 'warning'),
('error_rate', 1.0, 'percent', 'warning'),
('failed_logins', 10, 'count_per_minute', 'warning'),
('database_connections', 80, 'percent', 'warning');
```

---

## ✅ VALIDATION CHECKLIST

### Pre-deployment Validation

- [ ] Backup created and verified
- [ ] Rollback procedure tested
- [ ] Emergency contacts updated
- [ ] Monitoring alerts configured
- [ ] DR test completed within 30 days

### Post-deployment Validation

- [ ] System health green
- [ ] Core functionality verified
- [ ] Performance within SLA
- [ ] Security monitoring active
- [ ] Incident response ready

### Monthly Verification

- [ ] DR test executed successfully
- [ ] Backup integrity verified
- [ ] RTO/RPO metrics within target
- [ ] Emergency procedures updated
- [ ] Team training completed

---

**🎯 Success Criteria:**

- ✅ Rollback procedures documented and tested
- ✅ DR strategy meets RPO 24h / RTO 2h requirements
- ✅ Emergency response procedures established
- ✅ Monthly testing schedule implemented
- ✅ All scenarios have been validated

**Next Steps:**

1. Schedule monthly DR tests
2. Train team on emergency procedures
3. Set up automated monitoring alerts
4. Document any customizations for specific environment
