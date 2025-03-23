
// Required modules
const express = require('express');
const fs = require('fs');
const path = require('path');
const validUrl = require('valid-url');
const qr = require('qr-image');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Middleware and view engine setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Load stored URLs from file
const urlFilePath = path.join(__dirname, 'urls.json');
let urlDatabase = {};
if (fs.existsSync(urlFilePath)) {
  urlDatabase = JSON.parse(fs.readFileSync(urlFilePath));
}

// ✅ Function to generate 9-character short codes
function generateCustomShortCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${result.slice(0, 3)}-${result.slice(3, 6)}-${result.slice(6, 9)}`;
}

// ✅ Function to check if the request is from an API client (like Postman)
function isApiRequest(req) {
  return req.headers['user-agent'] && req.headers['user-agent'].includes('Postman');
}

// 🏠 Home page with URL input
app.get('/', (req, res) => {
  res.render('index', { shortUrl: null, qrCode: null, error: null });
});

// 🔗 Handle URL shortening
app.post('/shorten', (req, res) => {
  const longUrl = req.body.url;

  // Validate URL
  if (!validUrl.isUri(longUrl)) {
    if (isApiRequest(req)) {
      return res.status(400).json({ success: false, error: 'Invalid URL' });
    }
    return res.render('index', { shortUrl: null, qrCode: null, error: 'Invalid URL' });
  }

  // Generate short URL
  const shortCode = generateCustomShortCode();
  const shortUrl = `http://localhost:${PORT}/${shortCode}`;

  // Save URL to database
  urlDatabase[shortCode] = longUrl;
  fs.writeFileSync(urlFilePath, JSON.stringify(urlDatabase));

  // Generate QR Code
  const qrCode = qr.imageSync(shortUrl, { type: 'png' }).toString('base64');

  // JSON response for API clients like Postman
  if (isApiRequest(req)) {
    return res.json({ success: true, shortUrl, qrCode, shortCode, longUrl });
  }

  // Render EJS page for browser requests
  res.render('index', { shortUrl, qrCode, error: null });
});

// 🔀 Get Long URL from Short Code or Redirect
app.get('/:code', (req, res) => {
  const shortCode = req.params.code;
  const longUrl = urlDatabase[shortCode];

  console.log("Short code requested:", shortCode);

  if (longUrl) {
    if (isApiRequest(req)) {
      return res.json({ success: true, shortCode, longUrl });
    }
    res.redirect(longUrl);
  } else {
    if (isApiRequest(req)) {
      return res.status(404).json({ success: false, error: 'URL not found' });
    }
    res.render('index', { shortUrl: null, qrCode: null, error: 'URL not found' });
  }
});

// 📜 API to get all stored URLs
app.get('/api/urls', (req, res) => {
  res.json({ success: true, urls: urlDatabase });
});

// 🚀 Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
