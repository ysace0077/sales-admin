const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

app.use('/', express.static(path.join(__dirname)));

app.use('/ollama', createProxyMiddleware({
    target: 'https://api.yeosusquare.cloud',
    changeOrigin: true,
    pathRewrite: { '^/ollama': '' }
}));

app.listen(3000, () => console.log('Proxy running on http://localhost:3000'));