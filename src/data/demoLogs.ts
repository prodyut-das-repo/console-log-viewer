export const demoLogs = `2024-08-21T09:41:02.118Z  INFO  [app] Starting application v2.8.1
2024-08-21T09:41:02.142Z  INFO  [config] Environment: production
2024-08-21T09:41:02.204Z  DEBUG [database] Connecting to postgresql://db.internal:5432/app
2024-08-21T09:41:02.481Z  INFO  [database] Connection pool ready { min: 2, max: 10 }
2024-08-21T09:41:03.006Z  INFO  [http] Server listening on :8080
2024-08-21T09:41:08.317Z  INFO  [request] GET /api/v1/users 200 · 42ms
2024-08-21T09:41:09.028Z  WARN  [auth] Token expires in 5 minutes for user #usr_8K2D
2024-08-21T09:41:11.771Z  INFO  [request] POST /api/v1/events 201 · 126ms
2024-08-21T09:41:12.002Z  ERROR [payments] Gateway timeout after 3000ms
    at request (src/services/gateway.js:84:12)
    at async processPayment (src/services/payments.js:129:18)
2024-08-21T09:41:12.004Z  DEBUG [retry] Attempt 1/3 scheduled in 500ms
2024-08-21T09:41:12.518Z  INFO  [payments] Retry succeeded · txn_4f2c91
2024-08-21T09:41:18.905Z  INFO  [request] GET /api/v1/health 200 · 8ms
2024-08-21T09:41:20.112Z  WARN  [cache] Hit rate below threshold: 67.4%
2024-08-21T09:41:23.441Z  INFO  [worker] Queue drained · 24 jobs processed
2024-08-21T09:41:24.000Z  INFO  [app] Ready in 1.88s`;
