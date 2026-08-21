import React, { useState } from 'react';
import { useUser } from '../../../context/UserContext';
import AdminLayout from '../Common/AdminLayout';
import ChangePassword from './ChangePassword';
import { loadBranchNetwork } from '../../../domain/branches/branchNetworkStorage';
import { getSessionActiveBranch } from '../../../utils/authSession';
import '../adminShared.css';
import './styles.css';

const AdminProfile = () => {
  const { user, updateProfile } = useUser();
  const roleTitle = user?.role === 'superadmin' ? 'SuperAdmin' : 'Admin';
  const branchName = getSessionActiveBranch() || user?.activeBranch || user?.assignedBranch || '';
  const branchInfo = loadBranchNetwork().find((branch) => branch.name === branchName);
  const adminLocation = branchInfo?.location || branchName || '-';
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const openEditModal = () => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
    });
    setIsEditing(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await updateProfile(form);
      setIsEditing(false);
      alert('Profile updated successfully.');
    } catch (error) {
      alert(`Failed to update profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title={`${roleTitle} Profile`} subtitle="Manage profile and security">
      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>Profile</h3>
          <p><strong>Name:</strong> {user?.name || 'Administrator'}</p>
          <p><strong>Email:</strong> {user?.email || 'admin@aeropulse.com'}</p>
          <p><strong>Role:</strong> {user?.role || 'admin'}</p>
          <p><strong>Phone:</strong> {user?.phone || '-'}</p>
          <p><strong>Location:</strong> {adminLocation}</p>
          <p><strong>Last Login:</strong> {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : '-'}</p>
          <button type="button" onClick={openEditModal}>Edit Profile</button>
        </div>
        <ChangePassword />
      </div>
      {isEditing && (
        <div className="app-modal-overlay" onClick={() => setIsEditing(false)}>
          <form className="app-modal-card" onSubmit={saveProfile} onClick={(event) => event.stopPropagation()}>
            <h3>Edit Admin Profile</h3>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" />
            <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" />
            <input value={adminLocation} readOnly disabled placeholder="Location" />
            <div className="app-modal-actions">
              <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminProfile;
