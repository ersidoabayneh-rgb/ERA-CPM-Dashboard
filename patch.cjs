const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryView.tsx', 'utf8');

const target = `  const elapsed = (() => {
    const s = new Date(p.startDate);`;

const replacement = `  const elapsed = (() => {
    if (p.status === 'Completed' || p.status === 'Completed and Closed') return 100;
    if (p.status === 'Suspended' || p.status === 'Terminated') return p.physicalProgress || 100;
    const s = new Date(p.startDate);`;

if (code.includes(target)) {
  fs.writeFileSync('src/components/HistoryView.tsx', code.replace(target, replacement));
  console.log('Success HistoryView');
} else {
  console.log('Target not found HistoryView');
}
