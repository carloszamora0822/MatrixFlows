require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function checkCheckrides() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Checkride = mongoose.model('Checkride', new mongoose.Schema({}, { strict: false, collection: 'checkrides' }));
  
  console.log('\n🔍 CHECKRIDES DATA ANALYSIS\n');
  
  const allCheckrides = await Checkride.find({ orgId: 'VBT' }).lean();
  console.log(`Total checkrides in DB: ${allCheckrides.length}\n`);
  
  if (allCheckrides.length === 0) {
    console.log('❌ NO CHECKRIDES FOUND IN DATABASE!');
    console.log('This is why the screen returns null.\n');
  } else {
    console.log('Checkrides:');
    allCheckrides.forEach((c, i) => {
      console.log(`\n${i+1}. ${c.pilotName || c.studentName}`);
      console.log(`   Date: ${c.date}`);
      console.log(`   Type: ${c.type}`);
      console.log(`   Aircraft: ${c.aircraft || 'N/A'}`);
    });
    
    // Check today's date format
    const moment = require('moment-timezone');
    const todayCentral = moment().tz('America/Chicago');
    const todayStr = `${String(todayCentral.month() + 1).padStart(2, '0')}/${String(todayCentral.date()).padStart(2, '0')}`;
    
    console.log(`\n\n📅 Today's date (Central Time): ${todayStr}`);
    console.log(`Looking for checkrides with date: "${todayStr}"\n`);
    
    const todaysCheckrides = allCheckrides.filter(c => c.date === todayStr);
    console.log(`Checkrides for today: ${todaysCheckrides.length}`);
    
    if (todaysCheckrides.length === 0) {
      console.log('\n❌ NO CHECKRIDES FOR TODAY!');
      console.log('Dates in database:');
      const uniqueDates = [...new Set(allCheckrides.map(c => c.date))];
      uniqueDates.forEach(d => console.log(`   - ${d}`));
    }
  }
  
  await mongoose.connection.close();
}

checkCheckrides().catch(console.error);
