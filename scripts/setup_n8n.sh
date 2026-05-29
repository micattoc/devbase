#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="devbase_n8n"
WORKFLOW_NAME="Devbase Eval Gate"
WORKFLOW_FILE="/workflows/n8n_quality_gate.json"
IMPORT_FILE="/tmp/devbase_n8n_quality_gate_import.json"
EXPORT_FILE="/tmp/devbase_n8n_workflows.json"

echo "Starting n8n..."
docker compose up -d n8n

echo "Waiting for n8n container..."
sleep 8

echo "Preparing workflow import file..."
WORKFLOW_ID="$(
  docker exec -u node "${CONTAINER_NAME}" node -e "
    const fs = require('fs');
    const crypto = require('crypto');

    const workflowName = process.argv[1];
    const inputPath = process.argv[2];
    const outputPath = process.argv[3];

    const workflow = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    const hash = crypto
      .createHash('sha1')
      .update(workflowName)
      .digest('hex')
      .slice(0, 12);

    workflow.id = 'devbase_' + hash;
    workflow.name = workflowName;
    workflow.active = false;

    delete workflow.versionId;
    delete workflow.meta;

    fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
    console.log(workflow.id);
  " "${WORKFLOW_NAME}" "${WORKFLOW_FILE}" "${IMPORT_FILE}"
)"

if [[ -z "${WORKFLOW_ID}" ]]; then
  echo "Could not prepare workflow ID."
  exit 1
fi

echo "Workflow ID: ${WORKFLOW_ID}"

echo "Checking whether workflow already exists..."
docker exec -u node "${CONTAINER_NAME}" n8n export:workflow --all --output="${EXPORT_FILE}" >/dev/null

WORKFLOW_EXISTS="$(
  docker exec -u node "${CONTAINER_NAME}" node -e "
    const fs = require('fs');

    const workflowId = process.argv[1];
    const exportPath = process.argv[2];

    const raw = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    const workflows = Array.isArray(raw) ? raw : raw.workflows || [];

    console.log(workflows.some((workflow) => workflow.id === workflowId) ? 'yes' : 'no');
  " "${WORKFLOW_ID}" "${EXPORT_FILE}"
)"

if [[ "${WORKFLOW_EXISTS}" == "yes" ]]; then
  echo "Workflow already exists. Skipping import."
else
  echo "Importing workflow: ${WORKFLOW_NAME}"
  docker exec -u node "${CONTAINER_NAME}" n8n import:workflow --input="${IMPORT_FILE}"
fi

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