import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../utils/db';
import { jsPDF } from 'jspdf';

const terms = [
  'Adya', 'Madhya', 'Purna',
  'First Year', 'Second Year', 'Third Year',
  'Fourth Year', 'Fifth Year', 'Sixth Year', 'Seventh Year'
];
const FIELD_OPTIONS = ['Painting', 'Recitation', 'Singing'];

export default function StudentPayments({ student, onBack }) {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [collector, setCollector] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(terms[0]);
  const [filterField, setFilterField] = useState('All');
  const [logoBase64, setLogoBase64] = useState(null);

  // load logo for PDF
  useEffect(() => {
  // Vite’s public/ assets are served from BASE_URL at runtime
  const logoPath = `${import.meta.env.BASE_URL}logo.jpeg`;

  fetch(logoPath)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to fetch ${logoPath}: ${res.status}`);
      return res.blob();
    })
    .then(blob => {
      const reader = new FileReader();
      reader.onloadend = () => setLogoBase64(reader.result);
      reader.readAsDataURL(blob);
    })
    .catch(err => {
      console.error('Error loading logo:', err);
    });
}, []);
  useEffect(() => {
    (async () => {
      let arr = await db.payments
        .where({ studentId: student.id, term: selectedTerm })
        .toArray();
      if (filterField !== 'All') {
        arr = arr.filter(p => (p.field || []).includes(filterField));
      }
      setPayments(arr);
    })();
  }, [student.id, selectedTerm, filterField]);

  const handleAdd = async () => {
    if (!amount) return alert('Amount required');
    if (!collector.trim()) return alert('Collector name required');

    const today = new Date();
const yyyy  = today.getFullYear();
const mm    = String(today.getMonth() + 1).padStart(2, '0');
const dd    = String(today.getDate()).padStart(2, '0');
    await db.payments.add({
      studentId: student.id,
      term: selectedTerm,
      amount: parseFloat(amount),
      date: `${dd}-${mm}-${yyyy}`,
      note,
      collector,   
      field: student.field || [],
    });
    setAmount('');
    setNote('');
    setCollector('');

    // reload
    const arr = await db.payments
      .where({ studentId: student.id, term: selectedTerm })
      .toArray();
    setPayments(arr);
  };

  const handleDelete = async (pid) => {
    if (confirm('Delete payment?')) {
      await db.payments.delete(pid);
      setPayments(payments.filter(p => p.id !== pid));
    }
  };

  const handleGenerateReceipt = (p) => {
    if (!logoBase64) return alert('Logo not loaded yet.');
    const doc = new jsPDF();
    doc.addImage(logoBase64, 'JPEG', 85, 10, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Receipt', 105, 60, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(20, 65, 190, 65);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    const lines = [
      `Receipt No: R-${p.id}`,
      `Date: ${p.date}`,
      `Student Name: ${student.name}`,
      `Student ID: ${student.studentId}`,
      `Term: ${p.term}`,
      `Fields: ${(student.field || []).join(', ')}`,
      `Amount Paid: Rs ${p.amount}`,
      `Note: ${p.note}`,
    ];
    let y = 75;
    lines.forEach(l => { doc.text(l, 20, y); y += 10; });
    doc.text('Authorized Signature:', 20, y + 20);
    doc.line(70, y + 20, 140, y + 20);
    doc.save(`receipt-${p.id}.pdf`);
  };

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div style={styles.page}>
      <button onClick={onBack} style={styles.backBtn}>← Back</button>

      
<div style={styles.profileCard}>
  <div style={styles.imageSection}>
    {student.photo && (
      <div style={styles.imageBlock}>
        <img src={student.photo} alt="Student" style={styles.photoImage} />
        <p style={styles.imageLabel}>Photo</p>
      </div>
    )}
    {student.signature && (
      <div style={styles.imageBlock}>
        <img src={student.signature} alt="Signature" style={styles.signatureImage} />
        <p style={styles.imageLabel}>Signature</p>
      </div>
    )}
  </div>

  <div style={styles.detailsSection}>
    <h2 style={styles.name}>{student.name}</h2>
    <p><strong>ID:</strong> {student.studentId}</p>
    <p><strong>Father/Guardian:</strong> {student.fatherGuardian}</p>
    <p><strong>Contact:</strong> {student.contact} | <strong>WhatsApp:</strong> {student.whatsapp}</p>
    <p><strong>Address:</strong> {student.address}</p>
    <p><strong>Academic/School:</strong> {student.academicSchool}</p>
    <p><strong>Admission Date:</strong> {student.admissionDate} | <strong>Term:</strong> {student.year}</p>
    <p><strong>Fields:</strong> {(student.field || []).join(', ')}</p>
    <p><strong>Email:</strong> {student.email}</p>
  </div>
</div>


      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Term:</label>
          <select
            value={selectedTerm}
            onChange={e => setSelectedTerm(e.target.value)}
            style={styles.select}
          >
            {terms.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Field:</label>
          <select
            value={filterField}
            onChange={e => setFilterField(e.target.value)}
            style={styles.select}
          >
            {['All', ...FIELD_OPTIONS].map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div style={styles.addCard}>
        <div style={styles.addForm}>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={styles.inputFlex}
          />
          <input
            type="text"
            placeholder="Note"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={styles.inputFlex}
          />
          <input
  type="text"
  placeholder="Collector"
  value={collector}
  onChange={e => setCollector(e.target.value)}
  style={styles.inputFlex}
/>

          <button onClick={handleAdd} style={styles.addBtn}>Add</button>
        </div>
      </div>

      <div style={styles.history}>
        <h3 style={styles.subTitle}>Payment History ({selectedTerm})</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Amount','Date','collector','Note','Actions'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} style={styles.tr}>
                <td style={styles.td}>Rs {p.amount}</td>
                <td style={styles.td}>{p.date}</td>
                <td style={styles.td}>{p.collector}</td>
                <td style={styles.td}>{p.note}</td>
                <td style={styles.tdActions}>
                  <button onClick={() => handleDelete(p.id)} style={styles.deleteBtn}>Delete</button>
                  <button onClick={() => handleGenerateReceipt(p)} style={styles.receiptBtn}>Receipt</button>
                </td>
              </tr>
            ))}
            <tr style={styles.totalRow}>
              <td style={styles.td}>Total</td>
              <td colSpan={4} style={styles.td}>Rs {total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  backBtn: {
    color: '#2563EB',
    textDecoration: 'none',
    marginBottom: 16,
    display: 'inline-block',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontSize: 16,
  },
   profileCard: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 24,
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    alignItems: 'flex-start',
    marginTop: 32,
  },
  profileDetails: {
  flex: 1,
},
detailGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '8px 16px',
  fontSize: 14,
  marginTop: 12,
},

  avatar: { width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' },
 name: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  filters: {
    display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 29, marginTop: 20,
  },
  filterGroup: { display: 'flex', alignItems: 'center', gap: 8 },
  filterLabel: { fontWeight: 500 },
  select: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #D1D5DB',
  },

  addCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: 24,
  },
  addForm: { display: 'flex', flexWrap: 'wrap', gap: 16 },
  inputFlex: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #D1D5DB',
  },
  addBtn: {
    backgroundColor: '#16A34A',
    color: '#FFFFFF',
    padding: '8px 16px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },

  history: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  subTitle: { fontSize: 18, fontWeight: 600, marginBottom: 12 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    backgroundColor: '#F3F4F6',
    padding: '8px 12px',
    border: '1px solid #E5E7EB',
    fontSize: 14,
    textAlign: 'left',
  },
  tr: { },
  td: {
    padding: '8px 12px',
    border: '1px solid #E5E7EB',
    verticalAlign: 'middle',
  },
  tdActions: { display: 'flex', gap: 8 },
  deleteBtn: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    padding: '6px 12px',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  receiptBtn: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    padding: '6px 12px',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  totalRow: {
    backgroundColor: '#F3F4F6',
    fontWeight: 600,
  },
    imageSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    alignItems: 'center',
    minWidth: 150,
  },
 imageBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
 imageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
 photoImage: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #D1D5DB',
  },
    signatureImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    objectFit: 'contain',
    border: '2px solid #D1D5DB',
    backgroundColor: '#F9FAFB',
  },
   detailsSection: {
    flex: 1,
    minWidth: 250,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  
};
