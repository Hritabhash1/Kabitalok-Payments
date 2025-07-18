import { useEffect, useState } from 'react';
import { db } from '../utils/db';
import { useNavigate } from 'react-router-dom';

function formatTimestamp(ts) {
  const d = new Date(ts);
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminsManagement() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', modifiedBy: '' });

  useEffect(() => {
    async function fetchAdmins() {
      const list = await db.admins.toArray();
      setAdmins(list);
    }
    fetchAdmins();
  }, []);

  const reload = async () => {
    const list = await db.admins.toArray();
    setAdmins(list);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    // Validate required fields
    if (!form.username.trim() || !form.password.trim() || !form.modifiedBy.trim()) {
      return alert('Username, Password, and Modifier Name are all required');
    }
    const timestamp = new Date().toISOString();
    if (editing) {
      await db.admins.update(editing.id, {
        username: form.username,
        password: form.password,
        modifiedBy: form.modifiedBy,
        modifiedAt: timestamp
      });
    } else {
      await db.admins.add({
        username: form.username,
        password: form.password,
        modifiedBy: form.modifiedBy,
        modifiedAt: timestamp
      });
    }
    setForm({ username: '', password: '', modifiedBy: '' });
    setEditing(null);
    reload();
  };

  const handleDelete = async id => {
    if (window.confirm('Delete this admin?')) {
      await db.admins.delete(id);
      reload();
    }
  };

  const handleEdit = admin => {
    setEditing(admin);
    setForm({ username: admin.username, password: admin.password, modifiedBy: admin.modifiedBy });
  };

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/')} style={styles.backBtn}>&larr; Back to Dashboard</button>
      <h2>Admin Management</h2>

      <div style={styles.form}>
        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="modifiedBy"
          placeholder="Modifier Name"
          value={form.modifiedBy}
          onChange={handleChange}
          style={styles.input}
        />
        <button onClick={handleSave} style={styles.saveBtn}>
          {editing ? 'Update Admin' : 'Add Admin'}
        </button>
        {editing && (
          <button
            onClick={() => {
              setEditing(null);
              setForm({ username: '', password: '', modifiedBy: '' });
            }}
            style={styles.cancelBtn}
          >
            Cancel
          </button>
        )}
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th>Username</th>
            <th>Last Modified By</th>
            <th>Last Modified At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map(a => (
            <tr key={a.id}>
              <td>{a.username}</td>
              <td>{a.modifiedBy}</td>
              <td>{formatTimestamp(a.modifiedAt)}</td>
              <td>
                <button onClick={() => handleEdit(a)} style={styles.editBtn}>Edit</button>
                <button onClick={() => handleDelete(a.id)} style={styles.deleteBtn}>Delete</button>
              </td>
            </tr>
          ))}
          {!admins.length && (
            <tr>
              <td colSpan={4} style={styles.noData}>No admins found</td>
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
    background: '#fff',
    borderRadius: 12,
    margin: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  backBtn: {
    marginBottom: 16,
    background: 'none',
    border: 'none',
    color: '#2563EB',
    fontSize: 16,
    cursor: 'pointer'
  },
  form: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  input: { padding: '8px 12px', borderRadius: 4, border: '1px solid #D1D5DB' },
  saveBtn: { backgroundColor: '#16A34A', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer' },
  cancelBtn: { backgroundColor: '#E5E7EB', color: '#374151', padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  editBtn: { marginRight: 8, backgroundColor: '#FBBF24', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' },
  deleteBtn: { backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' },
  noData: { padding: 16, textAlign: 'center', color: '#6B7280' }
};
