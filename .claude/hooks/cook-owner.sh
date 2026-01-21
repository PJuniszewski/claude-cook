#!/bin/bash
# Hook: Auto-populate cook artifact Owner from git config
# Trigger: PostToolUse on Write tool for cook/*.cook.md files

# Get the file path from the tool input (passed as JSON via stdin)
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only process cook artifact files
if [[ "$FILE_PATH" == *"/cook/"* && "$FILE_PATH" == *".cook.md" ]]; then
    # Get git user info
    GIT_NAME=$(git config user.name 2>/dev/null)
    GIT_EMAIL=$(git config user.email 2>/dev/null)
    GIT_BRANCH=$(git branch --show-current 2>/dev/null)

    if [[ -n "$GIT_NAME" && -n "$GIT_EMAIL" ]] && [[ -f "$FILE_PATH" ]]; then
        OWNER="$GIT_NAME <$GIT_EMAIL>"

        # Replace _TBD_ in Decision Owner with actual git user (cross-platform)
        sed "s/Decision Owner: _TBD_/Decision Owner: $OWNER/" "$FILE_PATH" > "$FILE_PATH.tmp" && mv "$FILE_PATH.tmp" "$FILE_PATH"

        # Add branch info after "## Ownership" line if not already present
        if [[ -n "$GIT_BRANCH" ]] && ! grep -q "Branch:" "$FILE_PATH"; then
            awk -v branch="$GIT_BRANCH" '
                /^## Ownership/ { print; print "- Branch: `" branch "`"; next }
                { print }
            ' "$FILE_PATH" > "$FILE_PATH.tmp" && mv "$FILE_PATH.tmp" "$FILE_PATH"
        fi
    fi
fi

# Always exit success - hook should not block
exit 0
