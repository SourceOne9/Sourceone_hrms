/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * HRMS Quality Gate Script
 * Runs Linting, Type-checking, and Tests sequentially.
 * Fails if any step fails.
 */

const { execSync } = require('child_process');

function runCommand(command, name) {
    console.log(`\n🚀 [CI GATE] Running ${name}...`);
    try {
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ ${name} Passed!`);
    } catch (error) {
        console.error(`\n❌ ${name} Failed! CI Gate Blocked.`);
        process.exit(1);
    }
}

// 1. Lint Check
runCommand('npm run lint', 'Linting');

// 2. Type Check
runCommand('npx tsc --noEmit', 'Type Check');

// 3. Tests with Coverage (HRMS-405)
runCommand('npx vitest run --coverage', 'Automated Tests');

console.log('\n✨ ALL QUALITY GATES PASSED! READY FOR MERGE. ✨');
