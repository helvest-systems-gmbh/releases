#!/bin/bash
set -e

die() {
    echo
    >&2 echo "ERROR: $@" && false
}

release_firmware="$1"
release_version="$2"
token="$3"
(( $# == 2 || $# == 3 )) || die "Expected 2 or 3 parameters."

if [[ $(git status --porcelain) != "" ]]; then
    >&2 git status
    die "Uncommitted and/or untracked files present. This script must be executed in a clean working copy of the repository."
fi

echo "Adding hp100/hp100-firmware-v${release_version}.hex"
[[ ! -e "hp100/hp100-firmware-v${release_version}.hex" ]] || die "File hp100/hp100-firmware-v${release_version}.hex already exists."
cp "$release_firmware" "hp100/hp100-firmware-v${release_version}.hex"

git add --verbose "hp100/hp100-firmware-v${release_version}.hex"
node ./update-manifest.js
git add --verbose hp100/manifest.json

git commit --message "Release v${release_version}"

if [[ $(git status --porcelain) != "" ]]; then
    >&2 git status
    die "Unexpected file modifications found. This should never happen and might be the result of a bug."
fi

if [[ $token == "" ]]; then
    git push origin HEAD
else
    git push "https://$token@github.com/helvest-systems-gmbh/releases.git"
fi
