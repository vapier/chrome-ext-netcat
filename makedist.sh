#!/bin/bash -e
# Copyright (c) 2013 The Chromium OS Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

case $1 in
-h|--help)
  echo "Usage: $0 [rev]"
  exit 0
  ;;
esac

json_value() {
  local key=$1
  python -c '
import json, os, sys
path, key = sys.argv[1:]
with open(path) as fp:
  data = json.load(fp)
print(data[key])
' "manifest.json" "${key}"
}

PN=$(json_value name | sed 's:[[:space:]/]:_:g' | tr '[:upper:]' '[:lower:]')
if [[ ${PN} == "__msg_name__" ]] ; then
  PN=$(basename "$(pwd)")
fi
PV=$(json_value version)
rev=${1:-0}
PVR="${PV}.${rev}"
P="${PN}-${PVR}"

rm -rf "${P}"
mkdir "${P}"

while read line ; do
  [[ ${line} == */* ]] && mkdir -p "${P}/${line%/*}"
  ln "${line}" "${P}/${line}"
done < <(sed 's:#.*::' manifest.files)
ln -s ../js "${P}/"
ln -s ../externs "${P}/"
cp Makefile manifest.files manifest.json "${P}/"

make -C "${P}" -j {css,js}-min
while read line ; do
  mv "${line}" "${line%.min}"
done < <(find "${P}" -name '*.min')
rm "${P}"/{manifest.files,Makefile,js,externs}

python -c '
import json, os, sys
path, ver = sys.argv[1:]
with open(path) as fp:
  data = json.load(fp)
data.pop("key", None)
data["version"] = ver
with open(path, "w") as fp:
  json.dump(data, fp, separators=(",", ":"))
' "${P}/manifest.json" "${PVR}"

zip="${P}.zip"
rm -f "${zip}"
zip -r "${zip}" "${P}"
rm -rf "${P}"
du -b "${zip}"
