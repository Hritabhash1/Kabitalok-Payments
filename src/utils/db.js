import Dexie from 'dexie';
import { admins as defaultAdmins } from '../utils/admins';

export const db = new Dexie('KabitalokDB');

// Define schema
db.version(6).stores({
  students: '++id,studentId,name,contact,course,admissionDate,email',
  payments: '++id,studentId,amount,date,note,collector',
  expenditures: '++id,date,amount,reason,person',
  donations: '++id,studentId,amount,date,note,collector',
  assistance: '++id,date,studentId,amount,purpose,addedBy',
  admins: '++id,username,displayName,password,modifiedBy,modifiedAt'
});

// Open the database, then seed default admins if none exist
(async () => {
  try {
    await db.open();
    const count = await db.admins.count();
    if (count === 0) {
      const timestamp = new Date().toISOString();
      const seeded = defaultAdmins.map(a => ({
        username: a.username,
        displayName: a.displayName,
        password: a.password,
        modifiedBy: 'system',
        modifiedAt: timestamp
      }));
      await db.admins.bulkAdd(seeded);
      console.log('Seeded default admins');
    }
  } catch (e) {
    console.error('Failed to open or seed db:', e);
  }
})();
