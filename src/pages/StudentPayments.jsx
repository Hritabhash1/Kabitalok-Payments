
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

export default function StudentPayments({ student, onBack, user }) {
  const navigate = useNavigate();

  // Payments state
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(terms[0]);
  const [filterFields, setFilterFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);

  // Donations state
  const [donations, setDonations] = useState([]);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationNote, setDonationNote] = useState('');

  const isLimited = user.username === 'kabitalok';
  const collectorName = user.name;

  // Load payments
  useEffect(() => {
    (async () => {
      const all = await db.payments.where({ studentId: student.studentId, term: selectedTerm }).toArray();
      const filtered = filterFields.length
        ? all.filter(p => (p.field || []).some(tag => filterFields.includes(tag)))
        : all;
      setPayments(filtered);
    })();
  }, [student.id, student.studentId, selectedTerm, filterFields]);

  // Load donations
  useEffect(() => {
    (async () => {
      const all = await db.donations.where({ studentId: student.studentId }).toArray();
      setDonations(all);
    })();
  }, [student.studentId]);

  function formatDateDMY(dateObj) {
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}-${m}-${y}`;
  }
  // Add payment
  const handleAddPayment = async () => {
    if (isLimited) return alert('No privilege to add payments.');
    if (!amount) return alert('Amount required');
    const dateStr = formatDateDMY(new Date());
    await db.payments.add({
      studentId: student.studentId,
      term: selectedTerm,
      amount: +amount,
      date: dateStr,
      note,
      collector: collectorName,
      field: selectedFields,
    });
    setAmount(''); setNote(''); setSelectedFields([]);
    setPayments(await db.payments.where({ studentId: student.studentId, term: selectedTerm }).toArray());
  };

  // Add donation
  const handleAddDonation = async () => {
    if (isLimited) return alert('No privilege to add donations.');
    if (!donationAmount) return alert('Donation amount required');
    const dateStr = formatDateDMY(new Date());
    try {
      await db.donations.add({
        studentId: student.studentId,
        amount: +donationAmount,
        date: dateStr,
        note: donationNote,
        collector: collectorName,
      });
      setDonationAmount('');
      setDonationNote('');
      const updated = await db.donations.where({ studentId: student.studentId }).toArray();
      setDonations(updated);
    } catch (e) {
      console.error('Error adding donation:', e);
      alert('Failed to add donation. See console for details.');
    }
  };

  // Delete handlers
  const handleDeletePayment = async id => {
    if (confirm('Delete payment?')) {
      await db.payments.delete(id);
      setPayments(payments.filter(p => p.id !== id));
    }
  };
  const handleDeleteDonation = async id => {
    if (confirm('Delete donation?')) {
      await db.donations.delete(id);
      setDonations(donations.filter(d => d.id !== id));
    }
  };

  // --- DYNAMIC HEIGHT RECEIPT GENERATOR ---
  const generateReceipt = (data, type) => {
    // --- 1. CONFIGURATION ---
    const pageWidth = 245; // Fixed width of 24.5cm
    const margin = 10;
    const lineSpacing = 7;
    const x1 = margin;
    const x2 = pageWidth / 2;
    const columnWidth = (pageWidth / 2) - margin - 5;

    const isPayment = type === 'payment';
    const title = isPayment ? 'Payment Receipt' : 'Donation Receipt';
    const receiptNo = isPayment ? `R-${data.id}` : `D-${data.id}`;
    
    // --- 2. CALCULATE HEIGHT ---
    const tempDoc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [pageWidth, 100] });
    let y = margin + 5;

    // Title
    y += lineSpacing;
    y += lineSpacing * 1.5;

    // Row 1
    y += lineSpacing;
    // Row 2
    y += lineSpacing;
    // Row 3
    y += lineSpacing;
    // Row 4
    y += lineSpacing;

    // Row 5 (Note) - This needs careful calculation
    tempDoc.setFont('helvetica', 'normal').setFontSize(10);
    const noteText = `Note: ${data.note || 'N/A'}`;
    const splitNote = tempDoc.splitTextToSize(noteText, pageWidth - (margin * 2));
    y += lineSpacing * splitNote.length;

    // Add space for signatures
    y += margin + 15; // Space for signature area
    const calculatedHeight = y;

    // --- 3. GENERATE FINAL PDF ---
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [pageWidth, calculatedHeight] // Use calculated height
    });
    
    // Reset y for rendering
    y = margin + 5;

    // Render Title
    doc.setFont('helvetica', 'bold').setFontSize(14);
    doc.text(title, pageWidth / 2, y, { align: 'center' });
    y += lineSpacing;
    doc.setLineWidth(0.3).line(margin, y, pageWidth - margin, y);
    y += lineSpacing * 1.5;

    // Render Body (2-column layout)
    doc.setFont('helvetica', 'normal').setFontSize(10);
    // Row 1
    doc.text(`No: ${receiptNo}`, x1, y);
    doc.text(`Date: ${data.date}`, x2, y);
    y += lineSpacing;
    // Row 2
    doc.text(`Name: ${student.name}`, x1, y);
    if (isPayment) {
      doc.text(`Term: ${data.term}`, x2, y);
    }
    y += lineSpacing;
    // Row 3
    if (isPayment) {
      doc.text(`Fields: ${(data.field || []).join(', ') || 'N/A'}`, x1, y);
    }
    doc.text(`Collector: ${data.collector}`, x2, y);
    y += lineSpacing;
    // Row 4 - Amount
    doc.setFont('helvetica', 'bold').setFontSize(12);
    doc.text(`Amount: Rs ${data.amount}`, x1, y);
    y += lineSpacing;
    // Row 5 - Note
    doc.setFont('helvetica', 'normal').setFontSize(10);
    doc.text(splitNote, x1, y);
    y += lineSpacing * splitNote.length;

    // Render Signatures
    const signatureY = y + 10;
    doc.text('Collector Signature', x1, signatureY);
    doc.line(x1, signatureY + 2, x1 + columnWidth, signatureY + 2);
    doc.text('Guardian/Student Signature', x2, signatureY);
    doc.line(x2, signatureY + 2, x2 + columnWidth, signatureY + 2);

    // Save the file
    const fileName = `${type}-${receiptNo}-${student.name}.pdf`;
    doc.save(fileName);
  };

  const generatePaymentReceipt = p => {
    generateReceipt(p, 'payment');
  };

  const generateDonationReceipt = d => {
    generateReceipt(d, 'donation');
  };

  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
  const totalDonations = donations.reduce((s, d) => s + d.amount, 0);

  return (
    <div style={styles.page}>
      <button onClick={onBack} style={styles.backBtn}>← Back</button>

      {/* Profile Section */}
      <div style={styles.profileCard}>
        <div style={styles.imageSection}>
          {student.photo && <img src={student.photo} alt="Student" style={styles.avatar} />}
          {student.signature && <img src={student.signature} alt="Signature" style={styles.signatureSmall} />}
        </div>
        <div style={styles.detailsSection}>
          <h2 style={styles.name}>{student.name}</h2>
          <div style={styles.detailGrid}>
            <p><strong>ID:</strong> {student.studentId}</p>
            <p><strong>Father:</strong> {student.fatherGuardian}</p>
            <p><strong>Contact:</strong> {student.contact}</p>
            <p><strong>WhatsApp:</strong> {student.whatsapp}</p>
            <p><strong>Address:</strong> {student.address}</p>
            <p><strong>School:</strong> {student.academicSchool}</p>
            <p><strong>Admission:</strong> {student.admissionDate}</p>
            <p><strong>Year:</strong> {student.year}</p>
            <p><strong>Fields:</strong> {(student.field || []).join(', ')}</p>
            <p><strong>Email:</strong> {student.email}</p>
          </div>
        </div>
      </div>

      {/* Payments Section */}
      <h3 style={styles.sectionTitle}>Payments</h3>
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label>Term:</label>
          <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} style={styles.select}>
            {terms.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label>Field:</label>
          <div style={styles.tagContainer}>
            {FIELD_OPTIONS.map(opt => {
              const active = filterFields.includes(opt);
              return (
                <span
                  key={opt}
                  onClick={() => setFilterFields(curr => active ? curr.filter(f => f !== opt) : [...curr, opt])}
                  style={{ ...styles.tag, ...(active ? styles.tagActive : {}) }}
                >
                  {opt}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <div style={styles.addCard}>
        {isLimited ? <p style={styles.limitNotice}>No privilege to add payments.</p> : (
          <div style={styles.addForm}>
            <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={styles.inputFlex} />
            <input type="text" placeholder="Note" value={note} onChange={e => setNote(e.target.value)} style={styles.inputFlex} />
            <div style={styles.tagContainer}>
              {FIELD_OPTIONS.map(opt => {
                const active = selectedFields.includes(opt);
                return (
                  <span
                    key={opt}
                    onClick={() => setSelectedFields(curr => active ? curr.filter(f => f !== opt) : [...curr, opt])}
                    style={{ ...styles.tag, ...(active ? styles.tagActive : {}) }}
                  >
                    {opt}
                  </span>
                );
              })}
            </div>
            <button onClick={handleAddPayment} style={styles.addBtn}>Add Payment</button>
          </div>
        )}
      </div>
      <div style={styles.history}>
        <h4 style={styles.subTitle}>Payment History</h4>
        <table style={styles.table}>
          <thead><tr>{['Amount', 'Date', 'Collector', 'Note', 'Actions'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} style={styles.tr}>
                <td style={styles.td}>Rs {p.amount}</td>
                <td style={styles.td}>{p.date}</td>
                <td style={styles.td}>{p.collector}</td>
                <td style={styles.td}>{p.note}</td>
                <td style={styles.tdActions}>
                  <button onClick={() => handleDeletePayment(p.id)} style={styles.deleteBtn}>Delete</button>
                  <button onClick={() => generatePaymentReceipt(p)} style={styles.receiptBtn}>Receipt</button>
                </td>
              </tr>
            ))}
            <tr style={styles.totalRow}>
              <td style={styles.td}>Total</td><td colSpan={4} style={styles.td}>Rs {totalPayments}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Donations Section */}
      <h3 style={styles.sectionTitle}>Donations</h3>
      <div style={styles.addCard}>
        {isLimited ? <p style={styles.limitNotice}>No privilege to add donations.</p> : (
          <div style={styles.addForm}>
            <input type="number" placeholder="Donation Amount" value={donationAmount} onChange={e => setDonationAmount(e.target.value)} style={styles.inputFlex} />
            <input type="text" placeholder="Note" value={donationNote} onChange={e => setDonationNote(e.target.value)} style={styles.inputFlex} />
            <button onClick={handleAddDonation} style={styles.addBtn}>Add Donation</button>
          </div>
        )}
      </div>
      <div style={styles.history}>
        <h4 style={styles.subTitle}>Donation History</h4>
        <table style={styles.table}>
          <thead><tr>{['Amount', 'Date', 'Collector', 'Note', 'Actions'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
          <tbody>
            {donations.map(d => (
              <tr key={d.id} style={styles.tr}>
                <td style={styles.td}>Rs {d.amount}</td>
                <td style={styles.td}>{d.date}</td>
                <td style={styles.td}>{d.collector}</td>
                <td style={styles.td}>{d.note}</td>
                <td style={styles.tdActions}>
                  <button onClick={() => handleDeleteDonation(d.id)} style={styles.deleteBtn}>Delete</button>
                  <button onClick={() => generateDonationReceipt(d)} style={styles.receiptBtn}>Receipt</button>
                </td>
              </tr>
            ))}
            <tr style={styles.totalRow}>
              <td style={styles.td}>Total</td><td colSpan={4} style={styles.td}>Rs {totalDonations}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 24, backgroundColor: '#F9FAFB', minHeight: '100vh' },
  backBtn: { color: '#2563EB', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', marginBottom: 16 },
  profileCard: { display: 'grid', gridTemplateColumns: '100px 1fr', gap: 16, backgroundColor: '#fff', padding: 24, borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
  imageSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  avatar: { width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '2px solid #D1D5DB' },
  signatureSmall: { width: 100, height: 50, objectFit: 'contain', border: '1px solid #D1D5DB' },
  detailsSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  name: { fontSize: 24, fontWeight: 600, margin: 0 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(150px, 1fr))', gap: '8px 16px', fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: 600, margin: '24px 0 8px' },
  filters: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 },
  filterGroup: { display: 'flex', alignItems: 'center', gap: 8 },
  select: { padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB' },
  tagContainer: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  tag: { padding: '4px 10px', border: '1px solid #D1D5DB', borderRadius: 12, cursor: 'pointer', userSelect: 'none', fontSize: 12 },
  tagActive: { backgroundColor: '#2563EB', color: '#fff', borderColor: '#2563EB' },
  addCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 16 },
  addForm: { display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' },
  inputFlex: { flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', minWidth: '150px' },
  addBtn: { backgroundColor: '#16A34A', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer' },
  limitNotice: { color: '#DC2626', textAlign: 'center' },
  history: { backgroundColor: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 24 },
  subTitle: { fontSize: 18, fontWeight: 600, marginBottom: 12 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { backgroundColor: '#F3F4F6', padding: 8, border: '1px solid #E5E7EB', textAlign: 'left', fontSize: 12 },
  tr: {},
  td: { padding: 8, border: '1px solid #E5E7EB', verticalAlign: 'middle', fontSize: 14 },
  tdActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  deleteBtn: { backgroundColor: '#DC2626', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  receiptBtn: { backgroundColor: '#2563EB', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  totalRow: { backgroundColor: '#F3F4F6', fontWeight: 600 }
};
