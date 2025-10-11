# Branch Setup with GitHub CLI

This guide shows how to set up the development branch and branch protection rules using the GitHub CLI (`gh`).

## Prerequisites

1. **Install GitHub CLI** (if not already installed):
   ```bash
   # macOS
   brew install gh
   
   # Linux/Windows
   # See: https://cli.github.com/manual/installation
   ```

2. **Authenticate with GitHub**:
   ```bash
   gh auth login
   ```

3. **Verify authentication**:
   ```bash
   gh auth status
   ```

## Setup Commands

### 1. Create Development Branch

```bash
# Create and push the development branch
git checkout -b development
git push -u origin development

# Verify branch was created
gh repo view --json defaultBranchRef
```

### 2. Set Up Branch Protection Rules

```bash
# Enable branch protection for development branch
gh api repos/:owner/:repo/branches/development/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["preview-release"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
  --field restrictions='{"users":[],"teams":[],"apps":[]}' \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

### 3. Alternative: Step-by-Step Branch Protection

If the above command fails, you can set up protection rules step by step:

```bash
# 1. Enable required status checks
gh api repos/:owner/:repo/branches/development/protection/required_status_checks \
  --method PATCH \
  --field strict=true \
  --field contexts='["preview-release"]'

# 2. Enable required pull request reviews
gh api repos/:owner/:repo/branches/development/protection/required_pull_request_reviews \
  --method PATCH \
  --field required_approving_review_count=1 \
  --field dismiss_stale_reviews=true \
  --field require_code_owner_reviews=false

# 3. Enable restrictions (no force pushes)
gh api repos/:owner/:repo/branches/development/protection/restrictions \
  --method PUT \
  --field users='[]' \
  --field teams='[]' \
  --field apps='[]'

# 4. Enable admin enforcement
gh api repos/:owner/:repo/branches/development/protection/enforce_admins \
  --method PATCH \
  --field enabled=true
```

### 4. Verify Branch Protection

```bash
# Check branch protection status
gh api repos/:owner/:repo/branches/development/protection

# List all protected branches
gh api repos/:owner/:repo/branches --jq '.[] | select(.protected == true) | .name'
```

## Complete Setup Script

Here's a complete script that sets up everything:

```bash
#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up development branch and protection rules...${NC}"

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI (gh) is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Not authenticated with GitHub. Please run 'gh auth login' first.${NC}"
    exit 1
fi

# Get repository info
REPO_INFO=$(gh repo view --json owner,name)
REPO_OWNER=$(echo $REPO_INFO | jq -r '.owner.login')
REPO_NAME=$(echo $REPO_INFO | jq -r '.name')

echo -e "${YELLOW}Repository: ${REPO_OWNER}/${REPO_NAME}${NC}"

# Create development branch if it doesn't exist
if git show-ref --verify --quiet refs/heads/development; then
    echo -e "${YELLOW}Development branch already exists locally${NC}"
else
    echo -e "${YELLOW}Creating development branch...${NC}"
    git checkout -b development
fi

# Push development branch
echo -e "${YELLOW}Pushing development branch...${NC}"
git push -u origin development

# Set up branch protection
echo -e "${YELLOW}Setting up branch protection rules...${NC}"
gh api repos/${REPO_OWNER}/${REPO_NAME}/branches/development/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["preview-release"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
  --field restrictions='{"users":[],"teams":[],"apps":[]}' \
  --field allow_force_pushes=false \
  --field allow_deletions=false

echo -e "${GREEN}✅ Development branch and protection rules set up successfully!${NC}"

# Verify setup
echo -e "${YELLOW}Verifying setup...${NC}"
PROTECTION_STATUS=$(gh api repos/${REPO_OWNER}/${REPO_NAME}/branches/development/protection --jq '.required_status_checks.enabled')
if [ "$PROTECTION_STATUS" = "true" ]; then
    echo -e "${GREEN}✅ Branch protection is active${NC}"
else
    echo -e "${RED}❌ Branch protection setup failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Setup complete! You can now push to the development branch to trigger preview releases.${NC}"
```

## Useful GitHub CLI Commands

### Repository Management

```bash
# View repository information
gh repo view

# List all branches
gh api repos/:owner/:repo/branches --jq '.[].name'

# Check branch protection status
gh api repos/:owner/:repo/branches/development/protection

# List workflow runs
gh run list --workflow=preview-release

# View specific workflow run
gh run view <run-id>
```

### Branch Protection Management

```bash
# Disable branch protection (if needed)
gh api repos/:owner/:repo/branches/development/protection --method DELETE

# Update protection rules
gh api repos/:owner/:repo/branches/development/protection \
  --method PATCH \
  --field required_status_checks='{"strict":true,"contexts":["preview-release","build"]}'
```

### Monitoring

```bash
# Check recent releases
gh release list --limit 10

# Check preview releases
gh release list --limit 10 --prerelease

# View workflow status
gh run list --status=in_progress
```

## Troubleshooting

### Common Issues

1. **Permission Denied**:
   ```bash
   # Check your permissions
   gh api user --jq '.login'
   gh api repos/:owner/:repo --jq '.permissions'
   ```

2. **Branch Protection Fails**:
   ```bash
   # Check if branch exists
   gh api repos/:owner/:repo/branches/development
   
   # Check current protection status
   gh api repos/:owner/:repo/branches/development/protection
   ```

3. **Workflow Not Triggering**:
   ```bash
   # Check workflow file syntax
   gh workflow list
   
   # View workflow runs
   gh run list --workflow=preview-release
   ```

### Manual Override

If you need to bypass branch protection temporarily:

```bash
# Disable branch protection
gh api repos/:owner/:repo/branches/development/protection --method DELETE

# Make your changes
git push origin development

# Re-enable protection
# (Use the setup commands above)
```

## Next Steps

After running the setup:

1. **Test the workflow** by making a commit to the development branch
2. **Monitor the workflow** using `gh run list --workflow=preview-release`
3. **Check published packages**:
   - Node.js: `npm view @kadoa/node-sdk versions --json`
   - Python: `pip index versions kadoa_sdk`
