import { useEffect, useState } from 'react';
import { apiRequest } from '../../config/api';
import { BRANCHES } from './branches';

export default function useActiveBranches() {
  const [branches, setBranches] = useState(BRANCHES);
  useEffect(() => {
    let mounted = true;
    apiRequest('/branches')
      .then((result) => {
        if (!mounted) return;
        if (!Array.isArray(result.branches)) return;
        const names = result.branches
          .filter((branch) => branch?.active !== false && branch?.name)
          .map((branch) => branch.name);
        setBranches(names);
      })
      .catch(() => { /* Keep the built-in branches for offline/error rendering. */ });
    return () => { mounted = false; };
  }, []);
  return branches;
}
