// src/utils/backup.js
import { db } from './db';

export async function backupDataToFile() {
  const students = await db.students.toArray();
  const payments = await db.payments.toArray();
  const expenditures = await db.expenditures.toArray();

  const backup = {
    timestamp: new Date().toISOString(),
    students,
    payments,
    expenditures,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `kabitalok-backup-${new Date().toISOString()}.json`;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
export async function restoreDataFromFile(file) {
  try {
    const content = await readFileAsText(file);
    const data = JSON.parse(content);

    if (!data.students || !data.payments || !data.expenditures) {
      alert('Invalid backup file!');
      return;
    }

    await db.transaction('rw', db.students, db.payments, db.expenditures, async () => {
      await db.students.clear();
      await db.payments.clear();
      await db.expenditures.clear();

      await db.students.bulkAdd(data.students);
      await db.payments.bulkAdd(data.payments);
      await db.expenditures.bulkAdd(data.expenditures);
    });

    alert('Restore successful!');
  } catch (error) {
    console.error('Restore failed:', error);
    alert('Failed to restore database.');
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
