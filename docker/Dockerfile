FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements /app/requirements
RUN pip install --no-cache-dir -r requirements/prod.txt
COPY . /app
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
