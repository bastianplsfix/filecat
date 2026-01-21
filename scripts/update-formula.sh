#!/bin/bash
# Update Homebrew formula with SHA256 hashes from a release
# Usage: ./scripts/update-formula.sh v0.0.1

set -e

VERSION="${1:-}"

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 v0.0.1"
  exit 1
fi

# Strip 'v' prefix for formula version
FORMULA_VERSION="${VERSION#v}"

REPO="bastianplsfix/filecat"
BASE_URL="https://github.com/${REPO}/releases/download/${VERSION}"

echo "Downloading release artifacts for ${VERSION}..."

# Create temp directory
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Download and compute SHA256 for each platform
platforms=("darwin-x86_64" "darwin-aarch64" "linux-x86_64")
declare -A shas

for platform in "${platforms[@]}"; do
  artifact="filecat-${platform}.tar.gz"
  url="${BASE_URL}/${artifact}"

  echo "Downloading ${artifact}..."
  if curl -fsSL -o "${TMPDIR}/${artifact}" "$url"; then
    sha=$(shasum -a 256 "${TMPDIR}/${artifact}" | awk '{print $1}')
    shas[$platform]=$sha
    echo "  SHA256: ${sha}"
  else
    echo "  Warning: Failed to download ${artifact}"
  fi
done

# Update the formula
FORMULA_PATH="Formula/filecat.rb"

if [ ! -f "$FORMULA_PATH" ]; then
  echo "Error: Formula not found at ${FORMULA_PATH}"
  exit 1
fi

echo ""
echo "Updating ${FORMULA_PATH}..."

# Update version
sed -i.bak "s/version \".*\"/version \"${FORMULA_VERSION}\"/" "$FORMULA_PATH"

# Update SHA256 hashes
if [ -n "${shas[darwin-x86_64]}" ]; then
  sed -i.bak "s/PLACEHOLDER_SHA256_DARWIN_X86_64/${shas[darwin-x86_64]}/" "$FORMULA_PATH"
  # Also handle existing hashes (64 char hex strings)
  sed -i.bak -E "s/(url.*darwin-x86_64.*$)/\1/; n; s/sha256 \"[a-f0-9]{64}\"/sha256 \"${shas[darwin-x86_64]}\"/" "$FORMULA_PATH"
fi

if [ -n "${shas[darwin-aarch64]}" ]; then
  sed -i.bak "s/PLACEHOLDER_SHA256_DARWIN_AARCH64/${shas[darwin-aarch64]}/" "$FORMULA_PATH"
fi

if [ -n "${shas[linux-x86_64]}" ]; then
  sed -i.bak "s/PLACEHOLDER_SHA256_LINUX_X86_64/${shas[linux-x86_64]}/" "$FORMULA_PATH"
fi

# Clean up backup files
rm -f "${FORMULA_PATH}.bak"

echo "Done! Formula updated with SHA256 hashes."
echo ""
echo "Next steps:"
echo "  1. Review the changes: git diff ${FORMULA_PATH}"
echo "  2. Commit and push: git add ${FORMULA_PATH} && git commit -m 'Update formula for ${VERSION}'"
echo "  3. If using a tap, copy the formula to your homebrew-tap repository"
