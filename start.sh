#!/bin/bash
cd "$(dirname "$0")"
npx next dev -p 8088 -H 0.0.0.0
