#!/bin/bash

# MongoDB Backup Script
# Creates a backup and keeps only the latest one

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups"
TEMP_BACKUP="${BACKUP_DIR}/mongo_backup_${TIMESTAMP}"
LATEST_BACKUP="${BACKUP_DIR}/latest"
LOG_FILE="${BACKUP_DIR}/backup.log"

echo "$(date) - Starting MongoDB backup..." | tee -a "${LOG_FILE}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Perform the backup
mongodump \
  --host="${MONGO_HOST}" \
  --port="${MONGO_PORT}" \
  --username="${MONGO_USER}" \
  --password="${MONGO_PASSWORD}" \
  --authenticationDatabase=${MONGO_DB} \
  --out="${TEMP_BACKUP}" 2>&1 | tee -a "${LOG_FILE}"

if [ $? -eq 0 ]; then
  echo "$(date) - Backup created successfully at ${TEMP_BACKUP}" | tee -a "${LOG_FILE}"
  
  # Remove old 'latest' backup
  if [ -d "${LATEST_BACKUP}" ]; then
    echo "$(date) - Removing old backup..." | tee -a "${LOG_FILE}"
    rm -rf "${LATEST_BACKUP}"
  fi
  
  # Move new backup to 'latest'
  mv "${TEMP_BACKUP}" "${LATEST_BACKUP}"
  echo "$(date) - Backup moved to ${LATEST_BACKUP}" | tee -a "${LOG_FILE}"
  
  # Clean up any other old backups
  find "${BACKUP_DIR}" -maxdepth 1 -type d -name "mongo_backup_*" -exec rm -rf {} \;
  
  echo "$(date) - Backup completed successfully!" | tee -a "${LOG_FILE}"
else
  echo "$(date) - Backup failed!" | tee -a "${LOG_FILE}"
  exit 1
fi