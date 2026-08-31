const express = require('express');
const cors = require('cors');

const app = express();

const PORT = 3000;

app.use(cors({
  origin: 'http://localhost:8080',
}));

app.use(express.json());

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MINEXA API',
    message: 'Backend is running successfully',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`MINEXA API running on http://localhost:${PORT}`);
});