import fetch from 'node-fetch';
import fs from 'fs';

const testBuffer = Buffer.from([0, 1, 2, 3, 4, 5, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210]);

const formData = new FormData();
formData.append('audio', new Blob([testBuffer]), 'test.webm');
formData.append('language', 'rw');

try {
  const response = await fetch('http://localhost:3001/api/speech/recognize', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  console.log('API Response:', JSON.stringify(data, null, 2));
  console.log('SUCCESS: API is working!');
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
