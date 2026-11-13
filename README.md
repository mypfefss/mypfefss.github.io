# MyPFE

## Run the app

### Frontend
```bash
cd /home/mayna/mypfefss.github.io
python3 -m http.server 8001
```
Open: http://localhost:8001

### Backend
```bash
cd /home/mayna/mypfefss.github.io/backend
source ../.venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
API: http://localhost:8000
