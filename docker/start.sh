#!/bin/bash

cd /home/user/voi-js-client

# Uncomment to generate a self-signed certificate
# mkcert -install
# mkcert -key-file key.pem -cert-file cert.pem localhost

npm install
npm run serve