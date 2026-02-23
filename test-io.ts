import { chromium } from 'playwright';
import * as fs from 'fs';

const csvContent = `Employee Code,First Name,Last Name,Email,Phone,Department,Designation,Salary,Status,Date Of Joining
EMP-TEST1,Test,User1,test1@example.com,1234567890,Engineering,Tester,50000,Active,2023-01-01
EMP-TEST2,Test,User2,test2@example.com,0987654321,HR,Recruiter,60000,Active,2023-02-01`;

fs.writeFileSync('test_import.csv', csvContent);

(async () => {
    try {
        console.log("Launching browser...");
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        console.log("Navigating to login page...");
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

        // Fill in email to login as Admin
        await page.fill('input[type="email"]', 'admin@emspro.com');
        await page.click('button:has-text("Sign In")');

        // Wait for it to redirect to dashboard (e.g. url becomes /)
        await page.waitForTimeout(2000); // give the 1-second mock auth time to finish

        console.log("Navigating to employees page...");
        await page.goto('http://localhost:3000/employees', { waitUntil: 'networkidle' });

        // Wait for table to load
        await page.waitForSelector('text=John Doe', { timeout: 15000 });
        console.log("Table loaded!");

        // Test CSV Export
        console.log("Testing CSV Export...");
        const [downloadCsv] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: /CSV/i }).click()
        ]);
        const csvPath = await downloadCsv.path();
        console.log("CSV Downloaded to:", csvPath);
        if (fs.statSync(csvPath!).size > 0) {
            console.log("CSV export success! Size:", fs.statSync(csvPath!).size);
        } else {
            throw new Error("CSV file is empty!");
        }

        // Test PDF Export
        console.log("Testing PDF Export...");
        const [downloadPdf] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: /PDF/i }).click()
        ]);
        const pdfPath = await downloadPdf.path();
        console.log("PDF Downloaded to:", pdfPath);
        if (fs.statSync(pdfPath!).size > 0) {
            console.log("PDF export success! Size:", fs.statSync(pdfPath!).size);
        } else {
            throw new Error("PDF file is empty!");
        }

        // Test Import
        console.log("Testing Import...");
        const fileInput = await page.$('input[type="file"]');
        if (!fileInput) throw new Error("File input not found");

        await fileInput.setInputFiles('test_import.csv');

        // Wait for the success toast
        await page.waitForSelector('text=Successfully imported 2 employees', { timeout: 15000 });
        console.log("Import Successful toast verified!");

        // Let's verify if the newly imported users appear
        await page.waitForSelector('text=Test User1', { timeout: 15000 });
        await page.waitForSelector('text=Test User2', { timeout: 15000 });
        console.log("Newly imported employees are visible in the table!");

        await browser.close();
        console.log("ALL TESTS PASSED SUCCESSFULLY! 🚀");
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
})();
