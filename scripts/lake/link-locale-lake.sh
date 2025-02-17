yarn link "@swan-io/lake"
yarn link "@swan-io/shared-business"
yarn link "react"
yarn link "react-dom"

# remove vite cache
rm -rf clients/banking/node_modules/.vite
rm -rf clients/onboarding/node_modules/.vite

# create js module to export lake path
echo 'import path from "node:path";
// This file is generated by scripts/lake/link-local-lake.sh
// You can edit it in case your lake repo is not in the same directory as this repo
export default {
  lake: path.resolve(process.cwd(), "..", "lake"),
};' > locale.config.js
