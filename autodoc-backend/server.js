require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./configuration/db');

const app = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());
console.log("api is running");
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pdfs', require('./routes/pdfs'));
app.use('/api/annotations', require('./routes/annotations'));



// Health check
app.get('/', (req, res) => res.send('AutoDoc API is running'));

app.listen(port, () => {
  console.log(`🚀 Server listening on http://localhost:${port}`);
});
