// testLogin.js
const fetch = require('node-fetch'); // make sure you installed node-fetch@2

const SERVER = 'http://localhost:5001';

async function test() {
  try {
    console.log('--- Testing login with existing account ---');
    // Admin credentials
    const testEmail = 'vaanya@uwo.ca';
    const testPassword = 'vaanya123';

    // Uncomment below to test student credentials instead
    // const testEmail = 'alpha@uwo.ca';
    // const testPassword = 'shivi123';

    async function doLogin() {
      const res = await fetch(`${SERVER}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword })
      });
      const data = res.headers.get('content-type')?.includes('application/json')
        ? await res.json()
        : { error: 'Non-JSON response' };
      return { res, data };
    }

    let { res: loginRes, data: loginData } = await doLogin();

    if (!loginRes.ok) {
      console.warn('Initial login failed, attempting register:', loginData);
      const registerRes = await fetch(`${SERVER}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          fullName: 'Vaanya',
          studentNumber: '000000',
          faculty: 'computer-science',
          role: 'admin'
        })
      });

      if (registerRes.ok) {
        console.log('Register succeeded, retrying login.');
      } else {
        const raw = await registerRes.text();
        console.warn('Register response (non-ok, but continuing):', registerRes.status, raw);
      }

      ({ res: loginRes, data: loginData } = await doLogin());
    }

    if (!loginRes.ok) {
      console.error('Login failed even after register attempt:', loginData);
      return;
    }

    console.log('Login successful:', loginData);

    console.log('Login successful:', loginData);

    const token = loginData.token;
    if (!token) {
      console.error('No token returned!');
      return;
    }

    // Test protected admin route
    console.log('--- Testing /api/admin-only ---');
    const adminRes = await fetch(`${SERVER}/api/admin-only`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const adminData = await adminRes.json();
    console.log('/api/admin-only response:', adminData);

    // Test protected student route
    console.log('--- Testing /api/student-only ---');
    const studentRes = await fetch(`${SERVER}/api/student-only`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const studentData = await studentRes.json();
    console.log('/api/student-only response:', studentData);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();