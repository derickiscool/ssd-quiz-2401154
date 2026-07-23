import { Builder, By, until } from 'selenium-webdriver';
import assert from 'assert';

const environment = process.argv[2] || 'local';
const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
const seleniumHost = process.env.SELENIUM_HOST || 'http://localhost:4444/wd/hub';

// Encode admin credentials in URL (password contains @ → %40)
const creds = 'admin:2401154%40SIT.singaporetech.edu.sg';
const authUrl = baseUrl.replace('http://', `http://${creds}@`);

(async function testSearchApp() {
    console.log(`Environment: ${environment}`);
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Selenium: ${seleniumHost}`);

    let driver;
    try {
        driver = await new Builder()
            .forBrowser('chrome')
            .usingServer(seleniumHost)
            .build();

        // ===== Test 1: Home page loads =====
        console.log('\n--- Test 1: Home page loads ---');
        await driver.get(authUrl);
        await driver.wait(until.titleIs('Search'), 10000);
        console.log('PASS: Home page title is "Search"');

        // Check search input is present
        const input = await driver.findElement(By.id('search'));
        assert.ok(input, 'Search input should be present');
        console.log('PASS: Search input field found');

        // ===== Test 2: Valid search → result page =====
        console.log('\n--- Test 2: Valid search term ---');
        await input.clear();
        await input.sendKeys('hello world');
        await driver.findElement(By.css('button')).click();

        await driver.wait(until.titleIs('Search Result'), 5000);
        const body = await driver.findElement(By.tagName('body')).getText();
        assert.ok(body.includes('hello world'), 'Result should show the search term');
        assert.ok(body.includes('Logged at:'), 'Result should show logged timestamp');
        console.log('PASS: Result page shows search term and timestamp');

        // ===== Test 3: Return to Home button =====
        console.log('\n--- Test 3: Return to Home ---');
        await driver.findElement(By.css('button')).click();
        await driver.wait(until.titleIs('Search'), 5000);
        console.log('PASS: Returned to home page');

        // ===== Test 4: Invalid input → frontend blocks + alert =====
        console.log('\n--- Test 4: SQL injection attempt (frontend validation) ---');
        const input2 = await driver.findElement(By.id('search'));
        await input2.clear();
        await input2.sendKeys("' OR 1=1 --");
        await driver.findElement(By.css('button')).click();

        // Frontend alert should appear
        const alert = await driver.switchTo().alert();
        const alertText = await alert.getText();
        assert.ok(alertText.includes('Invalid'), 'Alert should warn about invalid input');
        console.log('PASS: Alert shown for SQLi: ' + alertText);
        await alert.accept();

        // ===== Test 5: Input cleared after invalid (G) =====
        console.log('\n--- Test 5: Input cleared after invalid submission ---');
        const clearedValue = await driver.findElement(By.id('search')).getAttribute('value');
        assert.strictEqual(clearedValue, '', 'Input should be cleared');
        console.log('PASS: Input field cleared');

        console.log('\n=== All UI tests passed! ===');

    } catch (err) {
        console.error('\n### UI test failed:', err.message);
        process.exitCode = 1;
    } finally {
        if (driver) await driver.quit();
    }
})();
