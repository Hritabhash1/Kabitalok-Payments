// src/pages/Reports.jsx
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

// no more `person` in emptyExp; we auto‑fill from currentAdmin
const emptyExp = { date: '', amount: '', reason: '' };

// Helpers to handle DD‑MM‑YYYY
function formatDateDMY(dateObj) {
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}-${m}-${y}`;
}
function parseDMY(dateStr) {
  const [d, m, y] = dateStr.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

export default function Reports({ currentAdmin }) {
  const [payments, setPayments] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [filter, setFilter] = useState('today');
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [newExp, setNewExp] = useState(emptyExp);
  const tableRef = useRef();

  // load data once
  useEffect(() => {
    db.payments.toArray().then(setPayments);
    db.expenditures.toArray().then(setExpenditures);
  }, []);

  // re-filter payments when `filter` or `payments` change
  useEffect(() => {
    const now = new Date();
    let temp = [];

    switch (filter) {
      case 'today': {
        const todayStr = formatDateDMY(now);
        temp = payments.filter(p => p.date === todayStr);
        break;
      }
      case 'week': {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        temp = payments.filter(p => {
          const d = parseDMY(p.date);
          return d >= start && d <= end;
        });
        break;
      }
      case 'month': {
        temp = payments.filter(p => {
          const d = parseDMY(p.date);
          return (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        });
        break;
      }
      case 'year': {
        temp = payments.filter(p => {
          const d = parseDMY(p.date);
          return d.getFullYear() === now.getFullYear();
        });
        break;
      }
      case 'all':
      default:
        temp = payments;
    }

    setFilteredPayments(temp);
  }, [filter, payments]);

  // inline filter of expenditures
  const filteredExpenditures = expenditures.filter(exp => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return exp.date === formatDateDMY(now);

      case 'week': {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        const d = parseDMY(exp.date);
        return d >= start && d <= end;
      }

      case 'month': {
        const d = parseDMY(exp.date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      }

      case 'year': {
        const d = parseDMY(exp.date);
        return d.getFullYear() === now.getFullYear();
      }

      case 'all':
      default:
        return true;
    }
  });

  // totals
  const totalCollected = filteredPayments
    .reduce((sum, p) => sum + p.amount, 0)
    .toFixed(2);
  const totalExp = filteredExpenditures
    .reduce((sum, e) => sum + e.amount, 0)
    .toFixed(2);
  const netTotal = (totalCollected - totalExp).toFixed(2);

  // PDF export
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Collection Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`View: ${periods.find(p => p.value === filter).label}`, 14, 28);

    autoTable(doc, {
      startY: 36,
      head: [['Date', 'Student ID', 'Amount', 'Note']],
      body: filteredPayments.map(p => [
        p.date,
        p.studentId,
        `Rs ${p.amount.toFixed(2)}`,
        p.note,
      ]),
      theme: 'grid',
    });

    const afterPayY = doc.lastAutoTable.finalY + 10;
    doc.text('Expenditures', 14, afterPayY);
    autoTable(doc, {
      startY: afterPayY + 4,
      head: [['Date', 'Amount', 'Reason', 'Person']],
      body: filteredExpenditures.map(e => [
        e.date,
        `Rs ${e.amount.toFixed(2)}`,
        e.reason,
        e.person,
      ]),
      theme: 'grid',
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Total Collected: Rs ${totalCollected}`, 14, finalY);
    doc.text(`Total Expenses: Rs ${totalExp}`, 14, finalY + 8);
    doc.text(`Net Total: Rs ${netTotal}`, 14, finalY + 16);

    doc.save(`report-${filter}-${formatDateDMY(new Date())}.pdf`);
  };

  // add new expenditure
  const handleAddExp = async () => {
    const amt = parseFloat(newExp.amount);
    if (
      !isNaN(amt) &&
      newExp.date &&
      newExp.reason.trim()
    ) {
      await db.expenditures.add({
        date:   formatDateDMY(new Date(newExp.date)),
        amount: amt,
        reason: newExp.reason,
        person: currentAdmin,           // auto‑fill
      });
      setExpenditures(await db.expenditures.toArray());
      setNewExp(emptyExp);
    } else {
      alert('Fill out all fields correctly.');
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Collection Report</h2>
        <Link to="/" style={styles.backLink}>
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Controls */}
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
        <button onClick={handleExportPDF} style={styles.exportBtn}>
          Export PDF
        </button>
      </div>

      {/* Payments Table */}
      <div style={styles.tableWrapper}>
        <table ref={tableRef} style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              {['Date', 'Student ID', 'Amount', 'Note', 'Actions'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length > 0 ? (
              filteredPayments.map(p => (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.td}>{p.date}</td>
                  <td style={styles.td}>{p.studentId}</td>
                  <td style={styles.td}>Rs {p.amount.toFixed(2)}</td>
                  <td style={styles.td}>{p.note}</td>
                  <td style={styles.tdActions}>
                    <button
                      onClick={() => {
                        const a = parseFloat(prompt('Enter new amount:', p.amount));
                        const n = prompt('Enter new note:', p.note);
                        if (!isNaN(a)) {
                          db.payments
                            .update(p.id, { amount: a, note: n || '' })
                            .then(() => db.payments.toArray().then(setPayments));
                        }
                      }}
                      style={styles.editBtn}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this payment record?')) {
                          db.payments
                            .delete(p.id)
                            .then(() => db.payments.toArray().then(setPayments));
                        }
                      }}
                      style={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={styles.noData}>No records found</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td style={styles.footLabel}>Total Collected</td>
              <td colSpan={3} style={styles.footValue}>Rs {totalCollected}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Expenditures Section */}
      <div style={styles.expSection}>
        <h3 style={styles.subTitle}>Expenditures</h3>

        {/* only non‑kabitalok can add */}
        {currentAdmin !== 'kabitalok' && (
          <div style={styles.expControls}>
            <input
              type="date"
              value={newExp.date}
              onChange={e => setNewExp(ne => ({ ...ne, date: e.target.value }))}
              style={styles.input}
            />
            <input
              type="number"
              placeholder="Amount"
              step="0.01"
              value={newExp.amount}
              onChange={e => setNewExp(ne => ({ ...ne, amount: e.target.value }))}
              style={styles.inputSmall}
            />
            <input
              type="text"
              placeholder="Reason"
              value={newExp.reason}
              onChange={e => setNewExp(ne => ({ ...ne, reason: e.target.value }))}
              style={styles.inputFlex}
            />
            <button onClick={handleAddExp} style={styles.addExpBtn}>Add</button>
          </div>
        )}

        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              {['Date', 'Amount', 'Reason', 'Person', 'Actions'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredExpenditures.length > 0 ? (
              filteredExpenditures.map(e => (
                <tr key={e.id} style={styles.tr}>
                  <td style={styles.td}>{e.date}</td>
                  <td style={styles.td}>Rs {e.amount.toFixed(2)}</td>
                  <td style={styles.td}>{e.reason}</td>
                  <td style={styles.td}>{e.person}</td>
                  <td style={styles.tdActions}>
                    <button
                      onClick={async () => {
                        const a = parseFloat(prompt('New amount:', e.amount));
                        const r = prompt('New reason:', e.reason);
                        if (!isNaN(a)) {
                          await db.expenditures.update(e.id, {
                            amount: a,
                            reason: r,
                          });
                          setExpenditures(await db.expenditures.toArray());
                        }
                      }}
                      style={styles.editBtn}
                    >Edit</button>
                    <button
                      onClick={async () => {
                        if (confirm('Delete this entry?')) {
                          await db.expenditures.delete(e.id);
                          setExpenditures(await db.expenditures.toArray());
                        }
                      }}
                      style={styles.deleteBtn}
                    >Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={styles.noData}>No expenditures found</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td style={styles.footLabel}>Total</td>
              <td style={styles.footValue}>Rs {totalExp}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        <h3 style={styles.subTitle}>Summary</h3>
        <div>Total Collected: <strong>Rs {totalCollected}</strong></div>
        <div>Total Expenses: <strong>Rs {totalExp}</strong></div>
        <div style={styles.net}>Net Total: <strong>Rs {netTotal}</strong></div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: 24,
    backgroundColor: '#F3F4F6',
    minHeight: '100vh',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: 600 },
  backLink: { color: '#4F46E5', textDecoration: 'none' },

  controls: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  btn: {
    padding: '8px 16px', borderRadius: 6, backgroundColor: '#E5E7EB',
    color: '#374151', border: 'none', cursor: 'pointer',
  },
  btnActive: {
    padding: '8px 16px', borderRadius: 6, backgroundColor: '#4F46E5',
    color: '#FFFFFF', border: 'none', cursor: 'pointer',
  },
  exportBtn: {
    marginLeft: 'auto', padding: '8px 16px', backgroundColor: '#16A34A',
    color: '#FFFFFF', border: 'none', borderRadius: 6, cursor: 'pointer',
  },

  tableWrapper: {
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflowX: 'auto', marginBottom: 24,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { backgroundColor: '#E5E7EB' },
  th: {
    padding: '8px 12px', borderBottom: '1px solid #D1D5DB',
    textAlign: 'left', fontSize: 12, color: '#374151',
  },
  tr: {},
  td: {
    padding: '8px 12px', borderBottom: '1px solid #E5E7EB',
    verticalAlign: 'middle',
  },
  tdActions: { display: 'flex', gap: 8, padding: '8px 12px' },
  editBtn: {
    padding: '4px 8px', backgroundColor: '#FBBF24',
    color: '#FFFFFF', border: 'none', borderRadius: 4, cursor: 'pointer',
  },
  deleteBtn: {
    padding: '4px 8px', backgroundColor: '#EF4444',
    color: '#FFFFFF', border: 'none', borderRadius: 4, cursor: 'pointer',
  },
  noData: { padding: 16, textAlign: 'center', color: '#6B7280' },
  footLabel: { fontWeight: 600, padding: '8px 12px' },
  footValue: { padding: '8px 12px' },

  expSection: { marginBottom: 24 },
  subTitle: { fontSize: 18, fontWeight: 600, marginBottom: 12 },
  expControls: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '6px 8px', borderRadius: 4, border: '1px solid #D1D5DB' },
  inputSmall: { width: 100, padding: '6px 8px', borderRadius: 4, border: '1px solid #D1D5DB' },
  inputFlex: { flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid #D1D5DB' },
  addExpBtn: {
    padding: '6px 12px', backgroundColor: '#2563EB',
    color: '#FFFFFF', border: 'none', borderRadius: 6, cursor: 'pointer',
  },

  summary: {
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  net: { marginTop: 8, fontSize: 16, fontWeight: 600 },
};
