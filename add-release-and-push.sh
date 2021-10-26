#!/usr/bin/env bash

#------------------------------------------------------------------------------
# Adds a nightly binary to a local checkout of solc-bin repository, updates
# file lists, commits and pushes the changes to the remote repository.
#
# The script expects to find the working copy in its working directory with
# the right branch already checked out and all the details necessary to make
# a commit and push it (committer name, `origin` remote, etc.) configured.
#
# The script fails if the specified version is already present in the
# repository.
#------------------------------------------------------------------------------

set -e

die() {
    echo
    >&2 echo "ERROR: $@" && false
}

nightly_binary="$1"
nightly_version="$2"
(( $# == 2 )) || die "Expected exactly 2 parameters."

if [[ $(git status --porcelain) != "" ]]; then
    >&2 git status
    die "Uncommitted and/or untracked files present. This script must be executed in a clean working copy of the repository."
fi

echo "Adding hp100/hp100-firmware-${nightly_version}.hex"
[[ ! -e "hp100/hp100-firmware-${nightly_version}.hex" ]] || die "File hp100/hp100-firmware-${nightly_version}.hex already exists."
cp "$nightly_binary" "hp100/hp100-firmware-${nightly_version}.hex"

# Stage the new nightly before running the list update to be able to detect any unintended changes caused by the script.
git add --verbose "hp100/hp100-firmware-${nightly_version}.hex"

# npm config set package-lock false
# npm install
# npm run update
# rm -r node_modules/

git add --verbose hp100/hp100-firmware.hex
git add --verbose hp100/manifest.*

git commit --message "Release ${nightly_version}"

if [[ $(git status --porcelain) != "" ]]; then
    >&2 git status
    die "Unexpected file modifications found. This should never happen and might be the result of a bug."
fi

git push origin HEAD