import React, { useState, useEffect, useRef } from 'react';

export const PaymentComponent = () => {
  const [paymentData, setPaymentData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const flexInstanceRef = useRef(null);
  const [billingForm, setBillingForm] = useState({
    street_1: '',
    city: '',
    postal_code: '',
    country: 'PK'
  });

  // Step 1: Initialize payment
  useEffect(() => {
    const initializePayment = async () => {
      try {
        setError(null);
        console.log('Starting payment initialization...');

        // Call your backend
        const response = await fetch('http://localhost:3000/payments/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('API Response:', responseData);

        // Get the JWT from the correct path
        const captureContextJwt = responseData.action?.flex?.capture_context_jwt;
        
        console.log('JWT found:', !!captureContextJwt);
        console.log('JWT length:', captureContextJwt?.length);
        
        if (!captureContextJwt) {
          console.error('No JWT found in response');
          setError('Failed to get payment token from server');
          return;
        }

        setPaymentData(responseData);
        console.log('Payment data and JWT obtained successfully');

        // Load Flex library with JWT
        loadFlexLibrary(captureContextJwt);

      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message || 'Failed to initialize payment');
      }
    };

    initializePayment();
  }, []);

  // Load and initialize Flex microform
  const loadFlexLibrary = (jwt) => {
    console.log('Loading Flex library...');

    // Check if Flex is already loaded
    if (window.Flex) {
      console.log('Flex already loaded');
      initializeFlex(jwt);
      return;
    }

    // Load Flex script
    const script = document.createElement('script');
    script.src = 'https://testflex.cybersource.com/microform/bundle/v2.0.2/flex-microform.min.js';
    script.type = 'text/javascript';
    
    script.onload = () => {
      console.log('Flex library loaded successfully');
      // Wait a bit for Flex to be available
      setTimeout(() => {
        if (window.Flex) {
          initializeFlex(jwt);
        } else {
          setError('Flex library loaded but not available globally');
        }
      }, 500);
    };

    script.onerror = () => {
      console.error('Failed to load Flex library');
      setError('Failed to load payment form library');
    };

    document.body.appendChild(script);
  };

  // const initializeFlex = (jwt) => {
  //   console.log('Initializing Flex with JWT...');
  //   console.log('JWT value:', jwt.substring(0, 50) + '...'); // First 50 chars
  //   console.log('JWT length:', jwt?.length);

  //   try {
  //     if (typeof window.Flex !== 'function') {
  //       console.error('window.Flex is not a function:', typeof window.Flex);
  //       setError('Payment library is not properly loaded. Try refreshing the page.');
  //       return;
  //     }

  //     console.log('Calling window.Flex() with JWT...');

  //     // Call Flex with the JWT
  //     const flexPromise = window.Flex(jwt);
  //     console.log('flexPromise:', flexPromise);
      
  //     flexPromise.then((flex) => {
  //       console.log('✅ Flex instance created successfully');
  //       console.log('Flex object:', flex);
  //       console.log('Creating microform fields...');
        
  //       // Create card number field
  //       flex.microform.create('number', {
  //         placeholder: 'Card Number',
  //         maxLength: 19
  //       }).then((el) => {
  //         console.log('Card number field created');
  //         el.attach('#card-number');
  //       }).catch((err) => {
  //         console.error('Error creating card number field:', err);
  //         setError('Failed to create card number field');
  //       });

  //       // Create expiration date field
  //       flex.microform.create('expiration-date', {
  //         placeholder: 'MM/YY'
  //       }).then((el) => {
  //         console.log('Expiration date field created');
  //         el.attach('#expiration-date');
  //       }).catch((err) => {
  //         console.error('Error creating expiration field:', err);
  //         setError('Failed to create expiration field');
  //       });

  //       // Create CVV field
  //       flex.microform.create('cvv', {
  //         placeholder: 'CVV'
  //       }).then((el) => {
  //         console.log('CVV field created');
  //         el.attach('#cvv');
  //       }).catch((err) => {
  //         console.error('Error creating CVV field:', err);
  //         setError('Failed to create CVV field');
  //       });

  //       // Store flex instance for later use
  //       flexInstanceRef.current = flex;
  //       console.log('Flex instance stored');

  //     }).catch((err) => {
  //       console.error('Error initializing Flex (in promise):', err);
  //       console.error('Error message:', err.message);
  //       console.error('Error stack:', err.stack);
  //       setError('Failed to initialize payment form: ' + (err.message || JSON.stringify(err)));
  //     });

  //   } catch (err) {
  //     console.error('Exception in initializeFlex (try-catch):', err);
  //     console.error('Error message:', err?.message);
  //     console.error('Error stack:', err?.stack);
  //     setError('Error: ' + (err?.message || JSON.stringify(err)));
  //   }
  // };

const initializeFlex = (jwt) => {
  try {
    const flex = new window.Flex(jwt);

    const microform = flex.microform({
      styles: {
        input: {
          'font-size': '16px',
          color: '#333',
        },
      },
    });

    // ✅ Card Number
    const cardNumber = microform.createField('number', {
      placeholder: 'Card Number',
    });
    cardNumber.load('#card-number');

    // ✅ CVV (securityCode)
    const cvv = microform.createField('securityCode', {
      placeholder: 'CVV',
    });
    cvv.load('#cvv');

    // Store microform
    flexInstanceRef.current = microform;

    console.log('✅ Secure Acceptance Microform initialized');

  } catch (err) {
    console.error('Flex init failed:', err);
    setError(err.message);
  }
};





  // Step 2: Handle payment submission
  const handlePayment = async (e) => {
    e.preventDefault?.();
    setIsProcessing(true);
    setError(null);

    try {
      if (!flexInstanceRef.current) {
        setError('Payment form not initialized. Please refresh the page.');
        setIsProcessing(false);
        return;
      }

      if (!billingForm.street_1 || !billingForm.city || !billingForm.postal_code) {
        setError('Please fill in all billing details');
        setIsProcessing(false);
        return;
      }

      console.log('Creating token from Flex...');

      // Get transient token from Flex
      flexInstanceRef.current.microform.createToken({}, async (err, token) => {
        if (err) {
          console.error('Token creation failed:', err);
          setError('Failed to tokenize card: ' + err.message);
          setIsProcessing(false);
          return;
        }

        if (!token || !token.token) {
          console.error('No token returned from Flex');
          setError('Failed to generate payment token');
          setIsProcessing(false);
          return;
        }

        console.log('Token created successfully:', token.token);

        // Step 3: Send transient token to backend
        try {
          const authResponse = await fetch('http://localhost:3000/api/payments/authorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transientToken: token.token,
              billingAddress: billingForm
            })
          });

          const authData = await authResponse.json();
          console.log('Authorization response:', authData);

          if (authData.success) {
            // Get tracker token from response
            const trackerToken = authData.data?.tracker?.token;

            if (trackerToken) {
              console.log('Payment authorized, polling for status...');
              // Step 4: Poll for payment status
              pollPaymentStatus(trackerToken);
            } else {
              setError('No tracker token in response');
              setIsProcessing(false);
            }
          } else {
            setError('Payment failed: ' + (authData.error || 'Unknown error'));
            setIsProcessing(false);
          }
        } catch (authError) {
          console.error('Authorization error:', authError);
          setError('Authorization error: ' + authError.message);
          setIsProcessing(false);
        }
      });

    } catch (error) {
      console.error('Payment error:', error);
      setError('Error: ' + error.message);
      setIsProcessing(false);
    }
  };

  // Poll tracker status
  const pollPaymentStatus = async (trackerToken) => {
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      try {
        console.log(`Polling payment status (attempt ${attempts + 1}/${maxAttempts})...`);
        
        const response = await fetch(`http://localhost:3000/api/payments/status/${trackerToken}`);
        const data = await response.json();

        console.log('Status poll response:', data);

        if (data.isPaymentComplete) {
          console.log('✅ Payment successful!');
          setSuccess(true);
          setIsProcessing(false);
          setError(null);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 1000); // Check again in 1 second
        } else {
          setError('Payment status check timed out');
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Status check error:', error);
        setError('Error checking payment status: ' + error.message);
        setIsProcessing(false);
      }
    };

    poll();
  };

  if (!paymentData) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', textAlign: 'center' }}>
        <div style={{ color: '#666' }}>Loading payment form...</div>
        {error && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
            Error: {error}
          </div>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', textAlign: 'center' }}>
        <div style={{ color: 'green', fontSize: '18px', fontWeight: 'bold' }}>
          ✅ Payment Successful!
        </div>
        <p>Your payment has been processed successfully.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc' }}>
      <h2>Payment Form</h2>
      
      {error && (
        <div style={{ padding: '10px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '15px' }}>
          ⚠️ {error}
        </div>
      )}
      
      <div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Card Number</label>
          <div id="card-number" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '40px' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Expiry Date</label>
            <div id="expiration-date" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '40px' }}></div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>CVV</label>
            <div id="cvv" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '40px' }}></div>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Street</label>
          <input
            type="text"
            value={billingForm.street_1}
            onChange={(e) => setBillingForm({ ...billingForm, street_1: e.target.value })}
            placeholder="123 Main St"
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>City</label>
          <input
            type="text"
            value={billingForm.city}
            onChange={(e) => setBillingForm({ ...billingForm, city: e.target.value })}
            placeholder="Islamabad"
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Postal Code</label>
          <input
            type="text"
            value={billingForm.postal_code}
            onChange={(e) => setBillingForm({ ...billingForm, postal_code: e.target.value })}
            placeholder="44000"
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={handlePayment}
          disabled={isProcessing}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: isProcessing ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          {isProcessing ? 'Processing...' : 'Pay PKR 50,000'}
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
        <p><strong>Test Card:</strong> 4111111111111111</p>
        <p><strong>Exp Date:</strong> 12/25</p>
        <p><strong>CVV:</strong> 123</p>
      </div>
    </div>
  );
};