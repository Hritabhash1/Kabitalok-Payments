import { useEffect, useState } from 'react';
import { db } from '../utils/db';
import { useNavigate } from 'react-router-dom';

function parseDMY(dateStr) {
  const [d, m, y] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function monthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setHours(0, 0, 0, 0); 
  return d;
}
export default function InactiveStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [period, setPeriod] = useState('3'); // in months

  useEffect(() => {
    (async () => {
      const [allStudents, allPayments] = await Promise.all([
        db.students.toArray(),
        db.payments.toArray(),
      ]);
      setStudents(allStudents);
      setPayments(allPayments);
    })();
  }, []);

  const inactive = students.filter(stu => {
    const hist = payments.filter(p => p.studentId === stu.studentId);
    if (!hist.length) {
      return true;
    }
    const cutoff = monthsAgo(Number(period));
    return !hist.some(p => {
      const pd = parseDMY(p.date);
      return pd >= cutoff;
    });
  });

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/')} style={styles.backBtn}>
        ← Back to Dashboard
      </button>
      <div style={styles.header}>
        <h2 style={styles.title}>Inactive Students</h2>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          style={styles.select}
        >
          <option value="3">Last 3 Months</option>
          <option value="6">Last 6 Months</option>
          <option value="12">Last 1 Year</option>
        </select>
      </div>

      <table style={styles.table}>
        <thead style={styles.thead}>
          <tr>
            <th style={styles.th}>Photo</th>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Year</th>
            <th style={styles.th}>Fields</th>
            <th style={styles.th}>Contact</th>
            <th style={styles.th}>WhatsApp</th>
          </tr>
        </thead>
        <tbody>
          {inactive.length > 0 ? (
            inactive.map(stu => (
              <tr
                key={stu.id}
                style={styles.tr}
                onClick={() => navigate(`/student/${stu.id}`)}
              >
                <td style={styles.td}>
                  {stu.photo && <img src={stu.photo} alt="photo" style={styles.avatar} />}
                </td>
                <td style={styles.td}>{stu.studentId}</td>
                <td style={styles.td}>{stu.name}</td>
                <td style={styles.td}>{stu.year}</td>
                <td style={styles.td}>{(stu.field || []).join(', ')}</td>
                <td style={styles.td}>{stu.contact}</td>
                <td style={styles.td}>{stu.whatsapp}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" style={styles.noData}>No inactive students in this period.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: {
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    margin: '24px',
  },
  backBtn: {
    marginBottom: 16,
    padding: '8px 16px',
    background: 'none',
    border: 'none',
    color: '#2563EB',
    fontSize: 16,
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: 600 },
  select: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #D1D5DB',
    cursor: 'pointer',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { backgroundColor: '#F3F4F6' },
  th: { padding: '8px 12px', borderBottom: '1px solid #E5E7EB', textAlign: 'left' },
  tr: { cursor: 'pointer', transition: 'background-color 0.2s' },
  td: { padding: '8px 12px', borderBottom: '1px solid #E5E7EB', verticalAlign: 'middle' },
  avatar: { width: 40, height: 40, borderRadius: '50%' },
  noData: { padding: 16, textAlign: 'center', color: '#6B7280' },
};
