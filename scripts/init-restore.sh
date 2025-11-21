#!/bin/bash

# Initialize and restore MongoDB if empty
# This runs once when the container starts

set -e

BACKUP_DIR="/backups/latest"
LOG_FILE="/backups/init-restore.log"

echo "$(date) - Checking if database needs initialization..." | tee -a "${LOG_FILE}"

# Wait a moment for MongoDB to fully start
sleep 5

# Check if the main database has any collections (excluding system collections)
COLLECTION_COUNT=$(mongosh --quiet --eval "
  db.getSiblingDB('${MONGO_DB}').getCollectionNames().filter(c => !c.startsWith('system.')).length
")

echo "$(date) - Found ${COLLECTION_COUNT} collections in ${MONGO_DB}" | tee -a "${LOG_FILE}"

if [ "${COLLECTION_COUNT}" -eq "0" ]; then
  echo "$(date) - Database has no collections. Checking for backup..." | tee -a "${LOG_FILE}"
  
  if [ -d "${BACKUP_DIR}" ]; then
    echo "$(date) - Backup found. Restoring..." | tee -a "${LOG_FILE}"
    
    mongorestore \
      --host=localhost \
      --port=27017 \
      --username="${MONGO_INITDB_ROOT_USERNAME}" \
      --password="${MONGO_INITDB_ROOT_PASSWORD}" \
      --authenticationDatabase=${MONGO_DB} \
      "${BACKUP_DIR}" 2>&1 | tee -a "${LOG_FILE}"
    
    if [ $? -eq 0 ]; then
      echo "$(date) - Automatic restore completed successfully!" | tee -a "${LOG_FILE}"
    else
      echo "$(date) - Automatic restore failed!" | tee -a "${LOG_FILE}"
    fi
  else
    echo "$(date) - No backup found to restore. Starting with empty database." | tee -a "${LOG_FILE}"
  fi
else
  echo "$(date) - Database has collections. Skipping automatic restore." | tee -a "${LOG_FILE}"
fi