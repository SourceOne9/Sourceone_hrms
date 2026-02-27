console.log("==========================================");
console.log("⏪ HRMS-PRO DATABASE & DEPLOYMENT ROLLBACK");
console.log("==========================================");
console.log(`
If a production deployment introduces critical faults, perform the following ordered rollback:

1. APPLICATION ROLLBACK: (Vercel / Hosting Provider)
    - Navigate to the project deployments dashboard.
    - Locate the previous successful deployment hash.
    - Click "Redeploy" or "Promote to Production".
    - This instantly routes traffic away from the faulty Edge functions.

2. DATABASE SCHEMA ROLLBACK: (Prisma)
    If the deployment included a breaking schema migration, Prisma requires explicitly rolling back the database state.
    
    A. Find the name of the previous successful migration.
    B. Run the following command from your local terminal mapped to Production:
       npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script > down.sql
       (Note: You must checkout the PREVIOUS git commit for the target schema before generating the diff)
    C. Execute the down migration against the production database:
       npx prisma db execute --url "$DATABASE_URL" --file down.sql

3. DATABASE DATA ROLLBACK: (Supabase PITR - Final Resort)
    If data was permanently corrupted or lost, initiate the DR Runbook:
    - Log into Supabase Dashboard -> Database -> Backups.
    - Select "Point in Time Recovery".
    - Choose the exact minute prior to the faulty deployment.
`);
