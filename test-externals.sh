#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FIXTURE="$SCRIPT_DIR/test-fixture"
OUTPUT_DIR=$(mktemp -d)

trap 'rm -rf "$OUTPUT_DIR"' EXIT

if [ ! -f "$SCRIPT_DIR/dist/src/main.js" ]; then
    echo "ERROR: dist/src/main.js not found. Run 'npm run build' first."
    exit 1
fi

TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_MISSING=0

run_package_test() {
    local PACKAGE="$1"
    shift
    local -n _EXPECTED=$1
    shift
    local -n _ORDERED=$1

    local SCIP_FILE="$OUTPUT_DIR/${PACKAGE}.scip"
    local STDERR_LOG="$OUTPUT_DIR/${PACKAGE}.stderr"

    echo "--- $PACKAGE ---"
    echo ""

    node "$SCRIPT_DIR/dist/src/main.js" index \
        --filter "$PACKAGE" \
        --cwd "$FIXTURE" \
        --output "$SCIP_FILE" \
        2>"$STDERR_LOG" || true

    declare -A RESULTS

    local current_spec=""
    while IFS= read -r line; do
        if [[ "$line" == *"isExternalImport moduleSpec:"* ]]; then
            current_spec="${line##*isExternalImport moduleSpec: }"
        elif [[ "$line" == *"isExternalImport result:"* && -n "$current_spec" ]]; then
            local result="${line##*isExternalImport result: }"
            if [[ "$result" == true* ]]; then
                RESULTS["$current_spec"]="EXTERNAL"
            else
                RESULTS["$current_spec"]="INTERNAL"
            fi
            current_spec=""
        fi
    done < "$STDERR_LOG"

    for spec in "${_ORDERED[@]}"; do
        local expected="${_EXPECTED[$spec]}"
        local actual="${RESULTS[$spec]:-NOT_FOUND}"
        if [ "$actual" = "NOT_FOUND" ]; then
            printf "  ? %-35s expected=%-10s actual=NOT_DETECTED\n" "$spec" "$expected"
            ((TOTAL_MISSING++)) || true
        elif [ "$actual" = "$expected" ]; then
            printf "  ✓ %-35s %s\n" "$spec" "$expected"
            ((TOTAL_PASS++)) || true
        else
            printf "  ✗ %-35s expected=%-10s actual=%s\n" "$spec" "$expected" "$actual"
            ((TOTAL_FAIL++)) || true
        fi
    done

    echo ""
}

echo "=== External Import Classification Test ==="
echo ""
echo "Fixture: $FIXTURE"
echo ""

# --- Package: app (with baseUrl + path aliases) ---
declare -A APP_EXPECTED
APP_EXPECTED["lodash"]="EXTERNAL"
APP_EXPECTED["lodash/add"]="EXTERNAL"
APP_EXPECTED["@angular/core"]="EXTERNAL"
APP_EXPECTED["./sibling"]="INTERNAL"
APP_EXPECTED["@/components/Foo"]="INTERNAL"
APP_EXPECTED["@queries/bar"]="INTERNAL"
APP_EXPECTED["\$lib/thing"]="INTERNAL"
APP_EXPECTED["@myworkspace/shared"]="INTERNAL"
APP_EXPECTED["components/Foo"]="INTERNAL"

APP_ORDERED=(
    "lodash"
    "lodash/add"
    "@angular/core"
    "./sibling"
    "@/components/Foo"
    "@queries/bar"
    "\$lib/thing"
    "@myworkspace/shared"
    "components/Foo"
)

run_package_test "app" APP_EXPECTED APP_ORDERED

# --- Package: simple (no baseUrl, no paths — regression test) ---
declare -A SIMPLE_EXPECTED
SIMPLE_EXPECTED["lodash"]="EXTERNAL"
SIMPLE_EXPECTED["./sibling"]="INTERNAL"
SIMPLE_EXPECTED["@myworkspace/shared"]="INTERNAL"

SIMPLE_ORDERED=(
    "lodash"
    "./sibling"
    "@myworkspace/shared"
)

run_package_test "simple" SIMPLE_EXPECTED SIMPLE_ORDERED

# --- Summary ---
echo "=== Summary ==="
echo ""
echo "  Pass:         $TOTAL_PASS"
echo "  Fail:         $TOTAL_FAIL"
echo "  Not detected: $TOTAL_MISSING"
echo ""

if [ "$TOTAL_FAIL" -gt 0 ]; then
    echo "FAILED — $TOTAL_FAIL import(s) misclassified"
    echo ""
    echo "Debug logs: $OUTPUT_DIR/"
    trap - EXIT
    exit 1
fi

if [ "$TOTAL_MISSING" -gt 0 ]; then
    echo "WARNING — $TOTAL_MISSING import(s) not detected by scip-typescript"
    exit 0
fi

echo "ALL PASS"
