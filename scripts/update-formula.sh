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
SHA_DARWIN_X86_64=""
SHA_DARWIN_AARCH64=""
SHA_LINUX_X86_64=""

for platform in darwin-x86_64 darwin-aarch64 linux-x86_64; do
  artifact="filecat-${platform}.tar.gz"
  url="${BASE_URL}/${artifact}"

  echo "Downloading ${artifact}..."
  if curl -fsSL -o "${TMPDIR}/${artifact}" "$url"; then
    sha=$(shasum -a 256 "${TMPDIR}/${artifact}" | awk '{print $1}')
    echo "  SHA256: ${sha}"

    case "$platform" in
      darwin-x86_64)  SHA_DARWIN_X86_64="$sha" ;;
      darwin-aarch64) SHA_DARWIN_AARCH64="$sha" ;;
      linux-x86_64)   SHA_LINUX_X86_64="$sha" ;;
    esac
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

# Update SHA256 hashes (handles both placeholders and existing hashes)
if [ -n "$SHA_DARWIN_X86_64" ]; then
  sed -i.bak "s/PLACEHOLDER_SHA256_DARWIN_X86_64/${SHA_DARWIN_X86_64}/" "$FORMULA_PATH"
  sed -i.bak -E "/darwin-x86_64/{ n; s/sha256 \"[a-f0-9]{64}\"/sha256 \"${SHA_DARWIN_X86_64}\"/; }" "$FORMULA_PATH"
fi

if [ -n "$SHA_DARWIN_AARCH64" ]; then
  sed -i.bak "s/PLACEHOLDER_SHA256_DARWIN_AARCH64/${SHA_DARWIN_AARCH64}/" "$FORMULA_PATH"
  sed -i.bak -E "/darwin-aarch64/{ n; s/sha256 \"[a-f0-9]{64}\"/sha256 \"${SHA_DARWIN_AARCH64}\"/; }" "$FORMULA_PATH"
fi

if [ -n "$SHA_LINUX_X86_64" ]; then
  sed -i.bak "s/PLACEHOLDER_SHA256_LINUX_X86_64/${SHA_LINUX_X86_64}/" "$FORMULA_PATH"
  sed -i.bak -E "/linux-x86_64/{ n; s/sha256 \"[a-f0-9]{64}\"/sha256 \"${SHA_LINUX_X86_64}\"/; }" "$FORMULA_PATH"
fi

# Clean up backup files
rm -f "${FORMULA_PATH}.bak"

echo "Done! Formula updated with SHA256 hashes."
echo ""
echo "Next steps:"
echo "  1. Review the changes: git diff ${FORMULA_PATH}"
echo "  2. Commit and push: git add ${FORMULA_PATH} && git commit -m 'Update formula for ${VERSION}'"
echo "  3. If using a tap, copy the formula to your homebrew-tap repository"
