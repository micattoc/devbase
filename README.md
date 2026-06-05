# <img height="35" src="https://github.com/user-attachments/assets/f34c054d-998b-4b5d-a047-6dbdb0bd6247" /> Devbase 

Devbase helps developers review risks before making changes in code, by querying repo history from GitHub issues and pull requests in a <ins>RAG system</ins>.

It uses <ins>eval gates</ins> in a workflow runner so that teams can continue to update and refer to repo data in the continuously reliable RAG.

#### Built using:
[![LangGraph](https://img.shields.io/badge/-Lang--Graph-88c7fd?style=for-the-badge)](https://www.langchain.com/langgraph)
[![Hugging Face](https://img.shields.io/badge/-Hugging--Face-fbd33a?style=for-the-badge)](https://huggingface.co/docs)
[![n8n](https://img.shields.io/badge/-n8n-e34c74?style=for-the-badge)](https://docs.n8n.io)
[![LightRAG](https://img.shields.io/badge/-LightRAG-89e051?style=for-the-badge)](https://github.com/hkuds/lightrag)
[![Presidio](https://img.shields.io/badge/-Presidio-ea5330?style=for-the-badge)](https://github.com/microsoft/presidio)
[![FastAPI](https://img.shields.io/badge/-Fast--API-2f988a?style=for-the-badge)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/-React-8acff3?style=for-the-badge)](https://react.dev)
[![Docker](https://img.shields.io/badge/-Docker-375efb?style=for-the-badge)](https://www.docker.com)

<br><br>

## Demo 
#### 🡳 Click image to watch demonstration + instructions for setup
<br>
<kbd>
    <a href="https://youtu.be/rkbrAXk-rWw"> 
        <img src="https://github.com/user-attachments/assets/e8b9de1d-cdd8-41d2-bb6c-918537143747" alt="Description" width="1000">
    </a>
</kbd>

<br><br>

## Tech Stack

| AI Orchestration      | API & Web         | Eval & Monitoring  |
| --------- |-------------| ------------- |
| <ul><li>**LangGraph** -> workflow orchestration</li><li>**Hugging Face** -> LLM and embedding models</li><li>**LightRAG** -> RAG storage/retrieval</li><li>**Presidio** -> prompt-injection screening</li></ul> | <ul><li>**Python** -> FastAPI REST</li><li>**React** -> Vite, Chakra UI</li><li>**Docker** ->runs n8n container</li></ul> | <ul><li>**n8n** -> eval workflow </li><li>**Braintrust** -> observability</li></ul>

<br>

## Architecture

```mermaid
flowchart TB
    User["Developer"]
    CLI["Local setup CLI<br/>(set builder, n8n setup)"]
    UI["Devbase UI"]
    API["Backend API<br/>(FastAPI, LangGraph)"]
    GitHub["Repo Data<br/>(GitHub issues + PRs)"]
    RAG["RAG Storage<br/>(LightRAG, Hugging Face, Presidio)"]
    Gate["Quality Gate<br/>(n8n workflow)"]

    User --> UI
    UI --> API
    API --> RAG
    RAG --> API
    API --> UI

    User -.-> CLI
    CLI -.-> Gate

    API ==>|fetch| GitHub
    GitHub ==>|ingest| RAG
    API ==>|evaluate| Gate
    Gate ==>|promote new data| RAG

    linkStyle 0,1,2,3,4 stroke:#2563eb,stroke-width:2px
    linkStyle 5,6 stroke:#6b7280,stroke-width:2px,stroke-dasharray:5 5
    linkStyle 7,8,9,10 stroke:#16a34a,stroke-width:3px
```

# Setup Instructions

## Configure Environment

Create your local `.env` file from the template:

```cmd
copy .env.example .env
```

### Required

- `HF_TOKEN`: required for LightRAG to call Hugging Face LLM and embedding models.

### Optional
- `GITHUB_TOKEN`: needed for private repos or higher GitHub API rate limits
- `BRAINTRUST_API_KEY`: enables eval logging/monitoring

### Modifiable

- `HF_LLM_MODEL`: Hugging Face chat model used for report generation
- `HF_EMBEDDING_MODEL`: Hugging Face embedding model used by LightRAG
- `HF_PROVIDER`: Hugging Face inference provider. Keep `auto` unless you need a specific provider

<br>

## Install Dependencies

From the project root, install dependencies:

```cmd
pip install -r requirements.txt
```

<br>

## Build Golden Set
Golden set cases are repo-scoped. The file: `golden_test_set.jsonl` contains cases for each repo that has been fetched using Devbase. 

- The eval process only uses cases for the repo being updated.
- Rebuilding for the same repo replaces that repo's cases and keeps cases for other repos.

<br>

> [!NOTE]
> A specific repo's <ins>golden set</ins> contains data pairs, each consisting of:
> 1. example case of your proposed code change
> 2. the sources that the RAG should cite

<br>

### Run the builder:

```cmd
python -m scripts.build_golden_set
```

The CLI asks for:

- `Repository owner/repo`: target repo, for example `micattoc/devbase`
- `Issues to fetch`: number of issue records
- `Pull requests to fetch`: number of PR records

<br>

For each generated candidate (records that have a `score` of `3+`):

- `y`: approve case
- `n`: reject case
- `e`: edit prompt before saving
- `q`: stop review

<br>

> [!NOTE]
> Candidate `score` is a heuristic (calculated when record is fetched):
> - `+1` when title/body contains high-signal words like `bug`, `regression`, `breaking`, `compatibility`, `fix`, `route`, `request`, or `body`
> - `+2` when labels contain those high-signal words
> - `+1` when the record is an issue or pull request
> - `+3` when the text links to another GitHub record with `fixes`, `closes`, or `resolves #...`
> - `+1` when the record has a URL
> 
> Higher score means the record is more likely to become a useful eval case.
> 
> The CLI shows up to 10 candidates, ranked by score, after dropping records below the minimum score threshold of `3`.

<br>

## Setup n8n Workflow

n8n runs the eval process: golden set evalution, promote staging RAG data only if eval passes, then return the result to Devbase.

> [!IMPORTANT]
> Prerequisites:
> - Docker is running
> - Golden set exists for the repo you want to update
> - FastAPI is available at `http://host.docker.internal:8000` when the workflow runs
> - Registered an account in n8n

<br>

### Run setup from the project root:

```cmd
bash scripts/setup_n8n.sh
```

The script will start `devbase_n8n` Docker container with an imported `n8n` workflow that is automatically published as a production webhook at:
```text
http://localhost:5678/webhook/kb-updated
```

You can view and modify the `n8n` workflow executions + stages at:
```text
http://localhost:5678
```


<br>

## Run Devbase

### Run backend

From the project root:
```cmd
uvicorn api.rest_api:app --reload --port 8000
```

### Run the UI

In a second terminal:
```cmd
cd web
npm run dev
```

### Open on browser

```text
http://localhost:5173
```

---
<div align="center">
    <img height="35" src="https://github.com/user-attachments/assets/f34c054d-998b-4b5d-a047-6dbdb0bd6247"
</div>

<p align="center">
    Developed by
</p>

<div align="center"> 

[![Author](https://img.shields.io/badge/-Sophia--Halapchuk-9ae0d0?style=flat-square)](https://www.linkedin.com/in/sophia-halapchuk)
[![Author](https://img.shields.io/badge/-@micattoc-eebc81?style=flat-square)](https://github.com/micattoc)

</div>




