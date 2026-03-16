#!/bin/bash
# Avvia il server Essere se non è già in esecuzione
if ! lsof -ti:8080 > /dev/null 2>&1; then
  cd /home/user/bla/fitness-app
  PORT=8080 nohup /opt/node22/bin/node serve.js >> /tmp/essere-app.log 2>&1 &
fi
