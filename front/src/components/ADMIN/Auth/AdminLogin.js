import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../adminShared.css';
import './styles.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!email || !password) return;
    navigate('/admin/dashboard');
  };

  return (
    <form className="admin-form admin-auth" onSubmit={submit}>
      <h2>Admin Login</h2>
      <input maxLength={254} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input maxLength={128} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Sign In</button>
    </form>
  );
};

export default AdminLogin;
