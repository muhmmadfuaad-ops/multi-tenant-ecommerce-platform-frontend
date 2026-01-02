import ngrok from 'ngrok';

(async () => {
  const url = await ngrok.connect({
    proto: 'http',
    addr: 5173
  });

  console.log('ngrok tunnel URL:', url);
})();
