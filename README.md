# GIDD Dashboard

React client for GIDD Dashboard

## Getting started

### Create .env file

```bash
The .env file requires these variables to be set:

```bash
NODE_ENV= # (auto-set: development, production, test)
REACT_APP_ENV=your_env # (required: dev,nightly,alpha,beta,prod)
REACT_APP_SENTRY_DSN=your_sentry_dsn # (optional)
REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_token # (optional)
REACT_APP_MMP_ENDPOINT=your_mmp_endpoint # (optional)
```

### Run

```
# Run docker-container and automatically install all depedencies
docker-compose up
