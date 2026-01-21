# Releasing a New Version

This guide covers how to release a new version of filecat and publish it to Homebrew.

## Prerequisites

- Push access to the main repository
- Push access to the [homebrew-tap](https://github.com/bastianplsfix/homebrew-tap) repository

## Release Steps

### 1. Commit your changes

```bash
cd /Users/sebastian/Workspace/github.com/bastianplsfix/filecat
git add .
git commit -m "Your commit message"
git push origin main
```

### 2. Create a version tag

```bash
git tag v0.0.X
git push origin v0.0.X
```

Replace `v0.0.X` with the new version number.

### 3. Wait for GitHub Actions

The release workflow will automatically:
- Build binaries for macOS (Intel + ARM) and Linux
- Create a GitHub release with the binaries

Monitor progress at: https://github.com/bastianplsfix/filecat/actions

This typically takes 2-3 minutes.

### 4. Update the Homebrew formula

Run the update script to fetch the new SHA256 hashes:

```bash
./scripts/update-formula.sh v0.0.X
```

### 5. Copy formula to tap repository

```bash
cp Formula/filecat.rb /Users/sebastian/Workspace/github.com/bastianplsfix/homebrew-tap/Formula/
```

### 6. Push the tap update

```bash
cd /Users/sebastian/Workspace/github.com/bastianplsfix/homebrew-tap
git add .
git commit -m "Update filecat to v0.0.X"
git push
```

### 7. Verify the release

```bash
brew update
brew upgrade filecat
filecat --help
```

## Version Numbering

Follow [semantic versioning](https://semver.org/):

- **MAJOR** (v1.0.0): Breaking changes
- **MINOR** (v0.1.0): New features, backwards compatible
- **PATCH** (v0.0.1): Bug fixes, backwards compatible

## Troubleshooting

### GitHub Actions failed

Check the [Actions tab](https://github.com/bastianplsfix/filecat/actions) for error logs. Common issues:
- Deno compilation errors
- Network timeouts during artifact upload

### SHA256 mismatch

If Homebrew reports a checksum mismatch:
1. Re-run `./scripts/update-formula.sh v0.0.X`
2. Verify the hashes match the release artifacts
3. Push the updated formula

### Homebrew not finding new version

```bash
brew update
brew tap --repair bastianplsfix/tap
brew upgrade filecat
```
