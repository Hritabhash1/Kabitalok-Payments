import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../utils/db';
import StudentPayments from './StudentPayments';
import WebcamCapture from '../components/WebCamCapture';
import { backupDataToFile,restoreDataFromFile } from '../utils/backup';
import { useRef } from 'react';

const terms = [
  'All', 'Adya', 'Madhya', 'Purna',
  'First Year', 'Second Year', 'Third Year',
  'Fourth Year', 'Fifth Year', 'Sixth Year', 'Seventh Year'
];
const FIELD_OPTIONS = ['Painting', 'Recitation', 'Singing'];
const PAGE_SIZE = 10;

export default function Dashboard({ onLogout,user }) {

  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [filterTerm, setFilterTerm] = useState('All');
  const [filterField, setFilterField] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editId, setEditId] = useState(null);
const [sortOption, setSortOption] = useState('id-asc');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    studentId: '', name: '', fatherGuardian: '', contact: '', whatsapp: '',email: '',
    address: '', academicSchool: '', admissionDate: '', year: 'Adya',
    photo: '', signature: '', field: []
  });
const fileInputRef = useRef();

function triggerFileSelect() {
  fileInputRef.current.click(); 
}

function handleRestore(e) {
  const file = e.target.files[0];
  if (file) {
    restoreDataFromFile(file).then(() => {
      loadStudents(); // reload after restore
      alert('Data restored successfully!');
    });
  }
}

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => {
    let temp = students;
    if (search) {
      const term = search.toLowerCase();
      temp = temp.filter(s =>
        s.studentId.toLowerCase().includes(term) ||
        s.name.toLowerCase().includes(term)
      );
    }
    if (filterTerm !== 'All') temp = temp.filter(s => s.year === filterTerm);
    if (filterField !== 'All') temp = temp.filter(s => (s.field || []).includes(filterField));
     temp = [...temp].sort((a, b) => {
     const [key, dir] = sortOption.split('-');
     let cmp = 0;
     if (key === 'id') {
       cmp = a.studentId.localeCompare(b.studentId, undefined, { numeric: true });
     } else {
       cmp = a.name.localeCompare(b.name);
     }
     return dir === 'asc' ? cmp : -cmp;
   });
    setFiltered(temp);
    setTotalPages(Math.ceil(temp.length / PAGE_SIZE) || 1);
    setPage(1);

  }, [search, filterTerm, filterField, students,sortOption]);

  async function loadStudents() {
    const all = await db.students.toArray();
    setStudents(all);
  }

  function handleChange(e) {
    const { name, value, files, checked } = e.target;
    if (name === 'field') {
      setForm(f => {
        const current = f.field || [];
        return checked
          ? { ...f, field: [...current, value] }
          : { ...f, field: current.filter(v => v !== value) };
      });
    } else if (files) {
      const reader = new FileReader();
      reader.onload = () => setForm(f => ({ ...f, [name]: reader.result }));
      reader.readAsDataURL(files[0]);
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  async function handleAddOrUpdate() {
    if (!form.studentId || !form.name) return alert('ID and Name required');
    if (editId) await db.students.update(editId, form);
    else await db.students.add(form);
    resetForm();
    loadStudents();
  }

  function resetForm() {
    setForm({
      studentId: '', name: '', fatherGuardian: '', contact: '', whatsapp: '',email: '',
      address: '', academicSchool: '', admissionDate: '', year: 'Adya',
      photo: '', signature: '', field: []
    });
    setEditId(null);
    setShowModal(false);
  }

  function handleEdit(e, stu) {
    e.stopPropagation();
    setForm({ ...stu, field: stu.field || [] });
    setEditId(stu.id);
    setShowModal(true);
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (window.confirm('Delete this student?')) {
      await db.students.delete(id);
      loadStudents();
    }
  }

  function handleRowClick(stu) {
    navigate(`/student/${stu.id}`);
  }

  // pagination
  const startIdx = (page - 1) * PAGE_SIZE;
  const currentStudents = filtered.slice(startIdx, startIdx + PAGE_SIZE);
function handleWebcamCapture(imageData) {
  setForm(f => ({ ...f, photo: imageData }));
}
function handleWebsignCapture(imageData) {
  setForm(f => ({ ...f, signature: imageData }));
}


  return (
    <div style={styles.container}>
     
      <div style={styles.header}>
        <input
          style={styles.searchInput}
          placeholder="🔍 Search by ID or Name"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={styles.select}
          value={filterTerm}
          onChange={e => setFilterTerm(e.target.value)}
        >
          {terms.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          style={styles.select}
          value={filterField}
          onChange={e => setFilterField(e.target.value)}
        >
          {['All', ...FIELD_OPTIONS].map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
  style={styles.select}
  value={sortOption}
  onChange={e => setSortOption(e.target.value)}
>
  <option value="id-asc">ID ↑</option>
  <option value="id-desc">ID ↓</option>
  <option value="name-asc">Name A→Z</option>
  <option value="name-desc">Name Z→A</option>
</select>

        <div style={styles.buttonGroup}>
          <button style={styles.addButton} onClick={() => setShowModal(true)}>+ Add Student</button>
          <button style={styles.reportButton} onClick={() => navigate('/reports')}>Reports</button>
        {user === 'kabitalok' && (
  <>
    <button style={styles.reportButton} onClick={() => navigate('/admins')}>Manage Admins</button>
   
  </>
)}

          <button style={styles.reportButton} onClick={() => navigate('/inactive')}>InactiveStudents</button>
          <button style={styles.logoutButton} onClick={onLogout}>Logout</button>
          
           
     <button onClick={backupDataToFile} style={{ padding: '12px 24px', backgroundColor: '#6B7280', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer' }}>
    📦 Backup
  </button>
      <>
  <button
    onClick={triggerFileSelect}
    style={{ padding: '12px 24px', backgroundColor: '#6B7280', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer' }}
  >
    🔁 Restore
  </button>
  <input
    type="file"
    accept=".json"
    ref={fileInputRef}
    onChange={handleRestore}
    style={{ display: 'none' }}
  />
</>

        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{editId ? 'Edit Student' : 'Add New Student'}</h3>
            <div style={styles.modalGrid}>
              {['studentId','name','fatherGuardian','contact','whatsapp','address','academicSchool','email'].map(f => (
                <div key={f}>
                  <label style={styles.label}>{f.replace(/([A-Z])/g,' $1')}</label>
                  <input
                    name={f}
                    value={form[f]}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>
              ))}
              <div>
                <label style={styles.label}>Admission Date</label>
                <input
                  type="date"
                  name="admissionDate"
                  value={form.admissionDate}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Select Year</label>
                <select
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                  style={styles.input}
                >
                  {terms.filter(t => t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={styles.label}>Select Fields</label>
                <div style={styles.checkboxGroup}>
                  {FIELD_OPTIONS.map(opt => (
                    <label key={opt} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="field"
                        value={opt}
                        checked={form.field.includes(opt)}
                        onChange={handleChange}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
             <div>
  <label style={styles.label}>Upload Photo</label>
  <input
    type="file"
    name="photo"
    accept="image/*"
    onChange={handleChange}
    style={styles.input}
  />
  <div style={{ marginTop: 8 }}>
    <WebcamCapture onCapture={handleWebcamCapture} />
  </div>
</div>

              <div>
                <label style={styles.label}>Upload Signature</label>
                <input
                  type="file"
                  name="signature"
                  accept="image/*"
                  onChange={handleChange}
                  style={styles.input}
                />
                 <div style={{ marginTop: 8 }}>
    <WebcamCapture onCapture={handleWebsignCapture} />
  </div>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={resetForm}>Cancel</button>
              <button style={styles.saveButton} onClick={handleAddOrUpdate}>
                {editId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.tableContainer}>
        <h2 style={styles.tableTitle}>Student Records</h2>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              {['Photo','ID','Name','Father/Guardian','Email','Contact','WhatsApp','Address','Academic/School','Admission Date','Year','Fields','Actions']
                .map(h => <th key={h} style={styles.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {currentStudents.map(stu => (
              <tr
                key={stu.id}
                onClick={() => handleRowClick(stu)}
                style={styles.tr}
              >
                <td style={styles.td}>
                  {stu.photo && <img src={stu.photo} alt="photo" style={styles.avatar}/>}
                </td>
                <td style={styles.td}>{stu.studentId}</td>
                <td style={styles.td}>{stu.name}</td>
                
                <td style={styles.td}>{stu.fatherGuardian}</td>
                <td style={styles.td}>{stu.email}</td>
                <td style={styles.td}>{stu.contact}</td>
                <td style={styles.td}>{stu.whatsapp}</td>
                <td style={styles.td}>{stu.address}</td>
                <td style={styles.td}>{stu.academicSchool}</td>
                <td style={styles.td}>{stu.admissionDate}</td>
                <td style={styles.td}>{stu.year}</td>
                <td style={styles.td}>{(stu.field || []).join(', ')}</td>
                <td style={styles.td}>
                  <button onClick={e => handleEdit(e, stu)} style={styles.editButton}>Edit</button>
                  <button onClick={e => handleDelete(e, stu.id)} style={styles.deleteButton}>Delete</button>
                </td>
              </tr>
            ))}
            {!currentStudents.length && (
              <tr>
                <td colSpan="12" style={styles.noData}>No records found</td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={styles.pagination}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={styles.pageButton}
          >Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            style={styles.pageButton}
          >Next</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #F9FAFB, #E5E7EB)',
    padding: 32,
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchInput: {
    flex: '1 1 200px',
    padding: 12,
    borderRadius: 9999,
    border: '1px solid #D1D5DB',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  select: {
    padding: 12,
    borderRadius: 9999,
    border: '1px solid #D1D5DB',
    minWidth: 140,
  },
  buttonGroup: {
    marginLeft: 'auto',
    display: 'flex',
    gap: 16,
  },
  addButton: { padding: '12px 24px', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer' },
  reportButton: { padding: '12px 24px', backgroundColor: '#16A34A', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer' },
  logoutButton: { padding: '12px 24px', backgroundColor: '#DC2626', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer' },

  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 50,
  },
  modal: {
    backgroundColor: '#fff', padding: 32, borderRadius: 40,
    width: '100%', maxWidth: 800, boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  modalTitle: { fontSize: 24, fontWeight: '600', marginBottom: 24 },
  modalGrid: {
    display: 'grid', gap: 24,
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    maxHeight: '70vh', overflowY: 'auto',
  },
  label: { display: 'block', marginBottom: 4, fontWeight: '500' },
  input: { width: '100%', padding: 12, border: '1px solid #D1D5DB', borderRadius: 12 },
  checkboxGroup: { display: 'flex', gap: 16 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8 },

  modalActions: { marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 16 },
  cancelButton: { padding: '8px 24px', backgroundColor: '#E5E7EB', border: 'none', borderRadius: 12, cursor: 'pointer' },
  saveButton: { padding: '8px 24px', backgroundColor: '#4F46E5', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' },

  tableContainer: { backgroundColor: '#fff', padding: 24, borderRadius: 40, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflowX: 'auto' },
  tableTitle: { fontSize: 32, fontWeight: '700', marginBottom: 24 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14, textAlign: 'left' },
  thead: { backgroundColor: '#F3F4F6', color: '#4B5563', textTransform: 'uppercase', fontSize: 12 },
  th: { padding: '12px 16px', borderBottom: '1px solid #E5E7EB' },
  tr: { cursor: 'pointer', transition: 'background-color 0.2s', },
  td: { padding: '12px 16px', borderBottom: '1px solid #E5E7EB', verticalAlign: 'middle' },
  avatar: { width: 40, height: 40, borderRadius: '50%' },
  editButton: { padding: '6px 12px', backgroundColor: '#FBBF24', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 8 },
  deleteButton: { padding: '6px 12px', backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  noData: { textAlign: 'center', color: '#9CA3AF', padding: '24px 0' },

  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 },
  pageButton: { padding: '8px 16px', backgroundColor: '#E5E7EB', border: 'none', borderRadius: 6, cursor: 'pointer' },
};
