#!/bin/sh

echo 'init-mongo.sh running...'

set -e

mongosh --username root --password Practicalstoragesystem --authenticationDatabase admin <<EOF

use api-backend

db.createUser({
    user: 'api-server',
    pwd: 'Practicalstoragesystem',
    roles: [ { role: "readWrite", db: 'api-backend' }]
})