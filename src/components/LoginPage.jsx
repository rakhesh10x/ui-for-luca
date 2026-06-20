import React, { useState, useEffect } from 'react';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [standard, setStandard] = useState('');
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const trimmedName = fullName.trim();
    const trimmedStandard = standard.trim();
    const digitsOnly = mobileNumber.replace(/\D/g, '');
    
    const valid = 
      trimmedName.length > 0 &&
      trimmedStandard.length > 0 &&
      digitsOnly.length === 10;
      
    setIsValid(valid);
  }, [fullName, mobileNumber, standard]);

  const handleMobileChange = (e) => {
    // Only allow digits to be entered
    const val = e.target.value.replace(/\D/g, '');
    // Restrict to 10 characters maximum
    if (val.length <= 10) {
      setMobileNumber(val);
    }
  };

  const handleStandardChange = (e) => {
    // Only allow digits to be entered
    const val = e.target.value.replace(/\D/g, '');
    setStandard(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;

    const user = {
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.replace(/\D/g, ''),
      standard: standard.trim(),
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('lucaUser', JSON.stringify(user));
    onLogin(user);
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        
        <form id="luca-login-form" onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="fullName">FULL NAME *</label>
            <input
              id="fullName"
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="login-input"
              autoComplete="name"
            />
          </div>

          <div className="login-field">
            <label htmlFor="mobileNumber">MOBILE NUMBER *</label>
            <input
              id="mobileNumber"
              type="tel"
              placeholder="Mobile Number"
              value={mobileNumber}
              onChange={handleMobileChange}
              className="login-input"
              autoComplete="tel"
            />
          </div>

          <div className="login-field">
            <label htmlFor="standard">STANDARD *</label>
            <input
              id="standard"
              type="tel"
              placeholder="Class you're studying in"
              value={standard}
              onChange={handleStandardChange}
              className="login-input"
            />
          </div>
        </form>
      </div>

      {/* Universal Bottom Dock */}
      <div className="bottom-dock slide-up">
        <button 
          type="submit" 
          form="luca-login-form"
          className="login-submit-btn"
          disabled={!isValid}
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
