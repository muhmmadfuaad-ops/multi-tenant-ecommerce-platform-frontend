import React, { useState, useEffect } from 'react';

export const PaymentComponent = () => {
  const [paymentData, setPaymentData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingForm, setBillingForm] = useState({
    street_1: '',
    city: '',
    postal_code: '',
    country: 'PK'
  });

  // Step 1: Initialize payment
  useEffect(() => {
    const initializePayment = async () => {
      const response = await fetch('http://localhost:3001/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 50000,
          currency: 'PKR',
          intent: 'PAYFAST',
          companyEmail: 'your-email@company.com',
          password: 'your-password'
        })
      });

      const data = await response.json();
      setPaymentData(data.data);

      // Load Flex library with JWT
      if (data.data.captureContextJwt) {
        loadFlexLibrary(data.data.captureContextJwt);
      }
    };

    initializePayment();
  }, []);

  // Load and initialize Flex microform
  const loadFlexLibrary = (jwt) => {
    // Load Flex script
    const script = document.createElement('script');
    script.src = 'https://testflex.cybersource.com/microform/bundle/v2.0.2/flex-microform.min.js';
    script.onload = () => {
      initializeFlex(jwt);
    };
    document.body.appendChild(script);
  };

  const initializeFlex = (jwt) => {
    // @ts-ignore
    window.Flex(jwt).then((flex) => {
      // Create card number field
      flex.microform.create('number', {
        placeholder: 'Card Number',
        maxLength: 19
      }).then((el) => el.attach('#card-number'));

      // Create expiration date field
      flex.microform.create('expiration-date', {
        placeholder: 'MM/YY'
      }).then((el) => el.attach('#expiration-date'));

      // Create CVV field
      flex.microform.create('cvv', {
        placeholder: 'CVV'
      }).then((el) => el.attach('#cvv'));

      // Store flex instance for later use
      window.flexInstance = flex;
    });
  };

  // Step 2: Handle payment submission
  const handlePayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Get transient token from Flex
      // @ts-ignore
      window.flexInstance.microform.createToken({}, async (err, token) => {
        if (err) {
          console.error('Token creation failed:', err);
          setIsProcessing(false);
          return;
        }

        // Step 3: Send transient token to backend
        const authResponse = await fetch('http://localhost:3001/api/payments/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transientToken: token.token,
            billingAddress: billingForm
          })
        });

        const authData = await authResponse.json();

        if (authData.success) {
          // Get tracker token from response
          const trackerToken = authData.data.tracker.token;

          // Step 4: Poll for payment status
          pollPaymentStatus(trackerToken);
        } else {
          alert('Payment failed: ' + authData.error);
          setIsProcessing(false);
        }
      });
    } catch (error) {
      console.error('Payment error:', error);
      alert('Error: ' + error.message);
      setIsProcessing(false);
    }
  };

  // Poll tracker status
  const pollPaymentStatus = async (trackerToken) => {
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/payments/status/${trackerToken}`);
        const data = await response.json();

        if (data.isPaymentComplete) {
          alert('✅ Payment successful!');
          setIsProcessing(false);
          // Redirect or show success
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 1000); // Check again in 1 second
        } else {
          alert('Payment status check timed out');
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    };

    poll();
  };

  if (!paymentData) {
    return <div>Loading payment form...</div>;
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc' }}>
      <h2>Payment Form</h2>
      
      <form onSubmit={handlePayment}>
        <div style={{ marginBottom: '15px' }}>
          <label>Card Number</label>
          <div id="card-number" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
          <div>
            <label>Expiry Date</label>
            <div id="expiration-date" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}></div>
          </div>
          <div>
            <label>CVV</label>
            <div id="cvv" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}></div>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Street</label>
          <input
            type="text"
            value={billingForm.street_1}
            onChange={(e) => setBillingForm({ ...billingForm, street_1: e.target.value })}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>City</label>
          <input
            type="text"
            value={billingForm.city}
            onChange={(e) => setBillingForm({ ...billingForm, city: e.target.value })}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Postal Code</label>
          <input
            type="text"
            value={billingForm.postal_code}
            onChange={(e) => setBillingForm({ ...billingForm, postal_code: e.target.value })}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: isProcessing ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isProcessing ? 'not-allowed' : 'pointer'
          }}
        >
          {isProcessing ? 'Processing...' : 'Pay PKR 50,000'}
        </button>
      </form>
    </div>
  );
};