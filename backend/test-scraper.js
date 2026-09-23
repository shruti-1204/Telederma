const { verifyDoctorOnNMC } = require('./src/services/scraper.service');

async function runTest() {
    console.log("=========================================");
    console.log("   MEDVERIFY SCRAPER INDEPENDENT TEST    ");
    console.log("=========================================\n");
    
    console.log("--- TEST CASE 1: Valid Name Match ---");
    console.log("Testing Registration ID: HMC1632, Name: Gopal Rao Patil");
    const result1 = await verifyDoctorOnNMC('HMC1632', 'Gopal Rao Patil');
    console.log("RESULT 1:", JSON.stringify(result1, null, 2));

    console.log("\n-----------------------------------------");
    console.log("--- TEST CASE 2: Name Mismatch (Hacker Attempt) ---");
    console.log("Testing Registration ID: DMC/R/01234, Name: Fake Hacker Name");
    const result2 = await verifyDoctorOnNMC('DMC/R/01234', 'Fake Hacker Name');
    console.log("RESULT 2:", JSON.stringify(result2, null, 2));
    
    console.log("\n=========================================");
    console.log("              TEST FINISHED              ");
    console.log("=========================================");
}

runTest();
