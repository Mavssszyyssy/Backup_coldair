import React, { useMemo } from 'react';
import AdminLayout from '../Common/AdminLayout';
import { useUser } from '../../../context/UserContext';
import { loadBranchNetwork } from '../../../domain/branches/branchNetworkStorage';
import { getSessionActiveBranch } from '../../../utils/authSession';
import '../adminShared.css';

const TOTP_DEMO = '123456';
const DEFAULT_BRANCH_LOCATIONS = {
  Bulacan: 'Bulacan',
  Cavite: 'Cavite',
  Laguna: 'Laguna',
  Bataan: 'Bataan',
  Pangasinan: 'Pangasinan',
  Ilocos: 'Ilocos',
};

const AdminStoreOperations = () => {
  const { user } = useUser();
  const branches = useMemo(() => loadBranchNetwork(), []);

  const assignedBranch = useMemo(() => {
    const pickedBranch = getSessionActiveBranch() || user?.activeBranch || user?.assignedBranch || '';
    if (pickedBranch) {
      const matchedByName = branches.find((branch) => branch.name === pickedBranch);
      if (matchedByName) return matchedByName;
      return {
        id: pickedBranch.toLowerCase().replace(/\s+/g, '-'),
        name: pickedBranch,
        location: DEFAULT_BRANCH_LOCATIONS[pickedBranch] || pickedBranch,
        manager: 'TBD',
        branchAdmin: String(user?.email || '').toLowerCase(),
        storeStatus: 'open',
        serverStatus: 'online',
        networkHealth: 'stable',
      };
    }
    const email = String(user?.email || '').toLowerCase();
    return branches.find((branch) => branch.branchAdmin === email) || branches[0];
  }, [branches, user?.email, user?.activeBranch, user?.assignedBranch]);

  return (
    <AdminLayout title="Store" subtitle="Branch closing flow and server shutdown controls">
      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>Branch Allocation</h3>
          <p><strong>Branch:</strong> {assignedBranch?.name}</p>
          <p><strong>Location:</strong> {assignedBranch?.location}</p>
          <p><strong>Manager:</strong> {assignedBranch?.manager}</p>
          <p><strong>Store:</strong> {assignedBranch?.storeStatus}</p>
          <p><strong>Server:</strong> {assignedBranch?.serverStatus}</p>
          <p><strong>Network:</strong> {assignedBranch?.networkHealth}</p>
          <p style={{ color: '#64748b', marginBottom: 0 }}>
            Demo TOTP: <strong>{TOTP_DEMO}</strong>
          </p>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminStoreOperations;
