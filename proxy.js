const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/', express.static('.'));  // 대시보드 파일 서빙

app.use('/ollama', createProxyMiddleware({
    target: 'https://api.yeosusquare.cloud',
    changeOrigin: true,
    pathRewrite: { '^/ollama': '' },
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('Origin', 'http://localhost');
    }
}));

app.listen(3000, () => console.log('Proxy running on http://localhost:3000'));