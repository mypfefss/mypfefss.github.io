// Use the local backend on localhost, and FastAPI Cloud in production.
const API_BASE = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
    ? 'http://127.0.0.1:8000'
    : 'https://mypfe.fastapicloud.dev';
