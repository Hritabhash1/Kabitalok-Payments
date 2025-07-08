import Dexie from 'dexie';

export const db = new Dexie('KabitalokDB');

db.version(4).stores({
  students: '++id,studentId,name,contact,course,admissionDate,email',
  payments: '++id,studentId,amount,date,note,collector',
  expenditures: '++id,date,amount,reason,person'
});
