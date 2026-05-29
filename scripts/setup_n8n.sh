#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="devbase_n8n"
WORKFLOW_NAME="Devbase Eval Gate"
WORKFLOW_FILE="/workflow/n8n_quality_gate.json"
EXPORT_FILE="/tmp/devbase_n8n_workflows.json"

echo "Starting n8n..."
docker compose up -d n8n

echo "Waiting for n8n container..."
sleep 8

echo "Importing workflow: ${WORKFLOW_NAME}"
docker exec -u node "${CONTAINER_NAME}" n8n import:workflow --input="${WORKFLOW_FILE}"

echo "Exporting workflows to find imported workflow ID..."
docker exec -u node "${CONTAINER_NAME}" n8n export:workflow --all --output="${EXPORT_FILE}"

WORKFLOW_ID="$(
  docker exec -u node "${CONTAINER_NAME}" node -e "
    const fs = require('fs');

    const workflowName = process.argv[1];
    const exportPath = process.argv[2];

    const raw = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    const workflows = Array.isArray(raw) ? raw : raw.workflows || [];

    const matches = workflows.filter((workflow) => workflow.name === workflowName);

    if (matches.length === 0) {
      console.error('No workflow found with name: ' + workflowName);
      process.exit(1);
    }

    matches.sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    console.log(matches[0].id);
  " "${WORKFLOW_NAME}" "${EXPORT_FILE}"
)"

if [[ -z "${WORKFLOW_ID}" ]]; then
  echo "Could not find workflow ID for ${WORKFLOW_NAME}."
  exit 1
fi

echo "Found workflow ID: ${WORKFLOW_ID}"

echo "Publishing workflow..."
if ! docker exec -u node "${CONTAINER_NAME}" n8n publish:workflow --id="${WORKFLOW_ID}"; then
  echo "publish:workflow failed. Trying legacy activation command..."
  docker exec -u node "${CONTAINER_NAME}" n8n update:workflow --id="${WORKFLOW_ID}" --active=true
fi

echo "Restarting n8n so webhook registration takes effect..."
docker compose restart n8n

echo
echo "n8n setup complete."
echo "Production webhook:"
echo "http://localhost:5678/webhook/kb-updated"