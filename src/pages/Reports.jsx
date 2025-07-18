import { useEffect, useState, useRef } from 'react';
import { db } from '../utils/db';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Link } from 'react-router-dom';

const periods = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
];

const emptyExp = { date: '', amount: '', reason: '' };
const emptyDonation = { date: '', amount: '', studentId: '', note: '' };
const emptyAssist = { date: '', amount: '', purpose: '' };

function formatDateDMY(dateObj) {
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}-${m}-${y}`;
}

function parseDMY(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date('invalid');
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date('invalid');
  const [d, m, y] = parts;
  return new Date(+y, +m - 1, +d);
}

export default function Reports({ currentAdmin }) {
  const [payments, setPayments] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [donations, setDonations] = useState([]);
  const [assistance, setAssistance] = useState([]);
  const [filter, setFilter] = useState('today');
  const [newExp, setNewExp] = useState(emptyExp);
  const [newDonation, setNewDonation] = useState(emptyDonation);
  const [newAssist, setNewAssist] = useState(emptyAssist);
  const tableRef = useRef();

  // --- NEW STATE FOR MONTHLY FILTER ---
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // --- NEW CONSTANTS FOR DROPDOWNS ---
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    async function load() {
      setPayments(await db.payments.toArray());
      setExpenditures(await db.expenditures.toArray());
      setDonations(await db.donations.toArray());
      setAssistance(await db.assistance.toArray());
    }
    load();
  }, []);

  const filterBy = (arr) => {
    const now = new Date();
    return arr.filter(item => {
      const d = parseDMY(item.date);
      if (isNaN(d.getTime())) return false; // Skip invalid dates
      switch (filter) {
        case 'today':
          return item.date === formatDateDMY(now);
        case 'week': {
          const start = new Date(now);
          start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
          return d >= start && d <= end;
        }
        case 'month':
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        case 'year':
          return d.getFullYear() === now.getFullYear();
        // --- NEW CASE FOR MONTHLY FILTER ---
        case 'byMonth':
          return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        case 'all':
        default:
          return true;
      }
    });
  };

  const filteredPayments = filterBy(payments);
  const filteredExpenditures = filterBy(expenditures);
  const filteredDonations = filterBy(donations);
  const filteredAssistance = filterBy(assistance);

  const sum = arr => arr.reduce((s, x) => s + x.amount, 0);
  const totalCollected = sum(filteredPayments);
  const totalExp = sum(filteredExpenditures);
  const totalDon = sum(filteredDonations);
  const totalAssist = sum(filteredAssistance);
  const netTotal = (totalCollected - totalExp + totalAssist + totalDon).toFixed(2);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Collection Report', 14, 20);
    doc.setFontSize(12);
    
    // --- UPDATED DYNAMIC LABEL FOR PDF ---
    let reportPeriodLabel = periods.find(p => p.value === filter)?.label || '';
    if (filter === 'byMonth') {
        reportPeriodLabel = `${monthNames[selectedMonth]} ${selectedYear}`;
    }
    doc.text(`View: ${reportPeriodLabel}`, 14, 28);
    
    const sections = [
        { title: 'Payments', head: ['Date', 'Student ID', 'Amount', 'Note', 'Collector'], body: filteredPayments.map(p => [p.date, p.studentId, `Rs ${p.amount.toFixed(2)}`, p.note, p.collector]) },
        { title: 'Expenditures', head: ['Date', 'Amount', 'Reason', 'Person'], body: filteredExpenditures.map(e => [e.date, `Rs ${e.amount.toFixed(2)}`, e.reason, e.person]) },
        { title: 'Donations', head: ['Date', 'Student ID', 'Amount', 'Note', 'Collector'], body: filteredDonations.map(d => [d.date, d.studentId, `Rs ${d.amount.toFixed(2)}`, d.note, d.collector]) },
        { title: 'Financial Assistance', head: ['Date', 'Amount', 'Purpose', 'Added By'], body: filteredAssistance.map(a => [a.date, `Rs ${a.amount.toFixed(2)}`, a.purpose, a.addedBy]) }
      ];
    let y = 36;
    sections.forEach(sec => {
        if (sec.body.length > 0) {
            doc.text(sec.title, 14, y);
            autoTable(doc, { head: [sec.head], body: sec.body, startY: y + 4, theme: 'grid' });
            y = doc.lastAutoTable.finalY + 10;
        }
    });
    doc.text(`Total Collected: Rs ${totalCollected.toFixed(2)}`, 14, y);
    doc.text(`Total Expenses: Rs ${totalExp.toFixed(2)}`, 14, y + 8);
    doc.text(`Total Donations: Rs ${totalDon.toFixed(2)}`, 14, y + 16);
    doc.text(`Total Assistance: Rs ${totalAssist.toFixed(2)}`, 14, y + 24);
    doc.text(`Net Total: Rs ${netTotal}`, 14, y + 32);
    doc.save(`report-${filter}-${formatDateDMY(new Date())}.pdf`);
  };
  
  // All other functions (generateReceipt, handleAdd*, handleEdit, handleDelete) remain unchanged
  const generateReceipt = (data, type) => {
    const pageWidth = 245;
    const margin = 10;
    const lineSpacing = 7;
    const x1 = margin;
    const x2 = pageWidth / 2;
    const columnWidth = (pageWidth / 2) - margin - 5;

    let title, receiptNo, r1_left, r1_right, r2_left, r2_right, amountLine, noteLine;
    switch (type) {
        case 'Expenditure':
            title = 'Expenditure Receipt';
            receiptNo = `E-${data.id}`;
            r1_left = `No: ${receiptNo}`;
            r1_right = `Date: ${data.date}`;
            r2_left = `Person: ${data.person}`;
            r2_right = '';
            amountLine = `Amount: Rs ${data.amount.toFixed(2)}`;
            noteLine = `Reason: ${data.reason}`;
            break;
        case 'Donation':
            title = 'Donation Receipt';
            receiptNo = `D-${data.id}`;
            r1_left = `No: ${receiptNo}`;
            r1_right = `Date: ${data.date}`;
            r2_left = `Student ID: ${data.studentId}`;
            r2_right = `Collector: ${data.collector}`;
            amountLine = `Amount: Rs ${data.amount.toFixed(2)}`;
            noteLine = `Note: ${data.note || 'N/A'}`;
            break;
        case 'Assistance':
            title = 'Financial Assistance Receipt';
            receiptNo = `A-${data.id}`;
            r1_left = `No: ${receiptNo}`;
            r1_right = `Date: ${data.date}`;
            r2_left = `Added By: ${data.addedBy}`;
            r2_right = '';
            amountLine = `Amount Given: Rs ${data.amount.toFixed(2)}`;
            noteLine = `Purpose: ${data.purpose}`;
            break;
        default: return;
    }
    
    const tempDoc = new jsPDF();
    let y = margin + 5;
    y += lineSpacing * 2.5; // Title + line
    [r1_left, r2_left, amountLine].forEach(() => y += lineSpacing);
    const splitNote = tempDoc.setFontSize(10).splitTextToSize(noteLine, pageWidth - (margin * 2));
    y += lineSpacing * splitNote.length;
    y += 25; // Signature space
    const calculatedHeight = y;

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [pageWidth, calculatedHeight],
    });
    y = margin + 5;

    doc.setFont('helvetica', 'bold').setFontSize(14);
    doc.text(title, pageWidth / 2, y, { align: 'center' });
    y += lineSpacing;
    doc.setLineWidth(0.3).line(margin, y, pageWidth - margin, y);
    y += lineSpacing * 1.5;

    doc.setFont('helvetica', 'normal').setFontSize(10);
    if(r1_left) { doc.text(r1_left, x1, y); doc.text(r1_right, x2, y); y+= lineSpacing; }
    if(r2_left) { doc.text(r2_left, x1, y); doc.text(r2_right, x2, y); y+= lineSpacing; }

    doc.setFont('helvetica', 'bold').setFontSize(12);
    doc.text(amountLine, x1, y);
    y += lineSpacing;

    doc.setFont('helvetica', 'normal').setFontSize(10);
    doc.text(splitNote, x1, y);
    y += lineSpacing * splitNote.length;

    const signatureY = y + 10;
    doc.text('Collector/Issuer Signature', x1, signatureY);
    doc.line(x1, signatureY + 2, x1 + columnWidth, signatureY + 2);
    doc.text('Receiver Signature (if any)', x2, signatureY);
    doc.line(x2, signatureY + 2, x2 + columnWidth, signatureY + 2);

    doc.save(`${type}-${receiptNo}.pdf`);
  };

  const handleAddAssist = async () => {
    const amt = parseFloat(newAssist.amount);
    if (!isNaN(amt) && newAssist.date && newAssist.purpose) {
      await db.assistance.add({
        date: formatDateDMY(new Date(newAssist.date)),
        amount: amt,
        purpose: newAssist.purpose,
        addedBy: currentAdmin
      });
      setAssistance(await db.assistance.toArray());
      setNewAssist(emptyAssist);
    } else alert('Please fill out date, amount, and purpose.');
  };

  const handleEditAssist = async a => {
    const amt = parseFloat(prompt('New amount:', a.amount));
    const pur = prompt('New purpose:', a.purpose);
    if (!isNaN(amt)) {
      await db.assistance.update(a.id, { amount: amt, purpose: pur || a.purpose });
      setAssistance(await db.assistance.toArray());
    }
  };

  const handleAddExp = async () => {
    const amt = parseFloat(newExp.amount);
    if (!isNaN(amt) && newExp.date && newExp.reason) {
      await db.expenditures.add({
        date: formatDateDMY(new Date(newExp.date)),
        amount: amt,
        reason: newExp.reason,
        person: currentAdmin
      });
      setExpenditures(await db.expenditures.toArray());
      setNewExp(emptyExp);
    } else alert('Fill out all fields correctly.');
  };

  const handleAddDonation = async () => {
    const amt = parseFloat(newDonation.amount);
    if (!isNaN(amt) && newDonation.date && newDonation.studentId) {
      await db.donations.add({
        date: formatDateDMY(new Date(newDonation.date)),
        amount: amt,
        studentId: newDonation.studentId,
        note: newDonation.note,
        collector: currentAdmin
      });
      setDonations(await db.donations.toArray());
      setNewDonation(emptyDonation);
    } else alert('Fill out donation date, amount, and student ID.');
  };

  const handleEdit = async (table, id, data) => {
    await db[table].update(id, data);
    const arr = await db[table].toArray();
    if (table === 'payments') setPayments(arr);
    if (table === 'expenditures') setExpenditures(arr);
    if (table === 'donations') setDonations(arr);
    if (table === 'assistance') setAssistance(arr);
  };

  const handleDelete = async (table, id) => {
    if (confirm(`Delete this ${table.slice(0, -1)} record?`)) {
      await db[table].delete(id);
      const arr = await db[table].toArray();
      if (table === 'payments') setPayments(arr);
      if (table === 'expenditures') setExpenditures(arr);
      if (table === 'donations') setDonations(arr);
      if (table === 'assistance') setAssistance(arr);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Collection Report</h2>
        <Link to="/" style={styles.backLink}>&larr; Back to Dashboard</Link>
      </div>
      
      {/* --- UPDATED CONTROLS SECTION --- */}
      <div style={styles.controls}>
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => setFilter(p.value)}
            style={filter === p.value ? styles.btnActive : styles.btn}
          >
            {p.label}
          </button>
        ))}
        <button onClick={() => setFilter('byMonth')} style={filter === 'byMonth' ? styles.btnActive : styles.btn}>
          By Month
        </button>

        {filter === 'byMonth' && (
          <>
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={styles.btn}>
              {monthNames.map((name, index) => (
                <option key={name} value={index}>{name}</option>
              ))}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={styles.btn}>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </>
        )}

        <button onClick={handleExportPDF} style={styles.exportBtn}>Export PDF</button>
      </div>

      <TableSection
        title="Payments"
        data={filteredPayments}
        columns={['date', 'studentId', 'amount','collector', 'note']} 
        formatRow={p => [p.date, p.studentId, `Rs ${p.amount.toFixed(2)}`,p.collector, p.note]}
        summaryLabel="Total Collected"
        summaryValue={`Rs ${totalCollected.toFixed(2)}`}
        canEdit
        onEdit={p => handleEdit('payments', p.id, { amount: parseFloat(prompt('Amount:', p.amount)), note: prompt('Note:', p.note) })}
        onDelete={id => handleDelete('payments', id)}
      />

      <TableSection
        title="Expenditures"
        data={filteredExpenditures}
        columns={['date', 'amount', 'reason', 'person']}
        formatRow={e => [e.date, `Rs ${e.amount.toFixed(2)}`, e.reason, e.person]}
        summaryLabel="Total Expenses"
        summaryValue={`Rs ${totalExp.toFixed(2)}`}
        canAdd
        addForm={<Inline
          inputs={[
            { type: 'date', value: newExp.date, onChange: d => setNewExp(ne => ({ ...ne, date: d })) },
            { type: 'number', placeholder: 'Amount', value: newExp.amount, onChange: a => setNewExp(ne => ({ ...ne, amount: a })) },
            { type: 'text', placeholder: 'Reason', value: newExp.reason, onChange: r => setNewExp(ne => ({ ...ne, reason: r })) }
          ]}
          onAdd={handleAddExp}
        />}
        canEdit
        extraAction={{ label: 'Receipt', action: (data) => generateReceipt(data, 'Expenditure') }}
        onEdit={e => handleEdit('expenditures', e.id, { amount: parseFloat(prompt('Amount:', e.amount)), reason: prompt('Reason:', e.reason) })}
        onDelete={id => handleDelete('expenditures', id)}
      />

      <TableSection
        title="Donations"
        data={filteredDonations}
        columns={['date', 'studentId', 'amount', 'note', 'collector']}
        formatRow={d => [d.date, d.studentId, `Rs ${d.amount.toFixed(2)}`, d.note, d.collector]}
        summaryLabel="Total Donations"
        summaryValue={`Rs ${totalDon.toFixed(2)}`}
        canAdd
        addForm={<Inline
          inputs={[
            { type: 'date', value: newDonation.date, onChange: d => setNewDonation(nd => ({ ...nd, date: d })) },
            { type: 'text', placeholder: 'Student ID', value: newDonation.studentId, onChange: id => setNewDonation(nd => ({ ...nd, studentId: id })) },
            { type: 'number', placeholder: 'Amount', value: newDonation.amount, onChange: a => setNewDonation(nd => ({ ...nd, amount: a })) },
            { type: 'text', placeholder: 'Note', value: newDonation.note, onChange: n => setNewDonation(nd => ({ ...nd, note: n })) }
          ]}
          onAdd={handleAddDonation}
        />}
        canEdit
        extraAction={{ label: 'Receipt', action: (data) => generateReceipt(data, 'Donation') }}
        onEdit={d => handleEdit('donations', d.id, { amount: parseFloat(prompt('Amount:', d.amount)), note: prompt('Note:', d.note) })}
        onDelete={id => handleDelete('donations', id)}
      />

      <TableSection
        title="Financial Assistance"
        data={filteredAssistance}
        columns={['date', 'amount', 'purpose', 'addedBy']}
        formatRow={a => [a.date, `Rs ${a.amount.toFixed(2)}`, a.purpose, a.addedBy]}
        summaryLabel="Total Assistance"
        summaryValue={`Rs ${totalAssist.toFixed(2)}`}
        canAdd={currentAdmin === 'kabitalok'}
        addForm={<Inline
          inputs={[
            { type: 'date', value: newAssist.date, onChange: d => setNewAssist(na => ({ ...na, date: d })) },
            { type: 'number', placeholder: 'Amount', value: newAssist.amount, onChange: a => setNewAssist(na => ({ ...na, amount: a })) },
            { type: 'text', placeholder: 'Purpose', value: newAssist.purpose, onChange: p => setNewAssist(na => ({ ...na, purpose: p })) }
          ]}
          onAdd={handleAddAssist}
        />}
        canEdit={currentAdmin === 'kabitalok'}
        extraAction={{ label: 'Receipt', action: (data) => generateReceipt(data, 'Assistance') }}
        onEdit={handleEditAssist}
        onDelete={id => handleDelete('assistance', id)}
      />

      <div style={styles.summary}>
        <h3 style={styles.subTitle}>Summary</h3>
        <div>Total Collected: <strong>Rs {totalCollected.toFixed(2)}</strong></div>
        <div>Total Expenses: <strong>Rs {totalExp.toFixed(2)}</strong></div>
        <div>Total Donations: <strong>Rs {totalDon.toFixed(2)}</strong></div>
        <div>Total Assistance: <strong>Rs {totalAssist.toFixed(2)}</strong></div>
        <div style={styles.net}>Net Total: <strong>Rs {netTotal}</strong></div>
      </div>
    </div>
  );
}

// Helper components remain unchanged
function TableSection({ title, data, columns, formatRow, summaryLabel, summaryValue, canAdd, addForm, canEdit, extraAction, onEdit, onDelete }) {
  return (
    <div style={styles.expSection}>
      <h3 style={styles.subTitle}>{title}</h3>
      {canAdd && addForm}
      <table style={styles.table}>
        <thead style={styles.thead}>
          <tr>
            {columns.map(c => <th key={c} style={styles.th}>{c.charAt(0).toUpperCase() + c.slice(1)}</th>)}
            {extraAction && <th style={styles.th}>{extraAction.label}</th>}
            {canEdit && <th style={styles.th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length ? data.map(row => (
            <tr key={row.id} style={styles.tr}>
              {formatRow(row).map((cell, i) => <td key={i} style={styles.td}>{cell}</td>)}
              {extraAction && <td style={styles.tdActions}><button onClick={() => extraAction.action(row)} style={styles.receiptBtn}>Receipt</button></td>}
              {canEdit && <td style={styles.tdActions}><button onClick={() => onEdit(row)} style={styles.editBtn}>Edit</button><button onClick={() => onDelete(row.id)} style={styles.deleteBtn}>Delete</button></td>}
            </tr>
          )) : (
            <tr><td colSpan={columns.length + (extraAction ? 1 : 0) + (canEdit ? 1 : 0)} style={styles.noData}>No records found</td></tr>
          )}
        </tbody>
        <tfoot>
          <tr><td style={styles.footLabel}>{summaryLabel}</td><td colSpan={columns.length - 1 + (extraAction ? 1 : 0) + (canEdit ? 1 : 0)} style={styles.footValue}>{summaryValue}</td></tr>
        </tfoot>
      </table>
    </div>
  );
}

function Inline({ inputs, onAdd }) {
  return (
    <div style={styles.expControls}>
      {inputs.map((inp, i) => <input key={i} type={inp.type} placeholder={inp.placeholder || ''} value={inp.value} onChange={e => inp.onChange(e.target.value)} style={inp.type === 'date' || inp.type === 'number' ? styles.inputSmall : styles.inputFlex} />)}
      <button onClick={onAdd} style={styles.addExpBtn}>Add</button>
    </div>
  );
}

// Styles remain unchanged
const styles = {
  page: { padding: 24, backgroundColor: '#F3F4F6', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 600 },
  backLink: { color: '#4F46E5', textDecoration: 'none' },
  controls: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  btn: { padding: '8px 16px', borderRadius: 6, backgroundColor: '#E5E7EB', color: '#374151', border: 'none', cursor: 'pointer' },
  btnActive: { padding: '8px 16px', borderRadius: 6, backgroundColor: '#4F46E5', color: '#FFFFFF', border: 'none', cursor: 'pointer' },
  exportBtn: { marginLeft: 'auto', padding: '8px 16px', backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: 6, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: 24 },
  thead: { backgroundColor: '#E5E7EB' },
  th: { padding: '8px 12px', borderBottom: '1px solid #D1D5DB', textAlign: 'left', fontSize: 12, color: '#374151' },
  td: { padding: '8px 12px', borderBottom: '1px solid #E5E7EB', verticalAlign: 'middle' },
  tdActions: { display: 'flex', gap: 8 },
  editBtn: { padding: '4px 8px', backgroundColor: '#FBBF24', color: '#FFFFFF', border: 'none', borderRadius: 4, cursor: 'pointer' },
  deleteBtn: { padding: '4px 8px', backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: 4, cursor: 'pointer' },
  receiptBtn: { padding: '4px 8px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 4, cursor: 'pointer' },
  noData: { padding: 16, textAlign: 'center', color: '#6B7280' },
  footLabel: { fontWeight: 600, padding: '8px 12px' },
  footValue: { padding: '8px 12px' },
  expSection: { marginBottom: 24, backgroundColor: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'},
  subTitle: { fontSize: 18, fontWeight: 600, marginBottom: 12 },
  expControls: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' },
  inputSmall: { width: 'auto', flexGrow: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid #D1D5DB' },
  inputFlex: { flex: 2, padding: '6px 8px', borderRadius: 4, border: '1px solid #D1D5DB' },
  addExpBtn: { padding: '6px 12px', backgroundColor: '#10B981', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  summary: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginTop: 24 },
  net: { marginTop: 8, fontSize: 16, fontWeight: 600 }
};