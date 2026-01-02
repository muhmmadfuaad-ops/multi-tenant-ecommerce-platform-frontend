import React, { useState, useEffect, useRef } from 'react';

export const RedirectComponent = () => {

  // Step 1: Initialize payment
  // useEffect(() => {
  //   const initializePayment = async () => {
  //     try {
        
  //       // Call your backend
  //       const response = await fetch('http://localhost:3000/payments/redirect', {
  //         method: 'GET',
  //         headers: { 'Content-Type': 'application/json' }
  //       });

  //       const data = await response.json();
  //       window.location.href = 'http://localhost:3000/redirect';

  //     } catch (err) {
  //       console.error('Initialization error:', err);
  //     }
  //   };

  //   initializePayment();
  // }, []);

  useEffect(() => {
  window.location.href = 'http://localhost:3000/payments/redirect';
}, []);


  return (
    <></>
  );
};