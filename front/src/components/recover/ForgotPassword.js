import { ArrowLeft, DeviceMobile, EnvelopeSimple, Info, Key, LockKey, ShieldCheck } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../config/api';
import BoutiqueAuthHeader from '../common/boutique/BoutiqueAuthHeader';
import BoutiqueAuthLayout from '../common/boutique/BoutiqueAuthLayout';
import BoutiqueBox from '../common/boutique/BoutiqueBox';
import BoutiqueButton from '../common/boutique/BoutiqueButton';
import BoutiqueInput from '../common/boutique/BoutiqueInput';
import BoutiqueStack from '../common/boutique/BoutiqueStack';
import BoutiqueText from '../common/boutique/BoutiqueText';
import { BQ_COLORS, BQ_SHADOWS } from '../common/boutique/BoutiqueTheme';

const isStrongPassword = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,25}$/.test(value || '');

function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = useMemo(() => String(location.state?.email || ''), [location.state]);
  const [channel, setChannel] = useState('email');
  const [identifier, setIdentifier] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('request');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    const value = String(identifier || '').trim();
    if (!value) { setError(`Enter your registered ${channel === 'email' ? 'email address' : 'mobile number'}.`); return; }
    setLoading(true);
    try {
      const result = await apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ channel, identifier: value }) });
      setMessage(result.message || 'If the account details match, a verification code has been sent.');
      setStep('verify');
    } catch (requestError) { setError(requestError.message || 'Unable to send a verification code.'); } finally { setLoading(false); }
  };
  const resetPassword = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the six-digit verification code.'); return; }
    if (password.length > 25) { setError('Password must not exceed 25 characters.'); return; }
    if (!isStrongPassword(password)) { setError('Use 8–25 characters with uppercase, lowercase, number, and special character.'); return; }
    if (password !== confirmPassword) { setError('New password and confirmation do not match.'); return; }
    setLoading(true);
    try {
      const result = await apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify({ channel, identifier: String(identifier).trim(), code: code.trim(), newPassword: password }) });
      setMessage(result.message || 'Password reset successfully. You can now sign in.');
      setStep('complete');
    } catch (requestError) { setError(requestError.message || 'Unable to reset password.'); } finally { setLoading(false); }
  };
  const changeChannel = (next) => { setChannel(next); setIdentifier(next === 'email' ? initialEmail : ''); setCode(''); setError(''); setMessage(''); setStep('request'); };
  const identifierLabel = channel === 'email' ? 'Registered Email Address' : 'Registered Mobile Number';

  return <BoutiqueAuthLayout>
    <button className="bq-login-back-btn" onClick={() => navigate('/login')} title="Back to Login"><ArrowLeft size={20} weight="bold" /></button>
    <BoutiqueAuthHeader title={step === 'request' ? 'Recover Access' : step === 'verify' ? 'Verify & Reset Password' : 'Password Reset Complete'} subtitle={step === 'request' ? 'Choose email or SMS verification to safely recover your account.' : step === 'verify' ? `Enter the code sent by ${channel === 'email' ? 'email' : 'SMS'} and choose a new password.` : 'Your account is ready to use again.'} />
    {step === 'request' ? <BoutiqueStack tag="form" gap={22} onSubmit={requestCode} className="bq-fade-in"><div className="recovery-channel-choice"><button type="button" className={channel === 'email' ? 'selected' : ''} onClick={() => changeChannel('email')}><EnvelopeSimple size={20} weight="bold" /><span>Email verification</span></button><button type="button" className={channel === 'sms' ? 'selected' : ''} onClick={() => changeChannel('sms')}><DeviceMobile size={20} weight="bold" /><span>SMS verification</span></button></div><BoutiqueInput label={identifierLabel} icon={channel === 'email' ? EnvelopeSimple : DeviceMobile} type={channel === 'email' ? 'email' : 'tel'} autoComplete={channel === 'email' ? 'email' : 'tel'} inputMode={channel === 'email' ? 'email' : 'tel'} value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={channel === 'email' ? 'you@example.com' : '09XXXXXXXXX'} hint={channel === 'email' ? 'Use the verified email on your SuperAdmin account.' : 'Use the registered mobile number on your SuperAdmin account.'} status={error ? 'error' : null} errorMessage={error} disabled={loading} />{message ? <RecoveryMessage message={message} /> : null}<BoutiqueButton type="submit" loading={loading} fullWidth>Send verification code</BoutiqueButton><RecoveryFooter navigate={navigate} /></BoutiqueStack> : null}
    {step === 'verify' ? <BoutiqueStack tag="form" gap={20} onSubmit={resetPassword} className="bq-fade-in"><BoutiqueBox padding="14px 16px" background={BQ_COLORS.bgAlt} style={{ borderRadius: '12px', border: `1px solid ${BQ_COLORS.border}` }}><BoutiqueText size="13px" weight={700} color={BQ_COLORS.inkMuted}>Code destination: {channel === 'email' ? identifier : `SMS to ${identifier}`}</BoutiqueText><button type="button" className="recovery-text-button" onClick={() => setStep('request')}>Use another method</button></BoutiqueBox><BoutiqueInput label="Six-digit verification code" icon={Key} inputMode="numeric" maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" status={error ? 'error' : null} errorMessage={error} disabled={loading} /><BoutiqueInput label="New password" icon={LockKey} type="password" autoComplete="new-password" value={password} maxLength={25} onChange={(event) => setPassword(event.target.value)} hint="Use 8–25 characters with uppercase, lowercase, number, and special character." disabled={loading} /><BoutiqueInput label="Confirm new password" icon={LockKey} type="password" autoComplete="new-password" value={confirmPassword} maxLength={25} onChange={(event) => setConfirmPassword(event.target.value)} status={confirmPassword && password === confirmPassword ? 'success' : null} disabled={loading} />{message ? <RecoveryMessage message={message} /> : null}<BoutiqueButton type="submit" loading={loading} fullWidth>Reset password securely</BoutiqueButton><button type="button" className="recovery-resend" disabled={loading} onClick={() => requestCode({ preventDefault: () => {} })}>Resend code</button></BoutiqueStack> : null}
    {step === 'complete' ? <BoutiqueStack gap={22} className="bq-fade-in"><BoutiqueBox padding="24px" background="#ecfdf5" align="center" style={{ borderRadius: '16px', border: '1px solid #10b98133', textAlign: 'center' }}><ShieldCheck size={34} weight="fill" style={{ color: '#059669' }} /><BoutiqueText variant="h2" color="#065f46" margin="12px 0 6px">Recovery complete</BoutiqueText><BoutiqueText color="#047857" weight={600}>{message}</BoutiqueText></BoutiqueBox><BoutiqueButton type="button" fullWidth onClick={() => navigate('/login', { replace: true })}>Go to sign in</BoutiqueButton><BoutiqueText size="13px" color={BQ_COLORS.inkMuted} weight={600}>You can sign in using the same verified email or mobile number used for recovery.</BoutiqueText></BoutiqueStack> : null}
    <style dangerouslySetInnerHTML={{ __html: `.bq-login-back-btn{position:absolute;top:40px;left:40px;background:#fff;border:0;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:${BQ_COLORS.ink};box-shadow:${BQ_SHADOWS.soft};z-index:100}.recovery-channel-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px}.recovery-channel-choice button{display:flex;align-items:center;gap:9px;padding:13px;border:1.5px solid ${BQ_COLORS.border};border-radius:12px;background:#fff;color:${BQ_COLORS.inkMuted};font:inherit;font-size:13px;font-weight:800;cursor:pointer}.recovery-channel-choice button.selected{border-color:${BQ_COLORS.brand};background:#eef2ff;color:${BQ_COLORS.brand}}.recovery-text-button,.recovery-resend{border:0;background:transparent;color:${BQ_COLORS.brand};font:inherit;font-size:12px;font-weight:800;cursor:pointer;padding:6px 0}.recovery-resend{align-self:center;text-decoration:underline}.bq-signup-link{background:none;border:0;color:${BQ_COLORS.brand};font-weight:800;cursor:pointer;text-decoration:underline;padding:0 4px;font-size:15px}@media(max-width:1024px){.bq-login-back-btn{top:20px;left:20px;width:40px;height:40px}}` }} />
  </BoutiqueAuthLayout>;
}

const RecoveryMessage = ({ message }) => <BoutiqueBox padding="14px 16px" background="#ecfdf5" direction="row" align="center" gap={10} style={{ borderRadius: '12px', border: '1px solid #10b98133' }}><Info size={18} weight="bold" style={{ color: '#059669' }} /><BoutiqueText weight={600} size="13px" color="#059669">{message}</BoutiqueText></BoutiqueBox>;
const RecoveryFooter = ({ navigate }) => <BoutiqueBox align="center"><BoutiqueText color={BQ_COLORS.inkMuted} weight={500}>Remembered your password?<button type="button" className="bq-signup-link" onClick={() => navigate('/login')}>Sign In</button></BoutiqueText></BoutiqueBox>;

export default ForgotPassword;
