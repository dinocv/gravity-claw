#!/usr/bin/env bash
# skill-guard: Scan skills for security issues before installing
# Usage: safe-install.sh <skill-slug> [--version <ver>] [--force] [--skip-scan]

set -euo pipefail

SKILL_SLUG=""
VERSION_ARG=""
FORCE_ARG=""
SKIP_SCAN=false
DRY_RUN=false
JSON_OUTPUT=false
STAGING_DIR="/tmp/skill-guard-staging"
SKILLS_DIR="${CLAWHUB_WORKDIR:-$HOME/.openclaw/workspace}/skills"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_error() { echo -e "${RED}ERROR:${NC} $1" >&2; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}→${NC} $1"; }

# Output JSON results to stdout, diagnostics to stderr
output_json() {
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        echo "$1"
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            VERSION_ARG="--version $2"
            shift 2
            ;;
        --force)
            FORCE_ARG="--force"
            shift
            ;;
        --skip-scan)
            SKIP_SCAN=true
            shift
            ;;
        --dry-run|-n)
            DRY_RUN=true
            shift
            ;;
        --json|-j)
            JSON_OUTPUT=true
            shift
            ;;
        --help|-h)
            echo "skill-guard: Secure skill installation with pre-install scanning"
            echo ""
            echo "Usage: safe-install.sh <skill-slug> [options]"
            echo ""
            echo "Options:"
            echo "  --version <ver>  Install specific version"
            echo "  --force          Overwrite existing installation"
            echo "  --skip-scan      Skip security scan (not recommended)"
            echo "  --dry-run,-n     Preview what would be installed without making changes"
            echo "  --json,-j        Output results as JSON to stdout"
            echo "  --help           Show this help"
            echo ""
            echo "Environment:"
            echo "  CLAWHUB_WORKDIR  Skills parent directory (default: ~/.openclaw/workspace)"
            echo ""
            echo "Exit Codes:"
            echo "  0  Success - skill installed"
            echo "  1  Error - check dependencies/network"
            echo "  2  Threats found - skill quarantined in /tmp/"
            echo ""
            echo "Examples:"
            echo "  safe-install.sh my-skill                    # Install with scan"
            echo "  safe-install.sh my-skill --dry-run          # Preview without installing"
            echo "  safe-install.sh my-skill --json            # JSON output for automation"
            echo "  safe-install.sh my-skill --version 1.2.3  # Specific version"
            exit 0
            ;;
        -*)
            print_error "Unknown option: $1"
            exit 1
            ;;
        *)
            SKILL_SLUG="$1"
            shift
            ;;
    esac
done

if [[ -z "$SKILL_SLUG" ]]; then
    print_error "No skill slug provided"
    echo "Usage: safe-install.sh <skill-slug> [--version <ver>] [--force]"
    echo "Run with --help for full usage information"
    output_json '{"status":"error","code":"MISSING_SLUG","message":"No skill slug provided"}'
    exit 1
fi

# Check dependencies
check_deps() {
    if ! command -v clawhub &> /dev/null; then
        print_error "clawhub CLI not found. Install with: npm i -g clawhub"
        exit 1
    fi
    
    if ! command -v uvx &> /dev/null; then
        # Try sourcing uv env
        if [[ -f "$HOME/.local/bin/env" ]]; then
            source "$HOME/.local/bin/env"
        fi
        if ! command -v uvx &> /dev/null; then
            print_error "uvx not found. Install uv with: curl -LsSf https://astral.sh/uv/install.sh | sh"
            exit 1
        fi
    fi
}

# Download skill to staging
stage_skill() {
    print_info "Fetching $SKILL_SLUG to staging area..."
    
    rm -rf "$STAGING_DIR/skills/$SKILL_SLUG"
    mkdir -p "$STAGING_DIR"
    
    # Install to staging directory (clawhub creates skills/<slug> under workdir)
    if ! clawhub install "$SKILL_SLUG" $VERSION_ARG --workdir "$STAGING_DIR" 2>&1; then
        print_error "Failed to fetch skill from ClawHub"
        exit 1
    fi
    
    # clawhub installs to <workdir>/skills/<slug>
    if [[ ! -d "$STAGING_DIR/skills/$SKILL_SLUG" ]]; then
        print_error "Skill not found in staging after download"
        exit 1
    fi
    
    print_success "Skill staged at $STAGING_DIR/skills/$SKILL_SLUG"
}

# Run mcp-scan
scan_skill() {
    print_info "Scanning $SKILL_SLUG for security issues..."
    echo ""
    
    local scan_output
    local scan_exit_code=0
    local staged_path="$STAGING_DIR/skills/$SKILL_SLUG"
    
    # Run mcp-scan and capture output
    scan_output=$(uvx mcp-scan@latest --skills "$staged_path" 2>&1) || scan_exit_code=$?
    
    echo "$scan_output"
    echo ""
    
    # Check for issues in output (mcp-scan reports vulnerabilities, injections, etc.)
    if echo "$scan_output" | grep -Eqi "vulnerability|injection|malware|secret found|unsafe|high risk|medium risk|critical"; then
        return 1  # Issues found
    fi
    
    if [[ $scan_exit_code -ne 0 ]]; then
        print_warning "Scanner returned non-zero exit code: $scan_exit_code"
        return 1
    fi
    
    return 0  # Clean
}

# Install from staging to final location
install_skill() {
    print_info "Installing $SKILL_SLUG to $SKILLS_DIR..."
    
    mkdir -p "$SKILLS_DIR"
    local staged_path="$STAGING_DIR/skills/$SKILL_SLUG"
    
    if [[ -d "$SKILLS_DIR/$SKILL_SLUG" ]]; then
        if [[ -n "$FORCE_ARG" ]]; then
            rm -rf "$SKILLS_DIR/$SKILL_SLUG"
        else
            print_error "Skill already exists at $SKILLS_DIR/$SKILL_SLUG (use --force to overwrite)"
            exit 1
        fi
    fi
    
    mv "$staged_path" "$SKILLS_DIR/"
    
    print_success "Installed $SKILL_SLUG to $SKILLS_DIR/$SKILL_SLUG"
}

# Cleanup staging
cleanup() {
    rm -rf "$STAGING_DIR/skills/$SKILL_SLUG" 2>/dev/null || true
}

# Main flow
main() {
    echo ""
    echo "╔══════════════════════════════════════════════╗"
    echo "║  skill-guard: Secure Skill Installation      ║"
    echo "╚══════════════════════════════════════════════╝"
    echo ""
    
    check_deps
    
    # Dry-run mode: just validate and show what would happen
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "Dry-run mode: validating without making changes"
        echo ""
        
        # Validate skill slug format
        if [[ ! "$SKILL_SLUG" =~ ^[a-z0-9_-]+$ ]]; then
            print_error "Invalid skill slug format: $SKILL_SLUG"
            print_error "Slug must contain only lowercase letters, numbers, underscores, and hyphens"
            output_json '{"status":"error","code":"INVALID_SLUG","message":"Invalid skill slug format"}'
            exit 1
        fi
        
        print_success "Dry-run validation passed for: $SKILL_SLUG"
        echo ""
        echo "Would perform:"
        echo "  1. Download skill to staging: $STAGING_DIR/skills/$SKILL_SLUG"
        echo "  2. Scan with mcp-scan for security issues"
        echo "  3. Install to: $SKILLS_DIR/$SKILL_SLUG"
        
        if [[ "$SKIP_SCAN" == "true" ]]; then
            echo "  4. [SKIP-SCAN] Security scan would be bypassed"
        fi
        echo ""
        print_success "Dry-run complete - no changes made"
        output_json '{"status":"dry_run","message":"Validation passed, no changes made"}'
        exit 0
    fi
    
    stage_skill
    
    if [[ "$SKIP_SCAN" == "true" ]]; then
        print_warning "Skipping security scan (--skip-scan)"
        install_skill
        cleanup
        echo ""
        print_success "Installation complete (scan skipped)"
        output_json '{"status":"success","skill":"'"$SKILL_SLUG"'","message":"Installation complete (scan skipped)","scan_skipped":true}'
        exit 0
    fi
    
    if scan_skill; then
        print_success "No security issues detected"
        install_skill
        cleanup
        echo ""
        print_success "Installation complete"
        output_json '{"status":"success","skill":"'"$SKILL_SLUG"'","message":"Installation complete"}'
        exit 0
    else
        echo ""
        print_warning "Security issues detected in $SKILL_SLUG"
        echo ""
        echo "The skill has been staged but NOT installed."
        echo "Staged location: $STAGING_DIR/skills/$SKILL_SLUG"
        echo ""
        echo "Options:"
        echo "  1. Review the issues above and decide if they're acceptable"
        echo "  2. Run: mv $STAGING_DIR/skills/$SKILL_SLUG $SKILLS_DIR/ to install anyway"
        echo "  3. Run: rm -rf $STAGING_DIR/skills/$SKILL_SLUG to discard"
        echo ""
        output_json '{"status":"threats_found","skill":"'"$SKILL_SLUG"'","message":"Security issues detected","staged_path":"'"$STAGING_DIR/skills/$SKILL_SLUG"'"}'
        exit 2  # Exit code 2 = issues found, not installed
    fi
}

main
