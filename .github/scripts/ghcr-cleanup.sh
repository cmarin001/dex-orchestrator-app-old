#!/usr/bin/env bash
set -euo pipefail
owner=cmarin001
package=${1:?Provide the GHCR package name}
case "$package" in dex-orchestrator|dex-orchestrator-app|dex-orchestrator-app-bff) ;; *) exit 2 ;; esac
api="/users/$owner/packages/container/$package/versions"
ignore_versions='^production$|^rollback$|^latest$'
min_versions_to_keep=50
# GHCR version names are digests, so protection must examine container tags.
# Without both aliases present, deployment metadata is incomplete.
versions=$(gh api --paginate --slurp "$api?per_page=100")
ids=$(jq -er --arg pattern "$ignore_versions" --argjson keep "$min_versions_to_keep" '
  add as $versions |
  [$versions[].metadata.container.tags[]] as $tags |
  if (($tags | index("production")) == null or ($tags | index("rollback")) == null)
  then error("Deployment aliases missing. No versions deleted.")
  else $versions | sort_by(.created_at) | reverse | .[$keep:] |
    map(select(all(.metadata.container.tags[]; test($pattern) | not)) | .id) |
    .[:100] | .[]
  end
' <<< "$versions") || {
  # jq -e returns 4 for an empty stream, which means nothing needs pruning.
  rc=$?
  if (( rc == 4 )); then exit 0; fi
  exit "$rc"
}
while read -r id; do
  [[ $id =~ ^[0-9]+$ ]] || exit 1
  version=$(gh api "$api/$id")
  protected=$(jq -r --arg pattern "$ignore_versions" '
    .metadata.container.tags | if type != "array" then error("Missing version tags")
    else any(.[]; test($pattern)) end' <<< "$version")
  case "$protected" in true) continue ;; false) ;; *) exit 1 ;; esac
  gh api -X DELETE "$api/$id"
done <<< "$ids"
