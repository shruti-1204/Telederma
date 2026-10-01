const puppeteer = require('puppeteer');

/**
 * Service to verify Doctor Credentials via National Medical Register (NMC/IMR)
 * REAL Live Web Scraping.
 */
const verifyDoctorOnNMC = async (registrationNumber, expectedName) => {
  let browser;
  let scrapedName = '';
  let scrapedCouncil = '';
  let scrapedYear = '';

  try {
    console.log(`\n[Scraper] Initializing LIVE verification for ID: ${registrationNumber}`);
    
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] 
    });
    const page = await browser.newPage();
    
    console.log(`[Scraper] Navigating to NMC website...`);
    await page.goto('https://www.nmc.org.in/information-desk/indian-medical-register/', { timeout: 20000 });
    
    console.log(`[Scraper] Selecting "Registration Number" Search Tab...`);
    await page.evaluate(() => {
       const btns = Array.from(document.querySelectorAll('button'));
       const regTab = btns.find(b => b.innerText.trim() === 'Registration Number');
       if(regTab) regTab.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    console.log(`[Scraper] Entering Registration ID: ${registrationNumber}...`);
    await page.type('#registration_no', registrationNumber);
    
    console.log(`[Scraper] Submitting search query...`);
    await page.click('#regSearchBtn');
    
    // Wait for the table to populate dynamically instead of hardcoded 4s
    try {
        await page.waitForSelector('table tbody tr td', { timeout: 15000 });
    } catch (e) {
        console.log(`[Scraper] Table did not load within 15s. NMC site is slow.`);
    }
    
    // Extract results
    const tableData = await page.evaluate(() => {
       const tds = Array.from(document.querySelectorAll('td'));
       return tds.map(td => td.innerText.trim());
    });
    
    if (tableData && tableData.length >= 6) {
        scrapedYear = tableData[1];
        // The ID is at tableData[2], Council at [3], Name at [4]
        scrapedCouncil = tableData[3];
        scrapedName = tableData[4];
    } else {
        scrapedName = 'RECORD NOT FOUND';
    }

    console.log(`[Scraper] Extraction complete. Found from Registry: "${scrapedName}"`);
    console.log(`[Scraper] User Entered Name: "${expectedName}"`);

    // Advanced Name Matching: Ignore case, punctuation, 'Dr' prefix, and word order
    const normalizeName = (name) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '') // Remove special characters
        .replace(/\bdr\b/g, '')     // Remove "dr" prefix if typed
        .split(' ')
        .filter(Boolean)
        .sort()                     // Sort words alphabetically so order doesn't matter
        .join(' ');
    };

    const normScraped = normalizeName(scrapedName);
    const normExpected = normalizeName(expectedName);
    
    console.log(`[Scraper] Normalized Registry: "${normScraped}"`);
    console.log(`[Scraper] Normalized User Input: "${normExpected}"`);

    const isMatch = normScraped === normExpected;

    return {
      success: true,
      data: { registrationId: registrationNumber, scrapedName, council: scrapedCouncil, year: scrapedYear },
      verificationResult: {
        isMatch,
        status: isMatch ? 'VERIFIED ACTIVE PRACTITIONER' : 'CREDENTIAL MISMATCH',
        message: isMatch 
          ? 'Successfully verified via National Register.' 
          : `Credential Mismatch: The entered Doctor Name ("${expectedName}") does not match the official registry details.`
      }
    };

  } catch (error) {
    console.error('[Scraper Error]:', error.message);
    return { success: false, error: 'Failed to complete scraping process. NMC server might be down.' };
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { verifyDoctorOnNMC };
