#!/bin/bash
if [[ -z "$1" ]]; then
  echo "Usage: $0 <net_error_list.h>"
  echo "e.g. $0 $(realpath ${0%/*}/../../chromium-net/base/net_error_list.h)"
  exit 1
fi

(
cat <<EOF
/* Auto-generated from chromium/src/net/base/net_error_list.h; do not edit. */

export const list = {
EOF
cpp "$1" -P -DNET_ERROR"(x,y)=#y: #x," | sed -e 's:^:  :' -e "s:\":':g"
cat <<EOF
};

EOF

cpp "$1" -P -DNET_ERROR"(x,y)= export const ##x = y;"

) > "${0%/*}/net_error_list.js"
