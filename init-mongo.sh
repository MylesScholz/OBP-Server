#!/bin/sh

echo 'init-mongo.sh running...'

set -e

mongosh --username $MONGO_INITDB_ROOT_USERNAME --password $MONGO_INITDB_ROOT_PASSWORD --authenticationDatabase admin <<EOF

use $MONGO_DB

db.createUser({
    user: $MONGO_USER,
    pwd: $MONGO_PASSWORD,
    roles: [ { role: "readWrite", db: $MONGO_DB }]
})