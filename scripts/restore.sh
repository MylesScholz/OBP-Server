#!/bin/bash

# MongoDB Restore Script
# Restores from the latest backup and drops existing collections

set -e

BACKUP_DIR="/backups/latest"
LOG_FILE="/backups/restore.log"

echo "$(date) - Starting MongoDB restore from latest backup..." | tee -a "${LOG_FILE}"

# Check if backup exists
if [ ! -d "${BACKUP_DIR}" ]; then
  echo "$(date) - ERROR: No backup found at ${BACKUP_DIR}" | tee -a "${LOG_FILE}"
  exit 1
fi

# Wait for MongoDB to be ready
echo "$(date) - Waiting for MongoDB to be ready..." | tee -a "${LOG_FILE}"
until mongosh --host="${MONGO_HOST}" --port="${MONGO_PORT}" \
  --username="${MONGO_USER}" --password="${MONGO_PASSWORD}" \
  --authenticationDatabase=${MONGO_DB} --eval "db.adminCommand('ping')" > /dev/null 2>&1
do
  echo "$(date) - MongoDB not ready, waiting..." | tee -a "${LOG_FILE}"
  sleep 2
done

echo "$(date) - MongoDB is ready. Starting restore with --drop flag..." | tee -a "${LOG_FILE}"

# Restore with --drop flag to overwrite existing data
mongorestore \
  --host="${MONGO_HOST}" \
  --port="${MONGO_PORT}" \
  --username="${MONGO_USER}" \
  --password="${MONGO_PASSWORD}" \
  --authenticationDatabase=${MONGO_DB} \
  --drop \
  "${BACKUP_DIR}" 2>&1 | tee -a "${LOG_FILE}"

if [ $? -eq 0 ]; then
  echo "$(date) - Restore completed successfully!" | tee -a "${LOG_FILE}"
else
  echo "$(date) - Restore failed!" | tee -a "${LOG_FILE}"
  exit 1
fi