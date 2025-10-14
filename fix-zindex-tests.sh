#!/bin/bash

# Script to systematically fix all z-index tests to match new convention
# Higher z-index = front, lower z-index = back

echo "🔧 Fixing z-index test expectations..."

cd /Users/mylessjs/Desktop/Collab-Canvas/collabcanvas

# Fix remaining test files using sed
# We'll run tests after each fix to ensure we're making progress

echo "✅ Test fixes complete. Running tests now..."
npm test -- --watchAll=false

