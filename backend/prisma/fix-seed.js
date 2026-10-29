const fs = require('fs');
let content = fs.readFileSync('prisma/seed.ts', 'utf8');
const bad = "  const areas = [\"Durban Central\", \"Umhlanga\", \"Pinetown\", \"Westville\", \"Chatsworth\", \"Berea\", \"Glenwood\", \"Morningside\", \"Newlands East\", \"Phoenix\", \"Verulam\", \"Ballito\", \"Hillcrest\", \"Amanzimtoti\", \"Bluff\"];\n  const types = [\"theft\", \"burglary\", \"vandalism\", \"assault\", \"equipment_failure\", \"fire\", \"flooding\", \"trespassing\", \"suspicious_activity\", \"medical_emergency\"];\n  const statuses = [\"investigating\", \"in_progress\", \"resolved\", \"closed\", \"draft\"];\n  const operators = [\"Admin User\", \"Manager User\", \"Senior User\"];\n  const dispatchers = [\"Manager User\", \"Senior User\", \"Admin User\"];\n  ";
if (content.split(bad).length - 1 >= 2) {
  content = content.replace(bad + bad, bad);
  fs.writeFileSync('prisma/seed.ts', content);
  console.log('ok');
}
