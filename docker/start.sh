#!/bin/bash

# Uncomment to generate a self-signed certificate
# mkcert -install
# mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 ::1 *.localhost 0.0.0.0

cd /home/user/voi-js-client
npm install
npm run serve